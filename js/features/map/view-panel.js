import { on, EVENTS } from "../../core/events.js";
import { getSelectedMapTarget, getSelectedSection } from "../../core/store.js";
import {
    captureCurrentMapView,
    clearSelectedMobileMapView,
    flyToSelectedChapter,
    getCurrentCamera,
    getStoredCamera,
    resizeMap
} from "./map-service.js";
import { bindMapEditorPanelEvents, updateLiveCameraFields } from "./map-editor-panel.js";

let initialized = false;
let activeViewMode = "desktop";

export function setupViewPanel() {
    if (initialized) return;
    initialized = true;
    document.getElementById("toggleViewPanelButton")?.addEventListener("click", togglePanel);
    document.getElementById("editorDeviceToggle")?.addEventListener("click", () => {
        switchViewMode(activeViewMode === "desktop" ? "mobile" : "desktop");
    });
    on(EVENTS.MAP_CAMERA_CHANGED, camera => {
        updateLiveCameraFields(camera);
        updateCaptureButtonState(camera);
    });
    on(EVENTS.PROJECT_REPLACED, () => {
        activeViewMode = "desktop";
        applyEditingViewportMode();
        renderViewPanel();
    });
    on(EVENTS.SELECTION_CHANGED, () => {
        // Conserve le périphérique actif pour pouvoir régler successivement
        // tous les cadrages mobiles ou desktop sans changer de mode.
        applyEditingViewportMode();
        renderViewPanel();
        syncMapToActiveStoredView();
    });
    applyEditingViewportMode();
}

export function renderViewPanel() {
    const panel = document.getElementById("viewPanel");
    const container = document.getElementById("viewPanelContent");
    if (!panel || !container) return;

    const chapter = getSelectedMapTarget();
    if (!chapter) {
        container.innerHTML = `<p class="panel-empty-message">Ajoute un chapitre pour régler sa vue.</p>`;
        return;
    }

    const camera = getStoredCamera(chapter, activeViewMode) ?? chapter.location;
    const hasMobileView = Boolean(chapter.mobileLocation);
    const mobileStatus = hasMobileView ? "Vue mobile adaptée" : "Utilise la vue desktop";
    const returnLabel = activeViewMode === "mobile"
        ? (hasMobileView ? "Revenir à la vue mobile" : "Revenir à la vue desktop")
        : (getSelectedSection() === "meta" ? "Revenir à la vue du projet" : "Revenir à la vue du chapitre");

    container.innerHTML = `
        <p class="view-device-status ${activeViewMode === "mobile" && !hasMobileView ? "is-inherited" : ""}">${activeViewMode === "desktop" ? "Vue de référence" : mobileStatus}</p>
        <form id="cameraForm" class="camera-form view-camera-form">
            <div class="camera-field"><label for="cameraLongitudeInput">Longitude</label><input id="cameraLongitudeInput" data-camera-field type="number" min="-180" max="180" step="0.000001" value="${Number(camera?.center?.[0] ?? 0).toFixed(6)}"></div>
            <div class="camera-field"><label for="cameraLatitudeInput">Latitude</label><input id="cameraLatitudeInput" data-camera-field type="number" min="-85" max="85" step="0.000001" value="${Number(camera?.center?.[1] ?? 0).toFixed(6)}"></div>
            <div class="camera-field"><label for="cameraZoomInput">Zoom</label><input id="cameraZoomInput" data-camera-field type="number" min="0" max="24" step="0.01" value="${Number(camera?.zoom ?? 0).toFixed(2)}"></div>
            <div class="camera-field"><label for="cameraPitchInput">Pitch</label><input id="cameraPitchInput" data-camera-field type="number" min="0" max="85" step="1" value="${Number(camera?.pitch ?? 0).toFixed(1)}"></div>
            <div class="camera-field camera-field-wide"><label for="cameraBearingInput">Bearing</label><input id="cameraBearingInput" data-camera-field type="number" min="-180" max="180" step="1" value="${Number(camera?.bearing ?? 0).toFixed(1)}"></div>
        </form>
        <div class="panel-actions view-actions">
            <button id="captureViewButton" class="button button-primary" type="button" disabled>Utiliser cette vue</button>
            <button id="returnToChapterViewButton" class="button button-light" type="button">${returnLabel}</button>
            ${activeViewMode === "mobile" && hasMobileView ? '<button id="clearMobileViewButton" class="button button-light" type="button">Reprendre la vue desktop</button>' : ""}
        </div>
        <p class="property-help view-help">${activeViewMode === "mobile" ? "La vue mobile suit la vue desktop tant qu’aucun cadrage mobile n’est enregistré." : "La vue desktop est toujours la vue de référence."}</p>`;

    bindMapEditorPanelEvents();
    container.querySelectorAll("[data-view-mode]").forEach(button => {
        button.addEventListener("click", () => switchViewMode(button.dataset.viewMode));
    });
    document.getElementById("captureViewButton")?.addEventListener("click", () => {
        if (!captureCurrentMapView(activeViewMode)) {
            alert("Connecte d’abord la carte Mapbox.");
            return;
        }
        updateCaptureButtonState(getCurrentCamera());
    });
    document.getElementById("returnToChapterViewButton")?.addEventListener("click", () => flyToSelectedChapter({ viewMode: activeViewMode }));
    document.getElementById("clearMobileViewButton")?.addEventListener("click", () => clearSelectedMobileMapView());
    const currentCamera = getCurrentCamera();
    updateLiveCameraFields(currentCamera);
    updateCaptureButtonState(currentCamera);
}

