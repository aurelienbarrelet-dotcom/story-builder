import { MAPBOX_TOKEN_KEY } from "../../core/config.js";
import { emit, EVENTS } from "../../core/events.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getChapters, getProjectConfig, getSelectedChapterIndex, getSelectedMapTarget, getSelectedMapTargets, getSelectedSection, getStory } from "../../core/store.js";
import { createTransitionTimeline, getTransitionEasingFunction, startTransitionProgress } from "../transitions/transition-timeline.js";

let map = null;
let baseLayerStyles = new Map();
let activeTransitionProgress = null;
let editableLayerCatalog = [];

const LAYER_CONTROLS = Object.freeze({
    fill: {
        opacity: ["fill-opacity"],
        controls: [
            { key: "fill-color", label: "Couleur", kind: "color" }
        ]
    },
    line: {
        opacity: ["line-opacity"],
        controls: [
            { key: "line-color", label: "Couleur", kind: "color" },
            { key: "line-width", label: "Épaisseur", kind: "number", min: 0, max: 30, step: 0.5, unit: "px" }
        ]
    },
    circle: {
        opacity: ["circle-opacity", "circle-stroke-opacity"],
        controls: [
            { key: "circle-color", label: "Couleur", kind: "color" },
            { key: "circle-radius", label: "Rayon", kind: "number", min: 0, max: 50, step: 0.5, unit: "px" }
        ]
    },
    symbol: {
        opacity: ["icon-opacity", "text-opacity"],
        controls: [
            { key: "text-color", label: "Couleur du texte", kind: "color" },
            { key: "text-opacity", label: "Opacité du texte", kind: "range", min: 0, max: 1, step: 0.01 },
            { key: "icon-opacity", label: "Opacité des icônes", kind: "range", min: 0, max: 1, step: 0.01 }
        ]
    },
    raster: { opacity: ["raster-opacity"], controls: [] },
    background: {
        opacity: ["background-opacity"],
        controls: [{ key: "background-color", label: "Couleur", kind: "color" }]
    },
    "fill-extrusion": {
        opacity: ["fill-extrusion-opacity"],
        controls: [{ key: "fill-extrusion-color", label: "Couleur", kind: "color" }]
    },
    heatmap: {
        opacity: ["heatmap-opacity"],
        controls: []
    }
});

export function getMapboxToken() {
    const projectToken = String(getStory()?.mapboxToken ?? "").trim();
    if (projectToken) return projectToken;

    // Compatibilité avec les projets antérieurs au Sprint 12.12.
    return localStorage.getItem(MAPBOX_TOKEN_KEY) ?? "";
}

export function saveMapboxToken(token) {
    const value = String(token ?? "").trim();
    const story = getStory();
    if (story) story.mapboxToken = value;

    // Une copie locale permet de migrer sans rupture les anciens projets.
    value ? localStorage.setItem(MAPBOX_TOKEN_KEY, value) : localStorage.removeItem(MAPBOX_TOKEN_KEY);
    return value;
}

