/**
 * Sprite renderer for Dino on Set.
 * PNGs in /public/game/ take priority when loaded; pixel-matrices.json is the fallback.
 */
import raw from "./pixel-matrices.json";
import manifest from "./game-manifest.json";
import boundsPack from "./sprite-bounds.json";

export interface SpriteBounds {
	x: number;
	y: number;
	w: number;
	h: number;
	sw: number;
	sh: number;
	aspect: number;
	foot: number;
	kind: "dino" | "gear" | "pickup" | "decor" | "ui" | "obstacle";
}

const boundsMap = (boundsPack as { sprites: Record<string, SpriteBounds> }).sprites ?? {};

export function getSpriteBounds(name: string): SpriteBounds | null {
	return boundsMap[name] ?? null;
}

/** Served from public/game/ — do not resize or re-export the source PNGs */
export const PNG_GAME_BASE = "/game";

/** Multiplier for dino + gear on screen */
export const DINO_DISPLAY_SCALE = 1.48;

/** Multiplier for obstacles, pickups */
export const WORLD_DISPLAY_SCALE = 1.32;

/** Logical height of dino on the playfield (before display scale) */
export const DINO_LAYOUT_H = 44;

/** Auto-generado por npm run game:prepare — lista PNG en public/game/ */
export const PNG_SPRITE_FILES: readonly string[] = manifest.files ?? [];

const pngCache = new Map<string, HTMLImageElement>();
let pngLoadPromise: Promise<void> | null = null;

function loadOnePng(file: string): Promise<void> {
	return new Promise((resolve) => {
		const img = new Image();
		img.decoding = "async";
		img.onload = () => {
			pngCache.set(file, img);
			resolve();
		};
		img.onerror = () => resolve();
		// Colon filenames (battery:pickup.png) must stay unencoded for Vite/static
		img.src = `${PNG_GAME_BASE}/${file}`;
	});
}

/** Preload PNG sprites from public/game (idempotent). */
export function loadPngSprites(): Promise<void> {
	pngLoadPromise = Promise.all([...PNG_SPRITE_FILES].map(loadOnePng)).then(() => undefined);
	return pngLoadPromise;
}

export function hasPngSprite(name: string): boolean {
	const img = pngCache.get(name);
	return Boolean(img?.complete && img.naturalWidth > 0);
}

export function getPngSprite(name: string): HTMLImageElement | null {
	const img = pngCache.get(name);
	return img?.complete && img.naturalWidth > 0 ? img : null;
}

/**
 * Huella lógica de un objeto del mundo.
 *
 * La altura declarada en content.ts manda: es la única medida comparable entre
 * objetos (un cable tirado en el piso es bajo, un trípode es alto). El ancho
 * sale del aspect real del PNG, así que nunca se deforma. Antes se usaba
 * `max(w, h)` como altura, lo que hacía que cualquier objeto ancho y chato
 * —el cable XLR, la pértiga— se dibujara tan alto como el dino.
 */
export function getSpriteLogicalSize(
	name: string,
	fallback?: { w: number; h: number },
): { w: number; h: number } {
	const fb = fallback ?? { w: SPRITE_SIZE, h: SPRITE_SIZE };
	const b = getSpriteBounds(name);
	if (b) return { w: fb.h * b.aspect, h: fb.h };
	const png = getPngSprite(name);
	if (png && png.naturalHeight > 0) {
		return { w: fb.h * (png.naturalWidth / png.naturalHeight), h: fb.h };
	}
	const matrix = getSprite(name);
	if (matrix) return { w: matrix.w, h: matrix.h };
	return fb;
}

/**
 * Fit a source sprite into a layout box without stretching.
 * Bottom-center anchor — feet sit on the layout bottom (ground line).
 */
export function fitSpriteRect(
	layoutX: number,
	layoutY: number,
	layoutW: number,
	layoutH: number,
	sourceW: number,
	sourceH: number,
) {
	if (sourceW <= 0 || sourceH <= 0) {
		return { x: layoutX, y: layoutY, w: layoutW, h: layoutH };
	}
	const s = Math.min(layoutW / sourceW, layoutH / sourceH);
	const w = sourceW * s;
	const h = sourceH * s;
	return {
		x: layoutX + (layoutW - w) * 0.5,
		y: layoutY + layoutH - h,
		w,
		h,
	};
}

