/**
 * Captura visual del easter egg "Dino on Set" y chequeo de errores de consola.
 * Uso: node scripts/dino-shots.mjs [baseUrl]
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:4321";
const OUT = "tmp/dino-shots";
mkdirSync(OUT, { recursive: true });

const problems = [];

const VIEWPORT = process.argv[3] === "mobile"
	? { width: 390, height: 844 }
	: { width: 1440, height: 900 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });

page.on("console", (m) => {
	if (m.type() === "error" || m.type() === "warning") problems.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));
page.on("response", (r) => {
	if (r.status() >= 400) problems.push(`[${r.status()}] ${r.url()}`);
});

await page.goto(BASE, { waitUntil: "networkidle" });
await page.click("[data-dino-open]");
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/01-start.png` });

// Autopilot: salta cuando hay algo de piso cerca, se agacha con lo aéreo
await page.evaluate(() => {
	const send = (type, code) =>
		window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
	send("keydown", "Space");
	send("keyup", "Space");
	window.__dinoBot = setInterval(() => {
		if (Math.random() < 0.5) {
			send("keydown", "Space");
			setTimeout(() => send("keyup", "Space"), 90);
		} else {
			send("keydown", "ArrowDown");
			setTimeout(() => send("keyup", "ArrowDown"), 260);
		}
	}, 520);
});

// Serie de frames seguidos para leer el ciclo de carrera
for (let i = 0; i < 6; i++) {
	await page.waitForTimeout(70);
	const clip = {
		x: 0,
		y: Math.max(0, VIEWPORT.height * 0.8 - 190),
		width: Math.min(460, VIEWPORT.width),
		height: 300,
	};
	await page.screenshot({ path: `${OUT}/run-${i}.png`, clip });
}

// Toast largo con la animación de entrada, para revisar el diseño
await page.evaluate(() => {
	const t = document.querySelector("[data-dino-toast]");
	if (!(t instanceof HTMLElement)) return;
	t.textContent = "EL CLIENTE DIJO QUE LO VE Y NO LO VIO NUNCA MÁS";
	t.hidden = false;
	t.classList.remove("is-out", "is-in");
	void t.offsetWidth;
	t.classList.add("is-in");
});
await page.waitForTimeout(320);
await page.screenshot({ path: `${OUT}/05-toast.png` });

await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/02-play.png` });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/03-play-late.png` });

const snapshot = await page.evaluate(() => {
	const t = document.querySelector("[data-dino-toast]");
	const c = document.querySelector("[data-dino-canvas]");
	return {
		toastHidden: t?.hidden,
		toastText: t?.textContent,
		toastClass: t?.className,
		canvasFilter: c?.style.filter ?? "",
	};
});

await page.evaluate(() => clearInterval(window.__dinoBot));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/04-gameover.png` });

console.log("SNAPSHOT", JSON.stringify(snapshot, null, 2));
console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "PROBLEMS: none");

await browser.close();
