#!/usr/bin/env node
/**
 * Genera public/og-image.jpg para previews en WhatsApp / redes.
 * Fondo + logo blanco centrado, como el splash loader.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_WIDTH = Math.round(WIDTH * 0.52);

const bg = await sharp(path.join(PUBLIC, "fondo-desktop.jpg"))
	.resize(WIDTH, HEIGHT, { fit: "cover", position: "center" })
	.jpeg({ quality: 88 })
	.toBuffer();

const logoSource = await sharp(path.join(PUBLIC, "logo.png"))
	.resize(LOGO_WIDTH, null, { fit: "inside" })
	.greyscale()
	.raw()
	.toBuffer({ resolveWithObject: true });

const { data, info } = logoSource;
const pixels = info.width * info.height;
const rgba = Buffer.alloc(pixels * 4);

for (let i = 0; i < pixels; i++) {
	const lum = data[i];
	rgba[i * 4] = 255;
	rgba[i * 4 + 1] = 255;
	rgba[i * 4 + 2] = 255;
	rgba[i * 4 + 3] = lum;
}

const logoOverlay = await sharp(rgba, {
	raw: { width: info.width, height: info.height, channels: 4 },
})
	.png()
	.toBuffer();

await sharp(bg)
	.composite([{ input: logoOverlay, gravity: "center" }])
	.jpeg({ quality: 90, mozjpeg: true })
	.toFile(path.join(PUBLIC, "og-image.jpg"));

console.log(`og-image.jpg → ${WIDTH}×${HEIGHT}`);