export interface SpriteRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** @deprecated — los PNG ya vienen con pies alineados en canvas */
export const DINO_FOOT_NUDGE = 0;

/** Frame que fija la escala y la línea de suelo del canvas compartido del dino */
export const DINO_BASE_SPRITE = "dino-run-1.png";

/**
 * Altura del borde inferior de los obstáculos aéreos, como fracción de la
 * altura del dino de pie. Debe quedar entre 0.52 (alto agachado) y 1.0 para
 * que agacharse sirva y el obstáculo no sea invisible.
 */
export const AIR_LIFT: Record<string, number> = {
	drone: 0.8,
	boom: 0.7,
};

export function getSourceSize(name: string): { w: number; h: number } | null {
	const b = getSpriteBounds(name);
	if (b) return { w: b.w, h: b.h };
	const png = getPngSprite(name);
	if (png) return { w: png.naturalWidth, h: png.naturalHeight };
	const matrix = getSprite(name);
	if (matrix) return { w: matrix.w, h: matrix.h };
	return null;
}

export function resolveSpriteDrawRect(
	name: string,
	layoutX: number,
	layoutY: number,
	layoutW: number,
	layoutH: number,
	footNudge = 0,
): SpriteRect | null {
	const src = getSourceSize(name);
	if (!src) return null;
	const r = fitSpriteRect(layoutX, layoutY, layoutW, layoutH, src.w, src.h);
	if (footNudge > 0) r.y += layoutH * footNudge;
	return r;
}

/**
 * Rect centrado en (cx, cy) con el ancho dado, respetando el aspect real del
 * contenido del sprite para que nunca se deforme.
 */
