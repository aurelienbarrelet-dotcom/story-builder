import { emit, EVENTS, on } from "../../core/events.js";
import { saveProjectLocally } from "../../core/project-service.js";
import { getProject } from "../../core/store.js";
import { getMapInstance } from "../map/map-service.js";

let placementModelId = null;
let boundMap = null;
let markerRecords = [];

export function setupModels3dMap() {
    on(EVENTS.MAP_STYLE_READY, () => {
        bindMapClickHandler();
        renderModelInstances();
    });
    on(EVENTS.PROJECT_REPLACED, () => {
        cancelModelPlacement();
        window.requestAnimationFrame(() => renderModelInstances());
    });

    bindMapClickHandler();
    renderModelInstances();
}

export function beginModelPlacement(modelId) {
    const map = getMapInstance();
    if (!map || !modelId) return false;

    bindMapClickHandler();
    placementModelId = modelId;
    setPlacementCursor(true);
    emit(EVENTS.MODEL3D_PLACEMENT_CHANGED, { active: true, modelId });
    return true;
}

export function cancelModelPlacement() {
    if (!placementModelId) return;
    placementModelId = null;
    setPlacementCursor(false);
    emit(EVENTS.MODEL3D_PLACEMENT_CHANGED, { active: false, modelId: null });
}

export function removeInstancesForModel(modelId) {
    const instances = getInstanceLibrary();
    for (let index = instances.length - 1; index >= 0; index -= 1) {
        if (instances[index]?.modelId === modelId) instances.splice(index, 1);
    }
    if (placementModelId === modelId) cancelModelPlacement();
}

export function renderModelInstances() {
    clearMarkers();

    const map = getMapInstance();
    if (!map || !window.mapboxgl) return;

    const models = new Map(getModelLibrary().map(model => [model.id, model]));
    for (const instance of getInstanceLibrary()) {
        const model = models.get(instance?.modelId);
        const longitude = Number(instance?.longitude);
        const latitude = Number(instance?.latitude);
        if (!model || !Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;

        const element = createMarkerElement(model);
        const popup = new window.mapboxgl.Popup({ offset: 30 }).setHTML(
            `<strong>${escapeHtml(model.name || "Modèle 3D")}</strong><br>` +
            `${longitude.toFixed(6)}, ${latitude.toFixed(6)}`
        );
        const marker = new window.mapboxgl.Marker({ element, anchor: "bottom" })
            .setLngLat([longitude, latitude])
            .setPopup(popup)
            .addTo(map);

        markerRecords.push({ marker, url: element.dataset.previewUrl || "" });
    }
}

function bindMapClickHandler() {
    const map = getMapInstance();
    if (!map || map === boundMap) return;
    boundMap = map;
    map.on("click", handleMapClick);
}

function handleMapClick(event) {
    if (!placementModelId) return;

    const project = getProject();
    const model = getModelLibrary().find(candidate => candidate.id === placementModelId);
    if (!project || !model) {
        cancelModelPlacement();
        return;
    }

    project.models3dInstances ??= [];
    project.models3dInstances.push({
        id: crypto.randomUUID(),
        modelId: placementModelId,
        longitude: Number(event.lngLat.lng),
        latitude: Number(event.lngLat.lat),
        altitude: 0,
        rotation: [0, 0, 0],
        scale: 1
    });

    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: true });
    saveProjectLocally();
    cancelModelPlacement();
    renderModelInstances();
}

function createMarkerElement(model) {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "models3d-map-marker";
    marker.title = model.name || "Modèle 3D";
    marker.setAttribute("aria-label", `Afficher ${model.name || "le modèle 3D"}`);

    try {
        const viewer = document.createElement("model-viewer");
        viewer.className = "models3d-map-marker-viewer";
        viewer.setAttribute("interaction-prompt", "none");
        viewer.setAttribute("camera-orbit", "35deg 70deg auto");
        viewer.setAttribute("disable-zoom", "");
        viewer.setAttribute("alt", "");
        const url = createGlbObjectUrl(model);
        marker.dataset.previewUrl = url;
        viewer.src = url;
        marker.append(viewer);
    } catch {
        const fallback = document.createElement("span");
        fallback.className = "models3d-map-marker-viewer";
        fallback.textContent = "3D";
        fallback.setAttribute("aria-hidden", "true");
        marker.append(fallback);
    }

    return marker;
}

function clearMarkers() {
    for (const record of markerRecords) {
        record.marker.remove();
        if (record.url) URL.revokeObjectURL(record.url);
    }
    markerRecords = [];
}

function setPlacementCursor(active) {
    const canvas = getMapInstance()?.getCanvas?.();
    canvas?.classList.toggle("models3d-placement-cursor", active);
}

function getModelLibrary() {
    const project = getProject();
    if (!project) return [];
    project.assets ??= {};
    project.assets.models ??= [];
    return project.assets.models;
}

function getInstanceLibrary() {
    const project = getProject();
    if (!project) return [];
    project.models3dInstances ??= [];
    return project.models3dInstances;
}

function createGlbObjectUrl(model) {
    if (model.encoding !== "base64" || !model.data) throw new Error("Données GLB indisponibles.");
    const binary = atob(model.data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return URL.createObjectURL(new Blob([bytes], { type: model.mimeType || "model/gltf-binary" }));
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
