import {
    clearDraggedChapterIndex,
    getChapters,
    getDraggedChapterIndex,
    getSelectedChapterIndex,
    getSelectedChapterIndices,
    getStory,
    isChapterMultiSelected,
    selectChapter,
    selectChapterSection,
    selectGeneralInformation,
    getSelectedSection,
    setChapterMultiSelection,
    setDraggedChapterIndex
} from "../../core/store.js";
import {
    deleteChapterAt,
    deleteSelectedChapters,
    duplicateChapterAt,
    moveChapter
} from "./chapter-service.js";
import { openStyleCopyDialog } from "./chapter-style-clipboard.js";
import { copySelectedChapters, duplicateSelectedChapters, pasteChapters } from "./chapter-clipboard.js";
import {
    bindCollectionMenu,
    closeCollectionMenus,
    renderCollectionSelectionBar
} from "../../ui/collection-panel.js";
import { bindInlineEditor } from "../../ui/inline-editor.js";
import { commitProjectChange } from "../../core/project-service.js";


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

export function renderChapterList() {
    const container = document.getElementById("chapters");
    const generalContainer = document.getElementById("generalInformationCard");
    const chapters = getChapters();
    const selectedIndex = getSelectedChapterIndex();
    const selectedIndices = getSelectedChapterIndices();
    const selectionBar = document.getElementById("chaptersSelectionBar");

    renderCollectionSelectionBar(selectionBar, {
        count: selectedIndices.length,
        singular: "chapitre",
        plural: "chapitres",
        onDelete: deleteSelectedChapters,
        deleteLabel: "Supprimer les chapitres sélectionnés"
    });

    container.innerHTML = "";
    generalContainer.innerHTML = "";

    const projectName = String(getStory()?.projectName ?? "").trim() || "Projet sans titre";
    const general = document.createElement("button");
    general.type = "button";
    general.className = "chapter chapter-general";
    general.classList.toggle("selected", getSelectedSection() === "meta");
    general.innerHTML = `<span class="project-status-dot" aria-hidden="true"></span><span class="chapter-content"><span class="chapter-title"></span></span>`;
    general.querySelector(".chapter-title").textContent = projectName;
    general.addEventListener("click", selectGeneralInformation);
    generalContainer.appendChild(general);

    if (!chapters.length) {
        const empty = document.createElement("p");
        empty.className = "empty-message";
        empty.innerHTML = "Aucun chapitre.<br>Clique sur le bouton « + » dans l’en-tête.";
        container.appendChild(empty);
        return;
    }

    chapters.forEach((chapter, index) => {
        const item = document.createElement("div");
        item.className = "chapter";
        item.draggable = true;
        item.dataset.chapterIndex = index;
        item.classList.toggle("selected", getSelectedSection() === "chapter" && index === selectedIndex);
        item.classList.toggle("multi-selected", isChapterMultiSelected(index));

        const handle = document.createElement("span");
        handle.className = "chapter-drag-handle";
        handle.textContent = "⋮⋮";
        handle.title = "Glisser pour déplacer";

        const content = document.createElement("div");
        content.className = "chapter-content";
        const indicators = [];
        if (chapter.image) {
            indicators.push(`
                <span class="chapter-status-icon" title="Image active" aria-label="Image active">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Zm2 12.5h12v-2.2l-3.1-3.1-2.4 2.4-1.7-1.7L6 18Zm9.25-8.25a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"/></svg>
                </span>`);
        }
        if (Array.isArray(chapter.legend) && chapter.legend.length) {
            indicators.push(`
                <span class="chapter-status-icon" title="Légende active" aria-label="Légende active">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h4v4H5V5Zm6 1h8v2h-8V6ZM5 10h4v4H5v-4Zm6 1h8v2h-8v-2ZM5 15h4v4H5v-4Zm6 1h8v2h-8v-2Z"/></svg>
                </span>`);
        }

        content.innerHTML = `
            <span class="chapter-number">Chapitre ${index + 1}</span>
            <span class="chapter-title"></span>
            ${indicators.length ? `<span class="chapter-status-icons">${indicators.join("")}</span>` : ""}
        `;
        const titleElement = content.querySelector(".chapter-title");
        titleElement.textContent = getChapterCardLabel(chapter);
        bindInlineEditor({
            element: titleElement,
            value: chapter.title,
            emptyValue: "Chapitre sans titre",
            ariaLabel: `Renommer le chapitre ${index + 1}`,
            onCommit(nextTitle) {
                chapter.title = nextTitle;
                commitProjectChange();
                renderChapterList();
            }
        });

        const actions = document.createElement("div");
        actions.className = "chapter-actions collection-card-actions";
        actions.innerHTML = `
            <button class="chapter-menu-button collection-menu-button" type="button" aria-label="Actions du chapitre" aria-expanded="false">⋯</button>
            <div class="chapter-menu collection-menu" data-collection-menu hidden>
                <button type="button" data-action="copy">Copier</button>
                <button type="button" data-action="paste">Coller après</button>
                <button type="button" data-action="duplicate">Dupliquer</button>
                <button type="button" data-action="copy-styles">Copier les styles</button>
                <button type="button" data-action="delete" class="danger">Supprimer</button>
            </div>`;

        const menuButton = actions.querySelector(".chapter-menu-button");
        const menu = actions.querySelector(".chapter-menu");
        bindCollectionMenu({
            root: item,
            trigger: menuButton,
            menu,
            onAction(action) {
                if (!isChapterMultiSelected(index)) selectChapter(index);
                if (action === "copy") copySelectedChapters();
                if (action === "paste") pasteChapters();
                if (action === "duplicate") duplicateSelectedChapters();
                if (action === "copy-styles") openStyleCopyDialog(chapter.id);
                if (action === "delete") {
                    if (isChapterMultiSelected(index) && document.querySelectorAll(".chapter.multi-selected").length > 1) {
                        deleteSelectedChapters();
                    } else {
                        deleteChapterAt(index);
                    }
                }
            }
        });

        item.append(handle, content, actions);
        item.addEventListener("click", event => {
            if (event.target.closest(".chapter-actions")) return;
            selectChapterSection(index, {
                toggle: event.ctrlKey || event.metaKey,
                range: event.shiftKey
            });
        });

        item.addEventListener("dragstart", event => {
            setDraggedChapterIndex(index);
            item.classList.add("dragging");
            event.dataTransfer.setData("text/plain", String(index));
            event.dataTransfer.effectAllowed = "move";
        });
        item.addEventListener("dragover", event => {
            event.preventDefault();
            if (getDraggedChapterIndex() !== index) item.classList.add("drag-over");
        });
        item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
        item.addEventListener("drop", event => {
            event.preventDefault();
            const draggedIndex = getDraggedChapterIndex();
            if (draggedIndex !== null) moveChapter(draggedIndex, index);
            clearDraggedChapterIndex();
        });
        item.addEventListener("dragend", () => {
            clearDraggedChapterIndex();
            document.querySelectorAll(".chapter").forEach(el => el.classList.remove("dragging", "drag-over"));
        });
        container.appendChild(item);
    });
}

document.addEventListener("click", closeCollectionMenus);
