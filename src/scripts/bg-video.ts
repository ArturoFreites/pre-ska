/**
 * Background video for iOS / Instagram WebViews.
 * When autoplay is blocked (e.g. Low Power Mode), show the first decoded
 * frame as a still (no native play/pause chrome) and start on first tap.
 */

type BgVideoOptions = {
	reduceMotion?: boolean;
	desktopMq?: string;
};

const hardenVideoEl = (video: HTMLVideoElement) => {
	video.controls = false;
	video.removeAttribute("controls");
	video.muted = true;
	video.defaultMuted = true;
	video.loop = true;
	video.playsInline = true;
	video.setAttribute("muted", "");
	video.setAttribute("playsinline", "");
	video.setAttribute("webkit-playsinline", "");
	video.setAttribute("autoplay", "");
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

const waitForCanPlay = (video: HTMLVideoElement, timeoutMs = 8000): Promise<void> => {
	if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
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

/** Paint current video frame into the container background (no native chrome). */
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
		bgMedia.style.backgroundImage = `url("${canvas.toDataURL("image/jpeg", 0.82)}")`;
	} catch {
		/* tainted / not ready — keep existing poster */
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
			// Nudge decode of frame 0 without relying on play().
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
	let showingStill = false;
	let watchdogId = 0;
	let pauseRetryId = 0;
	let stillInFlight: Promise<void> | null = null;

	const setStillMode = (on: boolean) => {
		showingStill = on;
		video.classList.toggle("is-still", on);
		hardenVideoEl(video);
		if (on) {
			video.pause();
		}
	};

	const showFirstFrameStill = async (token: number) => {
		if (disposed || token !== syncToken || reduceMotion) return;
		if (stillInFlight) {
			await stillInFlight;
			return;
		}

		stillInFlight = (async () => {
			hardenVideoEl(video);
			await seekToFirstFrame(video);
			if (disposed || token !== syncToken) return;
			captureFrameToBackground(video, bgMedia);
			setStillMode(true);
		})();

		try {
			await stillInFlight;
		} finally {
			stillInFlight = null;
		}
	};

	const markPlaying = () => {
		playing = true;
		setStillMode(false);
	};

	const markPaused = () => {
		playing = false;
	};

	const onPlaying = () => markPlaying();

	const schedulePauseRetry = () => {
		window.clearTimeout(pauseRetryId);
		if (disposed || reduceMotion || document.hidden) return;
		pauseRetryId = window.setTimeout(() => {
			if (disposed || reduceMotion || document.hidden || !video.paused) return;
			void tryPlay(video).then((ok) => {
				if (ok) {
					markPlaying();
					return;
				}
				void showFirstFrameStill(syncToken);
			});
		}, 120);
	};

	const onPause = () => {
		markPaused();
		schedulePauseRetry();
	};

	video.addEventListener("playing", onPlaying);
	video.addEventListener("pause", onPause);

	const unlockAndPlay = () => {
		if (disposed || reduceMotion) return;
		hardenVideoEl(video);
		void tryPlay(video).then((ok) => {
			if (ok) {
				markPlaying();
				return;
			}
			void showFirstFrameStill(syncToken);
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

	const startWatchdog = () => {
		window.clearInterval(watchdogId);
		if (reduceMotion) return;
		watchdogId = window.setInterval(() => {
			if (disposed || document.hidden) return;
			if (!video.src || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
			if (!video.paused) {
				markPlaying();
				return;
			}
			// Stay on still frame — do not keep calling play() (avoids native chrome flashes).
			if (!showingStill) void showFirstFrameStill(syncToken);
		}, 2500);
	};

	const stopWatchdog = () => {
		window.clearInterval(watchdogId);
		watchdogId = 0;
	};

	const attemptPlayWithRetries = async (token: number) => {
		await waitForCanPlay(video);
		if (disposed || token !== syncToken) return;

		if (await tryPlay(video)) {
			markPlaying();
			return;
		}

		// Autoplay blocked: show first frame without native play icon.
		await showFirstFrameStill(token);

		for (const delay of [400, 1200, 3000]) {
			await new Promise((r) => window.setTimeout(r, delay));
			if (disposed || token !== syncToken) return;
			if (!video.paused) {
				markPlaying();
				return;
			}
			if (await tryPlay(video)) {
				markPlaying();
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
		const nextPoster = desktop
			? (video.dataset.posterDesktop ?? "/fondo-desktop.jpg")
			: (video.dataset.posterMobile ?? "/fondo.jpg");

		if (bgMedia) {
			bgMedia.style.backgroundImage = `url("${nextPoster}")`;
		}
		video.poster = nextPoster;
		hardenVideoEl(video);

		if (reduceMotion) {
			video.pause();
			video.removeAttribute("autoplay");
			video.removeAttribute("src");
			video.load();
			setStillMode(false);
			unbindGestureUnlock();
			stopWatchdog();
			return;
		}

		const srcChanged = video.dataset.activeSrc !== nextSrc;
		if (srcChanged) {
			markPaused();
			setStillMode(false);
			syncToken += 1;
			video.dataset.activeSrc = nextSrc;
			video.src = nextSrc;
			video.load();
		}

		bindGestureUnlock();
		startWatchdog();
		void attemptPlayWithRetries(syncToken);
	};

	const onVisibility = () => {
		if (disposed || reduceMotion || document.hidden) return;
		if (video.paused) void attemptPlayWithRetries(syncToken);
	};

	const onPageShow = () => {
		if (disposed || reduceMotion) return;
		if (video.paused) void attemptPlayWithRetries(syncToken);
	};

	syncBgVideo();
	desktopBg.addEventListener("change", syncBgVideo);
	document.addEventListener("visibilitychange", onVisibility);
	window.addEventListener("pageshow", onPageShow);

	return () => {
		disposed = true;
		unbindGestureUnlock();
		stopWatchdog();
		window.clearTimeout(pauseRetryId);
		video.removeEventListener("playing", onPlaying);
		video.removeEventListener("pause", onPause);
		desktopBg.removeEventListener("change", syncBgVideo);
		document.removeEventListener("visibilitychange", onVisibility);
		window.removeEventListener("pageshow", onPageShow);
	};
};
