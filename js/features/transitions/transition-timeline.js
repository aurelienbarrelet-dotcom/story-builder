const DEFAULT_CAMERA_DURATION = 1200;
const DEFAULT_LAYER_DURATION = 600;

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
        essential: source.essential !== false
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
