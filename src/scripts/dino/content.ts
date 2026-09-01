/**
 * DINO ON SET — editable content & tunables.
 * Add/remove obstacles, pickups, events, stages and memes here.
 */

export const GAME_CONFIG = {
	logoClicks: 5,
	logoClickWindowMs: 2000,
	konamiWord: "dino",
	baseSpeed: 280,
	speedRamp: 6.5,
	maxSpeed: 620,
	jumpVelocity: 620,
	gravity: 1850,
	duckGravity: 2800,
	spawnMinMs: 900,
	spawnMaxMs: 2200,
	spawnMinFloor: 520,
	framesPerSecond: 30,
	storageKey: "ska-dino-best-take",
	eventCooldownMin: 9,
	eventCooldownMax: 16,
	eventMinScore: 180,
	pickupChance: 0.14,
	pickupMinScore: 120,
	/** Fallback biases if stage omits them */
	argentineChance: 0.11,
	airChanceBase: 0.26,
	airUnlockScore: 360,
	/** Chance to roll a meme event instead of stage pool */
	memeEventChance: 0.08,
} as const;

/** @deprecated alias kept for existing imports */
export const DINO_CONFIG = GAME_CONFIG;

export type SfxProfileId = "soft" | "set" | "street" | "night" | "post" | "client" | "aura";

export const SFX_PROFILES: Record<
	SfxProfileId,
	{ jump: number; start: number[]; cut: number; pickup: number; event: number; wave: OscillatorType }
> = {
	soft: { jump: 480, start: [660, 440], cut: 110, pickup: 700, event: 480, wave: "triangle" },
	set: { jump: 520, start: [880, 440], cut: 120, pickup: 720, event: 500, wave: "square" },
	street: { jump: 400, start: [520, 360], cut: 90, pickup: 640, event: 360, wave: "sawtooth" },
	night: { jump: 360, start: [420, 280], cut: 80, pickup: 580, event: 300, wave: "sine" },
	post: { jump: 700, start: [900, 600], cut: 160, pickup: 860, event: 760, wave: "square" },
	client: { jump: 560, start: [780, 520], cut: 140, pickup: 800, event: 620, wave: "triangle" },
	aura: { jump: 880, start: [990, 660], cut: 200, pickup: 990, event: 840, wave: "square" },
};

export type StageDecor = "storyboard" | "cam" | "street" | "night" | "timeline" | "export" | "aura";

export interface StageDef {
	id: string;
	label: string;
	from: number;
	/** Base fill under tint */
	bg: string;
	/** Stage tint color */
	tint: string;
	tintAlpha: number;
	ground: string;
	groundLine: string;
	grain: number;
	/** Bias 0–1 for argentine obstacles */
	argBias: number;
	/** Bias 0–1 for air obstacles (once unlocked) */
	airBias: number;
	/** Event tags this stage prefers (+ "any" always allowed) */
	eventTags: string[];
	sfx: SfxProfileId;
	decor: StageDecor;
	/** Optional toast when entering stage */
	enterToast?: string;
}

