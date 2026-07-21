import { getSelectedChapter, getSelectedSection } from "../../core/store.js";
import {
    updateChapterLayerMode,
    updateChapterLayerTransition,
    updateChapterTransition
} from "../chapters/chapter-service.js";

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
                    <input id="layerDurationInput" type="number" min="0" step="100" value="${Number(chapter.layerTransition?.duration ?? 600)}">
                </div>
                <div class="camera-field">
                    <label for="layerDelayInput">Délai (ms)</label>
                    <input id="layerDelayInput" type="number" min="0" step="100" value="${Number(chapter.layerTransition?.delay ?? 0)}">
                </div>
            </div>
        </section>
    `;

    bindTransitionEvents();
}

function bindTransitionEvents() {
    const transitionMethodInput = document.getElementById("transitionMethodInput");
    const transitionDurationInput = document.getElementById("transitionDurationInput");
    const layerModeInput = document.getElementById("layerModeInput");
    const layerDurationInput = document.getElementById("layerDurationInput");
    const layerDelayInput = document.getElementById("layerDelayInput");

    transitionMethodInput?.addEventListener("change", () => updateChapterTransition("method", transitionMethodInput.value));
    transitionDurationInput?.addEventListener("change", () => updateChapterTransition("duration", transitionDurationInput.value));
    layerModeInput?.addEventListener("change", () => updateChapterLayerMode(layerModeInput.value));
    layerDurationInput?.addEventListener("change", () => updateChapterLayerTransition("duration", layerDurationInput.value));
    layerDelayInput?.addEventListener("change", () => updateChapterLayerTransition("delay", layerDelayInput.value));
}
