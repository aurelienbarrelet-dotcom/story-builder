import { getSelectedChapter } from "../../core/store.js";
import { sanitizeRichText } from "../../core/utils.js";

export function renderPreview() {
    const chapter = getSelectedChapter();
    const title = document.getElementById("previewTitle");
    const description = document.getElementById("previewDescription");
    const imageContainer = document.getElementById("previewImageContainer");
    const image = document.getElementById("previewImage");
    const placeholder = document.getElementById("previewImagePlaceholder");
    const caption = document.getElementById("previewImageCaption");
    const legend = document.getElementById("previewLegend");

    if (!chapter) {
        title.textContent = "Aucun chapitre";
        description.textContent = "Clique sur le bouton + pour créer un chapitre.";
        image.removeAttribute("src");
        image.style.display = "none";
        placeholder.style.display = "flex";
        imageContainer.style.display = "block";
        caption.textContent = "";
        renderPreviewLegend(legend, []);
        return;
    }

    title.textContent = chapter.title || "";
    title.style.display = chapter.title ? "block" : "none";
    description.innerHTML = chapter.description ? sanitizeRichText(chapter.description) : "Aucune description.";
    caption.textContent = chapter.imageCaption || "";

    if (chapter.image) {
        image.src = chapter.image;
        image.alt = chapter.imageCaption || chapter.title || "Image du chapitre";
        imageContainer.style.display = "block";
        image.style.display = "block";
        placeholder.style.display = "none";
    } else {
        image.removeAttribute("src");
        image.alt = "";
        image.style.display = "none";
        placeholder.style.display = "flex";
        imageContainer.style.display = "block";
    }

    renderPreviewLegend(legend, chapter.legend ?? []);
}

function renderPreviewLegend(container, items) {
    if (!container) return;
    container.innerHTML = "";
    container.hidden = !items.length;
    items.forEach(item => {
        const row = document.createElement("div");
        row.className = "preview-map-legend-item";
        row.append(createSymbol(item.symbol));
        const label = document.createElement("span");
        label.textContent = item.label || item.layerId || "Élément";
        row.append(label);
        container.append(row);
    });
}

function createSymbol(symbol = {}) {
    const preview = document.createElement("span");
    const type = symbol.type ?? "fill";
    preview.className = `legend-symbol legend-symbol-${type}`;
    preview.style.setProperty("--legend-color", symbol.color || "#4b78ff");
    preview.style.setProperty("--legend-outline", symbol.outlineColor || symbol.color || "#4b78ff");
    preview.style.setProperty("--legend-opacity", String(symbol.opacity ?? 1));
    preview.style.setProperty("--legend-width", `${Math.max(1, Math.min(8, Number(symbol.width) || 2))}px`);
    return preview;
}
