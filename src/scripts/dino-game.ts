/**
 * DINO ON SET — endless runner engine (SKA Studio easter egg).
 * Content lives in ./dino/content.ts — edit phrases/obstacles there.
 */
import {
	GAME_CONFIG,
	DINO_CONFIG,
	STAGES,
	OBSTACLE_TYPES,
	PICKUP_TYPES,
	MEME_EVENTS_2026,
	GAME_OVER_MESSAGES,
	GAME_OVER_RARE,
	SFX_PROFILES,
	pickWeighted,
	dinoLevelFor,
	stageFor,
	eventsForStage,
	type ObstacleDef,
	type PickupDef,
	type EventEffect,
	type StageDef,
} from "./dino/content";
import {
	drawPixelSprite,
	getSprite,
	dinoSpriteName,
	OBSTACLE_SPRITE,
	PICKUP_SPRITE,
	DECOR_SPRITE,
	DECOR_MODE,
	GEAR_SPRITE,
	SPRITE_PALETTE,
	SPRITE_SIZE,
	obstacleDrawMode,
} from "./dino/sprites";

export { GAME_CONFIG, DINO_CONFIG, STAGES };

export function toTimecode(frames: number, fps = GAME_CONFIG.framesPerSecond): string {
	const total = Math.max(0, Math.floor(frames));
	const ff = total % fps;
	const totalSecs = Math.floor(total / fps);
	const ss = totalSecs % 60;
	const totalMins = Math.floor(totalSecs / 60);
	const mm = totalMins % 60;
	const hh = Math.floor(totalMins / 60);
	const p = (n: number) => String(n).padStart(2, "0");
	return `${p(hh)}:${p(mm)}:${p(ss)}:${p(ff)}`;
}

function loadBest(): number {
	try {
		const raw = localStorage.getItem(GAME_CONFIG.storageKey);
		return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
	} catch {
		return 0;
	}
}

function saveBest(frames: number) {
	try {
		localStorage.setItem(GAME_CONFIG.storageKey, String(frames));
	} catch {
		/* ignore */
	}
}

type GameState = "idle" | "running" | "over";

interface Obstacle {
	def: ObstacleDef;
	x: number;
	y: number;
	w: number;
	h: number;
	air: boolean;
}

interface Pickup {
	def: PickupDef;
	x: number;
	y: number;
	w: number;
	h: number;
}

interface Toast {
	text: string;
	ttl: number;
}

interface BgProp {
	kind: "moto" | "bondi" | "vecino" | "tv";
	x: number;
	y: number;
	vx: number;
	ttl: number;
}

interface DinoGameApi {
	open: () => void;
	close: () => void;
	destroy: () => void;
	isOpen: () => boolean;
}

export type { DinoGameApi };

