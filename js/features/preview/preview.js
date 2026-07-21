import { getSelectedChapter } from "../../core/store.js";
import { sanitizeRichText } from "../../core/utils.js";
import { createSymbolPreview, resolveLegendSymbol } from "../legend/legend-symbol.js";

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
        row.append(createSymbolPreview(resolveLegendSymbol(item)));
        const label = document.createElement("span");
        label.textContent = item.label || item.layerId || "Élément";
        row.append(label);
        container.append(row);
    });
}
