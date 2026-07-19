import { getChapters } from "../../core/store.js";
import { cloneObject } from "../../core/utils.js";
import { commitProjectChange } from "../../core/project-service.js";

let copiedStyles = null;
let sourceChapterId = null;

export function setupChapterStyleClipboard() {
    document.getElementById("closeStyleClipboardModalButton")?.addEventListener("click", closeStyleClipboardDialog);
    document.getElementById("cancelStyleClipboardButton")?.addEventListener("click", closeStyleClipboardDialog);
    document.getElementById("applyStyleClipboardButton")?.addEventListener("click", applyCopiedStyles);
    document.getElementById("selectAllStyleTargetsButton")?.addEventListener("click", toggleAllTargets);
    document.getElementById("selectAllStyleOptionsButton")?.addEventListener("click", toggleAllOptions);
    document.getElementById("styleClipboardModal")?.addEventListener("click", event => {
        if (event.target.id === "styleClipboardModal") closeStyleClipboardDialog();
    });
}

export function openStyleCopyDialog(chapterId) {
    // Repart toujours de la source de vérité courante afin que la liste reflète
    // immédiatement les ajouts, suppressions et réorganisations.
    const chapters = [...getChapters()];
    const chapter = chapters.find(item => String(item.id) === String(chapterId));
    if (!chapter) return;

    sourceChapterId = chapter.id;
    copiedStyles = {
        location: cloneObject(chapter.location ?? {}),
        mobileLocation: chapter.mobileLocation ? cloneObject(chapter.mobileLocation) : null,
        layerOpacity: cloneObject(chapter.layerOpacity ?? {}),
        layerStyles: cloneObject(chapter.layerStyles ?? {}),
        legend: cloneObject(chapter.legend ?? []),
        layerMode: chapter.layerMode ?? "snapshot",
        layerTransition: cloneObject(chapter.layerTransition ?? { duration: 600, delay: 0 })
    };

    const modal = document.getElementById("styleClipboardModal");
    const source = document.getElementById("styleClipboardSource");
    const targets = document.getElementById("styleClipboardTargets");
    const options = document.getElementById("styleClipboardOptions");
    if (!modal || !source || !targets || !options) return;

    const sourceIndex = chapters.findIndex(item => String(item.id) === String(sourceChapterId));
    source.textContent = `Depuis Chapitre ${sourceIndex + 1}`;
    renderStyleOptions(options);
    targets.innerHTML = "";

    chapters.forEach((targetChapter, targetIndex) => {
        const isSource = String(targetChapter.id) === String(sourceChapterId);
        targets.append(createCheckboxRow({
            className: `style-target-row${isSource ? " is-source" : ""}`,
            inputClass: "style-target-checkbox",
            value: String(targetChapter.id),
            label: `Chapitre ${targetIndex + 1}`,
            description: getChapterCardLabel(targetChapter),
            checked: false,
            disabled: isSource,
            suffix: isSource ? "Source" : ""
        }));
    });

    if (!targets.children.length) {
        targets.innerHTML = '<p class="style-target-empty">Aucun autre chapitre disponible.</p>';
    }

    document.querySelectorAll(".style-target-checkbox, .style-option-checkbox").forEach(input => {
        input.addEventListener("change", updateApplyButton);
    });
    updateApplyButton();
    modal.hidden = false;
    document.body.classList.add("modal-open");
}

function renderStyleOptions(container) {
    container.innerHTML = "";
    const rows = document.createElement("div");
    rows.className = "style-option-rows";
    [
        { value: "layers", label: "Calques", checked: true },
        { value: "legend", label: "Légendes", checked: true },
        { value: "view", label: "Vue", checked: true }
    ].forEach(option => rows.append(createCheckboxRow({
        className: "style-option-row",
        inputClass: "style-option-checkbox",
        ...option
    })));
    container.append(rows);
}

function getChapterCardLabel(chapter) {
    const title = String(chapter?.title ?? "").trim();
    if (title) return title;
    const description = String(chapter?.description ?? "")
        .replace(/<br\s*\/?\s*>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
    if (!description) return "Chapitre vide";
    return description.length > 58 ? `${description.slice(0, 57).trimEnd()}…` : description;
}

function createCheckboxRow({ className, inputClass, value, label, description = "", checked, disabled = false, suffix = "" }) {
    const row = document.createElement("label");
    row.className = className;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.className = inputClass;
    input.checked = checked;
    input.disabled = disabled;
    const content = document.createElement("span");
    content.className = "style-checkbox-content";
    const title = document.createElement("span");
    title.className = "style-checkbox-label";
    title.textContent = label;
    content.append(title);
    if (description) {
        const descriptionElement = document.createElement("small");
        descriptionElement.className = "style-checkbox-description";
        descriptionElement.textContent = description;
        content.append(descriptionElement);
    }
    if (suffix) {
        const meta = document.createElement("span");
        meta.className = "style-checkbox-meta";
        meta.textContent = suffix;
        content.append(meta);
    }
    row.append(input, content);
    return row;
}

function updateApplyButton() {
    const button = document.getElementById("applyStyleClipboardButton");
    if (!button) return;
    const targetCount = document.querySelectorAll(".style-target-checkbox:checked").length;
    const optionCount = document.querySelectorAll(".style-option-checkbox:checked").length;
    button.disabled = !copiedStyles || targetCount === 0 || optionCount === 0;
    button.textContent = targetCount > 1 ? `Appliquer à ${targetCount} chapitres` : "Appliquer les styles";
}

function toggleAllTargets() {
    toggleCheckboxes(".style-target-checkbox");
}

function toggleAllOptions() {
    toggleCheckboxes(".style-option-checkbox");
}

function toggleCheckboxes(selector) {
    const inputs = [...document.querySelectorAll(selector)];
    const shouldCheck = inputs.some(input => !input.checked);
    inputs.forEach(input => { input.checked = shouldCheck; });
    updateApplyButton();
}

function applyCopiedStyles() {
    if (!copiedStyles) return;
    const chapters = getChapters();
    const targetIds = [...document.querySelectorAll(".style-target-checkbox:checked")]
        .map(input => input.value)
        .filter(id => id && id !== sourceChapterId);
    const selections = new Set([...document.querySelectorAll(".style-option-checkbox:checked")].map(input => input.value));

    if (!targetIds.length || !selections.size) return;

    const targetsById = new Map(chapters.map(chapter => [String(chapter.id), chapter]));
    targetIds.forEach(id => {
        const chapter = targetsById.get(String(id));
        if (chapter) applySelectionsToChapter(chapter, selections);
    });
    commitProjectChange();
    closeStyleClipboardDialog();
}

function applySelectionsToChapter(chapter, selections) {
    if (selections.has("view")) {
        chapter.location = cloneObject(copiedStyles.location);
        if (copiedStyles.mobileLocation) chapter.mobileLocation = cloneObject(copiedStyles.mobileLocation);
        else delete chapter.mobileLocation;
    }

    if (selections.has("legend")) {
        chapter.legend = cloneObject(copiedStyles.legend);
    }

    if (selections.has("layers")) {
        chapter.layerOpacity = cloneObject(copiedStyles.layerOpacity);
        chapter.layerStyles = cloneObject(copiedStyles.layerStyles);
        chapter.layerMode = copiedStyles.layerMode;
        chapter.layerTransition = cloneObject(copiedStyles.layerTransition);
    }
}

function closeStyleClipboardDialog() {
    const modal = document.getElementById("styleClipboardModal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("modal-open");
}