export function initializeMap() {
    const token = getMapboxToken();
    updateEmptyState(!token);
    if (!token) { destroyMap(); updateMapCoordinates(); return; }
    if (!window.mapboxgl || !window.mapboxgl.supported()) {
        updateEmptyState(true, "Mapbox GL JS ou WebGL 2 n’est pas disponible.");
        return;
    }

    destroyMap();
    baseLayerStyles = new Map();
    editableLayerCatalog = [];
    window.mapboxgl.accessToken = token;
    const location = getSelectedMapTarget()?.location ?? { center: [6.6323, 46.5197], zoom: 9, pitch: 0, bearing: 0 };
    map = new window.mapboxgl.Map({
        container: "map",
        style: getStory()?.mapStyle ?? "mapbox://styles/mapbox/standard",
        ...location
    });
    map.addControl(new window.mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", handleStyleReady);
    map.on("style.load", handleStyleReady);
    map.on("move", () => { updateMapCoordinates(); emit(EVENTS.MAP_CAMERA_CHANGED, getCurrentCamera()); });
    map.on("error", event => {
        const message = String(event.error?.message ?? "").toLowerCase();
        if (message.includes("token") || message.includes("unauthorized")) {
            updateEmptyState(true, "Le token Mapbox semble invalide ou non autorisé.");
        }
    });
}

function handleStyleReady() {
    refreshEditableLayerCatalog();
    captureBaseLayerStyles();
    updateEmptyState(false);
    applySelectedChapterLayerOpacity();
    updateMapCoordinates();
    emit(EVENTS.MAP_CAMERA_CHANGED, getCurrentCamera());
    emit(EVENTS.MAP_STYLE_READY, { layers: getEditableLayers() });
}

export function getMapInstance() { return map; }

export function destroyMap() { map?.remove(); map = null; editableLayerCatalog = []; baseLayerStyles = new Map(); }

export function getCurrentCamera() {
    if (!map) return null;
    const center = map.getCenter();
    return {
        center: [round(center.lng, 6), round(center.lat, 6)],
        zoom: round(map.getZoom(), 3), pitch: round(map.getPitch(), 2), bearing: round(map.getBearing(), 2)
    };
}

export function setCurrentCamera(camera, options = {}) {
    if (!map) return false;
    map.easeTo({
        center: [clamp(Number(camera.center[0]), -180, 180), clamp(Number(camera.center[1]), -85, 85)],
        zoom: clamp(Number(camera.zoom), 0, 24), pitch: clamp(Number(camera.pitch), 0, 85),
        bearing: normalizeBearing(Number(camera.bearing)), duration: options.instant ? 0 : 350, essential: true
    });
    return true;
}

export function getStoredCamera(target = getSelectedMapTarget(), viewMode = "desktop") {
    if (!target) return null;
    return viewMode === "mobile"
        ? (target.mobileLocation ?? target.location ?? null)
        : (target.location ?? null);
}

export function captureCurrentMapView(viewMode = "desktop") {
    const chapter = getSelectedMapTarget();
    const camera = getCurrentCamera();
    if (!chapter || !camera) return false;
    if (viewMode === "mobile") chapter.mobileLocation = camera;
    else chapter.location = camera;
    commitProjectChange();
    emit(EVENTS.RENDER_REQUESTED);
    return true;
}

export function clearSelectedMobileMapView() {
    const chapter = getSelectedMapTarget();
    if (!chapter) return false;
    delete chapter.mobileLocation;
    commitProjectChange();
    emit(EVENTS.RENDER_REQUESTED);
    flyToSelectedChapter({ viewMode: "mobile", instant: true });
    return true;
}

export function flyToSelectedChapter(options = {}) {
    const chapter = getSelectedMapTarget();
    const camera = getStoredCamera(chapter, options.viewMode ?? "desktop");
    if (!camera || !map) return;
    const timeline = createTransitionTimeline(chapter);
    const method = options.instant ? "jumpTo" : timeline.camera.method;
    const cameraOptions = {
        ...camera,
        duration: options.instant ? 0 : timeline.camera.duration,
        essential: timeline.camera.essential,
        easing: getTransitionEasingFunction(timeline.camera.easing)
    };
    if (typeof map[method] === "function") map[method](cameraOptions); else map.flyTo(cameraOptions);
    applySelectedChapterLayerOpacity();
}

export function previewSelectedChapterTransition() {
    if (!map || !map.isStyleLoaded() || getSelectedSection() !== "chapter") return false;

    const chapters = getChapters();
    const selectedIndex = getSelectedChapterIndex();
    const chapter = chapters[selectedIndex];
    if (!chapter) return false;

    const source = selectedIndex > 0 ? chapters[selectedIndex - 1] : getProjectConfig();
    const sourceCamera = getStoredCamera(source, "desktop");
    if (sourceCamera) map.jumpTo(sourceCamera);
    applyLayerState(source, { instant: true, silent: true });

    waitForPreviewSourceFrame(() => {
        const targetCamera = getStoredCamera(chapter, "desktop");
        const timeline = createTransitionTimeline(chapter);
        const method = timeline.camera.method;
        const cameraOptions = {
            ...targetCamera,
            duration: timeline.camera.duration,
            essential: timeline.camera.essential,
            easing: getTransitionEasingFunction(timeline.camera.easing)
        };
        if (targetCamera) {
            if (typeof map[method] === "function") map[method](cameraOptions);
            else map.flyTo(cameraOptions);
        }

        // Réutilise le même moteur d'état que la lecture : restauration de la
        // base, héritage du projet, puis état complet du chapitre cible.
        applyLayerState(chapter, { silent: true });

        // La progression normalisée devient l’horloge commune de l’aperçu.
        // Le rendu reste natif Mapbox ; les futures interpolations pourront
        // consommer directement les valeurs caméra et calques comprises entre 0 et 1.
        activeTransitionProgress?.cancel();
        const progressController = startTransitionProgress(chapter, {
            onFrame: () => map?.triggerRepaint(),
            onComplete: () => { activeTransitionProgress = null; }
        });
        activeTransitionProgress = progressController.duration > 0 ? progressController : null;
    });

    return true;
}

function waitForPreviewSourceFrame(callback) {
    let completed = false;
    const run = () => {
        if (completed) return;
        completed = true;

        // Deux images et une courte stabilisation garantissent que l'état
        // source a réellement été peint avant de définir les valeurs cibles.
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                window.setTimeout(callback, 80);
            });
        });
    };

    map.once("idle", run);
    map.triggerRepaint();
    window.setTimeout(run, 240);
}