export const STAGES: StageDef[] = [
	{
		id: "pre",
		label: "PREPRODUCCIÓN",
		from: 0,
		bg: "#5c0c0e",
		tint: "#7a0f12",
		tintAlpha: 0.55,
		ground: "#2a0809",
		groundLine: "rgba(255,255,255,0.18)",
		grain: 0.035,
		argBias: 0.06,
		airBias: 0.18,
		eventTags: ["pre", "av", "any"],
		sfx: "soft",
		decor: "storyboard",
	},
	{
		id: "rodaje",
		label: "RODAJE",
		from: 450,
		bg: "#5c0c0e",
		tint: "#8a1218",
		tintAlpha: 0.58,
		ground: "#2a0809",
		groundLine: "rgba(255,255,255,0.2)",
		grain: 0.04,
		argBias: 0.1,
		airBias: 0.26,
		eventTags: ["rodaje", "av", "any"],
		sfx: "set",
		decor: "cam",
		enterToast: "RODANDO",
	},
	{
		id: "calle",
		label: "EXTERIOR / CALLE",
		from: 900,
		bg: "#4a1810",
		tint: "#a84828",
		tintAlpha: 0.42,
		ground: "#2c1410",
		groundLine: "rgba(255,220,180,0.22)",
		grain: 0.05,
		argBias: 0.32,
		airBias: 0.22,
		eventTags: ["calle", "arg", "av", "any"],
		sfx: "street",
		decor: "street",
		enterToast: "SALIMOS A LA CALLE",
	},
	{
		id: "noche",
		label: "NOCHE DE RODAJE",
		from: 1500,
		bg: "#0e0814",
		tint: "#2a1040",
		tintAlpha: 0.55,
		ground: "#100814",
		groundLine: "rgba(180,160,255,0.16)",
		grain: 0.06,
		argBias: 0.12,
		airBias: 0.34,
		eventTags: ["noche", "av", "any"],
		sfx: "night",
		decor: "night",
		enterToast: "PERDEMOS LA LUZ NATURAL",
	},
	{
		id: "post",
		label: "POSTPRODUCCIÓN",
		from: 2200,
		bg: "#12182a",
		tint: "#2a3a5c",
		tintAlpha: 0.55,
		ground: "#0c1018",
		groundLine: "rgba(120,200,255,0.2)",
		grain: 0.03,
		argBias: 0.06,
		airBias: 0.28,
		eventTags: ["post", "av", "any"],
		sfx: "post",
		decor: "timeline",
		enterToast: "A LA ISLA",
	},
	{
		id: "client",
		label: "ENTREGA / CLIENT",
		from: 3200,
		bg: "#1a1210",
		tint: "#6a3030",
		tintAlpha: 0.5,
		ground: "#181010",
		groundLine: "rgba(255,220,180,0.2)",
		grain: 0.025,
		argBias: 0.08,
		airBias: 0.24,
		eventTags: ["client", "av", "any"],
		sfx: "client",
		decor: "export",
		enterToast: "MANDO EL LINK",
	},
	{
		id: "aura",
		label: "AURA MAX",
		from: 5000,
		bg: "#1a0a12",
		tint: "#7a0f12",
		tintAlpha: 0.48,
		ground: "#14080c",
		groundLine: "rgba(255,224,138,0.28)",
		grain: 0.055,
		argBias: 0.1,
		airBias: 0.3,
		eventTags: ["aura", "meme", "av", "any"],
		sfx: "aura",
		decor: "aura",
		enterToast: "AURA DE DIRECTOR +9999",
	},
];

export type ObstacleLane = "ground" | "air";
export type ObstacleFamily =
	| "cable"
	| "box"
	| "stand"
	| "light"
	| "small"
	| "gear"
	| "seat"
	| "hazard"
	| "creature"
	| "rider"
	| "air";

export interface ObstacleDef {
	id: string;
	lane: ObstacleLane;
	family: ObstacleFamily;
	w: number;
	h: number;
	weight: number;
	pool: "av" | "arg" | "air";
	variant?: string;
}

