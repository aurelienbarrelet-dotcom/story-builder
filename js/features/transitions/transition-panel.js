import { getSelectedChapter, getSelectedChapters, getSelectedSection } from "../../core/store.js";
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

    const selectedChapters = getSelectedChapters();
    const selectionCount = selectedChapters.length;
    const transitionControl = getCommonValue(selectedChapters, item => item.transition?.control || "automatic", "automatic");
    const transitionMethod = getCommonValue(selectedChapters, item => item.transition?.method || "flyTo", "flyTo");
    const transitionDuration = getCommonValue(selectedChapters, item => Number(item.transition?.duration ?? 1200), 1200);
    const transitionSmoothing = getCommonValue(selectedChapters, item => Number(item.transition?.smoothing ?? 0.18), 0.18);
    const transitionEasing = getCommonValue(selectedChapters, item => item.transition?.easing || "ease-in-out", "ease-in-out");
    const transitionEssential = getCommonValue(selectedChapters, item => item.transition?.essential !== false, true);
    const layerTransitionEnabled = getCommonValue(selectedChapters, item => item.layerTransition?.enabled !== false, true);
    const layerMode = getCommonValue(selectedChapters, item => item.layerMode === "inherit" ? "inherit" : "snapshot", "snapshot");
    const layerDuration = getCommonValue(selectedChapters, item => Number(item.layerTransition?.duration ?? 600), 600);
    const layerDelay = getCommonValue(selectedChapters, item => Number(item.layerTransition?.delay ?? 0), 0);
    const isAutomatic = !transitionControl.mixed && transitionControl.value === "automatic";
    const isSmoothScroll = !transitionControl.mixed && transitionControl.value === "smooth-scroll";

    container.innerHTML = `
        ${selectionCount > 1 ? `<p class="transition-multi-selection"><strong>${selectionCount} chapitres sélectionnés.</strong> Toute modification ci-dessous sera appliquée à l’ensemble de la sélection.</p>` : ""}
        <section class="transition-panel-section" aria-labelledby="transitionControlTitle">
            <header class="transition-panel-section-header">
                <h3 id="transitionControlTitle">Déclenchement</h3>
                <span>Progression du récit</span>
            </header>
            <div class="transition-control-options" role="radiogroup" aria-label="Déclenchement de la transition">
                <label class="transition-control-option">
                    <input type="radio" name="transitionControl" value="automatic" ${!transitionControl.mixed && transitionControl.value === "automatic" ? "checked" : ""}>
                    <span>Automatique</span>
                </label>
                <label class="transition-control-option">
                    <input type="radio" name="transitionControl" value="scroll" ${!transitionControl.mixed && transitionControl.value === "scroll" ? "checked" : ""}>
                    <span>Défilement</span>
                </label>
                <label class="transition-control-option">
                    <input type="radio" name="transitionControl" value="smooth-scroll" ${!transitionControl.mixed && transitionControl.value === "smooth-scroll" ? "checked" : ""}>
                    <span>Défilement lissé</span>
                </label>
            </div>
            <p class="property-help">Automatique joue la transition à l’entrée du chapitre. Les modes de défilement suivent la progression du lecteur.</p>
            <div id="transitionSmoothingProperty" class="property ${isSmoothScroll || transitionControl.mixed ? "" : "is-hidden"}">
                <label for="transitionSmoothingInput">Lissage</label>
                <input id="transitionSmoothingInput" type="range" min="0.04" max="0.5" step="0.01" value="${transitionSmoothing.value}">
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
                    ${transitionMethod.mixed ? '<option value="" selected disabled>Valeurs multiples</option>' : ""}
                    <option value="flyTo" ${!transitionMethod.mixed && transitionMethod.value === "flyTo" ? "selected" : ""}>Vol fluide (flyTo)</option>
                    <option value="easeTo" ${!transitionMethod.mixed && transitionMethod.value === "easeTo" ? "selected" : ""}>Déplacement direct (easeTo)</option>
                    <option value="jumpTo" ${!transitionMethod.mixed && transitionMethod.value === "jumpTo" ? "selected" : ""}>Sans animation (jumpTo)</option>
                </select>
            </div>
            <div id="transitionDurationProperty" class="property ${isAutomatic || transitionControl.mixed ? "" : "is-hidden"}">
                <label for="transitionDurationInput">Durée caméra (ms)</label>
                <input id="transitionDurationInput" type="number" min="0" step="100" value="${transitionDuration.mixed ? "" : transitionDuration.value}" placeholder="${transitionDuration.mixed ? "Valeurs multiples" : ""}" ${!transitionMethod.mixed && transitionMethod.value === "jumpTo" ? "disabled" : ""}>
                <p id="cameraTransitionHelp" class="property-help">${transitionMethod.mixed ? "Plusieurs animations de caméra sont sélectionnées." : getCameraTransitionHelp(transitionMethod.value)}</p>
            </div>
            <div class="property">
                <label for="transitionEasingInput">Accélération</label>
                <select id="transitionEasingInput">
                    ${transitionEasing.mixed ? '<option value="" selected disabled>Valeurs multiples</option>' : ""}
                    <option value="linear" ${!transitionEasing.mixed && transitionEasing.value === "linear" ? "selected" : ""}>Linéaire</option>
                    <option value="ease" ${!transitionEasing.mixed && transitionEasing.value === "ease" ? "selected" : ""}>Ease</option>
                    <option value="ease-in" ${!transitionEasing.mixed && transitionEasing.value === "ease-in" ? "selected" : ""}>Ease-in</option>
                    <option value="ease-out" ${!transitionEasing.mixed && transitionEasing.value === "ease-out" ? "selected" : ""}>Ease-out</option>
                    <option value="ease-in-out" ${!transitionEasing.mixed && transitionEasing.value === "ease-in-out" ? "selected" : ""}>Ease-in-out</option>
                </select>
                <p class="property-help">Courbe appliquée au mouvement de caméra. Les calques conservent l’interpolation native Mapbox.</p>
            </div>
            <div class="property transition-toggle-property">
                <label class="transition-toggle" for="transitionEssentialInput">
                    <input id="transitionEssentialInput" type="checkbox" ${!transitionEssential.mixed && transitionEssential.value ? "checked" : ""}>
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
                    <input id="layerTransitionEnabledInput" type="checkbox" ${!layerTransitionEnabled.mixed && layerTransitionEnabled.value ? "checked" : ""}>
                    <span>Activer les transitions de calques</span>
                </label>
                <p class="property-help">Les propriétés animables évoluent progressivement. La visibilité reste instantanée.</p>
            </div>
            <div class="property">
                <label for="layerModeInput">Comportement des calques</label>
                <select id="layerModeInput">
                    ${layerMode.mixed ? '<option value="" selected disabled>Valeurs multiples</option>' : ""}
                    <option value="snapshot" ${!layerMode.mixed && layerMode.value === "snapshot" ? "selected" : ""}>État complet</option>
                    <option value="inherit" ${!layerMode.mixed && layerMode.value === "inherit" ? "selected" : ""}>Hériter du chapitre précédent</option>
                </select>
            </div>
            <div class="camera-form">
                <div class="camera-field">
                    <label for="layerDurationInput">Fondu (ms)</label>
                    <input id="layerDurationInput" type="number" min="0" step="100" value="${layerDuration.mixed ? "" : layerDuration.value}" placeholder="${layerDuration.mixed ? "Valeurs multiples" : ""}" ${!layerTransitionEnabled.mixed && !layerTransitionEnabled.value ? "disabled" : ""}>
                </div>
                <div class="camera-field">
                    <label for="layerDelayInput">Délai (ms)</label>
                    <input id="layerDelayInput" type="number" min="0" step="100" value="${layerDelay.mixed ? "" : layerDelay.value}" placeholder="${layerDelay.mixed ? "Valeurs multiples" : ""}" ${!layerTransitionEnabled.mixed && !layerTransitionEnabled.value ? "disabled" : ""}>
                </div>
            </div>
        </section>

        <div class="transition-preview-bar">
            <button id="previewTransitionButton" type="button" class="button button-primary">▶ Jouer la transition</button>
            <p id="transitionPreviewStatus" class="property-help" aria-live="polite">Rejoue le passage depuis le chapitre précédent, sans modifier le projet.</p>
        </div>
    `;

    const essentialInput = document.getElementById("transitionEssentialInput");
    const layerEnabledInput = document.getElementById("layerTransitionEnabledInput");
    if (essentialInput) essentialInput.indeterminate = transitionEssential.mixed;
    if (layerEnabledInput) layerEnabledInput.indeterminate = layerTransitionEnabled.mixed;
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

function getCommonValue(items, getter, fallback) {
    if (!items.length) return { value: fallback, mixed: false };
    const values = items.map(item => getter(item));
    return {
        value: values[0] ?? fallback,
        mixed: values.some(value => value !== values[0])
    };
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
