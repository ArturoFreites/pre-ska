#!/usr/bin/env node
/**
 * Analiza bounds de contenido en public/game/*.png
 * Genera sprite-bounds.json para render y hitboxes correctos.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GAME_DIR = path.join(ROOT, "public/game");
const BOUNDS_OUT = path.join(ROOT, "src/scripts/dino/sprite-bounds.json");
const MANIFEST_OUT = path.join(ROOT, "src/scripts/dino/game-manifest.json");

const ALPHA_MIN = 12;

function kindFromName(name) {
	if (name.startsWith("dino-")) return "dino";
	if (name.startsWith("gear-")) return "gear";
	if (name.startsWith("pickup-")) return "pickup";
	if (name.startsWith("decor-") || name.startsWith("bg-")) return "decor";
	if (name.startsWith("ui-")) return "ui";
	return "obstacle";
}

async function analyzeFile(name) {
	const filePath = path.join(GAME_DIR, name);
	const { data, info } = await sharp(filePath)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	let minX = info.width;
	let minY = info.height;
	let maxX = 0;
	let maxY = 0;

	for (let y = 0; y < info.height; y++) {
		for (let x = 0; x < info.width; x++) {
			const a = data[(y * info.width + x) * 4 + 3];
			if (a > ALPHA_MIN) {
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
			}
		}
	}

	if (maxX < minX) return null;

	const w = maxX - minX + 1;
	const h = maxY - minY + 1;

	return {
		x: minX,
		y: minY,
		w,
		h,
		sw: info.width,
		sh: info.height,
		aspect: +(w / h).toFixed(4),
		foot: info.height - 1 - maxY,
		kind: kindFromName(name),
	};
}

/** Normaliza ui-rec-dot y otros PNG sueltos a 512×512 */
async function normalizeUiSprite(name) {
	if (!name.startsWith("ui-")) return;
	const filePath = path.join(GAME_DIR, name);
	const meta = await sharp(filePath).metadata();
	if (meta.width === 512 && meta.height === 512) return;

	const trimmed = await sharp(filePath).trim().png().toBuffer({ resolveWithObject: true });
	const tw = trimmed.info.width;
	const th = trimmed.info.height;
	const pad = 8;
	const scale = Math.min((512 - pad * 2) / tw, (512 - pad * 2) / th, 1);
	const w = Math.round(tw * scale);
	const h = Math.round(th * scale);
	const resized = await sharp(trimmed.data).resize(w, h, { kernel: sharp.kernel.nearest }).png().toBuffer();

	await sharp({
		create: {
			width: 512,
			height: 512,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	})
		.composite([
			{
				input: resized,
				left: Math.round((512 - w) / 2),
				top: 512 - pad - h,
			},
		])
		.png()
		.toFile(filePath);
	console.log(`↻ normalizado ${name} → 512×512`);
}

export async function syncGameSprites() {
	if (!fs.existsSync(GAME_DIR)) fs.mkdirSync(GAME_DIR, { recursive: true });

	const files = fs
		.readdirSync(GAME_DIR)
		.filter((f) => f.toLowerCase().endsWith(".png"))
		.sort();

	for (const f of files) {
		await normalizeUiSprite(f);
	}

	const sprites = {};
	for (const f of files) {
		const b = await analyzeFile(f);
		if (b) sprites[f] = b;
	}

	fs.writeFileSync(BOUNDS_OUT, JSON.stringify({ sprites, updatedAt: new Date().toISOString() }, null, 2) + "\n");
	fs.writeFileSync(
		MANIFEST_OUT,
		JSON.stringify({ files, updatedAt: new Date().toISOString() }, null, 2) + "\n",
	);

	return { files: files.length, bounds: Object.keys(sprites).length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	syncGameSprites()
		.then(({ files, bounds }) => {
			console.log(`\n✅ sprite-bounds.json (${bounds} sprites)`);
			console.log(`   game-manifest.json (${files} archivos)\n`);
		})
		.catch((e) => {
			console.error(e);
			process.exit(1);
		});
}