export const OBSTACLE_TYPES: ObstacleDef[] = [
	{ id: "xlr", lane: "ground", family: "cable", w: 50, h: 10, weight: 10, pool: "av", variant: "xlr" },
	{ id: "sdi", lane: "ground", family: "cable", w: 52, h: 10, weight: 9, pool: "av", variant: "sdi" },
	{ id: "extension", lane: "ground", family: "cable", w: 56, h: 11, weight: 8, pool: "av", variant: "ext" },
	{ id: "powerstrip", lane: "ground", family: "small", w: 36, h: 14, weight: 7, pool: "av", variant: "strip" },
	{ id: "tripod", lane: "ground", family: "stand", w: 22, h: 54, weight: 10, pool: "av", variant: "tripod" },
	{ id: "cstand", lane: "ground", family: "stand", w: 26, h: 58, weight: 7, pool: "av", variant: "cstand" },
	{ id: "led", lane: "ground", family: "light", w: 30, h: 42, weight: 8, pool: "av", variant: "led" },
	{ id: "fresnel", lane: "ground", family: "light", w: 28, h: 48, weight: 6, pool: "av", variant: "fresnel" },
	{ id: "flight", lane: "ground", family: "box", w: 44, h: 30, weight: 9, pool: "av", variant: "flight" },
	{ id: "pelican", lane: "ground", family: "box", w: 40, h: 26, weight: 7, pool: "av", variant: "pelican" },
	{ id: "cambag", lane: "ground", family: "box", w: 34, h: 28, weight: 6, pool: "av", variant: "bag" },
	{ id: "vmount", lane: "ground", family: "small", w: 18, h: 28, weight: 6, pool: "av", variant: "vmount" },
	{ id: "slider", lane: "ground", family: "gear", w: 52, h: 22, weight: 5, pool: "av", variant: "slider" },
	{ id: "clapper", lane: "ground", family: "small", w: 30, h: 26, weight: 8, pool: "av", variant: "clapper" },
	{ id: "director", lane: "ground", family: "seat", w: 28, h: 40, weight: 5, pool: "av", variant: "chair" },
	{ id: "termo", lane: "ground", family: "small", w: 14, h: 28, weight: 7, pool: "av", variant: "termo" },
	{ id: "mate", lane: "ground", family: "small", w: 16, h: 20, weight: 8, pool: "av", variant: "mate" },
	{ id: "coffee", lane: "ground", family: "small", w: 14, h: 20, weight: 8, pool: "av", variant: "coffee" },
	{ id: "prodpack", lane: "ground", family: "box", w: 32, h: 36, weight: 5, pool: "av", variant: "pack" },
	{ id: "cone", lane: "ground", family: "hazard", w: 20, h: 28, weight: 6, pool: "av", variant: "cone" },
	{ id: "gaffer_roll", lane: "ground", family: "small", w: 18, h: 18, weight: 7, pool: "av", variant: "gaffer" },
	{ id: "hdd", lane: "ground", family: "small", w: 22, h: 14, weight: 6, pool: "av", variant: "hdd" },
	{ id: "monitor", lane: "ground", family: "gear", w: 34, h: 32, weight: 5, pool: "av", variant: "monitor" },
	{ id: "gimbal", lane: "ground", family: "gear", w: 24, h: 36, weight: 5, pool: "av", variant: "gimbal" },
	{ id: "reflector", lane: "ground", family: "light", w: 36, h: 40, weight: 5, pool: "av", variant: "reflector" },

	{ id: "pothole", lane: "ground", family: "hazard", w: 40, h: 10, weight: 6, pool: "arg", variant: "pothole" },
	{ id: "tile", lane: "ground", family: "hazard", w: 28, h: 8, weight: 5, pool: "arg", variant: "tile" },
	{ id: "delivery", lane: "ground", family: "rider", w: 30, h: 40, weight: 5, pool: "arg", variant: "delivery" },
	{ id: "moto", lane: "ground", family: "rider", w: 42, h: 28, weight: 5, pool: "arg", variant: "moto" },
	{ id: "dog", lane: "ground", family: "creature", w: 28, h: 20, weight: 6, pool: "arg", variant: "dog" },
	{ id: "pedestrian", lane: "ground", family: "creature", w: 18, h: 44, weight: 5, pool: "arg", variant: "ped" },
	{ id: "reposera", lane: "ground", family: "seat", w: 40, h: 24, weight: 4, pool: "arg", variant: "reposera" },
	{ id: "fan", lane: "ground", family: "gear", w: 28, h: 36, weight: 4, pool: "arg", variant: "fan" },
	{ id: "bag", lane: "ground", family: "small", w: 22, h: 18, weight: 5, pool: "arg", variant: "plastic" },
	{ id: "bigtermo", lane: "ground", family: "small", w: 20, h: 36, weight: 4, pool: "arg", variant: "bigtermo" },
	{ id: "argcone", lane: "ground", family: "hazard", w: 22, h: 30, weight: 5, pool: "arg", variant: "argcone" },

	{ id: "drone", lane: "air", family: "air", w: 40, h: 20, weight: 10, pool: "air", variant: "drone" },
	{ id: "crazydrone", lane: "air", family: "air", w: 38, h: 22, weight: 5, pool: "air", variant: "crazy" },
	{ id: "boom", lane: "air", family: "air", w: 58, h: 14, weight: 9, pool: "air", variant: "boom" },
	{ id: "hangcable", lane: "air", family: "air", w: 10, h: 48, weight: 7, pool: "air", variant: "hang" },
	{ id: "airreflector", lane: "air", family: "air", w: 40, h: 28, weight: 6, pool: "air", variant: "airref" },
	{ id: "diffuser", lane: "air", family: "air", w: 44, h: 30, weight: 5, pool: "air", variant: "diff" },
	{ id: "lightarm", lane: "air", family: "air", w: 52, h: 16, weight: 6, pool: "air", variant: "arm" },
];

