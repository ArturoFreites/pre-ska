/**
 * Background video helper tuned for iOS / Instagram in-app browser:
 * muted + playsInline, wait until canplay, retry on gesture & visibility.
 */

type BgVideoOptions = {
	reduceMotion?: boolean;
	desktopMq?: string;
};

const tryPlay = async (video: HTMLVideoElement): Promise<boolean> => {
	if (video.paused === false && !video.ended) return true;

	// Re-assert muted every attempt (WebViews sometimes clear it).
	video.muted = true;
	video.defaultMuted = true;
	video.setAttribute("muted", "");
	video.playsInline = true;
	video.setAttribute("playsinline", "");
	video.setAttribute("webkit-playsinline", "");

	try {
		await video.play();
		return true;
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

	const markPlaying = () => {
		playing = true;
		unbindGestureUnlock();
	};

	const onPlaying = () => markPlaying();
	const onPause = () => {
		// Keep poster visible if playback stops unexpectedly while page is visible.
		if (!document.hidden) playing = false;
	};

	video.addEventListener("playing", onPlaying);
	video.addEventListener("pause", onPause);

	const unlockAndPlay = () => {
		if (disposed || reduceMotion) return;
		void tryPlay(video).then((ok) => {
			if (ok) markPlaying();
		});
	};

	const onGesture = () => unlockAndPlay();

	const bindGestureUnlock = () => {
		if (gestureBound || reduceMotion) return;
		gestureBound = true;
		// Capture phase so we unlock even if UI handlers call stopPropagation.
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
		await waitForCanPlay(video);
		if (disposed || token !== syncToken) return;

		if (await tryPlay(video)) {
			markPlaying();
			return;
		}

		// Short delayed retries help flaky Instagram / Low Power Mode WebViews.
		for (const delay of [250, 750, 1500]) {
			await new Promise((r) => window.setTimeout(r, delay));
			if (disposed || token !== syncToken || playing) return;
			if (await tryPlay(video)) {
				markPlaying();
				return;
			}
		}

		bindGestureUnlock();
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

		if (reduceMotion) {
			video.pause();
			video.removeAttribute("autoplay");
			video.removeAttribute("src");
			video.load();
			unbindGestureUnlock();
			return;
		}

		video.muted = true;
		video.defaultMuted = true;
		video.loop = true;
		video.playsInline = true;
		video.setAttribute("muted", "");
		video.setAttribute("playsinline", "");
		video.setAttribute("webkit-playsinline", "");
		video.setAttribute("autoplay", "");

		const srcChanged = video.dataset.activeSrc !== nextSrc;
		if (srcChanged) {
			playing = false;
			syncToken += 1;
			video.dataset.activeSrc = nextSrc;
			video.src = nextSrc;
			video.load();
		}

		const token = syncToken;
		void attemptPlayWithRetries(token);
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
		video.removeEventListener("playing", onPlaying);
		video.removeEventListener("pause", onPause);
		desktopBg.removeEventListener("change", syncBgVideo);
		document.removeEventListener("visibilitychange", onVisibility);
		window.removeEventListener("pageshow", onPageShow);
	};
};
