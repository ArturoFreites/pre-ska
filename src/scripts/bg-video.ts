/**
 * Background video for iOS / Instagram WebViews.
 * Always uses the video (and its first frame as still). Never shows the old
 * SKA poster art. The <video> stays hidden until `playing` so native play
 * chrome cannot flash on reload / Low Power Mode.
 */

type BgVideoOptions = {
	reduceMotion?: boolean;
	desktopMq?: string;
};

const hardenVideoEl = (video: HTMLVideoElement) => {
	video.controls = false;
	video.removeAttribute("controls");
	video.removeAttribute("poster");
	video.muted = true;
	video.defaultMuted = true;
	video.loop = true;
	video.playsInline = true;
	video.setAttribute("muted", "");
	video.setAttribute("playsinline", "");
	video.setAttribute("webkit-playsinline", "");
	video.disablePictureInPicture = true;
	video.setAttribute("disablepictureinpicture", "");
	video.setAttribute("controlslist", "nodownload nofullscreen noremoteplayback");
	try {
		video.disableRemotePlayback = true;
	} catch {
		/* older WebViews */
	}
};

const tryPlay = async (video: HTMLVideoElement): Promise<boolean> => {
	if (!video.paused && !video.ended) return true;
	hardenVideoEl(video);

	try {
		await video.play();
		return !video.paused;
	} catch {
		return false;
	}
};

const waitForCanPlay = (video: HTMLVideoElement, timeoutMs = 10000): Promise<void> => {
	if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		let settled = false;
		const done = () => {
			if (settled) return;
			settled = true;
			video.removeEventListener("canplay", onReady);
			video.removeEventListener("loadeddata", onReady);
			video.removeEventListener("error", onReady);
			window.clearTimeout(timer);
			resolve();
		};
		const onReady = () => done();
		const timer = window.setTimeout(done, timeoutMs);
		video.addEventListener("canplay", onReady, { once: true });
		video.addEventListener("loadeddata", onReady, { once: true });
		video.addEventListener("error", onReady, { once: true });
	});
};

const captureFrameToBackground = (
	video: HTMLVideoElement,
	bgMedia: HTMLElement | null,
): void => {
	if (!bgMedia) return;
	const w = video.videoWidth;
	const h = video.videoHeight;
	if (w < 2 || h < 2) return;

	try {
		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.drawImage(video, 0, 0, w, h);
		bgMedia.style.backgroundImage = `url("${canvas.toDataURL("image/jpeg", 0.85)}")`;
	} catch {
		/* not ready */
	}
};

const seekToFirstFrame = (video: HTMLVideoElement): Promise<void> => {
	if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		let settled = false;
		const done = () => {
			if (settled) return;
			settled = true;
			video.removeEventListener("seeked", onSeeked);
			window.clearTimeout(timer);
			resolve();
		};
		const onSeeked = () => done();
		const timer = window.setTimeout(done, 1200);

		video.addEventListener("seeked", onSeeked, { once: true });
		try {
			const t = video.currentTime;
			video.currentTime = t > 0.01 ? 0 : 0.001;
		} catch {
			done();
		}
	});
};