export type PickupEffect =
	| { type: "score"; frames: number }
	| { type: "speed"; amount: number; duration: number }
	| { type: "multiplier"; amount: number; duration: number }
	| { type: "invuln"; duration: number }
	| { type: "shield" }
	| { type: "ease"; amount: number; duration: number };

export interface PickupDef {
	id: string;
	label: string;
	w: number;
	h: number;
	weight: number;
	effect: PickupEffect;
	variant: string;
}

export const PICKUP_TYPES: PickupDef[] = [
	{ id: "mate", label: "MATEcito Y SEGUIMOS", w: 18, h: 22, weight: 14, effect: { type: "score", frames: 90 }, variant: "mate" },
	{ id: "cafe", label: "CAFÉ DE PRODUCCIÓN", w: 16, h: 20, weight: 12, effect: { type: "multiplier", amount: 2, duration: 4 }, variant: "cafe" },
	{ id: "battery", label: "BATERÍA AL 100%", w: 16, h: 24, weight: 8, effect: { type: "invuln", duration: 3.2 }, variant: "battery" },
	{ id: "sdcard", label: "MATERIAL GUARDADO", w: 14, h: 18, weight: 12, effect: { type: "score", frames: 150 }, variant: "sd" },
	{ id: "gaffer", label: "TODO SE ARREGLA CON GAFFER", w: 20, h: 16, weight: 9, effect: { type: "shield" }, variant: "gaffer" },
	{ id: "budget", label: "PRESUPUESTO APROBADO", w: 28, h: 20, weight: 2, effect: { type: "ease", amount: 0.55, duration: 5 }, variant: "budget" },
];

export type EventEffect =
	| { type: "none" }
	| { type: "speed"; factor: number }
	| { type: "burst"; count: number }
	| { type: "delete_next" }
	| { type: "maybe_delete"; chance: number }
	| { type: "freeze"; ms: number }
	| { type: "render_bar" }
	| { type: "hide_rec" }
	| { type: "darken" }
	| { type: "spawn_hdd" }
	| { type: "bg_moto" }
	| { type: "bg_bondi"; slow: boolean }
	| { type: "bg_vecino" }
	| { type: "aura" }
	| { type: "cine" }
	| { type: "argentina" }
	| { type: "reels"; duration: number };

export interface GameEventDef {
	id: string;
	message: string;
	duration: number;
	weight: number;
	minScore?: number;
	/** Tags for stage filtering */
	tags: string[];
	effect: EventEffect;
}

