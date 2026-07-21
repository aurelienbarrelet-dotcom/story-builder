import { getBaseLayerProperty, getEditableLayers, getSelectedLayerValue } from "../map/map-service.js";

const SYMBOL_PROPERTIES = {
    fill: { color: ["fill-color"], outline: ["fill-outline-color"], opacity: ["fill-opacity"] },
    line: { color: ["line-color"], outline: ["line-color"], opacity: ["line-opacity"], width: ["line-width"] },
    circle: { color: ["circle-color"], outline: ["circle-stroke-color"], opacity: ["circle-opacity"], width: ["circle-radius"] },
    symbol: { color: ["icon-color", "text-color"], outline: ["icon-halo-color", "text-halo-color"], opacity: ["icon-opacity", "text-opacity"] },
    "fill-extrusion": { color: ["fill-extrusion-color"], outline: [], opacity: ["fill-extrusion-opacity"] },
    background: { color: ["background-color"], outline: [], opacity: ["background-opacity"] }
};

export function resolveLegendSymbol(item = {}) {
    if (item.styleMode === "custom") return item.symbol ?? createFallbackSymbol();

    const layer = getEditableLayers().find(candidate => candidate.id === item.layerId);
    return (layer && createSymbolFromLayer(layer, false)) || item.symbol || createFallbackSymbol(layer?.type);
}

export function createSymbolFromLayer(layer, allowFallback = true) {
    const config = SYMBOL_PROPERTIES[layer?.type];
    if (!config) return allowFallback ? createFallbackSymbol(layer?.type) : null;

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

export function createSymbolPreview(symbol = {}) {
    const preview = document.createElement("span");
    const type = symbol.type ?? "fill";
    preview.className = `legend-symbol legend-symbol-${type}`;
    preview.style.setProperty("--legend-color", symbol.color || "#4b78ff");
    preview.style.setProperty("--legend-outline", symbol.outlineColor || symbol.color || "#4b78ff");
    preview.style.setProperty("--legend-opacity", String(symbol.opacity ?? 1));
    preview.style.setProperty("--legend-width", `${Math.max(1, Math.min(8, Number(symbol.width) || 2))}px`);
    if (needsAutoContrast(symbol)) preview.classList.add("legend-symbol-auto-contrast");
    return preview;
}

export function needsAutoContrast(symbol = {}) {
    const color = parseCssColor(symbol.color);
    if (!color || relativeLuminance(color) < 0.82) return false;

    const type = symbol.type ?? "fill";
    if (type === "line") return true;

    const outline = parseCssColor(symbol.outlineColor || symbol.color);
    return !outline || relativeLuminance(outline) >= 0.72;
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

function createFallbackSymbol(type = "fill") {
    return {
        type: type || "fill",
        color: "#4b78ff",
        outlineColor: "#4b78ff",
        opacity: 1,
        width: type === "circle" ? 5 : 2
    };
}

function parseCssColor(value) {
    if (typeof value !== "string" || typeof document === "undefined") return null;
    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = value;
    if (!probe.style.color) return null;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    const match = computed.match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/i);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function relativeLuminance([r, g, b]) {
    const channels = [r, g, b].map(value => {
        const normalized = Math.max(0, Math.min(255, value)) / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}
