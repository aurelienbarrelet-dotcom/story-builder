function labelFromId(id) {
    return String(id).replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

function getInlineGeoJson(source) {
    if (!source || source.type !== "geojson") return null;
    return source.data && typeof source.data === "object" ? source.data : null;
}

function geometriesFromGeoJson(data) {
    if (!data) return [];
    if (data.type === "FeatureCollection") return data.features.map(feature => feature?.geometry).filter(Boolean);
    if (data.type === "Feature") return [data.geometry].filter(Boolean);
    return [data];
}

function hasLineGeometry(source) {
    return geometriesFromGeoJson(getInlineGeoJson(source)).some(geometry => ["LineString", "MultiLineString", "GeometryCollection"].includes(geometry?.type));
}

export function buildMotionLayerCatalog(map) {
    const style = map?.getStyle?.();
    const layers = style?.layers ?? [];
    const sources = style?.sources ?? {};
    return {
        actors: layers.filter(layer => layer.type === "model").map(layer => ({
            layerId: layer.id,
            type: "model",
            sourceId: layer.source ?? null,
            sourceLayer: layer["source-layer"] ?? null,
            label: labelFromId(layer.id)
        })),
        routes: layers.filter(layer => layer.type === "line").map(layer => ({
            layerId: layer.id,
            sourceId: layer.source ?? null,
            sourceLayer: layer["source-layer"] ?? null,
            label: labelFromId(layer.id),
            inlineGeometryAvailable: hasLineGeometry(sources[layer.source])
        }))
    };
}

function matchesFeatureId(feature, featureId) {
    if (featureId == null) return true;
    return String(feature?.id ?? feature?.properties?.id ?? "") === String(featureId);
}

function lineFeature(features, featureId) {
    return features.find(feature => matchesFeatureId(feature, featureId)
        && ["LineString", "MultiLineString", "GeometryCollection"].includes(feature?.geometry?.type));
}

export function resolveRouteFeature(map, routeReference) {
    const layer = map?.getLayer?.(routeReference?.layerId);
    if (!layer) throw new Error(`Calque de trajectoire introuvable : ${routeReference?.layerId ?? "non défini"}.`);
    const sourceId = routeReference.sourceId ?? layer.source;
    const sourceLayer = routeReference.sourceLayer ?? layer["source-layer"];
    const sourceDefinition = map.getStyle()?.sources?.[sourceId];
    const data = getInlineGeoJson(sourceDefinition);
    const inlineFeatures = data?.type === "FeatureCollection" ? data.features : data?.type === "Feature" ? [data] : data ? [{ type: "Feature", geometry: data, properties: {} }] : [];
    const inlineMatch = lineFeature(inlineFeatures, routeReference.featureId);
    if (inlineMatch) return inlineMatch;

    const queried = map.querySourceFeatures(sourceId, sourceLayer ? { sourceLayer } : {});
    const queriedMatch = lineFeature(queried, routeReference.featureId);
    if (queriedMatch) return queriedMatch;
    throw new Error("Aucune LineString exploitable n’a été trouvée dans le calque sélectionné.");
}
