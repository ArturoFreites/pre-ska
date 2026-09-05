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
	/** 0 = poderes desde el inicio de cualquier nivel, misma tasa en todos */
	pickupMinScore: 0,
	/** Fallback biases if stage omits them */
	argentineChance: 0.11,
	airChanceBase: 0.26,
	airUnlockScore: 360,
	/** Chance to roll a meme event instead of stage pool */
	memeEventChance: 0.08,
	/**
	 * Cada nivel reinicia dificultad desde 0 (no es competitivo: es un
	 * recorrido de escenarios). Intro prioriza p1/p2 antes del gear genérico.
	 */
	stageIntroFrames: 320,
	stageForcedChars: 2,
	/** Frames locales del nivel antes de desbloquear aéreos */
	stageAirUnlockFrames: 200,
	/** Crossfade de escenario + mensaje al cambiar de nivel (segundos) */
	stageTransitionSec: 1.65,
	stageToastDelaySec: 0.55,
	/** Collision insets — fraction shrunk from each edge (higher = more forgiving) */
	collision: {
		playerInsetX: 0.32,
		playerInsetTop: 0.28,
		playerInsetBottom: 0.04,
		playerInsetTopAir: 0.4,
		obstacleInsetX: 0.34,
		obstacleInsetY: 0.36,
		/** Casi sin margen vertical: el lift ya define la franja duck/stand */
		airObstacleInsetY: 0.08,
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

/** Claves de BG_SPRITE usadas por etapa */
export type BgSpriteKey =
	| "clouds"
	| "hills"
	| "city"
	| "level1"
	| "level2"
	| "level3"
	| "level4"
	| "level5";

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
	bgSky?: BgSpriteKey | null;
	bgHorizon?: BgSpriteKey | null;
	/** Opacidad de la silueta del horizonte y del decor de esquina */
	horizonAlpha?: number;
	decorAlpha?: number;
	/**
	 * Filtro CSS/canvas para parallax + decor: desatura y oscurece como el
	 * footage de la web bajo el velo negro/naranja SKA.
	 */
	parallaxFilter?: string;
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

/** 5 niveles — cada uno con bg-levelN + obstáculos p1/p2-levelN */
export const STAGES: StageDef[] = [
	{
		id: "level1",
		label: "NIVEL 1 · DEPÓSITO",
		from: 0,
		bg: "#2a3038",
		sky: "#12161c",
		tint: "#e95514",
		tintAlpha: 0.14,
		ground: "#1a1e24",
		groundLine: "rgba(255,255,255,0.16)",
		grain: 0.035,
		argBias: 0,
		airBias: 0.16,
		eventTags: ["calle", "av", "any"],
		sfx: "street",
		decor: "street",
		bgSky: "clouds",
		bgHorizon: "level1",
		horizonAlpha: 0.72,
		decorAlpha: 0.12,
		parallaxFilter: "contrast(1.05) brightness(0.92)",
		enterToast: "DEPÓSITO",
	},
	{
		id: "level2",
		label: "NIVEL 2 · SÓTANO",
		from: 500,
		bg: "#1c1816",
		sky: "#0e0c0b",
		tint: "#e95514",
		tintAlpha: 0.16,
		ground: "#141210",
		groundLine: "rgba(255,180,120,0.14)",
		grain: 0.045,
		argBias: 0,
		airBias: 0.2,
		eventTags: ["pre", "av", "any"],
		sfx: "soft",
		decor: "storyboard",
		bgSky: "clouds",
		bgHorizon: "level2",
		horizonAlpha: 0.55,
		decorAlpha: 0.1,
		parallaxFilter: "contrast(1.15) brightness(0.42)",
		enterToast: "SÓTANO",
	},
	{
		id: "level3",
		label: "NIVEL 3 · DOJO",
		from: 1200,
		bg: "#2a1010",
		sky: "#140808",
		tint: "#e95514",
		tintAlpha: 0.18,
		ground: "#180c0c",
		groundLine: "rgba(233,85,20,0.22)",
		grain: 0.04,
		argBias: 0,
		airBias: 0.22,
		eventTags: ["rodaje", "av", "any"],
		sfx: "set",
		decor: "cam",
		bgSky: "clouds",
		bgHorizon: "level3",
		horizonAlpha: 0.76,
		decorAlpha: 0.1,
		parallaxFilter: "sepia(0.15) contrast(1.08) brightness(0.9)",
		enterToast: "DOJO",
	},
	{
		id: "level4",
		label: "NIVEL 4 · ESCUELA",
		from: 2200,
		bg: "#1a2438",
		sky: "#0c1420",
		tint: "#e95514",
		tintAlpha: 0.12,
		ground: "#121820",
		groundLine: "rgba(180,200,255,0.16)",
		grain: 0.03,
		argBias: 0,
		airBias: 0.24,
		eventTags: ["client", "av", "any"],
		sfx: "client",
		decor: "export",
		bgSky: "clouds",
		bgHorizon: "level4",
		horizonAlpha: 0.78,
		decorAlpha: 0.1,
		parallaxFilter: "contrast(1.06) brightness(0.94)",
		enterToast: "ESCUELA",
	},
	{
		id: "level5",
		label: "NIVEL 5 · CALLE",
		from: 3500,
		bg: "#121418",
		sky: "#08090c",
		tint: "#e95514",
		tintAlpha: 0.2,
		ground: "#0c0e12",
		groundLine: "rgba(255,120,80,0.18)",
		grain: 0.05,
		argBias: 0,
		airBias: 0.28,
		eventTags: ["noche", "calle", "meme", "av", "any"],
		sfx: "night",
		decor: "night",
		bgSky: "clouds",
		bgHorizon: "level5",
		horizonAlpha: 0.8,
		decorAlpha: 0.12,
		parallaxFilter: "contrast(1.1) brightness(0.86)",
		enterToast: "CALLE DE NOCHE",
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
	/** Si está, solo aparece en esos stage ids (p1/p2 por nivel) */
	stages?: string[];
}

/**
 * `h` es la ÚNICA medida que hay que tocar para escalar un obstáculo: el ancho
 * sale del aspect real del PNG. Como referencia, el dino de pie mide 65 en
 * estas mismas unidades (DINO_LAYOUT_H 44 × DINO_DISPLAY_SCALE 1.48) y los
 * obstáculos se dibujan × WORLD_DISPLAY_SCALE (1.32), así que la altura
 * relativa al dino es `h × 1.32 / 65`. `w` sólo se usa si falta el PNG.
 *
 * Por nivel: p1/p2 (stages). En todos: gear de producción (sin stages).
 */
export const OBSTACLE_TYPES: ObstacleDef[] = [
	// Nivel 1 — depósito
	{ id: "p1_level1", lane: "ground", family: "creature", w: 28, h: 40, weight: 10, pool: "av", variant: "p1", stages: ["level1"] },
	{ id: "p2_level1", lane: "ground", family: "rider", w: 48, h: 28, weight: 9, pool: "av", variant: "p2", stages: ["level1"] },
	// Nivel 2 — sótano
	{ id: "p1_level2", lane: "ground", family: "creature", w: 40, h: 38, weight: 10, pool: "av", variant: "p1", stages: ["level2"] },
	{ id: "p2_level2", lane: "ground", family: "creature", w: 36, h: 44, weight: 9, pool: "av", variant: "p2", stages: ["level2"] },
	// Nivel 3 — dojo
	{ id: "p1_level3", lane: "ground", family: "creature", w: 40, h: 40, weight: 10, pool: "av", variant: "p1", stages: ["level3"] },
	{ id: "p2_level3", lane: "ground", family: "creature", w: 30, h: 40, weight: 9, pool: "av", variant: "p2", stages: ["level3"] },
	// Nivel 4 — escuela
	{ id: "p1_level4", lane: "ground", family: "creature", w: 34, h: 46, weight: 10, pool: "av", variant: "p1", stages: ["level4"] },
	{ id: "p2_level4", lane: "ground", family: "creature", w: 36, h: 52, weight: 9, pool: "av", variant: "p2", stages: ["level4"] },
	// Nivel 5 — calle
	{ id: "p1_level5", lane: "ground", family: "creature", w: 52, h: 34, weight: 10, pool: "av", variant: "p1", stages: ["level5"] },
	{ id: "p2_level5", lane: "ground", family: "creature", w: 36, h: 48, weight: 9, pool: "av", variant: "p2", stages: ["level5"] },
	// Producción — todos los niveles
	{ id: "xlr", lane: "ground", family: "cable", w: 21, h: 11, weight: 8, pool: "av", variant: "xlr" },
	{ id: "gaffer_roll", lane: "ground", family: "small", w: 19, h: 14, weight: 7, pool: "av", variant: "gaffer" },
	{ id: "clapper", lane: "ground", family: "small", w: 25, h: 22, weight: 8, pool: "av", variant: "clapper" },
	{ id: "flight", lane: "ground", family: "box", w: 34, h: 26, weight: 8, pool: "av", variant: "flight" },
	{ id: "tripod", lane: "ground", family: "stand", w: 34, h: 43, weight: 8, pool: "av", variant: "tripod" },
	// Aéreos — se pasan agachándose (o saltando por encima)
	{ id: "drone", lane: "air", family: "air", w: 33, h: 18, weight: 10, pool: "air", variant: "drone" },
	{ id: "boom", lane: "air", family: "air", w: 43, h: 16, weight: 9, pool: "air", variant: "boom" },
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
	| { type: "filters"; duration: number; every: number }
	/** El scroll se invierte: el nivel “retrocede” como si no se hubiera grabado */
	| { type: "rewind"; duration: number }
	/** Espejo vertical estilo Geometry Dash: piso arriba */
	| { type: "gravity_flip"; duration: number };

export interface PickupDef {
	id: string;
	label: string;
	w: number;
	h: number;
	weight: number;
	effect: PickupEffect;
	variant: string;
	/** Si está, solo aparece en esos stage ids */
	stages?: string[];
}

/**
 * `weight` es la probabilidad relativa dentro de la tirada de pickup: subir el
 * número de uno lo hace más frecuente respecto de los demás. Cada cuánto sale
 * *algún* pickup se controla con `GAME_CONFIG.pickupChance`.
 * Igual que en los obstáculos, `h` manda y el ancho sale del aspect del PNG.
 */
export const PICKUP_TYPES: PickupDef[] = [
	{ id: "mate", label: "MATEcito Y SEGUIMOS  INVENCIBLE", w: 17, h: 20, weight: 1, effect: { type: "invuln", duration: 3.2 }, variant: "mate" },
	{ id: "cafe", label: "CAFÉ DE PRODUCCIÓN  x2", w: 16, h: 19, weight: 1, effect: { type: "multiplier", amount: 2, duration: 6 }, variant: "cafe" },
	{
		id: "battery",
		label: "NOS QUEDAMOS SIN BATERÍA, NO SE GRABÓ NADA — A FILMAR OTRA VEZ",
		w: 20,
		h: 20,
		weight: 1,
		effect: { type: "rewind", duration: 30 },
		variant: "battery",
	},
	{ id: "slowmo", label: "CÁMARA LENTA  120 FPS", w: 18, h: 20, weight: 1, effect: { type: "slowmo", duration: 5 }, variant: "slowmo" },
	{ id: "lut", label: "PROBANDO LUTS  EL COLORISTA SE FUE", w: 24, h: 8, weight: 1, effect: { type: "filters", duration: 9, every: 2 }, variant: "lut" },
	{
		id: "flip",
		label: "CÁMARA AL REVÉS  GRAVEDAD LOCA",
		w: 20,
		h: 20,
		weight: 1,
		effect: { type: "gravity_flip", duration: 12 },
		variant: "flip",
		stages: ["level5"],
	},
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

export function pickWeighted<T extends { weight: number }>(list: readonly T[]): T {
	const total = list.reduce((s, i) => s + i.weight, 0);
	let r = Math.random() * total;
	for (const item of list) {
		r -= item.weight;
		if (r <= 0) return item;
	}
	return list[list.length - 1]!;
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
