import { emit, on, EVENTS } from "../../core/events.js";
import { getSelectedMapTargets, getSelectedSection } from "../../core/store.js";
import {
    getBaseLayerProperty,
    getEditableLayers,
    getLayerControlDefinitions,
    getSelectedLayerValue,
    resetSelectedChapterLayerOpacity,
    resetSelectedChapterLayerProperty,
    resetSelectedChapterLayerStyles,
    setSelectedChapterLayerOpacity,
    setSelectedChapterLayerProperty
} from "../map/map-service.js";

const COLLAPSED_KEY = "storyBuilderLayersPanelCollapsed";
let searchQuery = "";
let typeFilter = "all";
const selectedLayerIds = new Set();

export function getSelectedLayerIds() { return [...selectedLayerIds]; }

export function setupLayersPanel() {
    const panel = document.getElementById("layersPanel");
    const button = document.getElementById("toggleLayersPanelButton");
    if (!panel || !button) return;

    setCollapsedState(panel, button, localStorage.getItem(COLLAPSED_KEY) === "true");
    button.addEventListener("click", () => {
        const nextState = !panel.classList.contains("collapsed");
        setCollapsedState(panel, button, nextState);
        localStorage.setItem(COLLAPSED_KEY, String(nextState));
        window.dispatchEvent(new Event("resize"));
    });

    document.getElementById("layerSearchInput")?.addEventListener("input", event => {
        searchQuery = event.target.value.trim().toLowerCase();
        renderLayerControls();
    });
    document.getElementById("layerTypeFilter")?.addEventListener("change", event => {
        typeFilter = event.target.value;
        renderLayerControls();
    });
    document.getElementById("resetSelectedLayerStylesButton")?.addEventListener("click", () => {
        const layerIds = [...selectedLayerIds];
        const chapterCount = getSelectedMapTargets().length;
        if (!layerIds.length || !chapterCount) return;
        const layerLabel = `${layerIds.length} calque${layerIds.length > 1 ? "s" : ""}`;
        const projectSelected = getSelectedSection() === "meta";
        const targetLabel = projectSelected
            ? "le Projet selon le style Mapbox"
            : `${chapterCount} chapitre${chapterCount > 1 ? "s" : ""} selon les valeurs du Projet`;
        if (!confirm(`Réinitialiser ${layerLabel} pour ${targetLabel} ?`)) return;
        layerIds.forEach(layerId => resetSelectedChapterLayerStyles(layerId));
        selectedLayerIds.clear();
        renderLayerControls();
    });

    on(EVENTS.MAP_STYLE_READY, renderLayerControls);
    on(EVENTS.SELECTION_CHANGED, renderLayerControls);
    on(EVENTS.PROJECT_REPLACED, renderLayerControls);
    renderLayerControls();
}

function renderLayerControls() {
    const openLayerIds = new Set([...document.querySelectorAll("#layerOpacityList .layer-module[open]")].map(item => item.dataset.layerId));
    const list = document.getElementById("layerOpacityList");
    const summary = document.getElementById("layersSelectionCount");
    if (!list || !summary) return;

    const selectedCount = getSelectedMapTargets().length;
    summary.textContent = getSelectedSection() === "meta" ? "Valeurs de référence du projet" : `${selectedCount} chapitre${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}`;
    const allLayers = getEditableLayers();
    const availableLayerIds = new Set(allLayers.map(layer => layer.id));
    [...selectedLayerIds].forEach(layerId => {
        if (!availableLayerIds.has(layerId)) selectedLayerIds.delete(layerId);
    });
    updateResetSelectionButton();
    updateTypeFilter(allLayers);
    const layers = allLayers.filter(layer =>
        (typeFilter === "all" || layer.type === typeFilter) &&
        (!searchQuery || `${layer.id} ${layer.label}`.toLowerCase().includes(searchQuery))
    );

    list.replaceChildren();
    if (!allLayers.length) {
        list.innerHTML = '<p class="layer-empty">Connecte la carte pour afficher les calques disponibles.</p>';
        return;
    }
    if (!layers.length) {
        list.innerHTML = '<p class="layer-empty">Aucun calque ne correspond à cette recherche.</p>';
        return;
    }
    layers.forEach(layer => list.append(createLayerModule(layer, openLayerIds.has(layer.id))));
}

