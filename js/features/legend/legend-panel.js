import { on, EVENTS } from "../../core/events.js";
import { getSelectedMapTarget } from "../../core/store.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getBaseLayerProperty, getEditableLayers, getSelectedLayerValue } from "../map/map-service.js";
import { createCollectionSelection, renderCollectionSelectionBar, bindCollectionMenu } from "../../ui/collection-panel.js";
import { bindInlineEditor } from "../../ui/inline-editor.js";

const availableSelection = createCollectionSelection();
const activeSelection = createCollectionSelection();
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
    availableSelection.clear();
    activeSelection.clear();
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
    if (!chapter) {
        current.innerHTML = '<p class="legend-empty">Sélectionnez le projet ou un chapitre pour composer sa légende.</p>';
        available.innerHTML = '<p class="legend-empty">Aucune légende disponible.</p>';
        availableCount.textContent = "";
        currentCount.textContent = "";
        addButton.disabled = true;
        renderActiveSelectionBar();
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

    availableSelection.prune(candidateLayers.filter(entry => !existingIds.has(entry.layer.id)).map(entry => entry.layer.id));
    activeSelection.prune(chapter.legend.map(item => item.id));
    currentCount.textContent = `${chapter.legend.length} élément${chapter.legend.length > 1 ? "s" : ""}`;
    availableCount.textContent = `${candidateLayers.length} possibilité${candidateLayers.length > 1 ? "s" : ""}`;

    current.innerHTML = chapter.legend.length ? "" : '<p class="legend-empty">La légende est vide.</p>';
    chapter.legend.forEach((item, index) => current.append(createLegendItemCard(item, index, chapter.legend.map(entry => entry.id))));

    available.innerHTML = "";
    if (!getEditableLayers().length) available.innerHTML = '<p class="legend-empty">Connectez la carte pour analyser les calques disponibles.</p>';
    else if (!candidateLayers.length) available.innerHTML = '<p class="legend-empty">Aucun calque avec fond ou contour exploitable.</p>';
    else if (!filtered.length) available.innerHTML = '<p class="legend-empty">Aucun calque ne correspond à la recherche.</p>';
    else filtered.forEach(({ layer, symbol }) => available.append(createAvailableLayerCard(layer, symbol, existingIds.has(layer.id), filtered.map(entry => entry.layer.id))));

    updateAddButton();
    renderActiveSelectionBar();
}

function createAvailableLayerCard(layer, symbolData, alreadyAdded, orderedIds) {
    const card = document.createElement("article");
    card.className = `legend-available-row collection-card${alreadyAdded ? " is-added" : ""}${availableSelection.has(layer.id) ? " selected" : ""}`;
    card.tabIndex = alreadyAdded ? -1 : 0;
    card.setAttribute("aria-disabled", String(alreadyAdded));
    card.innerHTML = `<span class="legend-card-symbol"></span><span class="legend-available-copy"><strong>${escapeHtml(layer.label)}</strong><small>${escapeHtml(layer.type)} · ${escapeHtml(layer.id)}</small></span><span class="legend-added-state">${alreadyAdded ? "Ajouté" : ""}</span>`;
    card.querySelector(".legend-card-symbol").replaceWith(createSymbolPreview(symbolData));
    const select = event => {
        if (alreadyAdded) return;
        availableSelection.select(layer.id, orderedIds, event);
        renderLegendPanel();
    };
    card.addEventListener("click", select);
    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(event); }
    });
    return card;
}