export function mountDinoGame(root: HTMLElement): DinoGameApi {
	const canvas = root.querySelector<HTMLCanvasElement>("[data-dino-canvas]")!;
	const ctx = canvas.getContext("2d")!;
	const hudRec = root.querySelector<HTMLElement>("[data-dino-rec]")!;
	const hudBest = root.querySelector<HTMLElement>("[data-dino-best]")!;
	const hudStage = root.querySelector<HTMLElement>("[data-dino-stage]")!;
	const toastEl = root.querySelector<HTMLElement>("[data-dino-toast]")!;
	const startScreen = root.querySelector<HTMLElement>("[data-dino-start]")!;
	const overScreen = root.querySelector<HTMLElement>("[data-dino-over]")!;
	const overDuration = root.querySelector<HTMLElement>("[data-dino-duration]")!;
	const overBest = root.querySelector<HTMLElement>("[data-dino-over-best]")!;
	const overSub = root.querySelector<HTMLElement>("[data-dino-over-sub]");
	const btnClose = root.querySelector<HTMLElement>("[data-dino-close]")!;
	const btnBack = root.querySelector<HTMLElement>("[data-dino-back]")!;
	const btnRetry = root.querySelector<HTMLElement>("[data-dino-retry]")!;
	const btnDuck = root.querySelector<HTMLElement>("[data-dino-duck]")!;
	const btnMute = root.querySelector<HTMLElement>("[data-dino-mute]")!;

	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

	let open = false;
	let state: GameState = "idle";
	let raf = 0;
	let lastTs = 0;
	let dpr = 1;
	let W = 0;
	let H = 0;
	let groundY = 0;
	let scale = 1;

	let px = 0;
	let py = 0;
	let pvy = 0;
	let ducking = false;
	let onGround = true;
	let runFrame = 0;
	let runAcc = 0;

	let speed = GAME_CONFIG.baseSpeed;
	let obstacles: Obstacle[] = [];
	let pickups: Pickup[] = [];
	let bgProps: BgProp[] = [];
	let spawnTimer = 0;
	let scoreFrames = 0;
	let best = loadBest();
	let groundOffset = 0;
	let toast: Toast | null = null;
	let muted = true;
	let audioCtx: AudioContext | null = null;

	// Power / event state
	let speedBoost = 0;
	let speedBoostTtl = 0;
	let easeFactor = 1;
	let easeTtl = 0;
	let multiplier = 1;
	let multiplierTtl = 0;
	let invulnTtl = 0;
	let hasShield = false;
	let freezeTtl = 0;
	let hideRecTtl = 0;
	let darkenTtl = 0;
	let renderBarTtl = 0;
	let letterboxTtl = 0;
	let slowMoTtl = 0;
	let auraTtl = 0;
	let argentinaTtl = 0;
	let reelsTtl = 0;
	let deleteNext = false;
	let eventCooldown = 8;
	let lastEventId = "";
	let unlockedLevels = new Set<string>(["base"]);
	let lastStageId = STAGES[0]!.id;
	let particles: Array<{ x: number; y: number; vx: number; vy: number; ttl: number }> = [];

	let wantDuck = false;
	let touchStartY = 0;
	let prevFocus: HTMLElement | null = null;
	let scrollLockY = 0;

	const listeners: Array<() => void> = [];
	const on = <K extends keyof WindowEventMap>(
		target: Window | Document | HTMLElement,
		type: K,
		handler: (e: WindowEventMap[K]) => void,
		opts?: AddEventListenerOptions,
	) => {
		const h = handler as EventListener;
		target.addEventListener(type, h, opts);
		listeners.push(() => target.removeEventListener(type, h, opts));
	};

	function beep(freq: number, dur = 0.06, type: OscillatorType = "square", gain = 0.04) {
		if (muted) return;
		try {
			if (!audioCtx) audioCtx = new AudioContext();
			const o = audioCtx.createOscillator();
			const g = audioCtx.createGain();
			o.type = type;
			o.frequency.value = freq;
			g.gain.value = gain;
			o.connect(g);
			g.connect(audioCtx.destination);
			o.start();
			g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
			o.stop(audioCtx.currentTime + dur);
		} catch {
			/* ignore */
		}
	}

	function sfxProfile() {
		return SFX_PROFILES[stageFor(scoreFrames).sfx];
	}

	function sfx(kind: "jump" | "start" | "cut" | "pickup" | "event") {
		const p = sfxProfile();
		if (kind === "start") {
			beep(p.start[0]!, 0.05, p.wave, 0.05);
			beep(p.start[1]!, 0.08, p.wave, 0.04);
			return;
		}
		const freq = p[kind];
		const dur = kind === "cut" ? 0.18 : 0.05;
		beep(freq, dur, p.wave, kind === "cut" ? 0.06 : 0.04);
	}

	function showToast(text: string, ttl = 2.3) {
		toast = { text, ttl };
	}

	function playerBox() {
		// V3 pack: all sprites 32×32 — duck uses shorter hitbox for fairness
		const standW = SPRITE_SIZE * scale;
		const standH = SPRITE_SIZE * scale;
		if (ducking && onGround) {
			const duckH = standH * 0.55;
			const duckW = standW * 1.15;
			return { x: px, y: py - duckH, w: duckW, h: duckH };
		}
		return { x: px, y: py - standH, w: standW, h: standH };
	}

	function resize() {
		const rect = root.getBoundingClientRect();
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = Math.max(1, Math.floor(rect.width));
		H = Math.max(1, Math.floor(rect.height));
		canvas.width = Math.floor(W * dpr);
		canvas.height = Math.floor(H * dpr);
		canvas.style.width = `${W}px`;
		canvas.style.height = `${H}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.imageSmoothingEnabled = false;
		// 32×32 pack reads small at old scale — bump for readability
		scale = Math.max(1.05, Math.min(1.55, W / 820));
		if (isTouch || W < 720) scale = Math.max(scale, 1.2);
		groundY = H * 0.72;
		px = Math.min(110, W * 0.14);
		if (onGround) py = groundY;
		if (open) syncDuckButton();
	}

	function clearPowers() {
		speedBoost = 0;
		speedBoostTtl = 0;
		easeFactor = 1;
		easeTtl = 0;
		multiplier = 1;
		multiplierTtl = 0;
		invulnTtl = 0;
		hasShield = false;
		freezeTtl = 0;
		hideRecTtl = 0;
		darkenTtl = 0;
		renderBarTtl = 0;
		letterboxTtl = 0;
		slowMoTtl = 0;
		auraTtl = 0;
		argentinaTtl = 0;
		reelsTtl = 0;
		deleteNext = false;
		particles = [];
		bgProps = [];
		pickups = [];
	}

	function resetRun() {
		state = "idle";
		obstacles = [];
		speed = GAME_CONFIG.baseSpeed;
		spawnTimer = 800;
		scoreFrames = 0;
		pvy = 0;
		ducking = false;
		wantDuck = false;
		onGround = true;
		py = groundY;
		groundOffset = 0;
		toast = null;
		runFrame = 0;
		eventCooldown = 6 + Math.random() * 4;
		lastEventId = "";
		unlockedLevels = new Set(["base"]);
		lastStageId = STAGES[0]!.id;
		clearPowers();
		startScreen.hidden = false;
		overScreen.hidden = true;
		hudStage.textContent = STAGES[0]!.label;
		updateHud();
	}

	function startRun() {
		if (state === "running") return;
		resetRun();
		state = "running";
		startScreen.hidden = true;
		overScreen.hidden = true;
		sfx("start");
	}

	function gameOver() {
		if (state !== "running") return;
		if (invulnTtl > 0 || argentinaTtl > 0) return;
		if (hasShield) {
			hasShield = false;
			showToast("GAFFER AGUANTÓ", 1.6);
			sfx("event");
			invulnTtl = 0.6;
			return;
		}
		state = "over";
		sfx("cut");
		if (scoreFrames > best) {
			best = scoreFrames;
			saveBest(best);
		}
		overDuration.textContent = toTimecode(scoreFrames);
		overBest.textContent = toTimecode(best);
		if (Math.random() < GAME_OVER_RARE.weight) {
			if (overSub) overSub.textContent = GAME_OVER_RARE.title;
		} else if (overSub) {
			overSub.textContent =
				GAME_OVER_MESSAGES[Math.floor(Math.random() * GAME_OVER_MESSAGES.length)]!;
		}
		overScreen.hidden = false;
		updateHud();
	}

	function jump() {
		if (state === "idle") {
			startRun();
			return;
		}
		if (state === "over") {
			startRun();
			return;
		}
		if (state === "running" && onGround) {
			pvy = -GAME_CONFIG.jumpVelocity;
			onGround = false;
			ducking = false;
			sfx("jump");
		}
	}

	function setDuck(v: boolean) {
		wantDuck = v;
		if (state !== "running") return;
		if (v && onGround) ducking = true;
		if (!v) ducking = false;
		if (v && !onGround) pvy = Math.max(pvy, 0) + 200;
	}

	function poolObstacles(pool: "av" | "arg" | "air") {
		return OBSTACLE_TYPES.filter((o) => o.pool === pool);
	}

	function pickObstacleDef(): ObstacleDef {
		const stage = stageFor(scoreFrames);
		const airOk = scoreFrames > GAME_CONFIG.airUnlockScore && argentinaTtl <= 0;
		const airChance = stage.airBias + Math.min(0.14, scoreFrames / 10000);
		if (airOk && Math.random() < airChance) {
			return pickWeighted(poolObstacles("air"));
		}
		if (Math.random() < stage.argBias) {
			return pickWeighted(poolObstacles("arg"));
		}
		return pickWeighted(poolObstacles("av"));
	}

	function spawnObstacle(forced?: ObstacleDef) {
		if (argentinaTtl > 0) return;
		const def = forced ?? pickObstacleDef();
		const spriteName = OBSTACLE_SPRITE[def.id];
		const spr = spriteName ? getSprite(spriteName) : null;
		let bw = spr?.w ?? def.w;
		let bh = spr?.h ?? def.h;
		const varScale = 0.9 + Math.random() * 0.22;
		bw *= varScale;
		bh *= varScale;
		if (isTouch || W < 720) {
			bw *= 1.1;
			bh *= 1.1;
		}
		const w = bw * scale;
		const h = bh * scale;
		const air = def.lane === "air";
		const y = air ? groundY - (52 + Math.random() * 28) * scale : groundY;
		obstacles.push({ def, x: W + 24, y, w, h, air });
	}

	function spawnPickup() {
		const def = pickWeighted(PICKUP_TYPES);
		const spr = getSprite(PICKUP_SPRITE[def.id] ?? "");
		const bw = spr?.w ?? def.w;
		const bh = spr?.h ?? def.h;
		const w = bw * scale * (isTouch ? 1.08 : 1);
		const h = bh * scale * (isTouch ? 1.08 : 1);
		const float = (28 + Math.random() * 36) * scale;
		pickups.push({ def, x: W + 20, y: groundY - float, w, h });
	}

	function hitTest(
		a: { x: number; y: number; w: number; h: number },
		bx: number,
		by: number,
		bw: number,
		bh: number,
	) {
		const pad = 4 * scale;
		return (
			a.x + pad < bx + bw - pad &&
			a.x + a.w - pad > bx + pad &&
			a.y + pad < by + bh - pad &&
			a.y + a.h - pad > by + pad
		);
	}

	function applyPickup(def: PickupDef) {
		sfx("pickup");
		showToast(def.label, 2.1);
		const e = def.effect;
		switch (e.type) {
			case "score":
				scoreFrames += e.frames * multiplier;
				break;
			case "speed":
				speedBoost = e.amount;
				speedBoostTtl = e.duration;
				break;
			case "multiplier":
				multiplier = e.amount;
				multiplierTtl = e.duration;
				break;
			case "invuln":
				invulnTtl = Math.max(invulnTtl, e.duration);
				break;
			case "shield":
				hasShield = true;
				break;
			case "ease":
				easeFactor = e.amount;
				easeTtl = e.duration;
				invulnTtl = Math.max(invulnTtl, Math.min(2, e.duration * 0.4));
				break;
		}
	}

	function applyEventEffect(effect: EventEffect, duration: number) {
		switch (effect.type) {
			case "none":
				break;
			case "speed":
				speedBoost = GAME_CONFIG.baseSpeed * (effect.factor - 1);
				speedBoostTtl = duration;
				break;
			case "burst":
				for (let i = 0; i < effect.count; i++) {
					window.setTimeout(() => {
						if (state === "running" && open) spawnObstacle();
					}, 180 + i * 220);
				}
				break;
			case "delete_next":
				deleteNext = true;
				break;
			case "maybe_delete":
				if (Math.random() < effect.chance) deleteNext = true;
				break;
			case "freeze":
				freezeTtl = effect.ms / 1000;
				break;
			case "render_bar":
				renderBarTtl = duration;
				break;
			case "hide_rec":
				hideRecTtl = duration;
				break;
			case "darken":
				darkenTtl = duration;
				speedBoost = 40;
				speedBoostTtl = duration;
				break;
			case "spawn_hdd": {
				const hdd = OBSTACLE_TYPES.find((o) => o.id === "hdd");
				if (hdd) {
					for (let i = 0; i < 3; i++) {
						window.setTimeout(() => {
							if (state === "running" && open) spawnObstacle(hdd);
						}, i * 260);
					}
				}
				break;
			}
			case "bg_moto":
				bgProps.push({
					kind: "moto",
					x: W + 10,
					y: groundY - 26 * scale,
					vx: -speed * 1.35,
					ttl: 4,
				});
				break;
			case "bg_bondi":
				bgProps.push({
					kind: "bondi",
					x: W + 20,
					y: groundY - 48 * scale,
					vx: -speed * 0.55,
					ttl: 5,
				});
				if (effect.slow) {
					easeFactor = 0.7;
					easeTtl = duration;
				}
				break;
			case "bg_vecino":
				bgProps.push({
					kind: "vecino",
					x: W + 10,
					y: groundY - 44 * scale,
					vx: -speed * 0.75,
					ttl: 4,
				});
				break;
			case "aura":
				auraTtl = duration;
				multiplier = Math.max(multiplier, 2);
				multiplierTtl = duration;
				invulnTtl = Math.max(invulnTtl, duration * 0.5);
				for (let i = 0; i < 14; i++) {
					particles.push({
						x: px + 20 * scale,
						y: py - 30 * scale,
						vx: (Math.random() - 0.5) * 80,
						vy: -40 - Math.random() * 60,
						ttl: 0.8 + Math.random() * 0.6,
					});
				}
				break;
			case "cine":
				letterboxTtl = duration;
				slowMoTtl = duration;
				break;
			case "argentina":
				argentinaTtl = duration;
				obstacles = [];
				bgProps.push({
					kind: "tv",
					x: W * 0.62,
					y: groundY - 70 * scale,
					vx: 0,
					ttl: duration,
				});
				break;
			case "reels":
				reelsTtl = effect.duration;
				letterboxTtl = Math.max(letterboxTtl, effect.duration);
				speedBoost = 50;
				speedBoostTtl = effect.duration;
				break;
		}
	}

	function tryFireEvent() {
		const stage = stageFor(scoreFrames);
		let eligible =
			Math.random() < GAME_CONFIG.memeEventChance
				? MEME_EVENTS_2026.filter(
						(e) =>
							e.id !== lastEventId &&
							scoreFrames >= (e.minScore ?? 0) &&
							scoreFrames >= GAME_CONFIG.eventMinScore,
					)
				: eventsForStage(stage, scoreFrames, lastEventId);

		if (!eligible.length) eligible = eventsForStage(stage, scoreFrames, lastEventId);
		if (!eligible.length) return;

		const ev = pickWeighted(eligible);
		lastEventId = ev.id;
		showToast(ev.message, ev.duration);
		applyEventEffect(ev.effect, ev.duration);
		sfx("event");
		eventCooldown =
			GAME_CONFIG.eventCooldownMin +
			Math.random() * (GAME_CONFIG.eventCooldownMax - GAME_CONFIG.eventCooldownMin);

		if (ev.effect.type === "argentina") {
			window.setTimeout(() => {
				if (state === "running" && open) showToast("BUENO, SEGUIMOS", 2);
			}, ev.duration * 1000);
		}
	}

	function updateHud() {
		if (hideRecTtl > 0) {
			hudRec.textContent = "REC ○ —:—:—:—";
			hudRec.style.opacity = "0.35";
		} else {
			hudRec.textContent = `REC ● ${toTimecode(scoreFrames)}`;
			hudRec.style.opacity = "1";
		}
		hudBest.textContent = `MEJOR MARCA ${toTimecode(best)}`;
		hudStage.textContent = stageFor(scoreFrames).label;
		if (toast && toast.ttl > 0) {
			toastEl.hidden = false;
			toastEl.textContent = toast.text;
		} else {
			toastEl.hidden = true;
		}
	}

	function tickTimers(dt: number) {
		const decay = (v: number) => Math.max(0, v - dt);
		speedBoostTtl = decay(speedBoostTtl);
		if (speedBoostTtl <= 0) speedBoost = 0;
		easeTtl = decay(easeTtl);
		if (easeTtl <= 0) easeFactor = 1;
		multiplierTtl = decay(multiplierTtl);
		if (multiplierTtl <= 0) multiplier = 1;
		invulnTtl = decay(invulnTtl);
		hideRecTtl = decay(hideRecTtl);
		darkenTtl = decay(darkenTtl);
		renderBarTtl = decay(renderBarTtl);
		letterboxTtl = decay(letterboxTtl);
		slowMoTtl = decay(slowMoTtl);
		auraTtl = decay(auraTtl);
		argentinaTtl = decay(argentinaTtl);
		reelsTtl = decay(reelsTtl);
		if (toast) {
			toast.ttl -= dt;
			if (toast.ttl <= 0) toast = null;
		}
	}

	function checkStageAndGear() {
		const stage = stageFor(scoreFrames);
		if (stage.id !== lastStageId) {
			lastStageId = stage.id;
			if (stage.enterToast) showToast(stage.enterToast, 2.2);
			sfx("event");
		}
		const level = dinoLevelFor(scoreFrames);
		if (!unlockedLevels.has(level.id)) {
			unlockedLevels.add(level.id);
			if (level.unlockToast) {
				showToast(level.unlockToast, 2.4);
				if (level.id === "director" || level.id === "glasses") auraTtl = Math.max(auraTtl, 1.4);
				sfx("pickup");
			}
		}
	}

	function update(dt: number) {
		if (state !== "running") return;

		if (freezeTtl > 0) {
			freezeTtl -= dt;
			updateHud();
			return;
		}

		const timeScale = slowMoTtl > 0 ? 0.45 : 1;
		const adt = dt * timeScale;

		tickTimers(adt);

		const base =
			GAME_CONFIG.baseSpeed +
			scoreFrames * (GAME_CONFIG.speedRamp / GAME_CONFIG.framesPerSecond);
		speed = Math.min(GAME_CONFIG.maxSpeed, (base + speedBoost) * easeFactor);

		scoreFrames += adt * GAME_CONFIG.framesPerSecond * multiplier;
		groundOffset = (groundOffset + speed * adt) % (24 * scale);

		checkStageAndGear();

		const g = wantDuck && !onGround ? GAME_CONFIG.duckGravity : GAME_CONFIG.gravity;
		pvy += g * adt;
		py += pvy * adt;
		if (py >= groundY) {
			py = groundY;
			pvy = 0;
			onGround = true;
			ducking = wantDuck;
		} else {
			onGround = false;
		}

		runAcc += adt;
		if (runAcc > 0.08) {
			runAcc = 0;
			runFrame = (runFrame + 1) % 2;
		}

		if (argentinaTtl <= 0) {
			spawnTimer -= adt * 1000;
			if (spawnTimer <= 0) {
				if (scoreFrames > GAME_CONFIG.pickupMinScore && Math.random() < GAME_CONFIG.pickupChance) {
					spawnPickup();
				} else {
					spawnObstacle();
				}
				const t = Math.max(
					GAME_CONFIG.spawnMinFloor,
					GAME_CONFIG.spawnMaxMs - scoreFrames * 0.35,
				);
				const min = Math.max(
					GAME_CONFIG.spawnMinFloor * 0.85,
					GAME_CONFIG.spawnMinMs - scoreFrames * 0.12,
				);
				spawnTimer = (min + Math.random() * Math.max(80, t - min)) / Math.max(0.5, easeFactor);
				if (scoreFrames > 500 && Math.random() < 0.1) spawnTimer = Math.min(spawnTimer, 400);
			}
		}

		for (const o of obstacles) o.x -= speed * adt;
		obstacles = obstacles.filter((o) => o.x + o.w > -50);

		for (const p of pickups) p.x -= speed * adt;
		pickups = pickups.filter((p) => p.x + p.w > -40);

		for (const b of bgProps) {
			b.x += b.vx * adt;
			b.ttl -= adt;
		}
		bgProps = bgProps.filter((b) => b.ttl > 0 && b.x > -120);

		for (const p of particles) {
			p.x += p.vx * adt;
			p.y += p.vy * adt;
			p.ttl -= adt;
		}
		particles = particles.filter((p) => p.ttl > 0);

		const box = playerBox();

		for (let i = obstacles.length - 1; i >= 0; i--) {
			const o = obstacles[i]!;
			const top = o.y - o.h;
			if (!hitTest(box, o.x, top, o.w, o.h)) continue;
			if (deleteNext) {
				obstacles.splice(i, 1);
				deleteNext = false;
				showToast("SACADO EN POST", 1.4);
				sfx("event");
				continue;
			}
			gameOver();
			if (state !== "running") break;
		}

		for (let i = pickups.length - 1; i >= 0; i--) {
			const p = pickups[i]!;
			if (hitTest(box, p.x, p.y - p.h, p.w, p.h)) {
				applyPickup(p.def);
				pickups.splice(i, 1);
			}
		}

		eventCooldown -= adt;
		if (eventCooldown <= 0 && argentinaTtl <= 0) tryFireEvent();

		updateHud();
	}

	// ─── Drawing helpers ────────────────────────────────────────────────────
	function pxRect(x: number, y: number, w: number, h: number, color: string) {
		ctx.fillStyle = color;
		ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
	}

	const INK = SPRITE_PALETTE.primary;
	const DIM = SPRITE_PALETTE.dim;

	function clear() {
		const stage = stageFor(scoreFrames);
		ctx.fillStyle = stage.bg;
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = stage.tint;
		ctx.globalAlpha = darkenTtl > 0 ? Math.min(0.3, stage.tintAlpha) : stage.tintAlpha;
		ctx.fillRect(0, 0, W, H);
		ctx.globalAlpha = 1;

		if (darkenTtl > 0) {
			ctx.fillStyle = "rgba(0,0,0,0.45)";
			ctx.fillRect(0, 0, W, H);
		}

		if (!reduceMotion && stage.grain > 0) {
			ctx.globalAlpha = stage.grain;
			for (let i = 0; i < 30; i++) {
				ctx.fillStyle = "#fff";
				ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
			}
			ctx.globalAlpha = 1;
		}

		ctx.fillStyle = "rgba(255,255,255,0.04)";
		ctx.fillRect(0, groundY - 120 * scale, W, 120 * scale);
		ctx.fillStyle = stage.ground;
		ctx.fillRect(0, groundY, W, H - groundY);
		ctx.fillStyle = stage.groundLine;
		ctx.fillRect(0, groundY, W, 2);
		ctx.fillStyle = "rgba(255,255,255,0.12)";
		const dash = 24 * scale;
		for (let x = -groundOffset; x < W; x += dash) {
			ctx.fillRect(x, groundY + 10 * scale, 12 * scale, 2);
		}
		drawDecor(stage);
	}

	function drawDecor(stage: StageDef) {
		const name = DECOR_SPRITE[stage.decor];
		const spr = name ? getSprite(name) : null;
		if (!spr) return;
		const p = Math.max(1, scale * 1.05);
		const ox = W * 0.62;
		const oy = 36 * scale;
		ctx.globalAlpha = 0.4;
		drawPixelSprite(ctx, spr, ox, oy, p, DECOR_MODE[stage.decor] ?? "production");
		ctx.globalAlpha = 1;
	}

	function drawObstacle(o: Obstacle) {
		const name = OBSTACLE_SPRITE[o.def.id];
		const spr = name ? getSprite(name) : null;
		const top = o.y - o.h;
		if (!spr) {
			pxRect(o.x, top, o.w, o.h, SPRITE_PALETTE.primary);
			return;
		}
		const pixel = o.h / spr.h;
		drawPixelSprite(ctx, spr, o.x, top, pixel, obstacleDrawMode(o.def.id));
	}

	function drawPickup(p: Pickup) {
		const name = PICKUP_SPRITE[p.def.id];
		const spr = name ? getSprite(name) : null;
		const bob = Math.sin(performance.now() / 200 + p.x) * 2 * scale;
		const top = p.y - p.h + bob;
		ctx.globalAlpha = 0.22;
		pxRect(p.x - 2 * scale, top - 2 * scale, p.w + 4 * scale, p.h + 4 * scale, SPRITE_PALETTE.warm);
		ctx.globalAlpha = 1;
		if (!spr) {
			pxRect(p.x, top, p.w, p.h, SPRITE_PALETTE.primary);
			return;
		}
		const pixel = p.h / spr.h;
		drawPixelSprite(ctx, spr, p.x, top, pixel, "production");
	}

	function drawBgProp(b: BgProp) {
		const s = scale;
		ctx.globalAlpha = 0.45;
		if (b.kind === "moto") {
			pxRect(b.x, b.y, 36 * s, 12 * s, INK);
			pxRect(b.x + 4 * s, b.y + 10 * s, 8 * s, 8 * s, DIM);
			pxRect(b.x + 24 * s, b.y + 10 * s, 8 * s, 8 * s, DIM);
		} else if (b.kind === "bondi") {
			pxRect(b.x, b.y, 70 * s, 36 * s, "#c9a227");
			pxRect(b.x + 6 * s, b.y + 6 * s, 14 * s, 10 * s, "#224");
			pxRect(b.x + 28 * s, b.y + 6 * s, 14 * s, 10 * s, "#224");
			pxRect(b.x + 50 * s, b.y + 6 * s, 14 * s, 10 * s, "#224");
		} else if (b.kind === "vecino") {
			pxRect(b.x + 4 * s, b.y, 10 * s, 10 * s, INK);
			pxRect(b.x + 2 * s, b.y + 10 * s, 14 * s, 20 * s, DIM);
			pxRect(b.x + 2 * s, b.y + 30 * s, 5 * s, 12 * s, INK);
			pxRect(b.x + 11 * s, b.y + 30 * s, 5 * s, 12 * s, INK);
		} else if (b.kind === "tv") {
			pxRect(b.x, b.y, 40 * s, 28 * s, INK);
			pxRect(b.x + 3 * s, b.y + 3 * s, 34 * s, 18 * s, "#163");
			pxRect(b.x + 16 * s, b.y + 22 * s, 8 * s, 6 * s, DIM);
		}
		ctx.globalAlpha = 1;
	}

	function drawDino() {
		const box = playerBox();
		const p = Math.max(1, scale);
		const name = dinoSpriteName({
			ducking: ducking && onGround,
			onGround,
			runFrame,
		});
		const spr = getSprite(name);
		const flash = invulnTtl > 0 && Math.floor(performance.now() / 80) % 2 === 0;

		// Duck sprite is still 32×32 — align bottom to feet / ground box
		const drawY =
			ducking && onGround ? box.y + box.h - SPRITE_SIZE * p : box.y;
		const drawX = box.x;

		if (spr) {
			if (flash) ctx.globalAlpha = 0.65;
			drawPixelSprite(ctx, spr, drawX, drawY, p, "dino");
			ctx.globalAlpha = 1;

			if (!(ducking && onGround)) {
				const level = dinoLevelFor(scoreFrames);
				const gearList = auraTtl > 0 ? [...level.gear, "glasses" as const] : level.gear;
				for (const g of gearList) {
					if (g === "camera" || g === "clapper") continue;
					const gName = GEAR_SPRITE[g];
					const gSpr = gName ? getSprite(gName) : null;
					if (!gSpr) continue;
					drawPixelSprite(ctx, gSpr, drawX, drawY, p, "production");
				}
			}
		} else {
			pxRect(box.x, box.y, box.w, box.h, SPRITE_PALETTE.primary);
		}

		if (hasShield) {
			const shield = getSprite("ui-shield-gaffer.png");
			if (shield) {
				drawPixelSprite(
					ctx,
					shield,
					drawX + box.w * 0.45,
					drawY - 6 * p,
					p * 0.75,
					"production",
				);
			}
			ctx.strokeStyle = SPRITE_PALETTE.accent;
			ctx.globalAlpha = 0.65;
			ctx.lineWidth = 2;
			ctx.strokeRect(box.x - 3, box.y - 3, box.w + 6, box.h + 6);
			ctx.globalAlpha = 1;
		}
	}

	function drawOverlays() {
		if ((letterboxTtl > 0 || reelsTtl > 0) && !reduceMotion) {
			if (reelsTtl > 0) {
				// Vertical crop: side bars (reels frame)
				const side = W * 0.18;
				ctx.fillStyle = "#000";
				ctx.fillRect(0, 0, side, H);
				ctx.fillRect(W - side, 0, side, H);
				ctx.strokeStyle = "rgba(255,255,255,0.2)";
				ctx.lineWidth = 2;
				ctx.strokeRect(side, H * 0.08, W - side * 2, H * 0.84);
			} else {
				const bar = H * 0.12;
				ctx.fillStyle = "#000";
				ctx.fillRect(0, 0, W, bar);
				ctx.fillRect(0, H - bar, W, bar);
			}
		}
		if (renderBarTtl > 0) {
			const bw = Math.min(220, W * 0.4);
			const bx = W * 0.5 - bw / 2;
			const by = H * 0.22;
			ctx.fillStyle = "rgba(0,0,0,0.45)";
			ctx.fillRect(bx - 8, by - 18, bw + 16, 28);
			ctx.fillStyle = INK;
			ctx.font = `700 ${10 * scale}px Montserrat, Arial, sans-serif`;
			ctx.fillText("RENDER 99%", bx, by - 4);
			ctx.fillStyle = "#333";
			ctx.fillRect(bx, by, bw, 6);
			ctx.fillStyle = "#2c8";
			ctx.fillRect(bx, by, bw * 0.99, 6);
		}
		for (const p of particles) {
			ctx.globalAlpha = Math.min(1, p.ttl);
			pxRect(p.x, p.y, 3 * scale, 3 * scale, "#ffe08a");
			ctx.globalAlpha = 1;
		}
		// HUD chips: shield / x2
		ctx.font = `700 ${10 * scale}px Montserrat, Arial, sans-serif`;
		let chipX = W - 12 - (isTouch || W < 720 ? 56 : 12);
		if (hasShield) {
			ctx.fillStyle = "rgba(0,0,0,0.35)";
			ctx.fillRect(chipX - 70, 48 * scale, 66, 16);
			ctx.fillStyle = "#c9a227";
			ctx.fillText("GAFFER", chipX - 64, 60 * scale);
			chipX -= 74;
		}
		if (multiplier > 1) {
			ctx.fillStyle = "rgba(0,0,0,0.35)";
			ctx.fillRect(chipX - 40, 48 * scale, 36, 16);
			ctx.fillStyle = "#ffe08a";
			ctx.fillText(`x${multiplier}`, chipX - 34, 60 * scale);
		}
	}

	function drawScanlines() {
		if (reduceMotion) return;
		ctx.fillStyle = "rgba(0,0,0,0.05)";
		for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
	}

	function render() {
		clear();
		for (const b of bgProps) drawBgProp(b);
		for (const o of obstacles) drawObstacle(o);
		for (const p of pickups) drawPickup(p);
		if (state !== "idle") drawDino();
		else {
			ctx.globalAlpha = 0.35;
			drawDino();
			ctx.globalAlpha = 1;
		}
		drawOverlays();
		drawScanlines();
		if (freezeTtl > 0) {
			ctx.fillStyle = "rgba(0,0,0,0.15)";
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = INK;
			ctx.font = `700 ${12 * scale}px Montserrat, Arial, sans-serif`;
			ctx.fillText("PREMIERE NO RESPONDE…", W * 0.28, H * 0.4);
		}
	}

	function loop(ts: number) {
		if (!open) return;
		raf = requestAnimationFrame(loop);
		if (document.visibilityState !== "visible") {
			lastTs = ts;
			return;
		}
		const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
		lastTs = ts;
		update(dt);
		render();
	}

	function lockScroll() {
		scrollLockY = window.scrollY;
		document.documentElement.style.overflow = "hidden";
		document.body.style.overflow = "hidden";
		document.body.style.touchAction = "none";
	}

	function unlockScroll() {
		document.documentElement.style.overflow = "";
		document.body.style.overflow = "";
		document.body.style.touchAction = "";
		window.scrollTo(0, scrollLockY);
	}

	function syncDuckButton() {
		const narrow = W > 0 ? W < 720 : window.matchMedia("(max-width: 720px)").matches;
		btnDuck.hidden = !(isTouch || narrow);
	}

	function openGame() {
		if (open) return;
		open = true;
		prevFocus = document.activeElement as HTMLElement | null;
		root.hidden = false;
		root.setAttribute("aria-hidden", "false");
		root.classList.add("is-open");
		if (reduceMotion) root.classList.add("is-reduced");
		lockScroll();
		resize();
		resetRun();
		best = loadBest();
		updateHud();
		lastTs = performance.now();
		raf = requestAnimationFrame(loop);
		queueMicrotask(() => btnClose.focus());
		btnMute.setAttribute("aria-pressed", muted ? "true" : "false");
		btnMute.textContent = muted ? "♪" : "♫";
		syncDuckButton();
	}

	function closeGame() {
		if (!open) return;
		open = false;
		cancelAnimationFrame(raf);
		raf = 0;
		state = "idle";
		obstacles = [];
		pickups = [];
		bgProps = [];
		particles = [];
		clearPowers();
		root.classList.remove("is-open");
		root.setAttribute("aria-hidden", "true");
		root.hidden = true;
		unlockScroll();
		startScreen.hidden = false;
		overScreen.hidden = true;
		toastEl.hidden = true;
		prevFocus?.focus?.();
	}

	function destroy() {
		closeGame();
		for (const off of listeners) off();
		listeners.length = 0;
		if (audioCtx) {
			void audioCtx.close();
			audioCtx = null;
		}
	}

	on(window, "resize", () => {
		if (open) resize();
	});
	on(document, "visibilitychange", () => {
		if (document.visibilityState === "visible") lastTs = performance.now();
	});
	on(window, "keydown", (e) => {
		if (!open) return;
		if (e.code === "Escape") {
			e.preventDefault();
			closeGame();
			return;
		}
		if (e.code === "Space" || e.code === "ArrowUp") {
			e.preventDefault();
			jump();
		}
		if (e.code === "ArrowDown") {
			e.preventDefault();
			setDuck(true);
		}
	});
	on(window, "keyup", (e) => {
		if (!open) return;
		if (e.code === "ArrowDown") setDuck(false);
	});
	on(canvas, "pointerdown", (e) => {
		if (!open) return;
		if (e.pointerType === "touch") touchStartY = e.clientY;
		jump();
	});
	on(canvas, "pointerup", (e) => {
		if (!open) return;
		if (e.pointerType === "touch") {
			const dy = e.clientY - touchStartY;
			if (dy > 40) setDuck(true);
			else setDuck(false);
		}
	});

	const onClose = () => closeGame();
	const onRetry = () => startRun();
	const onMute = () => {
		muted = !muted;
		btnMute.setAttribute("aria-pressed", muted ? "true" : "false");
		btnMute.textContent = muted ? "♪" : "♫";
		btnMute.setAttribute("aria-label", muted ? "Activar sonido" : "Silenciar");
		if (!muted) beep(660, 0.05, "square", 0.04);
	};
	const duckDown = (e: Event) => {
		e.preventDefault();
		e.stopPropagation();
		setDuck(true);
	};
	const duckUp = (e: Event) => {
		e.preventDefault();
		e.stopPropagation();
		setDuck(false);
	};

	btnClose.addEventListener("click", onClose);
	btnBack.addEventListener("click", onClose);
	btnRetry.addEventListener("click", onRetry);
	btnMute.addEventListener("click", onMute);
	btnDuck.addEventListener("pointerdown", duckDown);
	btnDuck.addEventListener("pointerup", duckUp);
	btnDuck.addEventListener("pointerleave", duckUp);
	btnDuck.addEventListener("pointercancel", duckUp);
	listeners.push(() => {
		btnClose.removeEventListener("click", onClose);
		btnBack.removeEventListener("click", onClose);
		btnRetry.removeEventListener("click", onRetry);
		btnMute.removeEventListener("click", onMute);
		btnDuck.removeEventListener("pointerdown", duckDown);
		btnDuck.removeEventListener("pointerup", duckUp);
		btnDuck.removeEventListener("pointerleave", duckUp);
		btnDuck.removeEventListener("pointercancel", duckUp);
	});

	return { open: openGame, close: closeGame, destroy, isOpen: () => open };
}

export function bindDinoTriggers(
	api: DinoGameApi,
	logoEls: HTMLElement[],
	opts?: Partial<typeof GAME_CONFIG>,
) {
	const clicksNeeded = opts?.logoClicks ?? GAME_CONFIG.logoClicks;
	const windowMs = opts?.logoClickWindowMs ?? GAME_CONFIG.logoClickWindowMs;
	const word = (opts?.konamiWord ?? GAME_CONFIG.konamiWord).toLowerCase();
	let stamps: number[] = [];
	let buffer = "";

	const onLogoClick = (e: Event) => {
		e.preventDefault();
		e.stopPropagation();
		const now = Date.now();
		stamps = stamps.filter((t) => now - t < windowMs);
		stamps.push(now);
		if (stamps.length >= clicksNeeded) {
			stamps = [];
			api.open();
		}
	};

	const onKey = (e: KeyboardEvent) => {
		if (api.isOpen()) return;
		const target = e.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
		) {
			return;
		}
		if (e.key.length !== 1) return;
		buffer = (buffer + e.key.toLowerCase()).slice(-word.length);
		if (buffer === word) {
			buffer = "";
			api.open();
		}
	};

	for (const el of logoEls) el.addEventListener("click", onLogoClick);
	window.addEventListener("keydown", onKey);

	return () => {
		for (const el of logoEls) el.removeEventListener("click", onLogoClick);
		window.removeEventListener("keydown", onKey);
	};
}