/** Core production / Argentine events */
export const RANDOM_EVENTS: GameEventDef[] = [
	{ id: "una_mas", message: "UNA MÁS Y NOS VAMOS", duration: 2.2, weight: 10, minScore: 300, tags: ["rodaje", "av"], effect: { type: "burst", count: 3 } },
	{ id: "ultima", message: "AHORA SÍ, ÚLTIMA TOMA", duration: 2.2, weight: 10, minScore: 250, tags: ["rodaje", "noche", "av"], effect: { type: "speed", factor: 1.15 } },
	{ id: "cambio_chiquito", message: "EL CLIENTE DIJO “ES UN CAMBIO CHIQUITO”", duration: 2.8, weight: 9, minScore: 400, tags: ["client", "av"], effect: { type: "speed", factor: 1.28 } },
	{ id: "arregalo_post", message: "ARREGLALO EN POST", duration: 2.2, weight: 8, minScore: 350, tags: ["post", "av"], effect: { type: "delete_next" } },
	{ id: "vemos_post", message: "LO VEMOS EN POST", duration: 2.2, weight: 8, minScore: 350, tags: ["post", "av"], effect: { type: "maybe_delete", chance: 0.55 } },
	{ id: "render99", message: "RENDER AL 99%", duration: 2.4, weight: 9, tags: ["post", "av"], effect: { type: "render_bar" } },
	{ id: "premiere", message: "PREMIERE DEJÓ DE RESPONDER", duration: 1.8, weight: 7, minScore: 500, tags: ["post", "av"], effect: { type: "freeze", ms: 420 } },
	{ id: "disco", message: "FALTA ESPACIO EN DISCO", duration: 2.5, weight: 7, minScore: 450, tags: ["post", "av"], effect: { type: "spawn_hdd" } },
	{ id: "grabando", message: "¿ESTÁ GRABANDO?", duration: 2.8, weight: 8, tags: ["rodaje", "noche", "av"], effect: { type: "hide_rec" } },
	{ id: "backup", message: "¿TENEMOS BACKUP?", duration: 2.2, weight: 9, tags: ["post", "av", "any"], effect: { type: "none" } },
	{ id: "luz", message: "PERDEMOS LA LUZ", duration: 3.2, weight: 8, minScore: 400, tags: ["noche", "calle", "av"], effect: { type: "darken" } },
	{ id: "moto_evt", message: "SE ESCUCHA UNA MOTO", duration: 2.4, weight: 8, minScore: 280, tags: ["calle", "arg"], effect: { type: "bg_moto" } },
	{ id: "bondi", message: "ESPERÁ QUE PASE EL BONDI", duration: 3.0, weight: 7, minScore: 320, tags: ["calle", "arg"], effect: { type: "bg_bondi", slow: true } },
	{ id: "vecino", message: "ENTRÓ EL VECINO EN CUADRO", duration: 2.6, weight: 7, minScore: 300, tags: ["calle", "arg"], effect: { type: "bg_vecino" } },
	{ id: "perro", message: "ENTRÓ EL PERRO EN CUADRO", duration: 2.2, weight: 6, minScore: 350, tags: ["calle", "arg"], effect: { type: "none" } },
	{ id: "pozo", message: "CUIDADO CON EL POZO", duration: 2.0, weight: 5, minScore: 400, tags: ["calle", "arg"], effect: { type: "none" } },

	{ id: "luz2", message: "DALE QUE PERDEMOS LA LUZ", duration: 2.2, weight: 8, tags: ["noche", "av"], effect: { type: "none" } },
	{ id: "ultima2", message: "UNA ÚLTIMA Y ESTAMOS", duration: 2.2, weight: 8, tags: ["rodaje", "av"], effect: { type: "none" } },
	{ id: "gaffer_q", message: "¿QUIÉN TIENE GAFFER?", duration: 2.2, weight: 8, tags: ["rodaje", "av", "any"], effect: { type: "none" } },
	{ id: "adaptador", message: "¿QUIÉN SE LLEVÓ EL ADAPTADOR?", duration: 2.2, weight: 7, tags: ["pre", "rodaje", "av"], effect: { type: "none" } },
	{ id: "bateria_q", message: "ESA BATERÍA ESTABA CARGADA, ¿NO?", duration: 2.3, weight: 7, tags: ["noche", "rodaje", "av"], effect: { type: "none" } },
	{ id: "cable", message: "NO PISES EL CABLE, MAESTRO", duration: 2.2, weight: 9, tags: ["rodaje", "av", "any"], effect: { type: "none" } },
	{ id: "silencio", message: "SILENCIO, ESTAMOS RODANDO", duration: 2.2, weight: 8, tags: ["rodaje", "noche", "av"], effect: { type: "none" } },
	{ id: "camara", message: "NO MIRES A CÁMARA", duration: 2.2, weight: 7, tags: ["rodaje", "calle", "av"], effect: { type: "none" } },
	{ id: "borrar", message: "¿ESO DESPUÉS SE PUEDE BORRAR?", duration: 2.3, weight: 7, tags: ["client", "post", "av"], effect: { type: "none" } },
	{ id: "post_si", message: "SÍ, LO SACAMOS EN POST", duration: 2.2, weight: 8, tags: ["post", "av"], effect: { type: "none" } },
	{ id: "premium", message: "NECESITO QUE SE VEA MÁS PREMIUM", duration: 2.3, weight: 7, tags: ["client", "av"], effect: { type: "none" } },
	{ id: "dinamico", message: "EL CLIENTE QUIERE ALGO MÁS DINÁMICO", duration: 2.4, weight: 7, tags: ["client", "av"], effect: { type: "none" } },
	{ id: "viral", message: "¿PODEMOS HACERLO VIRAL?", duration: 2.2, weight: 6, tags: ["client", "av"], effect: { type: "none" } },
	{ id: "cine_txt", message: "HACELO MÁS CINEMATOGRÁFICO", duration: 2.2, weight: 6, tags: ["client", "rodaje", "av"], effect: { type: "none" } },
	{ id: "mismo", message: "QUIERE LO MISMO, PERO DISTINTO", duration: 2.4, weight: 8, tags: ["client", "av"], effect: { type: "none" } },
	{ id: "final", message: "AHORA SÍ ES LA FINAL", duration: 2.2, weight: 7, tags: ["post", "client", "av"], effect: { type: "none" } },
	{ id: "final_v3", message: "FINAL_FINAL_V3_AHORA_SI.mov", duration: 2.4, weight: 7, tags: ["post", "av"], effect: { type: "none" } },
	{ id: "link", message: "¿MANDÉ EL LINK CORRECTO?", duration: 2.2, weight: 6, tags: ["client", "av"], effect: { type: "none" } },
	{ id: "wetransfer", message: "WE TRANSFER AL 3%", duration: 2.3, weight: 5, tags: ["client", "post", "av"], effect: { type: "none" } },
	{ id: "mate_break", message: "CORTAMOS PARA EL MATE", duration: 2.0, weight: 5, tags: ["calle", "arg", "any"], effect: { type: "none" } },
	{ id: "argentina", message: "DALE QUE JUEGA ARGENTINA", duration: 3.2, weight: 1, minScore: 1500, tags: ["arg", "meme", "any"], effect: { type: "argentina" } },
];

