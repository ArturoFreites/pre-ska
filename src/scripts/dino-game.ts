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
	FILTER_CYCLE,
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
	drawGameSprite,
	drawGameSpriteRect,
	resolveSpriteDrawRect,
	dinoCanvasRect,
	dinoSpriteRect,
	gearLayoutRect,
	MAX_VISIBLE_GEAR,
	getSpriteLogicalSize,
	loadPngSprites,
	dinoSpriteName,
	OBSTACLE_SPRITE,
	PICKUP_SPRITE,
	DECOR_SPRITE,
	DECOR_MODE,
	BG_SPRITE,
	GEAR_SPRITE,
	SPRITE_PALETTE,
	DINO_LAYOUT_H,
	DINO_DISPLAY_SCALE,
	WORLD_DISPLAY_SCALE,
	AIR_LIFT,
	getSpriteBounds,
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

	/** Duración del squash de aterrizaje, en segundos */
	const LAND_SQUASH_TIME = 0.14;

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
	/** 0..1 phase of the run cycle — drives frame, bob and footfall dust */
	let runPhase = 0;
	let landSquashTtl = 0;

	let speed = GAME_CONFIG.baseSpeed;
	let obstacles: Obstacle[] = [];
	let pickups: Pickup[] = [];
	let bgProps: BgProp[] = [];
	let spawnTimer = 0;
	let scoreFrames = 0;
	let best = loadBest();
	let groundOffset = 0;
	/** Unbounded scroll accumulators — wrapped per-layer at draw time */
	let scrollNear = 0;
	let scrollFar = 0;
	let grainPoints: Array<{ x: number; y: number }> = [];
	let scanlinePattern: CanvasPattern | null = null;
	let toast: Toast | null = null;
	let toastHideTimer = 0;
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
	let filterTtl = 0;
	let filterEvery = 2;
	let filterSwapIn = 0;
	let filterIndex = -1;
	let deleteNext = false;
	let eventCooldown = 8;
	let lastEventId = "";
	let unlockedLevels = new Set<string>(["base"]);
	let lastStageId = STAGES[0]!.id;
	let particles: Array<{
		x: number;
		y: number;
		vx: number;
		vy: number;
		ttl: number;
		size?: number;
		color?: string;
	}> = [];

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

	function sfx(kind: "jump" | "start" | "cut" | "pickup" | "event" | "land") {
		const p = sfxProfile();
		if (kind === "start") {
			beep(p.start[0]!, 0.05, p.wave, 0.05);
			beep(p.start[1]!, 0.08, p.wave, 0.04);
			return;
		}
		if (kind === "land") {
			beep(p.jump * 0.45, 0.04, p.wave, 0.022);
			return;
		}
		const freq = p[kind];
		const dur = kind === "cut" ? 0.18 : 0.05;
		beep(freq, dur, p.wave, kind === "cut" ? 0.06 : 0.04);
	}

	/**
	 * Toasts are driven by events instead of by the render loop: writing
	 * textContent every frame would restart nothing and stomp the CSS
	 * enter/exit animations.
	 */
	function showToast(text: string, ttl = 2.3) {
		toast = { text, ttl };
		window.clearTimeout(toastHideTimer);
		toastEl.textContent = text;
		toastEl.hidden = false;
		toastEl.classList.remove("is-out", "is-in");
		void toastEl.offsetWidth;
		toastEl.classList.add("is-in");
	}

	function hideToast(immediate = false) {
		toast = null;
		window.clearTimeout(toastHideTimer);
		if (toastEl.hidden) return;
		if (immediate || reduceMotion) {
			toastEl.hidden = true;
			toastEl.classList.remove("is-in", "is-out");
			return;
		}
		toastEl.classList.remove("is-in");
		toastEl.classList.add("is-out");
		toastHideTimer = window.setTimeout(() => {
			toastEl.hidden = true;
			toastEl.classList.remove("is-out");
		}, 240);
	}

	/**
	 * Physics multiplier. Gravity, jump impulse and run speed are authored in
	 * absolute pixels, so without this the jump arc stayed the same height while
	 * sprites grew with the viewport — on a 1080p screen the dino could barely
	 * clear its own obstacles. Scaling all of them together keeps the airtime
	 * identical and the arc proportional to the character.
	 */
	function physK() {
		return 0.94 * scale;
	}

	function standHeight() {
		return DINO_LAYOUT_H * scale * DINO_DISPLAY_SCALE;
	}

	/** Caja lógica del personaje de pie — de ella sale el canvas compartido */
	function standBox() {
		const h = standHeight();
		return { x: px, y: py - h, w: h * 0.92, h };
	}

	function currentDinoSprite() {
		return dinoSpriteName({ ducking: ducking && onGround, onGround, runFrame });
	}

	/** Canvas de referencia del frame actual, compartido con sus accesorios */
	function dinoCanvas(bob = 0) {
		const b = standBox();
		return dinoCanvasRect(b.x, b.y + bob, b.w, b.h);
	}

	/** Caja visual real del frame actual: el agachado baja sin encogerse */
	function playerBox() {
		const stand = standBox();
		const canvas = dinoCanvas();
		const rect = canvas ? dinoSpriteRect(currentDinoSprite(), canvas) : null;
		if (rect) return rect;
		if (ducking && onGround) {
			const duckH = stand.h * 0.52;
			return { x: stand.x, y: stand.y + stand.h - duckH, w: stand.w * 1.12, h: duckH };
		}
		return stand;
	}

	function shrinkRect(
		x: number,
		y: number,
		w: number,
		h: number,
		insetX: number,
		insetTop: number,
		insetBottom = insetTop,
	) {
		const sx = w * insetX;
		const st = h * insetTop;
		const sb = h * insetBottom;
		return {
			x: x + sx,
			y: y + st,
			w: Math.max(2, w - sx * 2),
			h: Math.max(2, h - st - sb),
		};
	}

	function expandRect(x: number, y: number, w: number, h: number, grow: number) {
		const pad = w * grow;
		const padY = h * grow;
		return {
			x: x - pad,
			y: y - padY,
			w: w + pad * 2,
			h: h + padY * 2,
		};
	}

	function playerHitBox() {
		const visual = playerBox();
		const c = GAME_CONFIG.collision;
		const insetTop = onGround ? c.playerInsetTop : c.playerInsetTopAir;
		return shrinkRect(
			visual.x,
			visual.y,
			visual.w,
			visual.h,
			c.playerInsetX,
			insetTop,
			c.playerInsetBottom,
		);
	}

	function obstacleHitBox(o: Obstacle) {
		const top = o.y - o.h;
		const c = GAME_CONFIG.collision;
		const insetY = o.air ? c.airObstacleInsetY : c.obstacleInsetY;
		return shrinkRect(o.x, top, o.w, o.h, c.obstacleInsetX, insetY, insetY);
	}

	function rectsOverlap(
		a: { x: number; y: number; w: number; h: number },
		b: { x: number; y: number; w: number; h: number },
	) {
		return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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
		// Scale from both axes so the play field keeps the same proportions on
		// wide-and-short and tall-and-narrow viewports alike.
		scale = Math.max(1.05, Math.min(2.35, Math.min(W / 900, H / 560)));
		if (isTouch || W < 720) scale = Math.max(scale, 1.2);
		groundY = H * 0.8;
		px = Math.min(150 * scale, W * 0.12);
		if (onGround) py = groundY;
		buildGrain();
		buildScanlines();
		if (open) syncDuckButton();
	}

	/** Static noise field — animated by drift instead of re-randomising each frame */
	function buildGrain() {
		const count = reduceMotion ? 0 : 90;
		grainPoints = Array.from({ length: count }, () => ({
			x: Math.random() * W,
			y: Math.random() * H,
		}));
	}

	function buildScanlines() {
		if (reduceMotion) {
			scanlinePattern = null;
			return;
		}
		const tile = document.createElement("canvas");
		tile.width = 1;
		tile.height = 4;
		const tctx = tile.getContext("2d");
		if (!tctx) return;
		tctx.fillStyle = "rgba(0,0,0,0.06)";
		tctx.fillRect(0, 0, 1, 1);
		scanlinePattern = ctx.createPattern(tile, "repeat");
	}

	/**
	 * El filtro va como CSS sobre el <canvas>, no como `ctx.filter`: así lo
	 * compone la GPU una vez por frame en lugar de re-filtrar cada `drawImage`,
	 * y el HUD y las frases quedan fuera del efecto (siguen legibles).
	 * Sólo se toca el DOM cuando el filtro cambia.
	 */
	let appliedFilter = "";
	function syncCanvasFilter() {
		const next = filterIndex >= 0 ? (FILTER_CYCLE[filterIndex]?.css ?? "") : "";
		if (next === appliedFilter) return;
		appliedFilter = next;
		canvas.style.filter = next;
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
		filterTtl = 0;
		filterIndex = -1;
		filterSwapIn = 0;
		syncCanvasFilter();
		deleteNext = false;
		particles = [];
		bgProps = [];
		pickups = [];
	}

	function resetRun() {
		state = "idle";
		obstacles = [];
		speed = GAME_CONFIG.baseSpeed * physK();
		spawnTimer = 800;
		scoreFrames = 0;
		pvy = 0;
		ducking = false;
		wantDuck = false;
		onGround = true;
		py = groundY;
		groundOffset = 0;
		scrollNear = 0;
		scrollFar = 0;
		hideToast(true);
		runFrame = 0;
		runPhase = 0;
		landSquashTtl = 0;
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
		// The CORTE card owns the screen: a lingering phrase would compete with it
		hideToast(true);
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
			pvy = -GAME_CONFIG.jumpVelocity * physK();
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
		const argPool = poolObstacles("arg");
		if (airOk && Math.random() < airChance) {
			return pickWeighted(poolObstacles("air"));
		}
		if (argPool.length > 0 && Math.random() < stage.argBias) {
			return pickWeighted(argPool);
		}
		return pickWeighted(poolObstacles("av"));
	}

	function spawnObstacle(forced?: ObstacleDef) {
		if (argentinaTtl > 0) return;
		const def = forced ?? pickObstacleDef();
		const spriteName = OBSTACLE_SPRITE[def.id];
		const logical = spriteName
			? getSpriteLogicalSize(spriteName, { w: def.w, h: def.h })
			: { w: def.w, h: def.h };
		let bw = logical.w;
		let bh = logical.h;
		const varScale = 0.9 + Math.random() * 0.22;
		bw *= varScale;
		bh *= varScale;
		if (isTouch || W < 720) {
			bw *= 1.1;
			bh *= 1.1;
		}
		let w = bw * scale * WORLD_DISPLAY_SCALE;
		let h = bh * scale * WORLD_DISPLAY_SCALE;
		const air = def.lane === "air";
		const standH = standHeight();

		// Ground obstacles taller than the dino are unfair to clear — cap them
		// and keep the aspect ratio intact.
		if (!air && h > standH * 0.9) {
			const f = (standH * 0.9) / h;
			h *= f;
			w *= f;
		}

		// AIR_LIFT is a fraction of the dino's standing height: the obstacle's
		// bottom edge lands between duck-height and stand-height so ducking works.
		const lift = AIR_LIFT[def.id] ?? 0.74;
		const y = air ? groundY - standH * lift : groundY;
		obstacles.push({ def, x: W + 24, y, w, h, air });
	}

	function spawnPickup() {
		const def = pickWeighted(PICKUP_TYPES);
		const spriteName = PICKUP_SPRITE[def.id] ?? "";
		const logical = spriteName
			? getSpriteLogicalSize(spriteName, { w: def.w, h: def.h })
			: { w: def.w, h: def.h };
		const bw = logical.w;
		const bh = logical.h;
		const w = bw * scale * WORLD_DISPLAY_SCALE * (isTouch ? 1.08 : 1);
		const h = bh * scale * WORLD_DISPLAY_SCALE * (isTouch ? 1.08 : 1);
		// Keep pickups inside the reachable band (ground → jump apex)
		const float = standHeight() * (0.35 + Math.random() * 0.8);
		pickups.push({ def, x: W + 20, y: groundY - float, w, h });
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
			case "slowmo":
				slowMoTtl = Math.max(slowMoTtl, e.duration);
				break;
			case "filters":
				filterTtl = e.duration;
				filterEvery = e.every;
				filterSwapIn = 0;
				filterIndex = -1;
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
				const fallback = OBSTACLE_TYPES.find((o) => o.id === "flight") ?? OBSTACLE_TYPES[0];
				if (fallback) {
					for (let i = 0; i < 3; i++) {
						window.setTimeout(() => {
							if (state === "running" && open) spawnObstacle(fallback);
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
		landSquashTtl = decay(landSquashTtl);

		if (filterTtl > 0) {
			filterTtl = decay(filterTtl);
			filterSwapIn -= dt;
			if (filterSwapIn <= 0) {
				// No toast per swap: it would stomp the gameplay phrases every
				// couple of seconds. The HUD chip already names the filter.
				filterIndex = (filterIndex + 1) % FILTER_CYCLE.length;
				filterSwapIn = filterEvery;
			}
			if (filterTtl <= 0) filterIndex = -1;
			syncCanvasFilter();
		}
		if (toast) {
			toast.ttl -= dt;
			if (toast.ttl <= 0) hideToast();
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

	/** Puffs of dirt kicked up at the dino's heels. */
	function spawnDust(count: number, power: number) {
		if (reduceMotion) return;
		const heelX = px + standHeight() * 0.92 * 0.4;
		for (let i = 0; i < count; i++) {
			particles.push({
				x: heelX + (Math.random() * 12 - 6) * scale,
				y: groundY - Math.random() * 4 * scale,
				vx: -(40 + Math.random() * 90) * power,
				vy: -(10 + Math.random() * 55) * power,
				ttl: 0.25 + Math.random() * 0.3,
				size: (1.5 + Math.random() * 2) * scale,
				color: "rgba(255,255,255,0.5)",
			});
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

		const k = physK();
		const base =
			GAME_CONFIG.baseSpeed +
			scoreFrames * (GAME_CONFIG.speedRamp / GAME_CONFIG.framesPerSecond);
		speed = Math.min(GAME_CONFIG.maxSpeed * k, (base + speedBoost) * k * easeFactor);

		scoreFrames += adt * GAME_CONFIG.framesPerSecond * multiplier;
		groundOffset = (groundOffset + speed * adt) % (24 * scale);
		scrollNear += speed * adt;
		scrollFar += speed * adt * 0.12;

		checkStageAndGear();

		const wasAirborne = !onGround;
		const g = (wantDuck && !onGround ? GAME_CONFIG.duckGravity : GAME_CONFIG.gravity) * k;
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

		if (wasAirborne && onGround) {
			// Landing is a footfall: restart the cycle on a contact pose
			runPhase = 0;
			runFrame = 0;
			landSquashTtl = LAND_SQUASH_TIME;
			spawnDust(7, 1);
			sfx("land");
		}

		if (onGround) {
			// One `runPhase` cycle = two steps. Cadence comes from the stride
			// length (about half the body width) so the feet travel the same
			// distance as the floor and stop sliding.
			const stride = Math.max(1, standHeight() * 0.46);
			const stepsPerSecond = Math.min(16, Math.max(5, speed / stride));
			const prevPhase = runPhase;
			runPhase = (runPhase + adt * stepsPerSecond * 0.5) % 1;
			// Single source of truth: the frame flip and the bob can't drift apart
			runFrame = runPhase < 0.5 ? 0 : 1;
			const footfall = runPhase < prevPhase || (prevPhase < 0.5 && runPhase >= 0.5);
			if (footfall) spawnDust(2, 0.5);
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
				// Hard floor: never spawn closer than one jump arc apart
				const min = Math.max(
					GAME_CONFIG.spawnMinFloor,
					GAME_CONFIG.spawnMinMs - scoreFrames * 0.12,
				);
				spawnTimer = (min + Math.random() * Math.max(80, t - min)) / Math.max(0.5, easeFactor);
				if (scoreFrames > 500 && Math.random() < 0.1) {
					spawnTimer = Math.min(spawnTimer, GAME_CONFIG.spawnMinFloor);
				}
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
			p.vy += 190 * adt;
			p.x += p.vx * adt;
			p.y += p.vy * adt;
			p.ttl -= adt;
		}
		particles = particles.filter((p) => p.ttl > 0);

		const box = playerHitBox();

		if (invulnTtl <= 0) {
			for (let i = obstacles.length - 1; i >= 0; i--) {
				const o = obstacles[i]!;
				const oBox = obstacleHitBox(o);
				if (!rectsOverlap(box, oBox)) continue;
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
		}

		for (let i = pickups.length - 1; i >= 0; i--) {
			const p = pickups[i]!;
			const top = p.y - p.h;
			const pickBox = expandRect(p.x, top, p.w, p.h, GAME_CONFIG.collision.pickupExpand);
			if (rectsOverlap(box, pickBox)) {
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

		const sky = ctx.createLinearGradient(0, 0, 0, groundY);
		sky.addColorStop(0, stage.sky);
		sky.addColorStop(1, stage.bg);
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, W, groundY);
		ctx.fillStyle = stage.bg;
		ctx.fillRect(0, groundY, W, H - groundY);

		ctx.fillStyle = stage.tint;
		ctx.globalAlpha = darkenTtl > 0 ? Math.min(0.3, stage.tintAlpha) : stage.tintAlpha * 0.7;
		ctx.fillRect(0, 0, W, H);
		ctx.globalAlpha = 1;

		if (darkenTtl > 0) {
			ctx.fillStyle = "rgba(0,0,0,0.45)";
			ctx.fillRect(0, 0, W, H);
		}

		drawGrain(stage);
		drawParallax(stage);
		drawDecor(stage);
		drawGround(stage);
	}

	function drawGrain(stage: StageDef) {
		if (reduceMotion || stage.grain <= 0 || grainPoints.length === 0) return;
		const drift = (performance.now() / 60) % H;
		ctx.globalAlpha = stage.grain;
		ctx.fillStyle = "#fff";
		for (const p of grainPoints) {
			const y = (p.y + drift) % H;
			ctx.fillRect(p.x, y, 1.5, 1.5);
		}
		ctx.globalAlpha = 1;
	}

	function drawGround(stage: StageDef) {
		// Haze band that fades the horizon into the floor
		const haze = ctx.createLinearGradient(0, groundY - 140 * scale, 0, groundY);
		haze.addColorStop(0, "rgba(255,255,255,0)");
		haze.addColorStop(1, "rgba(255,255,255,0.07)");
		ctx.fillStyle = haze;
		ctx.fillRect(0, groundY - 140 * scale, W, 140 * scale);

		ctx.fillStyle = stage.ground;
		ctx.fillRect(0, groundY, W, H - groundY);

		const floor = ctx.createLinearGradient(0, groundY, 0, H);
		floor.addColorStop(0, "rgba(255,255,255,0.06)");
		floor.addColorStop(1, "rgba(0,0,0,0.25)");
		ctx.fillStyle = floor;
		ctx.fillRect(0, groundY, W, H - groundY);

		ctx.fillStyle = stage.groundLine;
		ctx.fillRect(0, groundY, W, Math.max(2, 2 * scale));

		drawFloorSpecks();
	}

	/**
	 * Floor texture. Evenly spaced dashes read as highway lane markings, so the
	 * marks are jittered inside each cell with a stable per-cell hash: the
	 * pattern still scrolls seamlessly but never lines up into a road.
	 */
	function drawFloorSpecks() {
		const rows: Array<[number, number, number]> = [
			// [cellPx, yOffsetPx, alpha] — closer rows move faster and brighter
			[74, 14, 0.16],
			[128, 46, 0.1],
			[210, 92, 0.055],
		];
		for (let r = 0; r < rows.length; r++) {
			const [cell, off, alpha] = rows[r]!;
			const c = cell * scale;
			const y = Math.round(groundY + off * scale);
			if (y > H) break;
			const drift = scrollNear * (1 - r * 0.28);
			const first = Math.floor(drift / c);
			ctx.fillStyle = `rgba(255,255,255,${alpha})`;
			for (let i = 0; i <= Math.ceil(W / c) + 1; i++) {
				const cellIndex = first + i;
				// Cheap deterministic hash so each cell keeps its own jitter
				const h = Math.sin(cellIndex * 12.9898 + r * 78.233) * 43758.5453;
				const rnd = h - Math.floor(h);
				const h2 = Math.sin(cellIndex * 39.3468 + r * 11.135) * 24634.6345;
				const rnd2 = h2 - Math.floor(h2);
				const x = cellIndex * c - drift + rnd * c * 0.8;
				const len = (7 + rnd2 * 20) * scale;
				ctx.fillRect(Math.round(x), y, Math.round(len), Math.max(1, Math.round(1.6 * scale)));
			}
		}
	}

	/** `sky` floats high and slow; `horizon` is the silhouette on the ground line. */
	function parallaxForStage(stage: StageDef): { sky: string | null; horizon: string | null } {
		const pick = (key: StageDef["bgSky"], fallback: string | null) =>
			key === null ? null : key ? (BG_SPRITE[key] ?? null) : fallback;
		return {
			sky: pick(stage.bgSky, BG_SPRITE.clouds ?? null),
			horizon: pick(stage.bgHorizon, BG_SPRITE.hills ?? null),
		};
	}

	/**
	 * Seamless horizontal tiling using the sprite's real content aspect.
	 * Every coordinate is integer so the per-draw rounding can't open 1px seams.
	 */
	function drawLayer(name: string, layerH: number, bottomY: number, offset: number, alpha: number) {
		const b = getSpriteBounds(name);
		const aspect = b && b.aspect > 0 ? b.aspect : 2;
		const tileW = Math.max(64, Math.round(layerH * aspect));
		const tileH = Math.max(1, Math.round(tileW / aspect));
		const top = Math.round(bottomY) - tileH;
		const start = -Math.round(((offset % tileW) + tileW) % tileW);
		ctx.globalAlpha = alpha;
		for (let x = start; x < W; x += tileW) {
			drawGameSpriteRect(ctx, name, { x, y: top, w: tileW, h: tileH }, "production");
		}
		ctx.globalAlpha = 1;
	}

	function drawParallax(stage: StageDef) {
		const layers = parallaxForStage(stage);

		if (layers.sky) {
			const h = Math.min(H * 0.3, 170 * scale);
			drawLayer(layers.sky, h, groundY - H * 0.28, scrollFar, 0.16);
		}
		if (layers.horizon) {
			const h = Math.min(H * 0.2, 120 * scale);
			drawLayer(layers.horizon, h, groundY + 1, scrollNear * 0.3, stage.horizonAlpha ?? 0.36);
		}
	}

	/**
	 * Stage mood piece. It lives on the left of the sky band: the HUD owns the
	 * top strip, the power chips own the right edge and the obstacles arrive
	 * along the ground line, so this is the only corner that stays free.
	 */
	function drawDecor(stage: StageDef) {
		const name = DECOR_SPRITE[stage.decor];
		if (!name) return;
		const b = getSpriteBounds(name);
		// Reserved band: below the HUD and above the jump apex, so a jumping
		// dino never crosses it.
		const bandTop = 44 * scale;
		const apex = (GAME_CONFIG.jumpVelocity * GAME_CONFIG.jumpVelocity) / (2 * GAME_CONFIG.gravity);
		const bandBottom = groundY - apex * physK() - standHeight() - 16 * scale;
		const band = bandBottom - bandTop;
		if (band < 60 * scale) return;

		const aspect = b ? b.aspect : 1;
		// Also capped by width so it never dominates a narrow phone viewport
		const dh = Math.min(band, H * 0.2, 150 * scale, (W * 0.26) / aspect);
		const dw = dh * aspect;
		const ox = 24 * scale;
		const float = reduceMotion ? 0 : Math.sin(performance.now() / 2600) * 4 * scale;
		ctx.globalAlpha = stage.decorAlpha ?? 0.26;
		drawGameSprite(ctx, name, ox, bandBottom - dh + float, dw, dh, DECOR_MODE[stage.decor] ?? "production");
		ctx.globalAlpha = 1;
	}

	/** Soft contact shadow so sprites read as standing on the floor. */
	function drawContactShadow(cx: number, w: number, alpha: number) {
		if (alpha <= 0.01) return;
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = "rgba(0,0,0,0.55)";
		ctx.beginPath();
		ctx.ellipse(cx, groundY + 4 * scale, w * 0.5, 4 * scale, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	function drawObstacle(o: Obstacle) {
		const name = OBSTACLE_SPRITE[o.def.id];
		const top = o.y - o.h;
		if (!o.air) drawContactShadow(o.x + o.w * 0.5, o.w * 0.85, 0.28);
		if (!name) {
			pxRect(o.x, top, o.w, o.h, SPRITE_PALETTE.primary);
			return;
		}
		drawGameSprite(ctx, name, o.x, top, o.w, o.h, obstacleDrawMode(o.def.id));
	}

	function drawPickup(p: Pickup) {
		const name = PICKUP_SPRITE[p.def.id];
		const bob = reduceMotion ? 0 : Math.sin(performance.now() / 240 + p.x * 0.05) * 3 * scale;
		const top = p.y - p.h + bob;
		const cx = p.x + p.w * 0.5;
		const cy = top + p.h * 0.5;
		const r = Math.max(p.w, p.h) * 0.75;
		const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
		glow.addColorStop(0, "rgba(255, 224, 138, 0.35)");
		glow.addColorStop(1, "rgba(255, 224, 138, 0)");
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.fill();
		if (!name) {
			pxRect(p.x, top, p.w, p.h, SPRITE_PALETTE.primary);
			return;
		}
		drawGameSprite(ctx, name, p.x, top, p.w, p.h, "production");
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
		const name = currentDinoSprite();
		const flash = invulnTtl > 0 && Math.floor(performance.now() / 80) % 2 === 0;

		const airHeight = Math.max(0, groundY - py);
		drawContactShadow(
			box.x + box.w * 0.5,
			box.w * (0.8 - Math.min(0.4, airHeight / (H * 0.9))),
			0.34 - Math.min(0.26, airHeight / (H * 1.1)),
		);

		// Cosmetic only — the hitbox stays on the ground line. The body is lowest
		// at each footfall (phase 0 and 0.5) and highest mid-stride, so the bob
		// is locked to the same phase that flips the frame.
		const bob =
			!reduceMotion && onGround && !ducking
				? -Math.abs(Math.sin(runPhase * Math.PI * 2)) * 3.2 * scale
				: 0;

		const canvas = dinoCanvas(bob);
		const dinoRect = canvas
			? dinoSpriteRect(name, canvas)
			: resolveSpriteDrawRect(name, box.x, box.y + bob, box.w, box.h, 0);

		if (!dinoRect) {
			pxRect(box.x, box.y, box.w, box.h, SPRITE_PALETTE.primary);
			return;
		}

		// Landing squash — axis-aligned so pixel art stays crisp
		const squash = reduceMotion ? 0 : landSquashTtl / LAND_SQUASH_TIME;
		if (squash > 0) {
			ctx.save();
			const footX = dinoRect.x + dinoRect.w * 0.5;
			const footY = dinoRect.y + dinoRect.h;
			ctx.translate(footX, footY);
			ctx.scale(1 + 0.1 * squash, 1 - 0.13 * squash);
			ctx.translate(-footX, -footY);
		}

		if (flash) ctx.globalAlpha = 0.65;
		const drew = drawGameSpriteRect(ctx, name, dinoRect, "dino");
		ctx.globalAlpha = 1;

		if (!drew) {
			if (squash > 0) ctx.restore();
			pxRect(box.x, box.y, box.w, box.h, SPRITE_PALETTE.primary);
			return;
		}

		if (canvas && !(ducking && onGround)) {
			const level = dinoLevelFor(scoreFrames);
			const gearList = auraTtl > 0 ? [...level.gear, "glasses" as const] : level.gear;
			// Only the newest unlocks: stacking every accessory turns the sprite
			// into an unreadable pile.
			const visible = gearList.filter((g) => GEAR_SPRITE[g]).slice(-MAX_VISIBLE_GEAR);
			for (const g of visible) {
				const gearRect = gearLayoutRect(canvas, g);
				if (gearRect) drawGameSpriteRect(ctx, GEAR_SPRITE[g]!, gearRect, "production");
			}
		}

		// Drawn, not a sprite: there is no gaffer-shield PNG in public/game, and
		// the matrix fallback rendered as a speckled box over the character.
		if (hasShield) {
			const cx = dinoRect.x + dinoRect.w * 0.5;
			const cy = dinoRect.y + dinoRect.h * 0.5;
			const rx = dinoRect.w * 0.72;
			const ry = dinoRect.h * 0.62;
			const pulse = reduceMotion ? 1 : 0.85 + Math.sin(performance.now() / 220) * 0.15;
			ctx.save();
			ctx.globalAlpha = 0.35 * pulse;
			ctx.strokeStyle = "#c9a227";
			ctx.lineWidth = Math.max(2, 2.5 * scale);
			ctx.setLineDash([9 * scale, 7 * scale]);
			ctx.lineDashOffset = -(performance.now() / 26) % (16 * scale);
			ctx.beginPath();
			ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}

		if (squash > 0) ctx.restore();
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
		drawPowerChips();
	}

	/** Every active power gets a chip so the player can tell what a pickup did. */
	function drawPowerChips() {
		const chips: Array<[string, string]> = [];
		if (hasShield) chips.push(["GAFFER", "#c9a227"]);
		if (multiplier > 1) chips.push([`x${multiplier}`, "#ffe08a"]);
		if (invulnTtl > 0) chips.push([`INVENCIBLE ${invulnTtl.toFixed(1)}`, "#78c8ff"]);
		if (slowMoTtl > 0) chips.push([`SLOW MO ${slowMoTtl.toFixed(1)}`, "#b7a6ff"]);
		if (filterIndex >= 0) chips.push([FILTER_CYCLE[filterIndex]!.label, "#ff9f6e"]);
		if (easeTtl > 0 && easeFactor < 1) chips.push(["PRESUPUESTO OK", "#8ef0a4"]);
		if (!chips.length) return;

		const fontPx = 10 * scale;
		ctx.font = `700 ${fontPx}px Montserrat, Arial, sans-serif`;
		ctx.textBaseline = "middle";
		const padX = 7 * scale;
		const chipH = 17 * scale;
		const gap = 6 * scale;
		let y = 46 * scale;
		const right = W - 12 - (isTouch || W < 720 ? 56 : 12);
		for (const [text, color] of chips) {
			const w = ctx.measureText(text).width + padX * 2;
			ctx.fillStyle = "rgba(0,0,0,0.45)";
			ctx.fillRect(right - w, y, w, chipH);
			ctx.fillStyle = color;
			ctx.fillRect(right - w, y, 2 * scale, chipH);
			ctx.fillText(text, right - w + padX, y + chipH * 0.5);
			y += chipH + gap;
		}
		ctx.textBaseline = "alphabetic";
	}

	function drawParticles() {
		for (const p of particles) {
			ctx.globalAlpha = Math.min(1, p.ttl * 2);
			const s = p.size ?? 3 * scale;
			pxRect(p.x, p.y, s, s, p.color ?? "#ffe08a");
		}
		ctx.globalAlpha = 1;
	}

	function drawScanlines() {
		if (!scanlinePattern) return;
		ctx.fillStyle = scanlinePattern;
		ctx.fillRect(0, 0, W, H);
	}

	function render() {
		clear();
		for (const b of bgProps) drawBgProp(b);
		for (const o of obstacles) drawObstacle(o);
		for (const p of pickups) drawPickup(p);
		drawParticles();
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
		hideToast(true);
		prevFocus?.focus?.();
	}

	function destroy() {
		closeGame();
		window.clearTimeout(toastHideTimer);
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

	void loadPngSprites();

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