function createLayerModule(layer, isOpen = false) {
    const definitions = getLayerControlDefinitions(layer.type);
    const details = document.createElement("details");
    details.className = `layer-module${layer.modified ? " is-modified" : ""}`;
    details.dataset.layerId = layer.id;
    details.open = isOpen;

    const summary = document.createElement("summary");
    const selector = document.createElement("input");
    selector.type = "checkbox";
    selector.className = "layer-selection-checkbox";
    selector.checked = selectedLayerIds.has(layer.id);
    selector.setAttribute("aria-label", `Sélectionner le calque ${layer.label}`);
    selector.addEventListener("click", event => event.stopPropagation());
    selector.addEventListener("change", () => {
        if (selector.checked) selectedLayerIds.add(layer.id);
        else selectedLayerIds.delete(layer.id);
        updateResetSelectionButton();
        emit(EVENTS.LAYER_SELECTION_CHANGED, { layerIds: getSelectedLayerIds() });
    });

    const dot = document.createElement("span");
    dot.className = "layer-state-dot";
    dot.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "layer-summary-copy";
    copy.innerHTML = `<strong>${escapeHtml(layer.label)}</strong><small>${escapeHtml(layer.type)} · ${escapeHtml(layer.id)}</small>`;

    const modified = document.createElement("span");
    modified.className = "layer-modified-label";
    modified.textContent = layer.modified ? "Modifié" : "";

    summary.append(selector, dot, copy, modified);
    details.append(summary);

    const body = document.createElement("div");
    body.className = "layer-module-body";
    body.append(createVisibilityControl(layer));
    body.append(createOpacityControl(layer));
    (definitions?.controls ?? []).forEach(control => body.append(createPaintControl(layer, control)));

    details.append(body);
    return details;
}

function createVisibilityControl(layer) {
    const state = getSelectedLayerValue(layer.id, "layout", "visibility");
    const wrapper = createControlShell("Visibilité", state.mixed ? "Valeurs mixtes" : "");
    const select = document.createElement("select");
    select.className = "layer-select";
    select.innerHTML = '<option value="visible">Affiché</option><option value="none">Masqué</option>';
    select.value = state.mixed ? "visible" : (state.value ?? getBaseLayerProperty(layer.id, "layout", "visibility") ?? "visible");
    select.classList.toggle("is-mixed", state.mixed);
    select.addEventListener("change", () => setSelectedChapterLayerProperty(layer.id, "layout", "visibility", select.value));
    wrapper.control.append(select, createResetButton(() => resetSelectedChapterLayerProperty(layer.id, "layout", "visibility")));
    return wrapper.element;
}

function createOpacityControl(layer) {
    const definitions = getLayerControlDefinitions(layer.type);
    const property = definitions.opacity[0];
    const state = getSelectedLayerValue(layer.id, "paint", property);
    const legacyValues = getSelectedMapTargets().map(chapter => chapter.layerOpacity?.[layer.id]);
    const legacyMixed = new Set(legacyValues.map(v => v === undefined ? "u" : String(v))).size > 1;
    const mixed = state.mixed || (!state.explicit && legacyMixed);
    const explicitValue = state.value ?? legacyValues[0];
    const base = getBaseLayerProperty(layer.id, "paint", property);
    const value = typeof explicitValue === "number" ? explicitValue : (typeof base === "number" ? base : 1);
    const wrapper = createControlShell("Opacité générale", mixed ? "Valeurs mixtes" : "");
    wrapper.element.classList.add("layer-control-percent");
    const { range, number } = createPercentRange(value, mixed, nextValue => {
        setSelectedChapterLayerOpacity(layer.id, nextValue);
    });
    wrapper.control.append(range, number, createResetButton(() => resetSelectedChapterLayerOpacity(layer.id)));
    return wrapper.element;
}

function createPaintControl(layer, definition) {
    const state = getSelectedLayerValue(layer.id, "paint", definition.key);
    const base = getBaseLayerProperty(layer.id, "paint", definition.key);
    const rawValue = state.value ?? base;
    const wrapper = createControlShell(definition.label, state.mixed ? "Valeurs mixtes" : formatValue(rawValue, definition));
    let input;

    if (definition.kind === "color") {
        input = document.createElement("input");
        input.type = "color";
        input.value = normalizeColor(rawValue);
        input.className = `layer-color${state.mixed ? " is-mixed" : ""}`;
        input.addEventListener("input", () => {
            wrapper.element.querySelector(".layer-control-value").textContent = input.value.toUpperCase();
            setSelectedChapterLayerProperty(layer.id, "paint", definition.key, input.value);
        });
    } else if (definition.kind === "range") {
        const value = typeof rawValue === "number" ? rawValue : definition.min;
        wrapper.element.classList.add("layer-control-percent");
        const controls = createPercentRange(value, state.mixed, nextValue => {
            setSelectedChapterLayerProperty(layer.id, "paint", definition.key, nextValue);
        });
        wrapper.control.append(controls.range, controls.number, createResetButton(() => resetSelectedChapterLayerProperty(layer.id, "paint", definition.key)));
        return wrapper.element;
    } else {
        input = document.createElement("input");
        input.type = "number";
        input.min = String(definition.min); input.max = String(definition.max); input.step = String(definition.step);
        input.value = String(typeof rawValue === "number" ? rawValue : definition.min);
        input.className = "layer-number";
        input.classList.toggle("is-mixed", state.mixed);
        input.addEventListener("change", () => {
            const value = Number(input.value);
            wrapper.element.querySelector(".layer-control-value").textContent = formatValue(value, definition);
            setSelectedChapterLayerProperty(layer.id, "paint", definition.key, value);
        });
    }
    wrapper.control.append(input, createResetButton(() => resetSelectedChapterLayerProperty(layer.id, "paint", definition.key)));
    return wrapper.element;
}