function createLegendItemCard(item, index, orderedIds) {
    const card = document.createElement("article");
    card.className = `legend-item-card collection-card${activeSelection.has(item.id) ? " selected" : ""}`;
    card.draggable = true;
    card.dataset.legendIndex = String(index);
    card.addEventListener("click", event => {
        if (event.target.closest("button,input")) return;
        activeSelection.select(item.id, orderedIds, event);
        renderLegendPanel();
    });

    const handle = document.createElement("span");
    handle.className = "legend-drag-handle";
    handle.textContent = "⋮⋮";
    handle.title = "Glisser pour réordonner";

    const copy = document.createElement("span");
    copy.className = "legend-item-copy";
    copy.innerHTML = `<strong></strong><small>${escapeHtml(item.symbol?.type ?? "symbole")} · ${escapeHtml(item.layerId || "sans calque")}</small>`;
    const labelElement = copy.querySelector("strong");
    labelElement.textContent = item.label;
    bindInlineEditor({
        element: labelElement,
        value: item.label,
        emptyValue: item.layerId || "Élément de légende",
        ariaLabel: "Renommer la légende",
        onCommit(nextLabel) {
            item.label = nextLabel;
            commitProjectChange();
            renderLegendPanel();
        }
    });

    const actions = document.createElement("div");
    actions.className = "collection-card-actions";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ui-icon-button collection-menu-trigger";
    trigger.textContent = "…";
    trigger.setAttribute("aria-label", "Actions de la légende");
    trigger.setAttribute("aria-expanded", "false");
    const menu = document.createElement("div");
    menu.className = "collection-card-menu";
    menu.dataset.collectionMenu = "";
    menu.hidden = true;
    menu.innerHTML = '<button type="button" data-action="rename">Renommer</button><button type="button" data-action="duplicate">Dupliquer</button><button type="button" data-action="delete" class="danger">Supprimer</button>';
    actions.append(trigger, menu);
    bindCollectionMenu({ root: card, trigger, menu, onAction: action => handleLegendAction(action, item.id) });

    card.append(handle, createSymbolPreview(item.symbol), copy, actions);
    card.addEventListener("dragstart", event => {
        draggedLegendIndex = index;
        card.classList.add("dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
    });
    card.addEventListener("dragover", event => { event.preventDefault(); if (draggedLegendIndex !== index) card.classList.add("drag-over"); });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", event => { event.preventDefault(); if (draggedLegendIndex !== null) moveLegendItem(draggedLegendIndex, index); draggedLegendIndex = null; });
    card.addEventListener("dragend", () => {
        draggedLegendIndex = null;
        document.querySelectorAll(".legend-item-card").forEach(element => element.classList.remove("dragging", "drag-over"));
    });
    return card;
}

function handleLegendAction(action, id) {
    const chapter = getSelectedMapTarget();
    const index = chapter?.legend?.findIndex(item => item.id === id) ?? -1;
    if (index < 0) return;
    if (action === "rename") {
        const next = window.prompt("Nom de la légende", chapter.legend[index].label);
        if (next === null) return;
        chapter.legend[index].label = next.trim() || chapter.legend[index].layerId || "Élément de légende";
    } else if (action === "duplicate") {
        const source = chapter.legend[index];
        chapter.legend.splice(index + 1, 0, { ...source, id: createLegendId(source.layerId), label: `${source.label} copie`, symbol: { ...source.symbol } });
    } else if (action === "delete") {
        chapter.legend.splice(index, 1);
        activeSelection.prune(chapter.legend.map(item => item.id));
    }
    commitProjectChange();
    renderLegendPanel();
}

function addSelectedLayers() {
    const chapter = getSelectedMapTarget();
    if (!chapter) return;
    const candidates = getEditableLayers().map(layer => ({ layer, symbol: createSymbolFromLayer(layer, false) })).filter(entry => entry.symbol);
    const byId = new Map(candidates.map(entry => [entry.layer.id, entry]));
    const existing = new Set((chapter.legend ?? []).map(item => item.layerId));
    chapter.legend ??= [];
    [...availableSelection.ids].forEach(layerId => {
        const entry = byId.get(layerId);
        if (!entry || existing.has(layerId)) return;
        chapter.legend.push({ id: createLegendId(layerId), layerId, label: entry.layer.label, symbol: entry.symbol });
    });
    availableSelection.clear();
    commitProjectChange();
    renderLegendPanel();
}

function renderActiveSelectionBar() {
    renderCollectionSelectionBar(document.getElementById("legendSelectionBar"), {
        count: activeSelection.count,
        singular: "légende",
        plural: "légendes",
        deleteLabel: "Supprimer les légendes sélectionnées",
        onDelete: deleteSelectedLegendItems
    });
}

function deleteSelectedLegendItems() {
    const chapter = getSelectedMapTarget();
    if (!chapter?.legend) return;
    chapter.legend = chapter.legend.filter(item => !activeSelection.has(item.id));
    activeSelection.clear();
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
    button.disabled = availableSelection.count === 0;
    button.setAttribute("aria-label", availableSelection.count ? `Ajouter ${availableSelection.count} légende${availableSelection.count > 1 ? "s" : ""}` : "Ajouter les légendes sélectionnées");
}

function createLegendId(layerId) {
    return `legend-${layerId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