export function centeredSpriteRect(
	name: string,
	cx: number,
	cy: number,
	w: number,
): SpriteRect {
	const src = getSourceSize(name);
	const aspect = src && src.h > 0 ? src.w / src.h : 1;
	const h = w / aspect;
	return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * Canvas de referencia que comparten todos los frames del dino y los overlays
 * gear-*. El encaje sale siempre del frame base, así que pasar a salto o a
 * agachado cambia la silueta pero nunca el tamaño del personaje, y cada
 * accesorio cae en el punto donde el arte lo dibujó sobre ese mismo canvas.
 */
export function dinoCanvasRect(
	layoutX: number,
	layoutY: number,
	layoutW: number,
	layoutH: number,
): SpriteRect | null {
	const base = getSpriteBounds(DINO_BASE_SPRITE);
	if (!base) return null;
	const s = Math.min(layoutW / base.w, layoutH / base.h);
	return {
		x: layoutX + (layoutW - base.w * s) * 0.5 - base.x * s,
		y: layoutY + layoutH - base.h * s - base.y * s,
		w: base.sw * s,
		h: base.sh * s,
	};
}

/** Y del suelo (pies del frame base) dentro del canvas compartido */
export function dinoGroundLine(canvas: SpriteRect): number {
	const base = getSpriteBounds(DINO_BASE_SPRITE);
	if (!base) return canvas.y + canvas.h;
	return canvas.y + ((base.y + base.h) / base.sh) * canvas.h;
}

export interface GearDrawSpec {
	/** Centro del accesorio, en fracción del canvas compartido del dino */
	cx: number;
	cy: number;
	/** Ancho del accesorio, en fracción del ancho del canvas */
	w: number;
}

/**
 * Los PNG de gear-*.png son ilustraciones sueltas que llenan su propio canvas
 * de 512x512 (un chaleco centrado, un mate centrado…), NO capas alineadas
 * sobre el dino. Mapearlos 1:1 al canvas del dino los dibuja del tamaño del
 * personaje y lo tapan. Se colocan como props sobre puntos anatómicos del
 * frame base: cabeza, ojos, torso y mano libre.
 */
export const GEAR_DRAW: Record<string, GearDrawSpec> = {
	glasses: { cx: 0.67, cy: 0.2, w: 0.26 },
	vest: { cx: 0.5, cy: 0.58, w: 0.3 },
	mate: { cx: 0.3, cy: 0.6, w: 0.14 },
	megaphone: { cx: 0.2, cy: 0.7, w: 0.2 },
};

/** Más accesorios que esto sobre un sprite de ~120px se vuelve ilegible */
export const MAX_VISIBLE_GEAR = 3;

export function gearLayoutRect(canvas: SpriteRect, gearId: string): SpriteRect | null {
	const spec = GEAR_DRAW[gearId];
	const name = GEAR_SPRITE[gearId];
	if (!spec || !name) return null;
	return centeredSpriteRect(
		name,
		canvas.x + canvas.w * spec.cx,
		canvas.y + canvas.h * spec.cy,
		canvas.w * spec.w,
	);
}

/** Rect de un frame del dino o de un accesorio dentro del canvas compartido */
export function dinoSpriteRect(name: string, canvas: SpriteRect): SpriteRect | null {
	const b = getSpriteBounds(name);
	if (!b) return null;
	const sx = canvas.w / b.sw;
	const sy = canvas.h / b.sh;
	const rect = {
		x: canvas.x + b.x * sx,
		y: canvas.y + b.y * sy,
		w: b.w * sx,
		h: b.h * sy,
	};
	// Todos los frames del dino apoyan su último píxel en la línea de suelo del
	// canvas. El de salto tiene las patas recogidas, así que su contenido acaba
	// ~60px más arriba en su PNG: sin este ajuste el personaje daba un salto
	// visual de 40px en el instante del despegue, cuando `py` sigue en el suelo.
	if (b.kind === "dino") {
		rect.y = dinoGroundLine(canvas) - rect.h;
	}
	return rect;
}

export function drawGameSpriteRect(
	ctx: CanvasRenderingContext2D,
	name: string,
	rect: SpriteRect,
	mode: DrawMode = "production",
): boolean {
	const png = getPngSprite(name);
	const b = getSpriteBounds(name);
	if (png) {
		const prevSmooth = ctx.imageSmoothingEnabled;
		ctx.imageSmoothingEnabled = false;
		if (b) {
			ctx.drawImage(
				png,
				b.x,
				b.y,
				b.w,
				b.h,
				Math.round(rect.x),
				Math.round(rect.y),
				Math.round(rect.w),
				Math.round(rect.h),
			);
		} else {
			ctx.drawImage(
				png,
				Math.round(rect.x),
				Math.round(rect.y),
				Math.round(rect.w),
				Math.round(rect.h),
			);
		}
		ctx.imageSmoothingEnabled = prevSmooth;
		return true;
	}

	const matrix = getSprite(name);
	if (matrix) {
		const pixel = rect.w / matrix.w;
		drawPixelSprite(ctx, matrix, rect.x, rect.y, pixel, mode);
		return true;
	}

	return false;
}

export type PixelCell = 0 | 1 | 2;

export interface PixelSprite {
	w: number;
	h: number;
	pivot: { x: number; y: number };
	pixels: PixelCell[][];
}

interface MatrixPack {
	format: string;
	encoding: Record<string, string>;
	paletteHint?: {
		"0"?: string;
		"1"?: string;
		"2"?: string;
		accentMappings?: {
			eye?: string;
			production?: string;
			warmLight?: string;
			postCold?: string;
		};
	};
	recommendedPalette?: {
		"1": string;
		"2": string;
		eyeOverride: string;
	};
	notes?: string[];
	usage?: string;
	sprites: Record<string, PixelSprite>;
}

const pack = raw as MatrixPack;
const accents = pack.paletteHint?.accentMappings ?? {};

export const SPRITE_PALETTE = {
	primary: pack.paletteHint?.["1"] || pack.recommendedPalette?.["1"] || "#F2F2F2",
	accent: "#E95514",
	eye: "#7A0F12",
	warm: "#FFB070",
	post: accents.postCold || "#78C8FF",
	dim: "#BDBDBD",
} as const;

/** Logical size of every V3 sprite */
export const SPRITE_SIZE = 32;

export const SPRITES = pack.sprites;

export function getSprite(name: string): PixelSprite | null {
	return SPRITES[name] ?? null;
}

export type DrawMode = "dino" | "production" | "warm" | "post" | "accent";

function accentFor(mode: DrawMode): string {
	switch (mode) {
		case "dino":
			return SPRITE_PALETTE.eye;
		case "warm":
			return SPRITE_PALETTE.warm;
		case "post":
			return SPRITE_PALETTE.post;
		case "production":
		case "accent":
		default:
			return SPRITE_PALETTE.accent;
	}
}

/**
 * Draw a pixel matrix with nearest-neighbor scaling (no smoothing).
 * `pixel` = CSS size of one logical matrix cell.
 * `ox, oy` = top-left of the sprite.
 */
export function drawPixelSprite(
	ctx: CanvasRenderingContext2D,
	sprite: PixelSprite,
	ox: number,
	oy: number,
	pixel: number,
	mode: DrawMode = "production",
) {
	const prevSmooth = ctx.imageSmoothingEnabled;
	ctx.imageSmoothingEnabled = false;

	const color1 = SPRITE_PALETTE.primary;
	const color2 = accentFor(mode);
	const px = Math.max(1, pixel);

	for (let y = 0; y < sprite.h; y++) {
		const row = sprite.pixels[y];
		if (!row) continue;
		for (let x = 0; x < sprite.w; x++) {
			const cell = row[x];
			if (!cell) continue;
			ctx.fillStyle = cell === 2 ? color2 : color1;
			ctx.fillRect(
				Math.round(ox + x * px),
				Math.round(oy + y * px),
				Math.ceil(px),
				Math.ceil(px),
			);
		}
	}

	ctx.imageSmoothingEnabled = prevSmooth;
}

/**
 * Draw a sprite into a layout box preserving aspect ratio (no stretch).
 * `layoutX/Y/W/H` = placement box; for ground objects the bottom edge is the floor.
 */
export function drawGameSprite(
	ctx: CanvasRenderingContext2D,
	name: string,
	layoutX: number,
	layoutY: number,
	layoutW: number,
	layoutH: number,
	mode: DrawMode = "production",
	footNudge = 0,
): boolean {
	const rect = resolveSpriteDrawRect(name, layoutX, layoutY, layoutW, layoutH, footNudge);
	if (!rect) return false;
	return drawGameSpriteRect(ctx, name, rect, mode);
}

/** Obstacle id → PNG filename in public/game/ */
export const OBSTACLE_SPRITE: Record<string, string> = {
	xlr: "xlr.png",
	tripod: "tripod.png",
	clapper: "clapper.png",
	flight: "flight.png",
	gaffer_roll: "gaffer-roll.png",
	drone: "drone.png",
	boom: "boom.png",
};

export const PICKUP_SPRITE: Record<string, string> = {
	mate: "pickup-mate.png",
	cafe: "pickup-cafe.png",
	battery: "pickup-battery.png",
	// Sin PNG propio: se reutilizan assets existentes antes que inventar
	// archivos que romperían la carga (ver game-manifest.json).
	slowmo: "decor-cam-a.png",
	lut: "gear-glasses.png",
};

/** Tanda 3 — decor de fondo por etapa + parallax */
export const DECOR_SPRITE: Record<string, string> = {
	storyboard: "decor-storyboard.png",
	cam: "decor-cam-a.png",
	street: "decor-street-ext.png",
	night: "decor-night-moon.png",
	timeline: "decor-timeline.png",
	export: "decor-export.png",
	aura: "decor-aura.png",
};

export const BG_SPRITE: Record<string, string> = {
	hills: "bg-parallax-hills.png",
	city: "bg-parallax-city.png",
	clouds: "bg-clouds-subtle.png",
};

export const DECOR_MODE: Record<string, DrawMode> = {
	storyboard: "production",
	cam: "production",
	street: "warm",
	night: "warm",
	timeline: "post",
	export: "production",
	aura: "warm",
};

export const GEAR_SPRITE: Record<string, string> = {
	vest: "gear-vest.png",
	mate: "gear-mate.png",
	glasses: "gear-glasses.png",
	megaphone: "gear-megaphone.png",
};

export function dinoSpriteName(opts: {
	ducking: boolean;
	onGround: boolean;
	runFrame: number;
}): string {
	if (opts.ducking && opts.onGround) return "dino-duck.png";
	if (!opts.onGround) return "dino-jump.png";
	return opts.runFrame === 0 ? "dino-run-1.png" : "dino-run-2.png";
}

export function obstacleDrawMode(id: string): DrawMode {
	return "production";
}
