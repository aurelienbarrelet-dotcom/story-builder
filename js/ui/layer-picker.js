import { getBaseLayerProperty, getEditableLayers } from "../features/map/map-service.js";

let activeDialog = null;

export function openLayerPicker({ title = "Ajouter des calques", confirmLabel = "Ajouter", selectedLayerIds = [], disabledLayerIds = [], filter = null, onConfirm }) {
    closeLayerPicker();
    const selected = new Set(selectedLayerIds);
    const disabled = new Set(disabledLayerIds);
    const layers = getEditableLayers().filter(layer => !filter || filter(layer));

    const backdrop = document.createElement("div");
    backdrop.className = "layer-picker-backdrop";
    backdrop.innerHTML = `
        <section class="layer-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="layerPickerTitle">
            <header class="layer-picker-header">
                <div><h2 id="layerPickerTitle">${escapeHtml(title)}</h2><p>Sélectionne un ou plusieurs calques.</p></div>
                <button class="ui-icon-button layer-picker-close" type="button" aria-label="Fermer">×</button>
            </header>
            <label class="layer-picker-search"><span class="visually-hidden">Rechercher un calque</span><input class="ui-input" type="search" placeholder="Rechercher un calque…"></label>
            <div class="layer-picker-list" role="listbox" aria-multiselectable="true"></div>
            <footer class="layer-picker-footer"><span class="layer-picker-count"></span><div><button class="button layer-picker-cancel" type="button">Annuler</button><button class="button button-primary layer-picker-confirm" type="button">${escapeHtml(confirmLabel)}</button></div></footer>
        </section>`;
    document.body.append(backdrop);
    activeDialog = backdrop;

    const list = backdrop.querySelector(".layer-picker-list");
    const search = backdrop.querySelector("input[type=search]");
    const count = backdrop.querySelector(".layer-picker-count");
    const confirm = backdrop.querySelector(".layer-picker-confirm");

    const render = () => {
        const query = search.value.trim().toLowerCase();
        const filtered = layers.filter(layer => `${layer.label} ${layer.id} ${layer.type}`.toLowerCase().includes(query));
        list.innerHTML = filtered.length ? filtered.map(layer => {
            const isDisabled = disabled.has(layer.id);
            const isChecked = selected.has(layer.id) || isDisabled;
            return `<label class="layer-picker-row${isDisabled ? " is-disabled" : ""}">
                <input type="checkbox" value="${escapeHtml(layer.id)}" ${isChecked ? "checked" : ""} ${isDisabled ? "disabled" : ""}>
                ${renderLayerPreview(layer)}
                <span class="layer-picker-copy"><strong>${escapeHtml(layer.label || layer.id)}</strong><small>${escapeHtml(layer.type)} · ${escapeHtml(layer.id)}</small></span>
                ${isDisabled ? '<em>Déjà ajouté</em>' : ""}
            </label>`;
        }).join("") : '<p class="layer-picker-empty">Aucun calque ne correspond à la recherche.</p>';
        count.textContent = `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`;
        confirm.disabled = selected.size === 0;
        list.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(input => input.addEventListener("change", () => {
            if (input.checked) selected.add(input.value); else selected.delete(input.value);
            count.textContent = `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`;
            confirm.disabled = selected.size === 0;
        }));
    };

    search.addEventListener("input", render);
    backdrop.querySelector(".layer-picker-close").addEventListener("click", closeLayerPicker);
    backdrop.querySelector(".layer-picker-cancel").addEventListener("click", closeLayerPicker);
    backdrop.addEventListener("click", event => { if (event.target === backdrop) closeLayerPicker(); });
    backdrop.addEventListener("keydown", event => { if (event.key === "Escape") closeLayerPicker(); });
    confirm.addEventListener("click", () => {
        const ids = [...selected];
        closeLayerPicker();
        onConfirm?.(ids);
    });
    render();
    search.focus();
}

export function closeLayerPicker() {
    activeDialog?.remove();
    activeDialog = null;
}

function renderLayerPreview(layer) {
    const type = layer.type;
    const color = resolveLayerColor(layer.id, type);
    const secondary = resolveSecondaryColor(layer.id, type);
    const width = clampNumber(getBaseLayerProperty(layer.id, "paint", type === "line" ? "line-width" : "circle-radius"), 1, 12, type === "line" ? 3 : 6);
    const style = `--layer-preview-color:${escapeHtml(color)};--layer-preview-secondary:${escapeHtml(secondary)};--layer-preview-size:${width}px`;
    const glyph = type === "symbol" ? "A" : "";
    return `<span class="layer-picker-preview layer-picker-preview--${escapeHtml(type)}" style="${style}" aria-hidden="true"><i>${glyph}</i></span>`;
}

function resolveLayerColor(layerId, type) {
    const properties = {
        fill: ["fill-color"],
        line: ["line-color"],
        circle: ["circle-color"],
        symbol: ["text-color", "icon-color"],
        "fill-extrusion": ["fill-extrusion-color"],
        heatmap: ["heatmap-color"],
        hillshade: ["hillshade-accent-color", "hillshade-shadow-color"],
        background: ["background-color"]
    }[type] || [];
    for (const property of properties) {
        const value = getBaseLayerProperty(layerId, "paint", property);
        if (typeof value === "string" && isCssColor(value)) return value;
    }
    return "#65758b";
}

function resolveSecondaryColor(layerId, type) {
    const property = type === "fill" ? "fill-outline-color" : type === "circle" ? "circle-stroke-color" : null;
    const value = property ? getBaseLayerProperty(layerId, "paint", property) : null;
    return typeof value === "string" && isCssColor(value) ? value : "#ffffff";
}

function isCssColor(value) {
    return /^(#|rgb|hsl|[a-z])/i.test(value) && !value.includes("[");
}

function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