export function updateMapStyle(styleUrl) {
    const story = getStory();
    if (!story) return;
    story.mapStyle = String(styleUrl ?? "").trim() || "mapbox://styles/mapbox/standard";
    commitProjectChange();
    baseLayerStyles = new Map();
    editableLayerCatalog = [];
    map?.setStyle(story.mapStyle);
}

export function getLayerControlDefinitions(type) {
    return LAYER_CONTROLS[type] ?? null;
}

export function getEditableLayers() {
    if (!map) return [];

    // Mapbox peut brièvement signaler un style indisponible pendant certains
    // rafraîchissements internes. Le catalogue capturé à style.load reste la
    // source stable du panneau, quel que soit le chapitre actif.
    if (!editableLayerCatalog.length && map.isStyleLoaded()) {
        refreshEditableLayerCatalog();
    }

    return editableLayerCatalog
        .filter(layer => Boolean(map.getLayer(layer.id)))
        .map(layer => ({
            ...layer,
            opacity: getLayerOpacity(layer),
            modified: getSelectedMapTargets().some(chapter => Boolean(chapter.layerStyles?.[layer.id]) || Object.hasOwn(chapter.layerOpacity ?? {}, layer.id))
        }));
}

function refreshEditableLayerCatalog() {
    if (!map?.isStyleLoaded()) return;
    const layers = (map.getStyle()?.layers ?? [])
        .filter(layer => LAYER_CONTROLS[layer.type])
        .map(layer => ({
            id: layer.id,
            type: layer.type,
            label: layer.id.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase())
        }));

    if (layers.length) editableLayerCatalog = layers;
}

export function getSelectedLayerValue(layerId, section, property) {
    const chapters = getSelectedMapTargets();
    if (!chapters.length) return { mixed: false, value: undefined, explicit: false };
    const values = chapters.map(chapter => chapter.layerStyles?.[layerId]?.[section]?.[property]);
    const explicit = values.some(value => value !== undefined);
    const normalized = values.map(value => value === undefined ? "__undefined__" : JSON.stringify(value));
    const mixed = new Set(normalized).size > 1;
    return { mixed, value: mixed ? undefined : values[0], explicit };
}

