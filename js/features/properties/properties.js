import { emit, EVENTS } from "../../core/events.js";
import { getSelectedChapter, getSelectedSection } from "../../core/store.js";
import { renderMetaProperties } from "./meta-properties.js";
import {
    escapeHtmlAttribute,
    escapeHtmlContent
} from "../../core/utils.js";
import {
    updateChapterDescription,
    updateChapterId,
    updateChapterTitle
} from "../chapters/chapter-service.js";

export function renderProperties() {
    const container = document.getElementById("propertiesContent");
    if (getSelectedSection() === "meta") {
        renderMetaProperties(container);
        return;
    }

    const chapter = getSelectedChapter();

    if (!chapter) {
        container.innerHTML = `
            <p class="empty-message">
                Ajoute un chapitre pour commencer.
            </p>
        `;
        return;
    }

    const mediaPreview = chapter.image
        ? `
            <img
                class="media-thumb"
                src="${escapeHtmlAttribute(chapter.image)}"
                alt=""
            >
        `
        : `<div class="media-empty">Aucune image</div>`;

    container.innerHTML = `
        <div class="property">
            <label for="titleInput">Titre</label>
            <input
                id="titleInput"
                type="text"
                value="${escapeHtmlAttribute(chapter.title)}"
            >
        </div>

        <div class="property description-property">
            <label for="descriptionInput">Description</label>
            <div class="description-editor">
                <div class="text-format-toolbar" role="toolbar" aria-label="Mise en forme de la description">
                    <button type="button" class="text-format-button" data-format="strong" aria-label="Gras" title="Gras (Ctrl+B)"><strong>B</strong></button>
                    <button type="button" class="text-format-button" data-format="em" aria-label="Italique" title="Italique (Ctrl+I)"><em>I</em></button>
                    <span class="text-format-separator" aria-hidden="true"></span>
                    <button type="button" class="text-format-button" data-format="link" aria-label="Ajouter un lien" title="Ajouter un lien">Lien</button>
                    <button type="button" class="text-format-button text-format-clear" data-format="clear" aria-label="Effacer la mise en forme" title="Effacer la mise en forme">Effacer</button>
                </div>
                <textarea id="descriptionInput" aria-describedby="descriptionFormatHelp">${escapeHtmlContent(chapter.description)}</textarea>
            </div>
            <span id="descriptionFormatHelp" class="property-help">Sélectionne un mot ou une phrase, puis choisis une mise en forme.</span>
        </div>

    `;

    bindPropertyEvents();
}

function bindPropertyEvents() {
    const titleInput = document.getElementById("titleInput");
    const descriptionInput = document.getElementById("descriptionInput");

    titleInput.addEventListener("input", () => {
        updateChapterTitle(titleInput.value);
        emit(EVENTS.RENDER_REQUESTED, { preserveProperties: true });
    });

    descriptionInput.addEventListener("input", () => {
        updateChapterDescription(descriptionInput.value);
        emit(EVENTS.RENDER_REQUESTED, { preserveProperties: true });
    });

    bindDescriptionFormatting(descriptionInput);

}

function bindDescriptionFormatting(textarea) {
    const buttons = document.querySelectorAll("[data-format]");

    buttons.forEach(button => {
        button.addEventListener("mousedown", event => event.preventDefault());
        button.addEventListener("click", () => applyDescriptionFormat(textarea, button.dataset.format));
    });

    textarea.addEventListener("keydown", event => {
        if (!(event.ctrlKey || event.metaKey)) return;
        const key = event.key.toLowerCase();
        if (key === "b" || key === "i") {
            event.preventDefault();
            applyDescriptionFormat(textarea, key === "b" ? "strong" : "em");
        }
    });
}

function applyDescriptionFormat(textarea, format) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    let replacement = selected;
    let selectionStart = start;
    let selectionEnd = end;

    if (format === "strong" || format === "em") {
        const tag = format;
        replacement = `<${tag}>${selected || "texte"}</${tag}>`;
        selectionStart = start + tag.length + 2;
        selectionEnd = selectionStart + (selected || "texte").length;
    } else if (format === "link") {
        const href = window.prompt("Adresse du lien", "https://");
        if (!href) return;
        const label = selected || "texte du lien";
        replacement = `<a href="${escapeMarkupAttribute(href)}">${label}</a>`;
        selectionStart = start + replacement.indexOf(">") + 1;
        selectionEnd = selectionStart + label.length;
    } else if (format === "clear") {
        if (selected) {
            replacement = selected.replace(/<\/?(?:strong|b|em|i|a)(?:\s[^>]*)?>/gi, "");
            selectionEnd = start + replacement.length;
        } else {
            replacement = textarea.value.replace(/<\/?(?:strong|b|em|i|a)(?:\s[^>]*)?>/gi, "");
            textarea.value = replacement;
            selectionStart = selectionEnd = replacement.length;
            commitDescriptionFormatting(textarea, selectionStart, selectionEnd);
            return;
        }
    }

    textarea.setRangeText(replacement, start, end, "preserve");
    commitDescriptionFormatting(textarea, selectionStart, selectionEnd);
}

function commitDescriptionFormatting(textarea, start, end) {
    updateChapterDescription(textarea.value);
    emit(EVENTS.RENDER_REQUESTED, { preserveProperties: true });
    requestAnimationFrame(() => {
        const current = document.getElementById("descriptionInput");
        if (!current) return;
        current.focus();
        current.setSelectionRange(start, end);
    });
}

function escapeMarkupAttribute(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
