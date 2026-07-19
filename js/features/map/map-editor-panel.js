import { on, EVENTS } from "../../core/events.js";
import { getSelectedChapterIndices } from "../../core/store.js";
import {
    getCurrentCamera,
    setCurrentCamera
} from "./map-service.js";

let initialized = false;

export function setupMapEditorPanel() {
    if (initialized) return;
    initialized = true;

    on(EVENTS.MAP_CAMERA_CHANGED, updateLiveCameraFields);
    on(EVENTS.SELECTION_CHANGED, () => requestAnimationFrame(() => {
        updateLiveCameraFields(getCurrentCamera());
        updateSelectionSummary();
    }));
    updateSelectionSummary();
}

export function bindMapEditorPanelEvents() {
    document.getElementById("cameraForm")?.addEventListener("input", event => {
        if (!event.target.matches("[data-camera-field]")) return;

        setCurrentCamera({
            center: [
                read("cameraLongitudeInput"),
                read("cameraLatitudeInput")
            ],
            zoom: read("cameraZoomInput"),
            pitch: read("cameraPitchInput"),
            bearing: read("cameraBearingInput")
        });
    });
}

export function updateLiveCameraFields(camera = getCurrentCamera()) {
    if (!camera) return;
    set("cameraLongitudeInput", camera.center[0], 6);
    set("cameraLatitudeInput", camera.center[1], 6);
    set("cameraZoomInput", camera.zoom, 3);
    set("cameraPitchInput", camera.pitch, 2);
    set("cameraBearingInput", camera.bearing, 2);
}

function read(id) {
    return Number(document.getElementById(id)?.value ?? 0);
}

function set(id, value, precision) {
    const input = document.getElementById(id);
    if (input && document.activeElement !== input) input.value = Number(value).toFixed(precision);
}


function updateSelectionSummary() {
    const output = document.getElementById("layersSelectionCount");
    if (!output) return;
    const count = getSelectedChapterIndices().length;
    output.textContent = count > 1 ? `${count} chapitres sélectionnés` : "1 chapitre sélectionné";
}