export function getBaseLayerProperty(layerId, section, property) {
    const projectValue = getProjectConfig()?.layerStyles?.[layerId]?.[section]?.[property];
    if (getSelectedSection() === "chapter" && projectValue !== undefined) return cloneStyleValue(projectValue);
    const captured = baseLayerStyles.get(layerId)?.[section]?.[property];
    if (captured !== undefined) return cloneStyleValue(captured);
    if (!map?.getLayer(layerId)) return undefined;
    try {
        return section === "layout" ? map.getLayoutProperty(layerId, property) : map.getPaintProperty(layerId, property);
    } catch { return undefined; }
}

export function getCurrentLayerProperty(layerId, section, property) {
    const chapterValue = getSelectedMapTarget()?.layerStyles?.[layerId]?.[section]?.[property];
    if (getSelectedSection() === "chapter" && chapterValue !== undefined) return cloneStyleValue(chapterValue);
    return getBaseLayerProperty(layerId, section, property);
}

export function setSelectedChapterLayerProperty(layerId, section, property, value) {
    const chapters = getSelectedMapTargets();
    const layer = map?.getLayer(layerId);
    if (!chapters.length || !layer || !["paint", "layout"].includes(section)) return false;
    chapters.forEach(chapter => {
        chapter.layerStyles ??= {};
        chapter.layerStyles[layerId] ??= { paint: {}, layout: {} };
        chapter.layerStyles[layerId][section] ??= {};
        chapter.layerStyles[layerId][section][property] = value;
        if (section === "paint" && (LAYER_CONTROLS[layer.type]?.opacity ?? []).includes(property)) {
            chapter.layerOpacity ??= {};
            chapter.layerOpacity[layerId] = Number(value);
        }
    });
    applyProperty(layerId, section, property, value);
    commitProjectChange();
    emit(EVENTS.MAP_STYLE_READY, { layers: getEditableLayers() });
    return true;
}

export function resetSelectedChapterLayerProperty(layerId, section, property) {
    const chapters = getSelectedMapTargets();
    const layer = map?.getLayer(layerId);
    if (!chapters.length || !layer) return false;
    chapters.forEach(chapter => {
        const styles = chapter.layerStyles?.[layerId];
        if (styles?.[section]) delete styles[section][property];
        cleanupLayerStyle(chapter, layerId);
        if (section === "paint" && (LAYER_CONTROLS[layer.type]?.opacity ?? []).includes(property)) {
            if (chapter.layerOpacity) delete chapter.layerOpacity[layerId];
        }
    });
    restoreProperty(layerId, section, property);
    commitProjectChange();
    emit(EVENTS.MAP_STYLE_READY, { layers: getEditableLayers() });
    return true;
}

export function resetSelectedChapterLayerStyles(layerId) {
    const chapters = getSelectedMapTargets();
    const layer = map?.getLayer(layerId);
    if (!chapters.length || !layer) return false;
    chapters.forEach(chapter => {
        if (chapter.layerStyles) delete chapter.layerStyles[layerId];
        if (chapter.layerOpacity) delete chapter.layerOpacity[layerId];
    });
    restoreLayer(layer);
    commitProjectChange();
    emit(EVENTS.MAP_STYLE_READY, { layers: getEditableLayers() });
    return true;
}

export function resetAllSelectedChapterLayerStyles() {
    const chapters = getSelectedMapTargets();
    if (!chapters.length) return false;
    chapters.forEach(chapter => { chapter.layerStyles = {}; chapter.layerOpacity = {}; });
    if (map?.isStyleLoaded()) getEditableLayers().forEach(({ id }) => restoreLayer(map.getLayer(id)));
    commitProjectChange();
    emit(EVENTS.MAP_STYLE_READY, { layers: getEditableLayers() });
    return true;
}

export function setSelectedChapterLayerOpacity(layerId, opacity) {
    const layer = map?.getLayer(layerId);
    const property = LAYER_CONTROLS[layer?.type]?.opacity?.[0];
    if (!property) return false;
    const value = clamp(Number(opacity), 0, 1);
    const chapters = getSelectedMapTargets();
    chapters.forEach(chapter => {
        chapter.layerOpacity ??= {};
        chapter.layerOpacity[layerId] = value;
        chapter.layerStyles ??= {};
        chapter.layerStyles[layerId] ??= { paint: {}, layout: {} };
        (LAYER_CONTROLS[layer.type].opacity ?? []).forEach(key => chapter.layerStyles[layerId].paint[key] = value);
    });
    applyOpacity(layer, value);
    commitProjectChange();
    emit(EVENTS.MAP_STYLE_READY, { layers: getEditableLayers() });
    return true;
}

