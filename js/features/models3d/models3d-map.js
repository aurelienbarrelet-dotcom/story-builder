import * as THREE from "https://esm.sh/three@0.180.0";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { emit, EVENTS, on } from "../../core/events.js";
import { saveProjectLocally } from "../../core/project-service.js";
import { getProject } from "../../core/store.js";
import { getMapInstance } from "../map/map-service.js";

const LAYER_ID = "story-builder-models3d-editor";
let placementModelId = null;
let boundMap = null;
let renderer = null;
let renderEntries = [];
let objectUrls = [];
let renderRevision = 0;
let selectedInstanceId = null;
let moveModeActive = false;
let draggingInstance = false;

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

export function getSelectedModelInstanceId() {
    return selectedInstanceId;
}

export function selectModelInstance(instanceId) {
    const nextId = getInstanceLibrary().some(instance => instance.id === instanceId) ? instanceId : null;
    if (selectedInstanceId === nextId) return;
    selectedInstanceId = nextId;
    if (!selectedInstanceId) setSelectedInstanceMoveMode(false);
    emit(EVENTS.MODEL3D_INSTANCE_SELECTED, { instanceId: selectedInstanceId, moveModeActive });
    renderModelInstances();
}

export function setSelectedInstanceMoveMode(active) {
    moveModeActive = Boolean(active && selectedInstanceId);
    draggingInstance = false;
    const map = getMapInstance();
    map?.getCanvas?.()?.classList.toggle("models3d-move-cursor", moveModeActive);
    emit(EVENTS.MODEL3D_INSTANCE_SELECTED, { instanceId: selectedInstanceId, moveModeActive });
}

export function isSelectedInstanceMoveModeActive() {
    return moveModeActive;
}

export function snapSelectedInstanceToTerrain() {
    const map = getMapInstance();
    const instance = getInstanceLibrary().find(item => item.id === selectedInstanceId);
    if (!map || !instance) return { ok: false, message: "Aucune instance sélectionnée." };
    const elevation = map.queryTerrainElevation?.([Number(instance.longitude), Number(instance.latitude)], { exaggerated: false });
    if (!Number.isFinite(elevation)) {
        return { ok: false, message: "Le style Mapbox actuel ne fournit pas d’élévation de terrain." };
    }
    instance.altitude = elevation;
    instance.snapToTerrain = true;
    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: true });
    saveProjectLocally();
    renderModelInstances();
    emit(EVENTS.MODEL3D_INSTANCE_SELECTED, { instanceId: selectedInstanceId, moveModeActive });
    return { ok: true, elevation };
}

export function removeInstancesForModel(modelId) {
    const instances = getInstanceLibrary();
    for (let index = instances.length - 1; index >= 0; index -= 1) {
        if (instances[index]?.modelId === modelId) instances.splice(index, 1);
    }
    if (placementModelId === modelId) cancelModelPlacement();
    if (!getInstanceLibrary().some(instance => instance.id === selectedInstanceId)) {
        selectedInstanceId = null;
        emit(EVENTS.MODEL3D_INSTANCE_SELECTED, { instanceId: null });
    }
    renderModelInstances();
}

export function renderModelInstances() {
    const map = getMapInstance();
    if (!map?.getStyle?.()) return;
    const revision = ++renderRevision;
    removeEditorLayer(map);
    releaseObjectUrls();
    renderEntries = [];

    const customLayer = {
        id: LAYER_ID,
        type: "custom",
        renderingMode: "3d",
        onAdd(currentMap, gl) {
            renderer = new THREE.WebGLRenderer({
                canvas: currentMap.getCanvas(),
                context: gl,
                antialias: true
            });
            renderer.autoClear = false;
            loadRenderEntries(revision).then(() => currentMap.triggerRepaint());
        },
        render(gl, matrix) {
            if (!renderer || revision !== renderRevision) return;
            const mapMatrix = new THREE.Matrix4().fromArray(matrix);
            const camera = new THREE.Camera();
            renderer.resetState();
            for (const entry of renderEntries) {
                const transform = entry.transform;
                const localMatrix = new THREE.Matrix4()
                    .makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
                    .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
                    .multiply(new THREE.Matrix4().makeRotationX(transform.rotateX))
                    .multiply(new THREE.Matrix4().makeRotationY(transform.rotateY))
                    .multiply(new THREE.Matrix4().makeRotationZ(transform.rotateZ));
                camera.projectionMatrix = mapMatrix.clone().multiply(localMatrix);
                renderer.render(entry.scene, camera);
            }
            renderer.resetState();
            map.triggerRepaint();
        },
        onRemove() {
            renderer?.dispose();
            renderer = null;
            releaseObjectUrls();
            renderEntries = [];
        }
    };

    try {
        map.addLayer(customLayer);
    } catch (error) {
        console.warn("Impossible d’ajouter le calque des modèles 3D à l’éditeur.", error);
    }
}