/**
 * Rotate this list every few months — keep weights low.
 * 2026/2027 internet wink bank (editable).
 */
export const MEME_EVENTS_2026: GameEventDef[] = [
	{ id: "aura", message: "FARMEANDO AURA", duration: 3.0, weight: 3, minScore: 800, tags: ["meme", "aura"], effect: { type: "aura" } },
	{ id: "aura2", message: "AURA +9999", duration: 2.2, weight: 2, minScore: 1200, tags: ["meme", "aura"], effect: { type: "aura" } },
	{ id: "se_viene", message: "SE VIENE CINE", duration: 1.2, weight: 3, minScore: 600, tags: ["meme", "any"], effect: { type: "cine" } },
	{ id: "reels_mode", message: "ERA PARA REELS", duration: 3.5, weight: 2, minScore: 1800, tags: ["meme", "client"], effect: { type: "reels", duration: 3.5 } },
	{ id: "main_character", message: "MAIN CHARACTER ENERGY", duration: 2.2, weight: 2, minScore: 1000, tags: ["meme", "aura"], effect: { type: "aura" } },
	{ id: "ratio", message: "NOS HICIERON RATIO", duration: 2.0, weight: 2, minScore: 900, tags: ["meme", "client"], effect: { type: "speed", factor: 1.2 } },
	{ id: "npc", message: "MODO NPC ACTIVADO", duration: 2.0, weight: 2, minScore: 700, tags: ["meme", "any"], effect: { type: "none" } },
	{ id: "delulu", message: "DELULU PERO EL CORTE CIERRA", duration: 2.2, weight: 2, minScore: 1100, tags: ["meme", "post"], effect: { type: "none" } },
	{ id: "brainrot", message: "BRAINROT CUT", duration: 2.0, weight: 1, minScore: 2000, tags: ["meme"], effect: { type: "speed", factor: 1.25 } },
	{ id: "sigma", message: "SIGMA TAKE", duration: 1.8, weight: 1, minScore: 2500, tags: ["meme", "aura"], effect: { type: "cine" } },
];

