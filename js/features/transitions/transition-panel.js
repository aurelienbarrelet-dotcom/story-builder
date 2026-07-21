import { getSelectedChapter, getSelectedChapters, getSelectedSection } from "../../core/store.js";
import { createTransitionTimeline, getTransitionTimelineDuration } from "./transition-timeline.js";
import {
    addLayerTransitions,
    removeLayerTransitions,
    sequenceSelectedLayerTransitions,
    updateChapterLayerMode,
    updateChapterLayerTransition,
    updateChapterTransition,
    updateSelectedLayerTransitions
} from "../chapters/chapter-service.js";
import { flyToSelectedChapter, getEditableLayers, previewSelectedChapterTransition } from "../map/map-service.js";
import { openLayerPicker } from "../../ui/layer-picker.js";

const selectedTransitionLayerIds = new Set();

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
    const editableLayers = getEditableLayers();
    const layerById = new Map(editableLayers.map(layer => [layer.id, layer]));
    const configuredLayerIds = [...new Set(selectedChapters.flatMap(item => Object.keys(item.layerTransitions ?? {})))].filter(id => layerById.has(id));
    [...selectedTransitionLayerIds].forEach(id => { if (!configuredLayerIds.includes(id)) selectedTransitionLayerIds.delete(id); });
    const selectedLayerIds = [...selectedTransitionLayerIds];
    const configuredLayers = configuredLayerIds.map(id => ({ id, label: layerById.get(id)?.label || id, type: layerById.get(id)?.type || "calque" }));
    const selectedLayerTransition = getCommonLayerTransition(selectedChapters, selectedLayerIds);

    container.innerHTML = `
        ${selectionCount > 1 ? `<p class="transition-multi-selection"><strong>${selectionCount} chapitres sélectionnés.</strong> Toute modification ci-dessous sera appliquée à l’ensemble de la sélection.</p>` : ""}
        ${renderTransitionTimeline(chapter, selectionCount > 1, configuredLayers)}
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
                <h3 id="layerTransitionTitle">Transition par défaut</h3>
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

        ${renderLayerTransitionManager(configuredLayers, selectedLayerIds, selectedLayerTransition)}

        <div class="transition-preview-bar">
            <button id="previewTransitionButton" type="button" class="button button-primary">▶ Jouer la transition</button>
            <p id="transitionPreviewStatus" class="property-help" aria-live="polite">Rejoue le passage depuis le chapitre précédent, sans modifier le projet.</p>
        </div>
    `;

    const essentialInput = document.getElementById("transitionEssentialInput");
    const layerEnabledInput = document.getElementById("layerTransitionEnabledInput");
    if (essentialInput) essentialInput.indeterminate = transitionEssential.mixed;
    if (layerEnabledInput) layerEnabledInput.indeterminate = layerTransitionEnabled.mixed;
    const selectedLayerEnabledInput = document.getElementById("selectedLayerTransitionEnabledInput");
    if (selectedLayerEnabledInput) selectedLayerEnabledInput.indeterminate = selectedLayerTransition.enabled.mixed;
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
    const addLayerTransitionsButton = document.getElementById("addLayerTransitionsButton");
    const removeSelectedLayerTransitionsButton = document.getElementById("removeSelectedLayerTransitionsButton");
    const selectedLayerEnabledInput = document.getElementById("selectedLayerTransitionEnabledInput");
    const selectedLayerEffectInput = document.getElementById("selectedLayerEffectInput");
    const selectedLayerDurationInput = document.getElementById("selectedLayerDurationInput");
    const selectedLayerDelayInput = document.getElementById("selectedLayerDelayInput");
    const sequenceLayerTransitionsButton = document.getElementById("sequenceLayerTransitionsButton");
    const sequenceLayerStepInput = document.getElementById("sequenceLayerStepInput");
    const previewTransitionButton = document.getElementById("previewTransitionButton");
    const transitionPreviewStatus = document.getElementById("transitionPreviewStatus");
    const timelinePlayhead = document.getElementById("transitionTimelinePlayhead");

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
    document.querySelectorAll("[data-transition-layer-id]").forEach(input => input.addEventListener("change", () => {
        if (input.checked) selectedTransitionLayerIds.add(input.dataset.transitionLayerId);
        else selectedTransitionLayerIds.delete(input.dataset.transitionLayerId);
        renderTransitionPanel();
    }));
    document.querySelectorAll("[data-remove-transition-layer]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const layerId = button.dataset.removeTransitionLayer;
        selectedTransitionLayerIds.delete(layerId);
        removeLayerTransitions([layerId]);
    }));
    addLayerTransitionsButton?.addEventListener("click", () => {
        const chapters = getSelectedChapters();
        const configured = [...new Set(chapters.flatMap(chapter => Object.keys(chapter.layerTransitions ?? {})))];
        openLayerPicker({
            title: "Ajouter des transitions de calques",
            confirmLabel: "Ajouter",
            disabledLayerIds: configured,
            onConfirm: layerIds => {
                addLayerTransitions(layerIds);
                layerIds.forEach(id => selectedTransitionLayerIds.add(id));
            }
        });
    });
    removeSelectedLayerTransitionsButton?.addEventListener("click", () => {
        const ids = [...selectedTransitionLayerIds];
        selectedTransitionLayerIds.clear();
        removeLayerTransitions(ids);
    });
    selectedLayerEnabledInput?.addEventListener("change", () => updateSelectedLayerTransitions([...selectedTransitionLayerIds], "enabled", selectedLayerEnabledInput.checked));
    selectedLayerEffectInput?.addEventListener("change", () => updateSelectedLayerTransitions([...selectedTransitionLayerIds], "effect", selectedLayerEffectInput.value));
    selectedLayerDurationInput?.addEventListener("change", () => updateSelectedLayerTransitions([...selectedTransitionLayerIds], "duration", selectedLayerDurationInput.value));
    selectedLayerDelayInput?.addEventListener("change", () => updateSelectedLayerTransitions([...selectedTransitionLayerIds], "delay", selectedLayerDelayInput.value));
    sequenceLayerTransitionsButton?.addEventListener("click", () => {
        sequenceSelectedLayerTransitions([...selectedTransitionLayerIds], sequenceLayerStepInput?.value ?? 200);
    });
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
        animateTimelinePlayhead(timelinePlayhead, previewDuration);

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