export const mountBgVideo = (
	video: HTMLVideoElement | null,
	bgMedia: HTMLElement | null = null,
	options: BgVideoOptions = {},
): (() => void) => {
	if (!video) return () => undefined;

	const reduceMotion =
		options.reduceMotion ??
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const desktopBg = window.matchMedia(options.desktopMq ?? "(min-width: 768px)");

	let disposed = false;
	let syncToken = 0;
	let gestureBound = false;
	let playing = false;
	let pauseRetryId = 0;
	let stillInFlight: Promise<void> | null = null;

	/** Video stays invisible until we confirm playback — kills native play chrome. */
	const keepStill = () => {
		playing = false;
		video.classList.add("is-still");
		hardenVideoEl(video);
		try {
			video.pause();
		} catch {
			/* ignore */
		}
	};

	const revealPlaying = () => {
		playing = true;
		video.classList.remove("is-still");
		hardenVideoEl(video);
	};

	const paintFirstFrame = async (token: number) => {
		if (disposed || token !== syncToken) return;
		if (stillInFlight) {
			await stillInFlight;
			return;
		}

		stillInFlight = (async () => {
			hardenVideoEl(video);
			keepStill();
			await seekToFirstFrame(video);
			if (disposed || token !== syncToken) return;
			captureFrameToBackground(video, bgMedia);
			keepStill();
		})();

		try {
			await stillInFlight;
		} finally {
			stillInFlight = null;
		}
	};

	const onPlaying = () => revealPlaying();

	const onPause = () => {
		if (disposed || reduceMotion || document.hidden) {
			keepStill();
			return;
		}
		window.clearTimeout(pauseRetryId);
		pauseRetryId = window.setTimeout(() => {
			if (disposed || document.hidden || !video.paused) return;
			void tryPlay(video).then((ok) => {
				if (ok) {
					revealPlaying();
					return;
				}
				void paintFirstFrame(syncToken);
			});
		}, 100);
	};

	video.addEventListener("playing", onPlaying);
	video.addEventListener("pause", onPause);

	const unlockAndPlay = () => {
		if (disposed || reduceMotion) return;
		hardenVideoEl(video);
		// Stay in still mode until `playing` fires — avoid chrome flash on tap.
		keepStill();
		void tryPlay(video).then((ok) => {
			if (ok) revealPlaying();
			else void paintFirstFrame(syncToken);
		});
	};

	const onGesture = () => unlockAndPlay();

	const bindGestureUnlock = () => {
		if (gestureBound || reduceMotion) return;
		gestureBound = true;
		document.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
		document.addEventListener("touchstart", onGesture, { capture: true, passive: true });
		document.addEventListener("click", onGesture, { capture: true, passive: true });
	};

	const unbindGestureUnlock = () => {
		if (!gestureBound) return;
		gestureBound = false;
		document.removeEventListener("pointerdown", onGesture, true);
		document.removeEventListener("touchstart", onGesture, true);
		document.removeEventListener("click", onGesture, true);
	};

	const attemptPlayWithRetries = async (token: number) => {
		keepStill();
		await waitForCanPlay(video);
		if (disposed || token !== syncToken) return;

		// Always paint the real first frame before any visible playback.
		await paintFirstFrame(token);
		if (disposed || token !== syncToken) return;

		if (reduceMotion) return;

		for (const delay of [0, 300, 900, 2000, 4000]) {
			if (delay) await new Promise((r) => window.setTimeout(r, delay));
			if (disposed || token !== syncToken || playing) return;
			keepStill();
			if (await tryPlay(video)) {
				revealPlaying();
				return;
			}
		}
	};

	const syncBgVideo = () => {
		if (!video || disposed) return;

		const desktop = desktopBg.matches;
		const nextSrc = desktop
			? (video.dataset.srcDesktop ?? "/fondo-desktop.mp4")
			: (video.dataset.srcMobile ?? "/fondo-mobile.mp4");

		if (bgMedia) {
			bgMedia.style.backgroundColor = "#000";
		}

		hardenVideoEl(video);
		keepStill();

		const srcChanged = video.dataset.activeSrc !== nextSrc;
		if (srcChanged) {
			playing = false;
			syncToken += 1;
			video.dataset.activeSrc = nextSrc;
			video.src = nextSrc;
			video.load();
			if (bgMedia) bgMedia.style.backgroundImage = "none";
		}

		if (reduceMotion) {
			video.removeAttribute("autoplay");
			unbindGestureUnlock();
			void attemptPlayWithRetries(syncToken);
			return;
		}

		bindGestureUnlock();
		void attemptPlayWithRetries(syncToken);
	};

	const onVisibility = () => {
		if (disposed || document.hidden) return;
		if (video.paused) void attemptPlayWithRetries(syncToken);
	};

	const onPageShow = () => {
		if (disposed) return;
		if (video.paused) void attemptPlayWithRetries(syncToken);
	};

	// First paint: never show the <video> node (avoids play icon on F5).
	keepStill();
	syncBgVideo();
	desktopBg.addEventListener("change", syncBgVideo);
	document.addEventListener("visibilitychange", onVisibility);
	window.addEventListener("pageshow", onPageShow);

	return () => {
		disposed = true;
		unbindGestureUnlock();
		window.clearTimeout(pauseRetryId);
		video.removeEventListener("playing", onPlaying);
		video.removeEventListener("pause", onPause);
		desktopBg.removeEventListener("change", syncBgVideo);
		document.removeEventListener("visibilitychange", onVisibility);
		window.removeEventListener("pageshow", onPageShow);
	};
};