function switchViewMode(mode) {
    setEditingViewMode(mode);
}

export function getEditingViewMode() {
    return activeViewMode;
}

export function setEditingViewMode(mode, options = {}) {
    activeViewMode = mode === "mobile" ? "mobile" : "desktop";
    applyEditingViewportMode();
    renderViewPanel();
    if (options.sync !== false) syncMapToActiveStoredView();
}

function syncMapToActiveStoredView() {
    // Le resize Mapbox peut conserver temporairement la caméra du viewport
    // précédent. On attend que le nouveau cadre soit calculé, puis on recharge
    // explicitement la caméra Desktop ou Mobile enregistrée.
    requestAnimationFrame(() => {
        resizeMap();
        requestAnimationFrame(() => {
            resizeMap();
            flyToSelectedChapter({ viewMode: activeViewMode, instant: true });
            updateCaptureButtonState(getCurrentCamera());
        });
    });
}

function updateCaptureButtonState(currentCamera = getCurrentCamera()) {
    const button = document.getElementById("captureViewButton");
    const target = getSelectedMapTarget();
    const storedCamera = getStoredCamera(target, activeViewMode);
    if (!button) return;

    const hasChanged = Boolean(currentCamera && storedCamera && !camerasAreEqual(currentCamera, storedCamera));
    button.disabled = !hasChanged;
    button.title = hasChanged
        ? `Enregistrer la vue ${activeViewMode === "mobile" ? "mobile" : "desktop"} actuelle`
        : "La vue affichée correspond déjà à la vue enregistrée";
}

function camerasAreEqual(first, second) {
    if (!first || !second) return false;
    const firstCenter = first.center ?? [];
    const secondCenter = second.center ?? [];
    return nearlyEqual(firstCenter[0], secondCenter[0], 0.00001)
        && nearlyEqual(firstCenter[1], secondCenter[1], 0.00001)
        && nearlyEqual(first.zoom, second.zoom, 0.005)
        && nearlyEqual(first.pitch, second.pitch, 0.05)
        && nearlyEqual(normalizeBearing(first.bearing), normalizeBearing(second.bearing), 0.05);
}

function nearlyEqual(first, second, tolerance) {
    return Math.abs(Number(first) - Number(second)) <= tolerance;
}

function normalizeBearing(value) {
    const number = Number(value);
    return Number.isFinite(number) ? ((number + 180) % 360 + 360) % 360 - 180 : 0;
}

function applyEditingViewportMode() {
    const workspace = document.getElementById("workspace");
    const mapPanel = document.getElementById("mapPanel");
    const isMobile = activeViewMode === "mobile";

    workspace?.classList.toggle("editing-mobile-viewport", isMobile);
    workspace?.classList.toggle("editing-desktop-viewport", !isMobile);

    const mapStage = document.getElementById("mapStage");
    [workspace, mapStage, mapPanel].forEach(element => {
        if (!element) return;
        element.style.removeProperty("width");
        element.style.removeProperty("max-width");
        element.style.removeProperty("height");
        element.style.removeProperty("min-height");
        element.style.removeProperty("margin");
        element.style.removeProperty("left");
        element.style.removeProperty("right");
    });

    if (mapPanel) {
        mapPanel.setAttribute("data-editing-device", isMobile ? "mobile" : "desktop");
    }

    const toggle = document.getElementById("editorDeviceToggle");
    if (toggle) {
        toggle.dataset.mode = isMobile ? "mobile" : "desktop";
        toggle.setAttribute("aria-checked", String(isMobile));
    }

    // Force le navigateur à appliquer la nouvelle géométrie avant que Mapbox
    // ne recalcule son canvas. Les délais couvrent aussi la fin de transition.
    void mapPanel?.offsetWidth;
    [0, 50, 180, 300].forEach(delay => {
        window.setTimeout(() => {
            resizeMap();
            window.dispatchEvent(new Event("resize"));
        }, delay);
    });
}

function togglePanel() {
    const panel = document.getElementById("viewPanel");
    const button = document.getElementById("toggleViewPanelButton");
    const collapsed = panel.classList.toggle("collapsed");
    button.setAttribute("aria-expanded", String(!collapsed));
    button.innerHTML = collapsed ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>` : "›";
    button.title = collapsed ? "Déployer la colonne" : "Réduire la colonne";
    window.dispatchEvent(new Event("resize"));
}