export function resetSelectedChapterLayerOpacity(layerId) {
    const layer = map?.getLayer(layerId);
    if (!layer) return false;
    const chapters = getSelectedMapTargets();
    chapters.forEach(chapter => {
        if (chapter.layerOpacity) delete chapter.layerOpacity[layerId];
        (LAYER_CONTROLS[layer.type]?.opacity ?? []).forEach(property => {
            if (chapter.layerStyles?.[layerId]?.paint) delete chapter.layerStyles[layerId].paint[property];
        });
        cleanupLayerStyle(chapter, layerId);
    });
    (LAYER_CONTROLS[layer.type]?.opacity ?? []).forEach(property => restoreProperty(layerId, "paint", property));
    commitProjectChange();
    emit(EVENTS.MAP_STYLE_READY, { layers: getEditableLayers() });
    return true;
}

export function applySelectedChapterLayerOpacity() {
    const chapter = getSelectedMapTarget();
    if (!chapter || !map || !map.isStyleLoaded()) return;
    applyLayerState(chapter, { instant: true });
}

function applyLayerState(chapter, options = {}) {
    if (!chapter || !map || !map.isStyleLoaded()) return;
    const layers = getEditableLayers();
    layers.forEach(({ id }) => {
        const layer = map.getLayer(id);
        if (!layer) return;
        applyLayerTransition(layer, chapter, options);
        restoreLayer(layer);
        const projectConfig = getProjectConfig();
        if (chapter !== projectConfig) {
            const projectOpacity = projectConfig?.layerOpacity?.[id];
            if (projectOpacity !== undefined && !projectConfig?.layerStyles?.[id]) applyOpacity(layer, projectOpacity);
            applyLayerStyle(layer, projectConfig?.layerStyles?.[id]);
        }
        const legacyOpacity = chapter.layerOpacity?.[id];
        if (legacyOpacity !== undefined && !chapter.layerStyles?.[id]) applyOpacity(layer, legacyOpacity);
        applyLayerStyle(layer, chapter.layerStyles?.[id]);
    });
    if (!options.silent) emit(EVENTS.MAP_STYLE_READY, { layers: getEditableLayers() });
}

function applyLayerStyle(layer, style) {
    if (!style) return;
    Object.entries(style.paint ?? {}).forEach(([property, value]) => applyProperty(layer.id, "paint", property, value));
    Object.entries(style.layout ?? {}).forEach(([property, value]) => applyProperty(layer.id, "layout", property, value));
}

function applyLayerTransition(layer, chapter, options = {}) {
    const globalTrack = createTransitionTimeline(chapter).layers;
    const override = chapter.layerTransitions?.[layer.id];
    const track = override ? {
        enabled: override.enabled !== false,
        duration: Math.max(0, Number(override.duration) || 0),
        delay: Math.max(0, Number(override.delay) || 0),
        effect: override.effect || "fade"
    } : { ...globalTrack, effect: "fade" };
    const enabled = track.enabled && track.effect !== "none" && !options.instant;
    const properties = new Set(LAYER_CONTROLS[layer.type]?.opacity ?? []);
    if (track.effect === "grow") {
        (LAYER_CONTROLS[layer.type]?.controls ?? []).forEach(control => {
            if (control.kind !== "color") properties.add(control.key);
        });
    }
    properties.forEach(property => {
        try {
            map.setPaintProperty(layer.id, `${property}-transition`, {
                duration: enabled ? track.duration : 0,
                delay: enabled ? track.delay : 0
            });
        } catch {}
    });
}

function applyProperty(layerId, section, property, value) {
    try {
        if (section === "layout") map.setLayoutProperty(layerId, property, value);
        else map.setPaintProperty(layerId, property, value);
    } catch (error) { console.warn(`Propriété Mapbox ignorée : ${layerId}.${property}`, error); }
}

