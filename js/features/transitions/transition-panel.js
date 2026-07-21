import { getSelectedChapter, getSelectedSection } from "../../core/store.js";
import { getTransitionTimelineDuration } from "./transition-timeline.js";
import {
    updateChapterLayerMode,
    updateChapterLayerTransition,
    updateChapterTransition
} from "../chapters/chapter-service.js";
import { flyToSelectedChapter, previewSelectedChapterTransition } from "../map/map-service.js";

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

    const transitionControl = chapter.transition?.control || "automatic";
    const isAutomatic = transitionControl === "automatic";
    const isSmoothScroll = transitionControl === "smooth-scroll";

    container.innerHTML = `
        <section class="transition-panel-section" aria-labelledby="transitionControlTitle">
            <header class="transition-panel-section-header">
                <h3 id="transitionControlTitle">Déclenchement</h3>
                <span>Progression du récit</span>
            </header>
            <div class="transition-control-options" role="radiogroup" aria-label="Déclenchement de la transition">
                <label class="transition-control-option">
                    <input type="radio" name="transitionControl" value="automatic" ${isAutomatic ? "checked" : ""}>
                    <span>Automatique</span>
                </label>
                <label class="transition-control-option">
                    <input type="radio" name="transitionControl" value="scroll" ${transitionControl === "scroll" ? "checked" : ""}>
                    <span>Défilement</span>
                </label>
                <label class="transition-control-option">
                    <input type="radio" name="transitionControl" value="smooth-scroll" ${isSmoothScroll ? "checked" : ""}>
                    <span>Défilement lissé</span>
                </label>
            </div>
            <p class="property-help">Automatique joue la transition à l’entrée du chapitre. Les modes de défilement suivent la progression du lecteur.</p>
            <div id="transitionSmoothingProperty" class="property ${isSmoothScroll ? "" : "is-hidden"}">
                <label for="transitionSmoothingInput">Lissage</label>
                <input id="transitionSmoothingInput" type="range" min="0.04" max="0.5" step="0.01" value="${Number(chapter.transition?.smoothing ?? 0.18)}">
                <p class="property-help">Réactivité du mouvement : faible = plus cinématique, forte = plus proche du défilement.</p>
            </div>
        </section>

        <section class="transition-panel-section" aria-labelledby="cameraTransitionTitle">
            <header class="transition-panel-section-header">
                <h3 id="cameraTransitionTitle">Caméra</h3>
                <span>Lecture scrollytelling</span>
            </header>
            <div class="property">
                <label for="transitionMethodInput">Animation caméra</label>
                <select id="transitionMethodInput">
                    <option value="flyTo" ${chapter.transition?.method === "flyTo" ? "selected" : ""}>Vol fluide (flyTo)</option>
                    <option value="easeTo" ${chapter.transition?.method === "easeTo" ? "selected" : ""}>Déplacement direct (easeTo)</option>
                    <option value="jumpTo" ${chapter.transition?.method === "jumpTo" ? "selected" : ""}>Sans animation (jumpTo)</option>
                </select>
            </div>
            <div id="transitionDurationProperty" class="property ${isAutomatic ? "" : "is-hidden"}">
                <label for="transitionDurationInput">Durée caméra (ms)</label>
                <input id="transitionDurationInput" type="number" min="0" step="100" value="${Number(chapter.transition?.duration ?? 1200)}" ${chapter.transition?.method === "jumpTo" ? "disabled" : ""}>
                <p id="cameraTransitionHelp" class="property-help">${getCameraTransitionHelp(chapter.transition?.method)}</p>
            </div>
            <div class="property">
                <label for="transitionEasingInput">Accélération</label>
                <select id="transitionEasingInput">
                    <option value="linear" ${chapter.transition?.easing === "linear" ? "selected" : ""}>Linéaire</option>
                    <option value="ease" ${chapter.transition?.easing === "ease" ? "selected" : ""}>Ease</option>
                    <option value="ease-in" ${chapter.transition?.easing === "ease-in" ? "selected" : ""}>Ease-in</option>
                    <option value="ease-out" ${chapter.transition?.easing === "ease-out" ? "selected" : ""}>Ease-out</option>
                    <option value="ease-in-out" ${!chapter.transition?.easing || chapter.transition?.easing === "ease-in-out" ? "selected" : ""}>Ease-in-out</option>
                </select>
                <p class="property-help">Courbe appliquée au mouvement de caméra. Les calques conservent l’interpolation native Mapbox.</p>
            </div>
            <div class="property transition-toggle-property">
                <label class="transition-toggle" for="transitionEssentialInput">
                    <input id="transitionEssentialInput" type="checkbox" ${chapter.transition?.essential !== false ? "checked" : ""}>
                    <span>Mouvement essentiel</span>
                </label>
                <p class="property-help">Autorise Mapbox à conserver ce déplacement lorsque le système limite les animations.</p>
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
            <button id="previewTransitionButton" type="button" class="button button-primary">▶ Jouer la transition</button>
            <p id="transitionPreviewStatus" class="property-help" aria-live="polite">Rejoue le passage depuis le chapitre précédent, sans modifier le projet.</p>
        </div>
    `;

    bindTransitionEvents();
}

