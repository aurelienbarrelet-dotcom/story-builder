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
    updateChapterTitle,
    updateChapterTransition,
    updateChapterLayerMode,
    updateChapterLayerTransition
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

        <details class="property-module" data-module-key="transition" open>
            <summary>
                <span>Transitions</span>
                <small>Lecture scrollytelling</small>
            </summary>
            <div class="property-module-content">
                <div class="property">
                    <label for="transitionMethodInput">Animation caméra</label>
                    <select id="transitionMethodInput">
                        <option value="flyTo" ${chapter.transition?.method === "flyTo" ? "selected" : ""}>flyTo</option>
                        <option value="easeTo" ${chapter.transition?.method === "easeTo" ? "selected" : ""}>easeTo</option>
                        <option value="jumpTo" ${chapter.transition?.method === "jumpTo" ? "selected" : ""}>jumpTo</option>
                    </select>
                </div>
                <div class="property">
                    <label for="transitionDurationInput">Durée caméra (ms)</label>
                    <input id="transitionDurationInput" type="number" min="0" step="100" value="${Number(chapter.transition?.duration ?? 1200)}">
                </div>
                <div class="property">
                    <label for="layerModeInput">Comportement des calques</label>
                    <select id="layerModeInput">
                        <option value="snapshot" ${chapter.layerMode !== "inherit" ? "selected" : ""}>État complet</option>
                        <option value="inherit" ${chapter.layerMode === "inherit" ? "selected" : ""}>Hériter du chapitre précédent</option>
                    </select>
                </div>
                <div class="camera-form">
                    <div class="camera-field">
                        <label for="layerDurationInput">Fondu (ms)</label>
                        <input id="layerDurationInput" type="number" min="0" step="100" value="${Number(chapter.layerTransition?.duration ?? 600)}">
                    </div>
                    <div class="camera-field">
                        <label for="layerDelayInput">Délai (ms)</label>
                        <input id="layerDelayInput" type="number" min="0" step="100" value="${Number(chapter.layerTransition?.delay ?? 0)}">
                    </div>
                </div>
            </div>
        </details>
    `;

    bindPropertyEvents();
}

function bindPropertyEvents() {
    const titleInput = document.getElementById("titleInput");
    const descriptionInput = document.getElementById("descriptionInput");
    const transitionMethodInput = document.getElementById("transitionMethodInput");
    const transitionDurationInput = document.getElementById("transitionDurationInput");
    const layerModeInput = document.getElementById("layerModeInput");
    const layerDurationInput = document.getElementById("layerDurationInput");
    const layerDelayInput = document.getElementById("layerDelayInput");

    titleInput.addEventListener("input", () => {
        updateChapterTitle(titleInput.value);
        emit(EVENTS.RENDER_REQUESTED, { preserveProperties: true });
    });

    descriptionInput.addEventListener("input", () => {
        updateChapterDescription(descriptionInput.value);
        emit(EVENTS.RENDER_REQUESTED, { preserveProperties: true });
    });

    bindDescriptionFormatting(descriptionInput);

    transitionMethodInput?.addEventListener("change", () => updateChapterTransition("method", transitionMethodInput.value));
    transitionDurationInput?.addEventListener("change", () => updateChapterTransition("duration", transitionDurationInput.value));
    layerModeInput?.addEventListener("change", () => updateChapterLayerMode(layerModeInput.value));
    layerDurationInput?.addEventListener("change", () => updateChapterLayerTransition("duration", layerDurationInput.value));
    layerDelayInput?.addEventListener("change", () => updateChapterLayerTransition("delay", layerDelayInput.value));

    bindPropertyModuleState();
}


function bindPropertyModuleState() {
    document.querySelectorAll("[data-module-key]").forEach(module => {
        const key = `storyBuilderPropertyModule:${module.dataset.moduleKey}`;
        const saved = localStorage.getItem(key);
        if (saved !== null) module.open = saved === "true";
        module.addEventListener("toggle", () => localStorage.setItem(key, String(module.open)));
    });
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