function renderLayerTransitionManager(layers, selectedIds, state) {
    const selected = new Set(selectedIds);
    const selectedCount = selected.size;
    return `
        <section class="transition-panel-section selected-layer-transition-section" aria-labelledby="selectedLayerTransitionTitle">
            <header class="transition-panel-section-header">
                <div>
                    <h3 id="selectedLayerTransitionTitle">Transitions spécifiques</h3>
                    <span>${layers.length} configurée${layers.length > 1 ? "s" : ""}</span>
                </div>
                <button id="addLayerTransitionsButton" class="ui-icon-button ui-icon-button--accent collection-add-button" type="button" aria-label="Ajouter des calques aux transitions" title="Ajouter des calques aux transitions">+</button>
            </header>
            <div class="transition-layer-list">
                ${layers.length ? layers.map(layer => `
                    <label class="transition-layer-card${selected.has(layer.id) ? " selected" : ""}">
                        <input type="checkbox" data-transition-layer-id="${escapeHtml(layer.id)}" ${selected.has(layer.id) ? "checked" : ""}>
                        <span><strong>${escapeHtml(layer.label)}</strong><small>${escapeHtml(layer.type)} · ${escapeHtml(layer.id)}</small></span>
                        <button type="button" class="transition-layer-remove" data-remove-transition-layer="${escapeHtml(layer.id)}" aria-label="Retirer la transition de ${escapeHtml(layer.label)}" title="Retirer cette transition">×</button>
                    </label>`).join("") : '<p class="property-help panel-empty-state panel-empty-state--compact">Aucune exception configurée. Tous les calques utilisent la transition par défaut.</p>'}
            </div>
            ${selectedCount ? `
                <div class="transition-layer-editor">
                    <p class="transition-layer-selection-summary"><strong>${selectedCount} calque${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}</strong></p>
                    <div class="property transition-toggle-property">
                        <label class="transition-toggle" for="selectedLayerTransitionEnabledInput">
                            <input id="selectedLayerTransitionEnabledInput" type="checkbox" ${state.enabled.mixed || state.enabled.value ? "checked" : ""}>
                            <span>Transition individuelle</span>
                        </label>
                    </div>
                    <div class="property">
                        <label for="selectedLayerEffectInput">Type d’apparition</label>
                        <select id="selectedLayerEffectInput">
                            ${state.effect.mixed ? '<option value="" selected disabled>Valeurs multiples</option>' : ""}
                            <option value="fade" ${!state.effect.mixed && state.effect.value === "fade" ? "selected" : ""}>Fondu</option>
                            <option value="grow" ${!state.effect.mixed && state.effect.value === "grow" ? "selected" : ""}>Croissance / interpolation</option>
                            <option value="none" ${!state.effect.mixed && state.effect.value === "none" ? "selected" : ""}>Instantané</option>
                        </select>
                    </div>
                    <div class="camera-form">
                        <div class="camera-field"><label for="selectedLayerDurationInput">Durée (ms)</label><input id="selectedLayerDurationInput" type="number" min="0" step="50" value="${state.duration.mixed ? "" : state.duration.value}" placeholder="${state.duration.mixed ? "Valeurs multiples" : ""}"></div>
                        <div class="camera-field"><label for="selectedLayerDelayInput">Délai (ms)</label><input id="selectedLayerDelayInput" type="number" min="0" step="50" value="${state.delay.mixed ? "" : state.delay.value}" placeholder="${state.delay.mixed ? "Valeurs multiples" : ""}"></div>
                    </div>
                    <div class="transition-sequence-row">
                        <label for="sequenceLayerStepInput">Décalage automatique</label>
                        <input id="sequenceLayerStepInput" type="number" min="0" step="50" value="200" aria-label="Décalage entre les calques en millisecondes">
                        <button id="sequenceLayerTransitionsButton" type="button" class="button">Séquencer</button>
                    </div>
                    <button id="removeSelectedLayerTransitionsButton" type="button" class="button button-danger">Retirer les transitions sélectionnées</button>
                </div>` : '<p class="property-help">Coche une ou plusieurs exceptions pour modifier leurs réglages ensemble. Retirer une exception rétablit la transition par défaut.</p>'}
        </section>`;
}

