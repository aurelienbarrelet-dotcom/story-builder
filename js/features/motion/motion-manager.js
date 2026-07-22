import { on, EVENTS } from "../../core/events.js";
import { getChapters, getStory } from "../../core/store.js";
import { getMapInstance } from "../map/map-service.js";
import { createPreparedMotion, evaluateMotion } from "./motion-engine.js";
import { buildMotionLayerCatalog, resolveRouteFeature } from "./motion-layer-catalog.js";

let catalog = { actors: [], routes: [] };
const preparedMotions = new Map();

export function refreshMotionLayerCatalog() {
    const map = getMapInstance();
    catalog = map ? buildMotionLayerCatalog(map) : { actors: [], routes: [] };
    preparedMotions.clear();
    return getMotionLayerCatalog();
}

export function getMotionLayerCatalog() {
    return { actors: catalog.actors.map(item => ({ ...item })), routes: catalog.routes.map(item => ({ ...item })) };
}

export function prepareProjectMotion(motionId) {
    const motion = (getStory()?.motions ?? []).find(item => item.id === motionId);
    if (!motion) throw new Error(`Trajectoire introuvable : ${motionId}.`);
    const routeFeature = resolveRouteFeature(getMapInstance(), motion.route);
    const prepared = createPreparedMotion(motion, routeFeature);
    preparedMotions.set(motion.id, prepared);
    return prepared;
}

export function evaluateProjectMotion(motionId, chapterId, chapterProgress = 0) {
    const prepared = preparedMotions.get(motionId) ?? prepareProjectMotion(motionId);
    return evaluateMotion(prepared, getChapters(), chapterId, chapterProgress);
}

export function setupMotionManager() {
    on(EVENTS.MAP_STYLE_READY, refreshMotionLayerCatalog);
    on(EVENTS.PROJECT_REPLACED, () => preparedMotions.clear());
}
