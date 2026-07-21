import { getSelectedChapter, getSelectedSection } from "../../core/store.js";
import {
    updateChapterLayerMode,
    updateChapterLayerTransition,
    updateChapterTransition
} from "../chapters/chapter-service.js";
import { previewSelectedChapterTransition } from "../map/map-service.js";

export function renderTransitionPanel() {
    const container = document.getElementById("transitionPanelContent");
    if (!container) return;

    if (getSelectedSection() !== "chapter") {
        container.innerHTML = `<p class="empty-message">Sélectionne un chapitre pour régler ses transitions.</p>`;
        return;
    }

    const chapter = getSelectedChapter();
    if (!chapter) {
        container.innerHTML = `<p class="empty-message">Ajoute un chapitre pour commencer.</p>`;
        return;
    }

    container.innerHTML = `
        <section class="transition-panel-section" aria-labelledby="cameraTransitionTitle">
            <header class="transition-panel-section-header">
                <h3 id="cameraTransitionTitle">Caméra</h3>
                <span>Lecture scrollytelling</span>
            </header>
            <div class="property">
                <label for="transitionMethodInput">Animation caméra</label>
                <select id="transitionMethodInput">
                    <option value="flyTo" ${chapter.transition?.method === "flyTo" ? "selected" : ""}>flyTo</option>
                    <option value="easeTo" ${chapter.transition?.method === "easeTo" ? "selected" : ""}>easeTo</option>
                    <option value="jumpTo" ${chapter.transition?.method === "jumpTo" ? "selected" : ""}>jumpTo</option>
                </select>
            </div>
            <div class="property">
                <label for="transitionDurationInput">Durée caméra (ms)</label>
                <input id="transitionDurationInput" type="number" min="0" step="100" value="${Number(chapter.transition?.duration ?? 1200)}">
            </div>
        </section>

        <section class="transition-panel-section" aria-labelledby="layerTransitionTitle">
            <header class="transition-panel-section-header">
                <h3 id="layerTransitionTitle">Calques</h3>
                <span>État et fondu</span>
            </header>
            <div class="property transition-toggle-property">
                <label class="transition-toggle" for="layerTransitionEnabledInput">
                    <input id="layerTransitionEnabledInput" type="checkbox" ${chapter.layerTransition?.enabled !== false ? "checked" : ""}>
                    <span>Activer les transitions de calques</span>
                </label>
                <p class="property-help">Les propriétés animables évoluent progressivement. La visibilité reste instantanée.</p>
            </div>
            <div class="property">
                <label for="layerModeInput">Comportement des calques</label>
                <select id="layerModeInput">
                    <option value="snapshot" ${chapter.layerMode !== "inherit" ? "selected" : ""}>État complet</option>
                    <option value="inherit" ${chapter.layerMode === "inherit" ? "selected" : ""}>Hériter du chapitre précédent</option>
                </select>
            </div>
            <div class="camera-form">
                <div class="camera-field">
                    <label for="layerDurationInput">Fondu (ms)</label>
                    <input id="layerDurationInput" type="number" min="0" step="100" value="${Number(chapter.layerTransition?.duration ?? 600)}" ${chapter.layerTransition?.enabled === false ? "disabled" : ""}>
                </div>
                <div class="camera-field">
                    <label for="layerDelayInput">Délai (ms)</label>
                    <input id="layerDelayInput" type="number" min="0" step="100" value="${Number(chapter.layerTransition?.delay ?? 0)}" ${chapter.layerTransition?.enabled === false ? "disabled" : ""}>
                </div>
            </div>
        </section>

        <div class="transition-preview-bar">
            <button id="previewTransitionButton" type="button" class="button button-primary">Aperçu de la transition</button>
            <p id="transitionPreviewStatus" class="property-help" aria-live="polite">Rejoue le passage depuis le chapitre précédent, sans modifier le projet.</p>
        </div>
    `;

    bindTransitionEvents();
}

function bindTransitionEvents() {
    const transitionMethodInput = document.getElementById("transitionMethodInput");
    const transitionDurationInput = document.getElementById("transitionDurationInput");
    const layerTransitionEnabledInput = document.getElementById("layerTransitionEnabledInput");
    const layerModeInput = document.getElementById("layerModeInput");
    const layerDurationInput = document.getElementById("layerDurationInput");
    const layerDelayInput = document.getElementById("layerDelayInput");
    const previewTransitionButton = document.getElementById("previewTransitionButton");
    const transitionPreviewStatus = document.getElementById("transitionPreviewStatus");

    transitionMethodInput?.addEventListener("change", () => updateChapterTransition("method", transitionMethodInput.value));
    transitionDurationInput?.addEventListener("change", () => updateChapterTransition("duration", transitionDurationInput.value));
    layerTransitionEnabledInput?.addEventListener("change", () => {
        const enabled = layerTransitionEnabledInput.checked;
        layerDurationInput.disabled = !enabled;
        layerDelayInput.disabled = !enabled;
        updateChapterLayerTransition("enabled", enabled);
    });
    layerModeInput?.addEventListener("change", () => updateChapterLayerMode(layerModeInput.value));
    layerDurationInput?.addEventListener("change", () => updateChapterLayerTransition("duration", layerDurationInput.value));
    layerDelayInput?.addEventListener("change", () => updateChapterLayerTransition("delay", layerDelayInput.value));
    previewTransitionButton?.addEventListener("click", () => {
        const started = previewSelectedChapterTransition();
        if (!started) {
            transitionPreviewStatus.textContent = "La carte doit être chargée pour lancer l’aperçu.";
            return;
        }
        transitionPreviewStatus.textContent = "Aperçu en cours…";
        window.setTimeout(() => {
            if (transitionPreviewStatus) transitionPreviewStatus.textContent = "Aperçu terminé. Aucun changement n’a été enregistré.";
        }, 1600);
    });
}
