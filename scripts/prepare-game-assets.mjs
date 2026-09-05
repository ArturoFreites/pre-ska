#!/usr/bin/env node
/**
 * Prepara PNGs de ChatGPT para Dino on Set (gratis, local).
 *
 * 1. Poné los PNG crudos en public/game/inbox/
 * 2. Renombralos con el nombre final (ej. dino-run-1.png)
 * 3. npm run game:prepare
 *
 * Hace: fondo blanco/gris → transparente, encaja en 512×512, pies abajo.
 *
 * Los frames del dino y los overlays gear-* se exportan con una única
 * transformación compartida: recortar y reencuadrar cada uno por separado
 * rompería la alineación que el arte trae desde el canvas original.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INBOX = path.join(ROOT, "public/game/inbox");
const OUT = path.join(ROOT, "public/game");
const MANIFEST = path.join(ROOT, "src/scripts/dino/game-manifest.json");

const SIZE = 512;
const FOOT_PAD = 8;
/** Pixels más claros que esto → transparente (fondo ChatGPT) */
const WHITE_THRESHOLD = 248;
const ALPHA_MIN = 12;
const BLACK_PAD_MAX = 26;

/** Sprites que comparten un mismo canvas y deben conservar su alineación mutua */
const ALIGNED_PREFIXES = ["dino-", "gear-"];

function isAligned(name) {
	return ALIGNED_PREFIXES.some((p) => name.startsWith(p));
}

