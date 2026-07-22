const ACTOR_TYPES = new Set(["model", "point"]);
const TIMELINE_MODES = new Set(["chapter-range"]);
const DIRECTIONS = new Set(["forward", "reverse"]);
const ORIENTATIONS = new Set(["fixed", "follow-path", "follow-path-reverse"]);

function optionalString(value) {
    const normalized = String(value ?? "").trim();
    return normalized || null;
}

export function createMotionDefinition(options = {}) {
    return normalizeMotionDefinition({
        id: options.id ?? crypto.randomUUID(),
        name: options.name ?? "Nouvelle trajectoire",
        enabled: options.enabled ?? true,
        actor: options.actor ?? {},
        route: options.route ?? {},
        timeline: options.timeline ?? {},
        motion: options.motion ?? {}
    });
}

export function normalizeMotionDefinition(value, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const actor = source.actor && typeof source.actor === "object" ? source.actor : {};
    const route = source.route && typeof source.route === "object" ? source.route : {};
    const timeline = source.timeline && typeof source.timeline === "object" ? source.timeline : {};
    const motion = source.motion && typeof source.motion === "object" ? source.motion : {};
    const headingOffset = Number(motion.headingOffset);
    const altitudeOffset = Number(motion.altitudeOffset);

    return {
        id: optionalString(source.id) ?? `motion-${index + 1}`,
        name: String(source.name ?? `Trajectoire ${index + 1}`),
        enabled: source.enabled !== false,
        actor: {
            type: ACTOR_TYPES.has(actor.type) ? actor.type : "model",
            layerId: optionalString(actor.layerId),
            featureId: optionalString(actor.featureId)
        },
        route: {
            layerId: optionalString(route.layerId),
            sourceId: optionalString(route.sourceId),
            sourceLayer: optionalString(route.sourceLayer),
            featureId: optionalString(route.featureId)
        },
        timeline: {
            mode: TIMELINE_MODES.has(timeline.mode) ? timeline.mode : "chapter-range",
            startChapterId: optionalString(timeline.startChapterId),
            endChapterId: optionalString(timeline.endChapterId),
            distribution: "uniform"
        },
        motion: {
            direction: DIRECTIONS.has(motion.direction) ? motion.direction : "forward",
            orientation: ORIENTATIONS.has(motion.orientation) ? motion.orientation : "follow-path",
            headingOffset: Number.isFinite(headingOffset) ? headingOffset : 0,
            altitudeOffset: Number.isFinite(altitudeOffset) ? altitudeOffset : 0
        }
    };
}

export function normalizeMotions(value) {
    if (!Array.isArray(value)) return [];
    const ids = new Set();
    return value.map((motion, index) => {
        const normalized = normalizeMotionDefinition(motion, index);
        if (ids.has(normalized.id)) normalized.id = `${normalized.id}-${index + 1}`;
        ids.add(normalized.id);
        return normalized;
    });
}
