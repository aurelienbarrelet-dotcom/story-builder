const listeners = new Map();

export const EVENTS = Object.freeze({
    PROJECT_CHANGED: "project:changed",
    PROJECT_REPLACED: "project:replaced",
    PROJECT_DIRTY_CHANGED: "project:dirty-changed",
    SELECTION_CHANGED: "selection:changed",
    RENDER_REQUESTED: "render:requested",
    SAVE_STATUS_CHANGED: "save-status:changed",
    MAP_CAMERA_CHANGED: "map:camera-changed",
    MAP_STYLE_READY: "map:style-ready",
    READER_MODE_CHANGED: "reader-mode:changed",
    HISTORY_CHANGED: "history:changed",
    CLIPBOARD_CHANGED: "clipboard:changed",
    LAYER_SELECTION_CHANGED: "layer-selection:changed",
    MODEL3D_PLACEMENT_CHANGED: "model3d:placement-changed"
});

export function on(eventName, callback) {
    if (!listeners.has(eventName)) {
        listeners.set(eventName, new Set());
    }

    listeners.get(eventName).add(callback);

    return () => {
        listeners.get(eventName)?.delete(callback);
    };
}

export function emit(eventName, detail = {}) {
    const eventListeners = listeners.get(eventName);

    if (!eventListeners) {
        return;
    }

    eventListeners.forEach(callback => callback(detail));
}