function createPercentRange(value, mixed, onChange) {
    const normalized = Math.max(0, Math.min(1, Number(value) || 0));
    const range = document.createElement("input");
    range.type = "range";
    range.min = "0";
    range.max = "1";
    range.step = "0.01";
    range.value = String(normalized);
    range.className = `layer-range${mixed ? " is-mixed" : ""}`;

    const number = document.createElement("input");
    number.type = "number";
    number.min = "0";
    number.max = "100";
    number.step = "1";
    number.value = String(Math.round(normalized * 100));
    number.className = `layer-percent-number${mixed ? " is-mixed" : ""}`;
    number.setAttribute("aria-label", "Valeur en pourcentage");

    const commit = nextValue => {
        const clamped = Math.max(0, Math.min(1, Number(nextValue) || 0));
        range.value = String(clamped);
        number.value = String(Math.round(clamped * 100));
        onChange(clamped);
    };

    range.addEventListener("input", () => {
        const nextValue = Number(range.value);
        number.value = String(Math.round(nextValue * 100));
        onChange(nextValue);
    });

    // Pendant la frappe, on ne modifie que le slider. La mutation du projet
    // est validée à la fin afin que "100" ne soit pas interrompu après "1".
    number.addEventListener("input", () => {
        if (number.value === "") return;
        const percent = Math.max(0, Math.min(100, Number(number.value) || 0));
        range.value = String(percent / 100);
    });
    number.addEventListener("change", () => commit(Number(number.value) / 100));
    number.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            number.blur();
        }
    });
    return { range, number };
}

function createControlShell(label, value) {
    const element = document.createElement("div");
    element.className = "layer-control";
    element.innerHTML = `<div class="layer-control-header"><label>${escapeHtml(label)}</label><span class="layer-control-value">${escapeHtml(value)}</span></div>`;
    const control = document.createElement("div");
    control.className = "layer-control-row";
    element.append(control);
    return { element, control };
}

function createResetButton(callback) {
    const button = document.createElement("button");
    const projectSelected = getSelectedSection() === "meta";
    button.type = "button"; button.className = "layer-control-reset"; button.textContent = "↺";
    button.title = projectSelected
        ? "Réinitialiser selon le style Mapbox"
        : "Réinitialiser selon les valeurs du Projet";
    button.addEventListener("click", () => { callback(); renderLayerControls(); });
    return button;
}

function updateTypeFilter(layers) {
    const select = document.getElementById("layerTypeFilter");
    if (!select) return;
    const types = [...new Set(layers.map(layer => layer.type))].sort();
    const current = typeFilter;
    select.innerHTML = '<option value="all">Tous les types</option>' + types.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("");
    select.value = types.includes(current) ? current : "all";
    typeFilter = select.value;
}

function updateResetSelectionButton() {
    const projectSelected = getSelectedSection() === "meta";
    const bar = document.getElementById("layersSelectionBar");
    const countLabel = document.getElementById("selectedLayersCount");
    const button = document.getElementById("resetSelectedLayerStylesButton");
    if (!bar || !countLabel || !button) return;
    const count = selectedLayerIds.size;
    const actionLabel = projectSelected
        ? "Restaurer les valeurs du style Mapbox"
        : "Restaurer les valeurs définies dans le Projet";
    bar.hidden = count === 0;
    bar.classList.toggle("visible", count > 0);
    countLabel.textContent = `${count} calque${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`;
    button.disabled = count === 0;
    button.setAttribute("aria-label", actionLabel);
    button.title = actionLabel;
}

function setCollapsedState(panel, button, isCollapsed) {
    panel.classList.toggle("collapsed", isCollapsed);
    button.innerHTML = isCollapsed ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>` : "›";
    button.setAttribute("aria-expanded", String(!isCollapsed));
    button.setAttribute("aria-label", isCollapsed ? "Ouvrir la colonne des calques" : "Réduire la colonne des calques");
    button.title = isCollapsed ? "Ouvrir la colonne" : "Réduire la colonne";
}

function normalizeColor(value) {
    if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value;
    if (typeof value === "string" && /^#[0-9a-f]{3}$/i.test(value)) return "#" + [...value.slice(1)].map(c => c + c).join("");
    return "#4b78ff";
}
function formatValue(value, definition) {
    if (definition.kind === "color") return typeof value === "string" ? value.toUpperCase() : "Style d’origine";
    if (typeof value !== "number") return "Style d’origine";
    if (definition.kind === "range") return `${Math.round(value * 100)} %`;
    return `${value}${definition.unit ? ` ${definition.unit}` : ""}`;
}
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
