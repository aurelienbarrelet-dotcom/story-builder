const EARTH_RADIUS_METERS = 6371008.8;

function toRadians(value) {
    return Number(value) * Math.PI / 180;
}

function clampProgress(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

function isCoordinate(value) {
    return Array.isArray(value) && value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]));
}

export function distanceBetweenCoordinates(start, end) {
    const lat1 = toRadians(start[1]);
    const lat2 = toRadians(end[1]);
    const deltaLat = lat2 - lat1;
    const deltaLng = toRadians(end[0] - start[0]);
    const a = Math.sin(deltaLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function extractLineStrings(geometry) {
    if (!geometry || typeof geometry !== "object") return [];
    if (geometry.type === "LineString") return [geometry.coordinates];
    if (geometry.type === "MultiLineString") return geometry.coordinates;
    if (geometry.type === "GeometryCollection") return geometry.geometries.flatMap(extractLineStrings);
    return [];
}

export function prepareRoute(geometry) {
    const lines = extractLineStrings(geometry)
        .map(line => line.filter(isCoordinate).map(coordinate => [Number(coordinate[0]), Number(coordinate[1]), Number(coordinate[2] ?? 0)]))
        .filter(line => line.length >= 2);
    if (!lines.length) throw new Error("La géométrie sélectionnée ne contient aucune LineString exploitable.");

    const coordinates = lines.reduce((result, line) => {
        if (!result.length) return [...line];
        const previous = result[result.length - 1];
        const first = line[0];
        if (previous[0] === first[0] && previous[1] === first[1]) result.push(...line.slice(1));
        else result.push(...line);
        return result;
    }, []);

    let totalDistance = 0;
    const segments = [];
    for (let index = 1; index < coordinates.length; index += 1) {
        const start = coordinates[index - 1];
        const end = coordinates[index];
        const length = distanceBetweenCoordinates(start, end);
        segments.push({ start, end, startDistance: totalDistance, endDistance: totalDistance + length, length });
        totalDistance += length;
    }
    if (!totalDistance) throw new Error("La LineString sélectionnée a une longueur nulle.");
    return { coordinates, segments, totalDistance };
}

export function evaluateRoute(preparedRoute, progress) {
    if (!preparedRoute?.segments?.length) throw new Error("La trajectoire n’a pas été préparée.");
    const normalized = clampProgress(progress);
    const targetDistance = preparedRoute.totalDistance * normalized;
    const segment = preparedRoute.segments.find(item => targetDistance <= item.endDistance)
        ?? preparedRoute.segments[preparedRoute.segments.length - 1];
    const local = segment.length ? (targetDistance - segment.startDistance) / segment.length : 0;
    const lng = segment.start[0] + (segment.end[0] - segment.start[0]) * local;
    const lat = segment.start[1] + (segment.end[1] - segment.start[1]) * local;
    const altitude = segment.start[2] + (segment.end[2] - segment.start[2]) * local;
    const bearing = Math.atan2(
        Math.sin(toRadians(segment.end[0] - segment.start[0])) * Math.cos(toRadians(segment.end[1])),
        Math.cos(toRadians(segment.start[1])) * Math.sin(toRadians(segment.end[1]))
            - Math.sin(toRadians(segment.start[1])) * Math.cos(toRadians(segment.end[1]))
            * Math.cos(toRadians(segment.end[0] - segment.start[0]))
    ) * 180 / Math.PI;
    return { coordinates: [lng, lat, altitude], bearing, progress: normalized };
}
