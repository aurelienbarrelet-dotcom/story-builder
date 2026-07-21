const DEFAULT_CAMERA_DURATION = 1200;
const DEFAULT_LAYER_DURATION = 600;
const DEFAULT_EASING = "ease-in-out";
const ALLOWED_EASINGS = new Set(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]);

export function createTransitionTimeline(chapter) {
    const camera = normalizeCameraTrack(chapter?.transition);
    const layers = normalizeLayerTrack(chapter?.layerTransition);

    return Object.freeze({
        camera,
        layers,
        duration: Math.max(camera.end, layers.end, 0)
    });
}

export function getTransitionTimelineDuration(chapter, minimum = 0) {
    return Math.max(createTransitionTimeline(chapter).duration, Math.max(0, Number(minimum) || 0));
}

function normalizeCameraTrack(source = {}) {
    const method = ["flyTo", "easeTo", "jumpTo"].includes(source.method)
        ? source.method
        : "flyTo";
    const duration = method === "jumpTo"
        ? 0
        : Math.max(0, Number(source.duration ?? DEFAULT_CAMERA_DURATION) || 0);

    return Object.freeze({
        start: 0,
        end: duration,
        duration,
        method,
        essential: source.essential !== false,
        easing: ALLOWED_EASINGS.has(source.easing) ? source.easing : DEFAULT_EASING
    });
}

function normalizeLayerTrack(source = {}) {
    const enabled = source.enabled !== false;
    const delay = enabled ? Math.max(0, Number(source.delay) || 0) : 0;
    const duration = enabled
        ? Math.max(0, Number(source.duration ?? DEFAULT_LAYER_DURATION) || 0)
        : 0;

    return Object.freeze({
        start: delay,
        end: delay + duration,
        delay,
        duration,
        enabled
    });
}

export function getTransitionEasingFunction(name) {
    const easing = ALLOWED_EASINGS.has(name) ? name : DEFAULT_EASING;
    if (easing === "linear") return t => t;
    if (easing === "ease-in") return t => t * t;
    if (easing === "ease-out") return t => 1 - ((1 - t) * (1 - t));
    if (easing === "ease") return t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}


export function createTransitionProgress(chapter, elapsedMs) {
    const timeline = createTransitionTimeline(chapter);
    const elapsed = Math.max(0, Number(elapsedMs) || 0);
    const overall = timeline.duration > 0 ? clamp01(elapsed / timeline.duration) : 1;
    const cameraLinear = getTrackProgress(timeline.camera, elapsed);

    return Object.freeze({
        elapsed,
        duration: timeline.duration,
        overall,
        camera: getTransitionEasingFunction(timeline.camera.easing)(cameraLinear),
        cameraLinear,
        layers: getTrackProgress(timeline.layers, elapsed),
        complete: overall >= 1
    });
}

export function startTransitionProgress(chapter, callbacks = {}) {
    const timeline = createTransitionTimeline(chapter);
    const requestFrame = globalThis.requestAnimationFrame?.bind(globalThis)
        ?? (callback => globalThis.setTimeout(() => callback(Date.now()), 16));
    const cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis)
        ?? globalThis.clearTimeout?.bind(globalThis);
    let frameId = null;
    let cancelled = false;
    let startedAt = null;

    const finish = progress => {
        callbacks.onFrame?.(progress);
        callbacks.onComplete?.(progress);
    };

    const tick = timestamp => {
        if (cancelled) return;
        if (startedAt === null) startedAt = timestamp;
        const progress = createTransitionProgress(chapter, timestamp - startedAt);
        callbacks.onFrame?.(progress);
        if (progress.complete) {
            callbacks.onComplete?.(progress);
            return;
        }
        frameId = requestFrame(tick);
    };

    if (timeline.duration <= 0) {
        finish(createTransitionProgress(chapter, timeline.duration));
    } else {
        frameId = requestFrame(tick);
    }

    return Object.freeze({
        duration: timeline.duration,
        cancel() {
            cancelled = true;
            if (frameId !== null) cancelFrame?.(frameId);
        }
    });
}

function getTrackProgress(track, elapsed) {
    if (!track.enabled && Object.hasOwn(track, "enabled")) return 1;
    if (track.duration <= 0) return elapsed >= track.start ? 1 : 0;
    return clamp01((elapsed - track.start) / track.duration);
}

function clamp01(value) {
    return Math.min(1, Math.max(0, Number(value) || 0));
}
