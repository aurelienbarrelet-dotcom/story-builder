import { on, EVENTS } from "../../core/events.js";
import { getSelectedMapTarget, getSelectedSection } from "../../core/store.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getBaseLayerProperty, getEditableLayers, getSelectedLayerValue } from "../map/map-service.js";

const selectedLayerIds = new Set();
let searchQuery = "";
let draggedLegendIndex = null;

const SYMBOL_PROPERTIES = {
    fill: { color: ["fill-color"], outline: ["fill-outline-color"], opacity: ["fill-opacity"] },
    line: { color: ["line-color"], outline: ["line-color"], opacity: ["line-opacity"], width: ["line-width"] },
    circle: { color: ["circle-color"], outline: ["circle-stroke-color"], opacity: ["circle-opacity"], width: ["circle-radius"] },
    symbol: { color: ["icon-color", "text-color"], outline: ["icon-halo-color", "text-halo-color"], opacity: ["icon-opacity", "text-opacity"] },
    "fill-extrusion": { color: ["fill-extrusion-color"], outline: [], opacity: ["fill-extrusion-opacity"] },
    background: { color: ["background-color"], outline: [], opacity: ["background-opacity"] }
};

export function setupLegendPanel() {
    document.getElementById("legendLayerSearchInput")?.addEventListener("input", event => {
        searchQuery = event.target.value.trim().toLowerCase();
        renderLegendPanel();
    });
    document.getElementById("addSelectedLegendItemsButton")?.addEventListener("click", addSelectedLayers);
    on(EVENTS.MAP_STYLE_READY, renderLegendPanel);
    on(EVENTS.SELECTION_CHANGED, resetAndRender);
    on(EVENTS.PROJECT_REPLACED, resetAndRender);
}

function resetAndRender() {
    selectedLayerIds.clear();
    renderLegendPanel();
}

export function renderLegendPanel() {
    const available = document.getElementById("legendAvailableLayers");
    const current = document.getElementById("legendCurrentItems");
    const availableCount = document.getElementById("legendAvailableCount");
    const currentCount = document.getElementById("legendCurrentCount");
    const addButton = document.getElementById("addSelectedLegendItemsButton");
    if (!available || !current || !availableCount || !currentCount || !addButton) return;

    const chapter = getSelectedMapTarget();
    const chapterSelected = Boolean(chapter);
    if (!chapterSelected) {
        current.innerHTML = '<p class="legend-empty">Sélectionnez le projet ou un chapitre pour composer sa légende.</p>';
        available.innerHTML = '<p class="legend-empty">Aucune légende disponible.</p>';
        availableCount.textContent = "";
        currentCount.textContent = "";
        addButton.disabled = true;
        return;
    }

    chapter.legend ??= [];
    const candidateLayers = getEditableLayers()
        .map(layer => ({ layer, symbol: createSymbolFromLayer(layer, false) }))
        .filter(entry => entry.symbol);
    const existingIds = new Set(chapter.legend.map(item => item.layerId));
    const filtered = candidateLayers.filter(({ layer }) => {
        const haystack = `${layer.label} ${layer.id} ${layer.type}`.toLowerCase();
        return !searchQuery || haystack.includes(searchQuery);
    });

    currentCount.textContent = `${chapter.legend.length} élément${chapter.legend.length > 1 ? "s" : ""}`;
    availableCount.textContent = `${candidateLayers.length} possibilité${candidateLayers.length > 1 ? "s" : ""}`;

    current.innerHTML = "";
    if (!chapter.legend.length) {
        current.innerHTML = '<p class="legend-empty">La légende est vide.</p>';
    } else {
        chapter.legend.forEach((item, index) => current.append(createLegendItemCard(item, index)));
    }

    available.innerHTML = "";
    if (!getEditableLayers().length) {
        available.innerHTML = '<p class="legend-empty">Connectez la carte pour analyser les calques disponibles.</p>';
    } else if (!candidateLayers.length) {
        available.innerHTML = '<p class="legend-empty">Aucun calque avec fond ou contour exploitable.</p>';
    } else if (!filtered.length) {
        available.innerHTML = '<p class="legend-empty">Aucun calque ne correspond à la recherche.</p>';
    } else {
        filtered.forEach(({ layer, symbol }) => available.append(createAvailableLayerRow(layer, symbol, existingIds.has(layer.id))));
    }

    [...selectedLayerIds].forEach(id => {
        if (!candidateLayers.some(({ layer }) => layer.id === id) || existingIds.has(id)) selectedLayerIds.delete(id);
    });
    updateAddButton();
}