function applyOpacity(layer, value) {
    (LAYER_CONTROLS[layer.type]?.opacity ?? []).forEach(property => applyProperty(layer.id, "paint", property, value));
}

function captureBaseLayerStyles() {
    if (!map?.isStyleLoaded() || baseLayerStyles.size) return;
    (map.getStyle()?.layers ?? [])
        .filter(layer => LAYER_CONTROLS[layer.type])
        .forEach(layer => {
            const paint = {};
            const properties = new Set([
                ...(LAYER_CONTROLS[layer.type]?.opacity ?? []),
                ...(LAYER_CONTROLS[layer.type]?.controls ?? []).map(control => control.key)
            ]);
            properties.forEach(property => {
                try { paint[property] = cloneStyleValue(map.getPaintProperty(layer.id, property)); } catch {}
            });
            let visibility;
            try { visibility = cloneStyleValue(map.getLayoutProperty(layer.id, "visibility")); } catch {}
            baseLayerStyles.set(layer.id, { paint, layout: { visibility } });
        });
}

function restoreProperty(layerId, section, property) {
    const projectValue = getProjectConfig()?.layerStyles?.[layerId]?.[section]?.[property];
    const useProjectValue = getSelectedSection() === "chapter" && projectValue !== undefined;
    const base = useProjectValue ? projectValue : baseLayerStyles.get(layerId)?.[section]?.[property];
    applyProperty(layerId, section, property, base === undefined ? null : cloneStyleValue(base));
}

function restoreLayer(layer) {
    if (!layer) return;
    (LAYER_CONTROLS[layer.type]?.opacity ?? []).forEach(property => restoreProperty(layer.id, "paint", property));
    (LAYER_CONTROLS[layer.type]?.controls ?? []).forEach(control => restoreProperty(layer.id, "paint", control.key));
    restoreProperty(layer.id, "layout", "visibility");
}

function cloneStyleValue(value) {
    if (value === undefined || value === null || typeof value !== "object") return value;
    try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
}

function cleanupLayerStyle(chapter, layerId) {
    const style = chapter.layerStyles?.[layerId];
    if (!style) return;
    if (!Object.keys(style.paint ?? {}).length && !Object.keys(style.layout ?? {}).length) delete chapter.layerStyles[layerId];
}

function getLayerOpacity(layer) {
    const chapter = getSelectedMapTarget();
    if (Object.hasOwn(chapter?.layerOpacity ?? {}, layer.id)) return chapter.layerOpacity[layer.id];
    const property = LAYER_CONTROLS[layer.type]?.opacity?.[0];
    const styled = chapter?.layerStyles?.[layer.id]?.paint?.[property];
    if (typeof styled === "number") return styled;
    try {
        const value = map.getPaintProperty(layer.id, property);
        return typeof value === "number" ? value : 1;
    } catch { return 1; }
}

export function updateMapCoordinates() {
    const output = document.getElementById("mapCoordinates");
    const camera = getCurrentCamera();
    if (!output) return;
    output.textContent = camera
        ? `lng ${camera.center[0].toFixed(5)} · lat ${camera.center[1].toFixed(5)} · zoom ${camera.zoom.toFixed(2)} · pitch ${camera.pitch.toFixed(1)}° · bearing ${camera.bearing.toFixed(1)}°`
        : "Carte non connectée";
}

export function updateEmptyState(show, message = "") {
    const element = document.getElementById("mapEmptyState");
    if (!element) return;
    element.classList.toggle("hidden", !show);
    if (message) element.querySelector("p").textContent = message;
}

export function resizeMap() { map?.resize(); }
function clamp(value, min, max) { return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min; }
function normalizeBearing(value) { return Number.isFinite(value) ? ((value + 180) % 360 + 360) % 360 - 180 : 0; }
function round(value, precision) { const multiplier = 10 ** precision; return Math.round(value * multiplier) / multiplier; }
