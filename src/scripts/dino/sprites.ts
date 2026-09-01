/**
 * Pixel-matrix sprite renderer for Dino on Set.
 * Source of truth: ./pixel-matrices.json (V3 uniform 32×32)
 */
import raw from "./pixel-matrices.json";

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
	accent: accents.production || pack.recommendedPalette?.["2"] || "#C9A227",
	eye: accents.eye || pack.recommendedPalette?.eyeOverride || "#5C0C0E",
	warm: accents.warmLight || "#FFE08A",
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

/** Obstacle id (content.ts) → sprite filename */
export const OBSTACLE_SPRITE: Record<string, string> = {
	xlr: "obst-xlr.png",
	sdi: "obst-sdi.png",
	extension: "obst-extension.png",
	powerstrip: "obst-powerstrip.png",
	tripod: "obst-tripod.png",
	cstand: "obst-cstand.png",
	led: "obst-led.png",
	fresnel: "obst-fresnel.png",
	flight: "obst-flight.png",
	pelican: "obst-pelican.png",
	cambag: "obst-cambag.png",
	vmount: "obst-vmount.png",
	slider: "obst-slider.png",
	clapper: "obst-clapper.png",
	director: "obst-director-chair.png",
	termo: "obst-termo.png",
	mate: "obst-mate.png",
	coffee: "obst-coffee.png",
	prodpack: "obst-prodpack.png",
	cone: "obst-cone.png",
	gaffer_roll: "obst-gaffer-roll.png",
	hdd: "obst-hdd.png",
	monitor: "obst-monitor.png",
	gimbal: "obst-gimbal.png",
	reflector: "obst-reflector.png",
	pothole: "obst-pothole.png",
	tile: "obst-tile.png",
	delivery: "obst-delivery.png",
	moto: "obst-moto.png",
	dog: "obst-dog.png",
	pedestrian: "obst-pedestrian.png",
	reposera: "obst-reposera.png",
	fan: "obst-fan.png",
	bag: "obst-bag.png",
	bigtermo: "obst-bigtermo.png",
	argcone: "obst-argcone.png",
	drone: "obst-drone.png",
	crazydrone: "obst-crazydrone.png",
	boom: "obst-boom.png",
	hangcable: "obst-hangcable.png",
	airreflector: "obst-airreflector.png",
	diffuser: "obst-diffuser.png",
	lightarm: "obst-lightarm.png",
};

export const PICKUP_SPRITE: Record<string, string> = {
	mate: "pickup-mate.png",
	cafe: "pickup-cafe.png",
	battery: "pickup-battery.png",
	sdcard: "pickup-sd.png",
	gaffer: "pickup-gaffer.png",
	budget: "pickup-budget.png",
};

export const DECOR_SPRITE: Record<string, string> = {
	storyboard: "decor-storyboard.png",
	cam: "decor-cam-a.png",
	street: "decor-street-ext.png",
	night: "decor-night-moon.png",
	timeline: "decor-timeline.png",
	export: "decor-export.png",
	aura: "decor-aura.png",
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
	headset: "gear-headset.png",
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
	if (id === "led" || id === "fresnel" || id === "reflector" || id === "diffuser" || id === "airreflector") {
		return "warm";
	}
	if (id === "hdd" || id === "monitor" || id === "slider") return "post";
	return "production";
}