function createAvailableLayerRow(layer, symbolData, alreadyAdded) {
    const row = document.createElement("label");
    row.className = `legend-available-row${alreadyAdded ? " is-added" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedLayerIds.has(layer.id);
    checkbox.disabled = alreadyAdded;
    checkbox.addEventListener("change", () => {
        checkbox.checked ? selectedLayerIds.add(layer.id) : selectedLayerIds.delete(layer.id);
        updateAddButton();
    });
    const text = document.createElement("span");
    text.className = "legend-available-copy";
    text.innerHTML = `<strong>${escapeHtml(layer.label)}</strong><small>${escapeHtml(layer.type)} · ${escapeHtml(layer.id)}</small>`;
    const state = document.createElement("span");
    state.className = "legend-added-state";
    state.textContent = alreadyAdded ? "Ajouté" : "";
    row.append(checkbox, createSymbolPreview(symbolData), text, state);
    return row;
}

function createLegendItemCard(item, index) {
    const card = document.createElement("article");
    card.className = "legend-item-card";
    card.draggable = true;
    card.dataset.legendIndex = String(index);

    const handle = document.createElement("span");
    handle.className = "legend-drag-handle";
    handle.textContent = "⋮⋮";
    handle.title = "Glisser pour réordonner";

    const input = document.createElement("input");
    input.type = "text";
    input.value = item.label;
    input.className = "panel-text-input";
    input.setAttribute("aria-label", "Libellé de la légende");
    input.addEventListener("change", () => {
        item.label = input.value.trim() || item.layerId || "Élément de légende";
        commitProjectChange();
        renderLegendPanel();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "legend-icon-button";
    remove.textContent = "×";
    remove.title = "Supprimer";
    remove.setAttribute("aria-label", "Supprimer");
    remove.addEventListener("click", () => removeLegendItem(index));

    const top = document.createElement("div");
    top.className = "legend-item-top";
    top.append(handle, createSymbolPreview(item.symbol), input, remove);
    const meta = document.createElement("div");
    meta.className = "legend-item-meta";
    meta.textContent = `${item.symbol?.type ?? "symbole"} · ${item.layerId || "sans calque"}`;
    card.append(top, meta);

    card.addEventListener("dragstart", event => {
        draggedLegendIndex = index;
        card.classList.add("dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
    });
    card.addEventListener("dragover", event => {
        event.preventDefault();
        if (draggedLegendIndex !== index) card.classList.add("drag-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", event => {
        event.preventDefault();
        if (draggedLegendIndex !== null) moveLegendItem(draggedLegendIndex, index);
        draggedLegendIndex = null;
    });
    card.addEventListener("dragend", () => {
        draggedLegendIndex = null;
        document.querySelectorAll(".legend-item-card").forEach(el => el.classList.remove("dragging", "drag-over"));
    });
    return card;
}

function addSelectedLayers() {
    const chapter = getSelectedMapTarget();
    if (!chapter) return;
    const candidates = getEditableLayers()
        .map(layer => ({ layer, symbol: createSymbolFromLayer(layer, false) }))
        .filter(entry => entry.symbol);
    const byId = new Map(candidates.map(entry => [entry.layer.id, entry]));
    const existing = new Set((chapter.legend ?? []).map(item => item.layerId));
    chapter.legend ??= [];
    [...selectedLayerIds].forEach(layerId => {
        const entry = byId.get(layerId);
        if (!entry || existing.has(layerId)) return;
        chapter.legend.push({ id: createLegendId(layerId), layerId, label: entry.layer.label, symbol: entry.symbol });
    });
    selectedLayerIds.clear();
    commitProjectChange();
    renderLegendPanel();
}

function moveLegendItem(fromIndex, toIndex) {
    const chapter = getSelectedMapTarget();
    if (!chapter?.legend || fromIndex === toIndex || toIndex < 0 || toIndex >= chapter.legend.length) return;
    const [item] = chapter.legend.splice(fromIndex, 1);
    chapter.legend.splice(toIndex, 0, item);
    commitProjectChange();
    renderLegendPanel();
}

function removeLegendItem(index) {
    const chapter = getSelectedMapTarget();
    if (!chapter?.legend?.[index]) return;
    chapter.legend.splice(index, 1);
    commitProjectChange();
    renderLegendPanel();
}

function createSymbolFromLayer(layer, allowFallback = true) {
    const config = SYMBOL_PROPERTIES[layer.type];
    if (!config) return null;
    const color = resolveFirstProperty(layer.id, config.color);
    const outlineColor = resolveFirstProperty(layer.id, config.outline);
    if (!color && !outlineColor && !allowFallback) return null;
    const resolvedColor = color || outlineColor || "#4b78ff";
    return {
        type: layer.type,
        color: resolvedColor,
        outlineColor: outlineColor || resolvedColor,
        opacity: resolveNumberProperty(layer.id, config.opacity, 1),
        width: resolveNumberProperty(layer.id, config.width, layer.type === "circle" ? 5 : 2)
    };
}

function resolveFirstProperty(layerId, properties) {
    for (const property of properties ?? []) {
        const selected = getSelectedLayerValue(layerId, "paint", property);
        const value = selected.mixed ? undefined : selected.value;
        const resolved = normalizeColor(value ?? getBaseLayerProperty(layerId, "paint", property));
        if (resolved) return resolved;
    }
    return null;
}

function resolveNumberProperty(layerId, properties, fallback) {
    for (const property of properties ?? []) {
        const selected = getSelectedLayerValue(layerId, "paint", property);
        const value = selected.mixed ? undefined : selected.value;
        const resolved = value ?? getBaseLayerProperty(layerId, "paint", property);
        if (typeof resolved === "number" && Number.isFinite(resolved)) return resolved;
    }
    return fallback;
}

function normalizeColor(value) {
    if (typeof value !== "string") return null;
    if (/^#[0-9a-f]{3,8}$/i.test(value) || /^(rgb|hsl)a?\(/i.test(value) || /^[a-z]+$/i.test(value)) return value;
    return null;
}

function createSymbolPreview(symbol = {}) {
    const preview = document.createElement("span");
    const type = symbol.type ?? "fill";
    preview.className = `legend-symbol legend-symbol-${type}`;
    preview.style.setProperty("--legend-color", symbol.color || "#4b78ff");
    preview.style.setProperty("--legend-outline", symbol.outlineColor || symbol.color || "#4b78ff");
    preview.style.setProperty("--legend-opacity", String(symbol.opacity ?? 1));
    preview.style.setProperty("--legend-width", `${Math.max(1, Math.min(8, Number(symbol.width) || 2))}px`);
    return preview;
}

function updateAddButton() {
    const button = document.getElementById("addSelectedLegendItemsButton");
    if (!button) return;
    const count = selectedLayerIds.size;
    button.disabled = count === 0;
    button.textContent = count ? `Ajouter ${count} calque${count > 1 ? "s" : ""} à la légende` : "Ajouter à la légende";
}

function createLegendId(layerId) {
    return `legend-${layerId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