function isBackground(r, g, b) {
	return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

function isPadPixel(r, g, b, a) {
	if (a <= ALPHA_MIN) return true;
	const mx = Math.max(r, g, b);
	const mn = Math.min(r, g, b);
	return mx <= BLACK_PAD_MAX && mx - mn <= 10;
}

/** RGBA crudo con el fondo blanco de ChatGPT ya pasado a transparente */
async function loadRgba(inputPath) {
	const { data, info } = await sharp(inputPath)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	let hasAlpha = false;
	for (let i = 3; i < data.length; i += 4) {
		if (data[i] < 250) {
			hasAlpha = true;
			break;
		}
	}

	if (!hasAlpha) {
		for (let i = 0; i < data.length; i += 4) {
			if (isBackground(data[i], data[i + 1], data[i + 2])) data[i + 3] = 0;
		}
	}

	return { data, info };
}

function contentBox(data, info, { trimBlackPad = false } = {}) {
	let minX = info.width;
	let minY = info.height;
	let maxX = -1;
	let maxY = -1;

	for (let y = 0; y < info.height; y++) {
		for (let x = 0; x < info.width; x++) {
			const i = (y * info.width + x) * 4;
			const keep = trimBlackPad
				? !isPadPixel(data[i], data[i + 1], data[i + 2], data[i + 3])
				: data[i + 3] > ALPHA_MIN;
			if (!keep) continue;
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	}

	if (maxX < minX) return null;
	return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function emptyCanvas(width, height) {
	return sharp({
		create: {
			width,
			height,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	});
}

// ─── Sprites sueltos: recorte + encaje individual ────────────────────────────

async function fitToCanvas({ data, info }, name) {
	const isWideBg = name.startsWith("bg-");
	const canvasW = isWideBg ? 1024 : SIZE;
	const canvasH = SIZE;
	const footPad = isWideBg ? 0 : FOOT_PAD;

	const trimBlackPad =
		/^p[12]-/.test(name) ||
		/^(xlr|tripod|clapper|flight|gaffer-roll|pickup-)/.test(name);
	const box = contentBox(data, info, { trimBlackPad });
	if (!box) throw new Error("Imagen vacía después de recortar");

	const trimmed = await sharp(data, {
		raw: { width: info.width, height: info.height, channels: 4 },
	})
		.extract({ left: box.x, top: box.y, width: box.w, height: box.h })
		.png()
		.toBuffer();

	const maxH = canvasH - footPad;
	const scale = Math.min(canvasW / box.w, maxH / box.h, 1);
	const w = Math.max(1, Math.round(box.w * scale));
	const h = Math.max(1, Math.round(box.h * scale));

	const resized = await sharp(trimmed)
		.resize(w, h, { kernel: sharp.kernel.nearest })
		.png()
		.toBuffer();

	const left = Math.round((canvasW - w) / 2);
	const top = isWideBg ? Math.round((canvasH - h) / 2) : canvasH - footPad - h;

	return emptyCanvas(canvasW, canvasH)
		.composite([{ input: resized, left, top }])
		.png();
}

// ─── Dino + gear: una sola transformación para todo el grupo ─────────────────

/**
 * Escala y desplazamiento comunes al grupo, calculados sobre la unión de todos
 * los contenidos: así ningún accesorio se sale del canvas y cada uno cae en el
 * mismo punto relativo al dino que tenía en el arte original.
 */
function alignedTransform(entries) {
	const first = entries[0].info;
	const sameCanvas = entries.every(
		(e) => e.info.width === first.width && e.info.height === first.height,
	);
	if (!sameCanvas) return null;

	const minX = Math.min(...entries.map((e) => e.box.x));
	const minY = Math.min(...entries.map((e) => e.box.y));
	const maxX = Math.max(...entries.map((e) => e.box.x + e.box.w));
	const maxY = Math.max(...entries.map((e) => e.box.y + e.box.h));
	const union = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

	const scale = Math.min(SIZE / union.w, (SIZE - FOOT_PAD) / union.h, 1);
	return {
		scale,
		offsetX: (SIZE - union.w * scale) / 2 - union.x * scale,
		offsetY: SIZE - FOOT_PAD - union.h * scale - union.y * scale,
	};
}

async function renderAligned({ data, info }, t) {
	const sw = Math.max(1, Math.round(info.width * t.scale));
	const sh = Math.max(1, Math.round(info.height * t.scale));

	const scaled = await sharp(data, {
		raw: { width: info.width, height: info.height, channels: 4 },
	})
		.resize(sw, sh, { kernel: sharp.kernel.nearest })
		.png()
		.toBuffer();

	const srcLeft = Math.max(0, Math.round(-t.offsetX));
	const srcTop = Math.max(0, Math.round(-t.offsetY));
	const dstLeft = Math.max(0, Math.round(t.offsetX));
	const dstTop = Math.max(0, Math.round(t.offsetY));
	const cw = Math.min(sw - srcLeft, SIZE - dstLeft);
	const ch = Math.min(sh - srcTop, SIZE - dstTop);
	if (cw <= 0 || ch <= 0) throw new Error("El sprite queda fuera del canvas");

	const piece = await sharp(scaled)
		.extract({ left: srcLeft, top: srcTop, width: cw, height: ch })
		.png()
		.toBuffer();

	return emptyCanvas(SIZE, SIZE)
		.composite([{ input: piece, left: dstLeft, top: dstTop }])
		.png();
}

// ─── Orquestación ────────────────────────────────────────────────────────────

function ensureDirs() {
	fs.mkdirSync(INBOX, { recursive: true });
	fs.mkdirSync(OUT, { recursive: true });
}

function listInboxPngs() {
	if (!fs.existsSync(INBOX)) return [];
	return fs.readdirSync(INBOX).filter((f) => f.toLowerCase().endsWith(".png"));
}

async function writeOut(name, pipeline) {
	await pipeline.toFile(path.join(OUT, name));
}

async function processStandalone(name, processed) {
	try {
		const rgba = await loadRgba(path.join(INBOX, name));
		await writeOut(name, await fitToCanvas(rgba, name));
		processed.push(name);
		console.log(`✓ ${name}`);
	} catch (err) {
		console.error(`✗ ${name}:`, err.message || err);
	}
}

async function processAlignedGroup(names, processed) {
	const entries = [];
	for (const name of names) {
		try {
			const { data, info } = await loadRgba(path.join(INBOX, name));
			const box = contentBox(data, info);
			if (!box) throw new Error("Imagen vacía");
			entries.push({ name, data, info, box });
		} catch (err) {
			console.error(`✗ ${name}:`, err.message || err);
		}
	}
	if (entries.length === 0) return;

	const t = alignedTransform(entries);
	if (!t) {
		console.warn(
			"⚠ dino/gear no comparten tamaño de canvas — se procesan sueltos y los accesorios pueden desalinearse",
		);
		for (const e of entries) {
			try {
				await writeOut(e.name, await fitToCanvas(e, e.name));
				processed.push(e.name);
				console.log(`✓ ${e.name}`);
			} catch (err) {
				console.error(`✗ ${e.name}:`, err.message || err);
			}
		}
		return;
	}

	console.log(`⇢ dino + gear alineados (escala ${t.scale.toFixed(4)})`);
	for (const e of entries) {
		try {
			await writeOut(e.name, await renderAligned(e, t));
			processed.push(e.name);
			console.log(`✓ ${e.name}`);
		} catch (err) {
			console.error(`✗ ${e.name}:`, err.message || err);
		}
	}
}

async function main() {
	ensureDirs();
	const files = listInboxPngs();

	if (files.length === 0) {
		const { syncGameSprites } = await import("./sync-game-sprites.mjs");
		await syncGameSprites();
		console.log("\n📁 No hay PNG nuevos en inbox — manifest/bounds actualizados.\n");
		process.exit(0);
	}

	const processed = [];
	await processAlignedGroup(files.filter(isAligned).sort(), processed);
	for (const file of files.filter((f) => !isAligned(f)).sort()) {
		await processStandalone(file, processed);
	}

	// Manifest = todos los PNG en public/game/ (excepto inbox)
	const allPngs = fs
		.readdirSync(OUT)
		.filter((f) => f.toLowerCase().endsWith(".png"))
		.sort();

	fs.writeFileSync(
		MANIFEST,
		JSON.stringify({ files: allPngs, updatedAt: new Date().toISOString() }, null, 2) + "\n",
	);

	const { syncGameSprites } = await import("./sync-game-sprites.mjs");
	await syncGameSprites();

	console.log(`\n✅ ${processed.length} procesados → public/game/`);
	console.log(`   Manifest: src/scripts/dino/game-manifest.json (${allPngs.length} sprites)`);
	console.log("   Refrescá el juego en el navegador.\n");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