function getCommonLayerTransition(chapters, layerIds) {
    const values = [];
    chapters.forEach(chapter => layerIds.forEach(layerId => {
        const fallback = chapter.layerTransition ?? { enabled: true, duration: 600, delay: 0 };
        const value = chapter.layerTransitions?.[layerId] ?? {};
        values.push({
            enabled: value.enabled ?? (fallback.enabled !== false),
            duration: Number(value.duration ?? fallback.duration ?? 600),
            delay: Number(value.delay ?? fallback.delay ?? 0),
            effect: value.effect || "fade"
        });
    }));
    return {
        enabled: getCommonValue(values, item => item.enabled, true),
        duration: getCommonValue(values, item => item.duration, 600),
        delay: getCommonValue(values, item => item.delay, 0),
        effect: getCommonValue(values, item => item.effect, "fade")
    };
}

function renderTransitionTimeline(chapter, mixedSelection, selectedLayers = []) {
    if (mixedSelection) {
        return `
            <section class="transition-panel-section transition-timeline-section" aria-labelledby="transitionTimelineTitle">
                <header class="transition-panel-section-header">
                    <h3 id="transitionTimelineTitle">Timeline</h3>
                    <span>Valeurs multiples</span>
                </header>
                <p class="property-help">Sélectionne un seul chapitre pour visualiser précisément ses pistes.</p>
            </section>`;
    }

    const timeline = createTransitionTimeline(chapter);
    const individualTracks = selectedLayers.map(layer => {
        const fallback = chapter.layerTransition ?? { enabled: true, duration: 600, delay: 0 };
        const config = chapter.layerTransitions?.[layer.id] ?? fallback;
        return {
            ...layer,
            enabled: config.enabled !== false && config.effect !== "none",
            duration: Math.max(0, Number(config.duration) || 0),
            delay: Math.max(0, Number(config.delay) || 0)
        };
    });
    const maxLayerEnd = individualTracks.reduce((max, track) => Math.max(max, track.delay + track.duration), 0);
    const total = Math.max(timeline.duration, maxLayerEnd, 1);
    const cameraWidth = Math.max(0, timeline.camera.duration / total * 100);
    const rows = individualTracks.length ? individualTracks : [{
        id: "global", label: "Calques", enabled: timeline.layers.enabled,
        duration: timeline.layers.duration, delay: timeline.layers.start
    }];
    const middle = total / 2;

    return `
        <section class="transition-panel-section transition-timeline-section" aria-labelledby="transitionTimelineTitle">
            <header class="transition-panel-section-header">
                <h3 id="transitionTimelineTitle">Timeline</h3>
                <span>${formatDuration(total)}</span>
            </header>
            <div class="transition-timeline">
                <div class="transition-timeline-ruler" aria-hidden="true">
                    <span>0</span><span>${formatDuration(middle)}</span><span>${formatDuration(total)}</span>
                </div>
                <div class="transition-timeline-track">
                    <span class="transition-timeline-label">Caméra</span>
                    <div class="transition-timeline-rail"><span class="transition-timeline-clip transition-timeline-camera" style="left:0;width:${cameraWidth}%"></span></div>
                </div>
                ${rows.map(track => `
                    <div class="transition-timeline-track ${track.enabled ? "" : "is-disabled"}">
                        <span class="transition-timeline-label" title="${escapeHtml(track.label)}">${escapeHtml(track.label)}</span>
                        <div class="transition-timeline-rail"><span class="transition-timeline-clip transition-timeline-layers" style="left:${track.delay / total * 100}%;width:${track.duration / total * 100}%"></span></div>
                    </div>`).join("")}
                <span id="transitionTimelinePlayhead" class="transition-timeline-playhead" aria-hidden="true"></span>
            </div>
            <p class="property-help">La timeline affiche la caméra et, lorsqu’ils sont sélectionnés, les calques avec leurs délais individuels.</p>
        </section>`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
}

function animateTimelinePlayhead(playhead, duration) {
    if (!playhead) return;
    playhead.getAnimations().forEach(animation => animation.cancel());
    playhead.style.transform = "translateX(0)";
    if (duration <= 0) {
        playhead.style.transform = "translateX(calc(100% - 2px))";
        return;
    }
    playhead.animate(
        [{ left: "82px" }, { left: "100%" }],
        { duration, easing: "linear", fill: "forwards" }
    );
}