async function loadRenderEntries(revision) {
    const models = new Map(getModelLibrary().map(model => [model.id, model]));
    const loader = new GLTFLoader();
    for (const instance of getInstanceLibrary()) {
        if (revision !== renderRevision) return;
        const model = models.get(instance?.modelId);
        const longitude = Number(instance?.longitude);
        const latitude = Number(instance?.latitude);
        if (!model || !Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
        try {
            const gltf = await loader.loadAsync(createGlbObjectUrl(model));
            if (revision !== renderRevision) return;
            const root = gltf.scene || gltf.scenes?.[0];
            if (!root) continue;
            fitModelToGround(root);
            const rotation = Array.isArray(instance.rotation) ? instance.rotation : [0, 0, 0];
            const altitude = Number(instance.altitude) || 0;
            const mercator = window.mapboxgl.MercatorCoordinate.fromLngLat([longitude, latitude], altitude);
            const userScale = Number(instance.scale) || 1;
            const scene = createScene(root, instance);
            if (instance.id === selectedInstanceId) {
                const helper = new THREE.BoxHelper(root, 0x2563eb);
                helper.material.depthTest = false;
                helper.renderOrder = 1000;
                scene.add(helper);
            }
            renderEntries.push({
                instanceId: instance.id,
                scene,
                transform: {
                    translateX: mercator.x,
                    translateY: mercator.y,
                    translateZ: mercator.z,
                    rotateX: Math.PI / 2 + degreesToRadians(rotation[0]),
                    rotateY: degreesToRadians(rotation[1]),
                    rotateZ: degreesToRadians(rotation[2]),
                    scale: mercator.meterInMercatorCoordinateUnits() * userScale
                }
            });
        } catch (error) {
            console.warn("Impossible de charger un modèle 3D dans l’éditeur.", error);
        }
    }
}

function bindMapClickHandler() {
    const map = getMapInstance();
    if (!map || map === boundMap) return;
    boundMap = map;
    map.on("click", handleMapClick);
    map.on("mousedown", handleMoveStart);
    map.on("mousemove", handleMoveDrag);
    map.on("mouseup", handleMoveEnd);
}

function handleMapClick(event) {
    if (draggingInstance) return;
    if (!placementModelId) {
        selectNearestInstance(event);
        return;
    }
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

function createScene(root, instance = {}) {
    const scene = new THREE.Scene();
    scene.add(root);
    const lighting = instance.lighting || {};
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7280, Number(lighting.ambient ?? 1.35)));
    const sun = new THREE.DirectionalLight(0xffffff, Number(lighting.sun ?? 1.55));
    sun.position.set(30, -20, 50);
    scene.add(sun);
    root.traverse(object => {
        if (!object.isMesh) return;
        object.castShadow = Boolean(lighting.shadows);
        object.receiveShadow = Boolean(lighting.shadows);
    });
    return scene;
}

function fitModelToGround(root) {
    const bounds = new THREE.Box3().setFromObject(root);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.y -= bounds.min.y;
    root.position.z -= center.z;
}

function removeEditorLayer(map) {
    try {
        if (map.getLayer?.(LAYER_ID)) map.removeLayer(LAYER_ID);
    } catch (error) {
        console.debug("Nettoyage du calque 3D différé.", error);
    }
}

function setPlacementCursor(active) {
    getMapInstance()?.getCanvas?.()?.classList.toggle("models3d-placement-cursor", active);
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
    const url = URL.createObjectURL(new Blob([bytes], { type: model.mimeType || "model/gltf-binary" }));
    objectUrls.push(url);
    return url;
}

function releaseObjectUrls() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
}

function degreesToRadians(value) {
    return Number(value || 0) * Math.PI / 180;
}

function selectNearestInstance(event) {
    const map = getMapInstance();
    if (!map || !event?.point) return;
    let nearestId = null;
    let nearestDistance = 38;
    for (const instance of getInstanceLibrary()) {
        const longitude = Number(instance?.longitude);
        const latitude = Number(instance?.latitude);
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
        const point = map.project([longitude, latitude]);
        const distance = Math.hypot(point.x - event.point.x, point.y - event.point.y);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestId = instance.id;
        }
    }
    selectModelInstance(nearestId);
}

function handleMoveStart(event) {
    if (!moveModeActive || !selectedInstanceId) return;
    const instance = getInstanceLibrary().find(item => item.id === selectedInstanceId);
    if (!instance) return;
    const map = getMapInstance();
    const point = map.project([Number(instance.longitude), Number(instance.latitude)]);
    if (Math.hypot(point.x - event.point.x, point.y - event.point.y) > 45) return;
    draggingInstance = true;
    map.dragPan?.disable();
    event.preventDefault?.();
}

function handleMoveDrag(event) {
    if (!draggingInstance || !selectedInstanceId) return;
    const instance = getInstanceLibrary().find(item => item.id === selectedInstanceId);
    if (!instance) return;
    instance.longitude = Number(event.lngLat.lng);
    instance.latitude = Number(event.lngLat.lat);
    if (instance.snapToTerrain) {
        const elevation = getMapInstance()?.queryTerrainElevation?.([instance.longitude, instance.latitude], { exaggerated: false });
        if (Number.isFinite(elevation)) instance.altitude = elevation;
    }
    renderModelInstances();
    emit(EVENTS.MODEL3D_INSTANCE_SELECTED, { instanceId: selectedInstanceId, moveModeActive });
}

function handleMoveEnd() {
    if (!draggingInstance) return;
    draggingInstance = false;
    getMapInstance()?.dragPan?.enable();
    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: true });
    saveProjectLocally();
    emit(EVENTS.MODEL3D_INSTANCE_SELECTED, { instanceId: selectedInstanceId, moveModeActive });
}
