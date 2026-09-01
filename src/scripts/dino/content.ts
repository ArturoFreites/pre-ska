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
	/**
	 * El salto dura 2·v/g = 0.67 s a cualquier velocidad (la física escala con
	 * el viewport, no el tiempo). Cualquier hueco menor a eso hace que el
	 * jugador aterrice encima del obstáculo siguiente sin poder evitarlo, así
	 * que `spawnMinFloor` nunca debe bajar de ~800 ms.
	 */
	spawnMinMs: 1150,
	spawnMaxMs: 2200,
	spawnMinFloor: 820,
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
	/** Collision insets — fraction shrunk from each edge (higher = more forgiving) */
	collision: {
		playerInsetX: 0.32,
		playerInsetTop: 0.38,
		playerInsetBottom: 0.04,
		playerInsetTopAir: 0.46,
		obstacleInsetX: 0.34,
		obstacleInsetY: 0.36,
		airObstacleInsetY: 0.4,
		pickupExpand: 0.2,
	},
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
	/** Top-of-sky color for the vertical gradient */
	sky: string;
	/** Stage tint color */
	tint: string;
	tintAlpha: number;
	ground: string;
	groundLine: string;
	grain: number;
	/** Capas de parallax: clave de BG_SPRITE o null para apagar la capa */
	bgSky?: "clouds" | "hills" | "city" | null;
	bgHorizon?: "clouds" | "hills" | "city" | null;
	/** Opacidad de la silueta del horizonte y del decor de esquina */
	horizonAlpha?: number;
	decorAlpha?: number;
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
		sky: "#3a0708",
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
		bgSky: "clouds",
		bgHorizon: "hills",
		horizonAlpha: 0.3,
		decorAlpha: 0.26,
	},
	{
		id: "rodaje",
		label: "RODAJE",
		from: 450,
		bg: "#5c0c0e",
		sky: "#40080a",
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
		bgSky: "clouds",
		bgHorizon: "hills",
		horizonAlpha: 0.36,
		decorAlpha: 0.3,
		enterToast: "RODANDO",
	},
	{
		id: "calle",
		label: "EXTERIOR / CALLE",
		from: 900,
		bg: "#4a1810",
		sky: "#7a2c14",
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
		bgSky: "clouds",
		bgHorizon: "city",
		horizonAlpha: 0.44,
		decorAlpha: 0.32,
		enterToast: "SALIMOS A LA CALLE",
	},
	{
		id: "noche",
		label: "NOCHE DE RODAJE",
		from: 1500,
		bg: "#0e0814",
		sky: "#050308",
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
		bgSky: null,
		bgHorizon: "city",
		horizonAlpha: 0.5,
		decorAlpha: 0.38,
		enterToast: "PERDEMOS LA LUZ NATURAL",
	},
	{
		id: "post",
		label: "POSTPRODUCCIÓN",
		from: 2200,
		bg: "#12182a",
		sky: "#070b16",
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
		bgSky: "clouds",
		bgHorizon: "hills",
		horizonAlpha: 0.22,
		decorAlpha: 0.34,
		enterToast: "A LA ISLA",
	},
	{
		id: "client",
		label: "ENTREGA / CLIENT",
		from: 3200,
		bg: "#1a1210",
		sky: "#0d0908",
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
		bgSky: "clouds",
		bgHorizon: "city",
		horizonAlpha: 0.3,
		decorAlpha: 0.3,
		enterToast: "MANDO EL LINK",
	},
	{
		id: "aura",
		label: "AURA MAX",
		from: 5000,
		bg: "#1a0a12",
		sky: "#2a0a1c",
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
		bgSky: "clouds",
		bgHorizon: "hills",
		horizonAlpha: 0.4,
		decorAlpha: 0.4,
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

/**
 * `h` es la ÚNICA medida que hay que tocar para escalar un obstáculo: el ancho
 * sale del aspect real del PNG. Como referencia, el dino de pie mide 65 en
 * estas mismas unidades (DINO_LAYOUT_H 44 × DINO_DISPLAY_SCALE 1.48) y los
 * obstáculos se dibujan × WORLD_DISPLAY_SCALE (1.32), así que la altura
 * relativa al dino es `h × 1.32 / 65`. `w` sólo se usa si falta el PNG.
 */
export const OBSTACLE_TYPES: ObstacleDef[] = [
	// Piso — de más bajo a más alto
	{ id: "xlr", lane: "ground", family: "cable", w: 21, h: 11, weight: 10, pool: "av", variant: "xlr" }, // 0.22× dino
	{ id: "gaffer_roll", lane: "ground", family: "small", w: 19, h: 12, weight: 7, pool: "av", variant: "gaffer" }, // 0.24×
	{ id: "clapper", lane: "ground", family: "small", w: 25, h: 21, weight: 8, pool: "av", variant: "clapper" }, // 0.43×
	{ id: "flight", lane: "ground", family: "box", w: 34, h: 25, weight: 9, pool: "av", variant: "flight" }, // 0.51×
	{ id: "tripod", lane: "ground", family: "stand", w: 34, h: 43, weight: 10, pool: "av", variant: "tripod" }, // 0.87×
	// Aéreos — se pasan agachándose (o saltando por encima)
	{ id: "drone", lane: "air", family: "air", w: 33, h: 17, weight: 10, pool: "air", variant: "drone" }, // 0.35×
	{ id: "boom", lane: "air", family: "air", w: 43, h: 15, weight: 9, pool: "air", variant: "boom" }, // 0.30×
];

export type PickupEffect =
	| { type: "score"; frames: number }
	| { type: "speed"; amount: number; duration: number }
	| { type: "multiplier"; amount: number; duration: number }
	| { type: "invuln"; duration: number }
	| { type: "shield" }
	| { type: "ease"; amount: number; duration: number }
	/** Cámara lenta: el mundo corre al 45% durante `duration` segundos */
	| { type: "slowmo"; duration: number }
	/** Rueda los filtros de FILTER_CYCLE cada `every` segundos */
	| { type: "filters"; duration: number; every: number };

export interface PickupDef {
	id: string;
	label: string;
	w: number;
	h: number;
	weight: number;
	effect: PickupEffect;
	variant: string;
}

/**
 * `weight` es la probabilidad relativa dentro de la tirada de pickup: subir el
 * número de uno lo hace más frecuente respecto de los demás. Cada cuánto sale
 * *algún* pickup se controla con `GAME_CONFIG.pickupChance`.
 * Igual que en los obstáculos, `h` manda y el ancho sale del aspect del PNG.
 */
export const PICKUP_TYPES: PickupDef[] = [
	{ id: "mate", label: "MATEcito Y SEGUIMOS  +3s", w: 17, h: 20, weight: 14, effect: { type: "score", frames: 90 }, variant: "mate" },
	{ id: "cafe", label: "CAFÉ DE PRODUCCIÓN  x2", w: 16, h: 19, weight: 12, effect: { type: "multiplier", amount: 2, duration: 6 }, variant: "cafe" },
	{ id: "battery", label: "BATERÍA AL 100%  INVENCIBLE", w: 20, h: 20, weight: 8, effect: { type: "invuln", duration: 3.2 }, variant: "battery" },
	{ id: "slowmo", label: "CÁMARA LENTA  120 FPS", w: 18, h: 20, weight: 7, effect: { type: "slowmo", duration: 5 }, variant: "slowmo" },
	{ id: "lut", label: "PROBANDO LUTS  EL COLORISTA SE FUE", w: 24, h: 8, weight: 6, effect: { type: "filters", duration: 9, every: 2 }, variant: "lut" },
];

/** Filtros que rota el pickup `lut`, en orden */
export const FILTER_CYCLE = [
	{ id: "sepia", label: "SEPIA", css: "sepia(0.85) contrast(1.05)" },
	{ id: "bw", label: "BLANCO Y NEGRO", css: "grayscale(1) contrast(1.15)" },
	{ id: "teal", label: "TEAL & ORANGE", css: "saturate(1.9) hue-rotate(-18deg)" },
	{ id: "negative", label: "NEGATIVO", css: "invert(1) hue-rotate(180deg)" },
] as const;

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

export type DinoGear = "camera" | "vest" | "glasses" | "megaphone" | "clapper" | "mate";

export interface DinoLevel {
	from: number;
	id: string;
	gear: DinoGear[];
	unlockToast?: string;
}

export const DINO_LEVELS: DinoLevel[] = [
	{ from: 0, id: "base", gear: ["camera"] },
	{ from: 500, id: "vest", gear: ["camera", "vest"], unlockToast: "CHALECO DE PRODUCCIÓN" },
	{ from: 1200, id: "mate", gear: ["camera", "vest", "mate"], unlockToast: "MATE EN MANO" },
	{ from: 2500, id: "glasses", gear: ["camera", "vest", "mate", "glasses"], unlockToast: "LOOK DE DIRECCIÓN" },
	{
		from: 4000,
		id: "director",
		gear: ["camera", "vest", "mate", "glasses", "megaphone"],
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