function bindTransitionEvents() {
    const transitionControlInputs = [...document.querySelectorAll('input[name="transitionControl"]')];
    const transitionSmoothingProperty = document.getElementById("transitionSmoothingProperty");
    const transitionSmoothingInput = document.getElementById("transitionSmoothingInput");
    const transitionDurationProperty = document.getElementById("transitionDurationProperty");
    const transitionMethodInput = document.getElementById("transitionMethodInput");
    const transitionDurationInput = document.getElementById("transitionDurationInput");
    const transitionEssentialInput = document.getElementById("transitionEssentialInput");
    const transitionEasingInput = document.getElementById("transitionEasingInput");
    const cameraTransitionHelp = document.getElementById("cameraTransitionHelp");
    const layerTransitionEnabledInput = document.getElementById("layerTransitionEnabledInput");
    const layerModeInput = document.getElementById("layerModeInput");
    const layerDurationInput = document.getElementById("layerDurationInput");
    const layerDelayInput = document.getElementById("layerDelayInput");
    const previewTransitionButton = document.getElementById("previewTransitionButton");
    const transitionPreviewStatus = document.getElementById("transitionPreviewStatus");

    transitionControlInputs.forEach(input => input.addEventListener("change", () => {
        if (!input.checked) return;
        const control = input.value;
        transitionDurationProperty?.classList.toggle("is-hidden", control !== "automatic");
        transitionSmoothingProperty?.classList.toggle("is-hidden", control !== "smooth-scroll");
        updateChapterTransition("control", control);
        // Stabilise immédiatement l’éditeur lorsqu’un mode est remplacé :
        // toute animation en cours est interrompue et le chapitre actif est
        // réappliqué sans transition avant le prochain aperçu ou défilement.
        flyToSelectedChapter({ instant: true });
        if (transitionPreviewStatus) {
            transitionPreviewStatus.textContent = getPreviewDescription(control);
        }
    }));
    transitionSmoothingInput?.addEventListener("input", () => updateChapterTransition("smoothing", transitionSmoothingInput.value));

    transitionMethodInput?.addEventListener("change", () => {
        const method = transitionMethodInput.value;
        transitionDurationInput.disabled = method === "jumpTo";
        if (cameraTransitionHelp) cameraTransitionHelp.textContent = getCameraTransitionHelp(method);
        updateChapterTransition("method", method);
    });
    transitionDurationInput?.addEventListener("change", () => updateChapterTransition("duration", transitionDurationInput.value));
    transitionEssentialInput?.addEventListener("change", () => updateChapterTransition("essential", transitionEssentialInput.checked));
    transitionEasingInput?.addEventListener("change", () => updateChapterTransition("easing", transitionEasingInput.value));
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
        const chapter = getSelectedChapter();
        const started = previewSelectedChapterTransition();
        if (!started) {
            transitionPreviewStatus.textContent = "La carte doit être chargée pour lancer l’aperçu.";
            return;
        }

        const previewDuration = getPreviewDuration(chapter);
        const control = chapter?.transition?.control || "automatic";
        previewTransitionButton.disabled = true;
        previewTransitionButton.textContent = "Lecture en cours…";
        transitionPreviewStatus.textContent = getPreviewRunningDescription(control, previewDuration);

        window.setTimeout(() => {
            if (!previewTransitionButton?.isConnected) return;
            previewTransitionButton.disabled = false;
            previewTransitionButton.textContent = "↻ Rejouer la transition";
            if (transitionPreviewStatus) transitionPreviewStatus.textContent = "Aperçu terminé. Aucun changement n’a été enregistré.";
        }, previewDuration + 250);
    });
}

function getCameraTransitionHelp(method) {
    if (method === "jumpTo") return "Le changement de caméra est instantané ; la durée n’est pas utilisée.";
    if (method === "easeTo") return "Déplacement régulier entre les deux vues, sans trajectoire de vol.";
    return "Trajectoire fluide avec zoom intermédiaire, adaptée aux déplacements géographiques.";
}

function getPreviewDuration(chapter) {
    const control = chapter?.transition?.control || "automatic";
    const timelineDuration = getTransitionTimelineDuration(chapter, 300);
    if (control === "scroll") return Math.max(700, timelineDuration);
    if (control === "smooth-scroll") return Math.max(1100, timelineDuration);
    return timelineDuration;
}

function getPreviewDescription(control) {
    if (control === "scroll") return "Simule une progression directe du défilement, de 0 à 100 %.";
    if (control === "smooth-scroll") return "Simule le défilement lissé avec la réactivité configurée.";
    return "Rejoue le passage depuis le chapitre précédent, sans modifier le projet.";
}

function getPreviewRunningDescription(control, duration) {
    const formatted = formatDuration(duration);
    if (control === "scroll") return `Simulation du défilement direct — environ ${formatted}.`;
    if (control === "smooth-scroll") return `Simulation du défilement lissé — environ ${formatted}.`;
    return `Aperçu automatique en cours — environ ${formatted}.`;
}

function formatDuration(duration) {
    if (duration < 1000) return `${Math.round(duration)} ms`;
    return `${(duration / 1000).toFixed(duration % 1000 === 0 ? 0 : 1)} s`;
}