export const ALL_EVENTS: GameEventDef[] = [...RANDOM_EVENTS, ...MEME_EVENTS_2026];

export const GAME_OVER_MESSAGES = [
	"ESA ERA ENSAYO",
	"BUENO, OTRA",
	"ESTABA BUENA IGUAL",
	"NO ESTABA GRABANDO",
	"SEGUIMOS, SEGUIMOS",
	"¿POR QUÉ NADIE ME AVISÓ?",
	"LO ARREGLAMOS EN POST",
	"PERDIMOS LA LUZ",
	"EL CLIENTE QUIERE OTRA",
	"ESA ERA LA ÚLTIMA",
	"AHORA SÍ, UNA MÁS",
	"QUEDÓ CINE",
	"ERA VERTICAL",
] as const;

export const GAME_OVER_RARE = {
	weight: 0.06,
	title: "ERA PARA REELS",
	sub: "HABÍA QUE GRABARLO VERTICAL",
} as const;

export type DinoGear = "headset" | "camera" | "vest" | "glasses" | "megaphone" | "clapper" | "mate";

export interface DinoLevel {
	from: number;
	id: string;
	gear: DinoGear[];
	unlockToast?: string;
}

export const DINO_LEVELS: DinoLevel[] = [
	{ from: 0, id: "base", gear: ["camera"] },
	{ from: 500, id: "headset", gear: ["camera", "headset"] },
	{ from: 1200, id: "vest", gear: ["camera", "headset", "vest"], unlockToast: "CHALECO DE PRODUCCIÓN" },
	{ from: 2500, id: "mate", gear: ["camera", "headset", "vest", "mate"], unlockToast: "MATE EN MANO" },
	{ from: 4000, id: "glasses", gear: ["camera", "headset", "vest", "mate", "glasses"], unlockToast: "LOOK DE DIRECCIÓN" },
	{
		from: 5500,
		id: "director",
		gear: ["camera", "headset", "vest", "mate", "glasses", "megaphone"],
		unlockToast: "AURA DE DIRECTOR +9999",
	},
];

export function pickWeighted<T extends { weight: number }>(list: readonly T[]): T {
	const total = list.reduce((s, i) => s + i.weight, 0);
	let r = Math.random() * total;
	for (const item of list) {
		r -= item.weight;
		if (r <= 0) return item;
	}
	return list[list.length - 1]!;
}

export function dinoLevelFor(score: number): DinoLevel {
	let cur = DINO_LEVELS[0]!;
	for (const l of DINO_LEVELS) {
		if (score >= l.from) cur = l;
	}
	return cur;
}

export function stageFor(frames: number): StageDef {
	let current = STAGES[0]!;
	for (const s of STAGES) {
		if (frames >= s.from) current = s;
	}
	return current;
}

export function eventsForStage(stage: StageDef, score: number, excludeId?: string): GameEventDef[] {
	const tags = new Set(stage.eventTags);
	return ALL_EVENTS.filter((e) => {
		if (excludeId && e.id === excludeId) return false;
		if (score < (e.minScore ?? 0)) return false;
		if (score < GAME_CONFIG.eventMinScore) return false;
		return e.tags.some((t) => tags.has(t) || t === "any");
	});
}
