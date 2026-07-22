import { getMotionProgress } from "./motion-chapter-progress.js";
import { evaluateRoute, prepareRoute } from "./motion-route.js";

export function createPreparedMotion(motion, routeFeature) {
    return { definition: motion, route: prepareRoute(routeFeature?.geometry ?? routeFeature) };
}

export function evaluateMotion(preparedMotion, chapters, chapterId, chapterProgress = 0) {
    const progress = getMotionProgress(preparedMotion?.definition, chapters, chapterId, chapterProgress);
    if (progress == null) return null;
    const pose = evaluateRoute(preparedMotion.route, progress);
    const definition = preparedMotion.definition;
    const orientation = definition.motion.orientation;
    const headingDirection = orientation === "follow-path-reverse" ? 180 : 0;
    return {
        ...pose,
        bearing: orientation === "fixed" ? definition.motion.headingOffset : pose.bearing + headingDirection + definition.motion.headingOffset,
        coordinates: [pose.coordinates[0], pose.coordinates[1], pose.coordinates[2] + definition.motion.altitudeOffset]
    };
}
