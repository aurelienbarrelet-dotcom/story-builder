import { APP_VERSION } from "./core/config.js";
import { on, EVENTS } from "./core/events.js";
import {
    createNewProject,
    downloadProjectFile,
    importProjectFile,
    loadInitialProject,
    saveProjectLocally
} from "./core/project-service.js";
import { getSelectedChapterIndices, getSelectedSection, setProject } from "./core/store.js";
import { redo, resetHistory, undo } from "./core/history.js";
import {
    addChapter
} from "./features/chapters/chapter-service.js";
import {
    renderChapterList
} from "./features/chapters/chapter-list.js";
import {
    renderPreview
} from "./features/preview/preview.js";
import {
    renderProperties
} from "./features/properties/properties.js";
import {
    flyToSelectedChapter,
    getMapboxToken,
    initializeMap,
    resizeMap
} from "./features/map/map-service.js";
import { setupMapEditorPanel } from "./features/map/map-editor-panel.js";
import { renderViewPanel, setupViewPanel } from "./features/map/view-panel.js";
import { setupLayersPanel } from "./features/layers/layers-panel.js";
import { setupPropertiesPanel } from "./features/properties/properties-panel.js";
import { renderTransitionPanel } from "./features/transitions/transition-panel.js";
import { setupReaderMode } from "./features/reader/reader-mode.js";
import { setupRightPanels } from "./features/layout/right-panels.js";
import { renderLegendPanel, setupLegendPanel } from "./features/legend/legend-panel.js";
import { setupChapterStyleClipboard } from "./features/chapters/chapter-style-clipboard.js";
import { exportPublication } from "./core/export-service.js";
import { copySelectedChapters, duplicateSelectedChapters, hasChapterClipboard, pasteChapters } from "./features/chapters/chapter-clipboard.js";
import { renderAssetsPanel, setupAssetsPanel } from "./features/assets/assets-panel.js";

const ELEMENT_IDS = Object.freeze({
    addChapterButton: "addChapterButton",
    copyChapterButton: "copyChapterButton",
    duplicateChapterButton: "duplicateChapterButton",
    exportArchiveButton: "exportScrollytellingArchiveButton",
    newProjectButton: "newProjectButton",
    openProjectButton: "openProjectButton",
    pasteChapterButton: "pasteChapterButton",
    projectFileInput: "projectFileInput",
    saveProjectButton: "saveProjectButton",
    saveStatus: "saveStatus"
});

function getElement(elementName) {
    return document.getElementById(ELEMENT_IDS[elementName]);
}

function renderApplication(options = {}) {
    renderChapterList();
    renderPreview();
    renderViewPanel();
    renderTransitionPanel();
    renderLegendPanel();
    renderAssetsPanel();

    if (!options.preserveProperties) {
        renderProperties();
    }
}

function setupApplicationEvents() {
    on(EVENTS.RENDER_REQUESTED, options => {
        renderApplication(options);
    });

    on(EVENTS.SELECTION_CHANGED, () => {
        flyToSelectedChapter();
    });

    on(EVENTS.PROJECT_CHANGED, () => {
        renderChapterList();
        renderPreview();
        renderTransitionPanel();
        renderLegendPanel();
        renderAssetsPanel();
    });

    on(EVENTS.PROJECT_REPLACED, ({ reason } = {}) => {
        document.body.dataset.projectDirty = "false";
        const status = getElement("saveStatus");
        if (reason === "history") {
            saveProjectLocally();
            initializeMap();
        }
        if (status) {
            status.textContent = reason === "history" ? "État restauré" : "Projet chargé";
            status.classList.remove("unsaved");
        }
    });

    on(EVENTS.PROJECT_DIRTY_CHANGED, ({ isDirty }) => {
        const card = document.querySelector("#generalInformationCard .chapter-general");
        card?.classList.toggle("is-dirty", Boolean(isDirty));
        document.body.dataset.projectDirty = isDirty ? "true" : "false";
    });

    on(EVENTS.HISTORY_CHANGED, () => updateProductivityButtons());
    on(EVENTS.CLIPBOARD_CHANGED, () => updateProductivityButtons());
    on(EVENTS.SELECTION_CHANGED, () => updateProductivityButtons());
    on(EVENTS.LAYER_SELECTION_CHANGED, () => renderTransitionPanel());

    on(EVENTS.SAVE_STATUS_CHANGED, ({ isSaved, message }) => {
        const status = getElement("saveStatus");

        if (!status) return;
        status.textContent = message;
        status.classList.toggle("unsaved", !isSaved);
    });
}

function updateProductivityButtons() {
    const hasChapterSelection = getSelectedSection() === "chapter" && getSelectedChapterIndices().length > 0;
    getElement("copyChapterButton")?.toggleAttribute("disabled", !hasChapterSelection);
    getElement("duplicateChapterButton")?.toggleAttribute("disabled", !hasChapterSelection);
    getElement("pasteChapterButton")?.toggleAttribute("disabled", !hasChapterClipboard());
}

function isTypingTarget(target) {
    return target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable);
}

function setupProductivityShortcuts() {
    const copyButton = getElement("copyChapterButton");
    const pasteButton = getElement("pasteChapterButton");
    const duplicateButton = getElement("duplicateChapterButton");
    copyButton?.addEventListener("click", copySelectedChapters);
    pasteButton?.addEventListener("click", pasteChapters);
    duplicateButton?.addEventListener("click", duplicateSelectedChapters);

    document.addEventListener("keydown", event => {
        const modifier = event.ctrlKey || event.metaKey;
        if (!modifier) return;
        const key = event.key.toLowerCase();
        if (key === "z") {
            event.preventDefault();
            event.shiftKey ? redo() : undo();
            return;
        }
        if (isTypingTarget(event.target)) return;
        if (key === "c") { event.preventDefault(); copySelectedChapters(); }
        if (key === "v") { event.preventDefault(); pasteChapters(); }
        if (key === "d") { event.preventDefault(); duplicateSelectedChapters(); }
    });
    updateProductivityButtons();
}

function setupToolbarEvents() {
    const saveButton = getElement("saveProjectButton");
    const openButton = getElement("openProjectButton");
    const newButton = getElement("newProjectButton");
    const addButton = getElement("addChapterButton");
    const fileInput = getElement("projectFileInput");
    const exportArchiveButton = getElement("exportArchiveButton");

    saveButton.addEventListener("click", downloadProjectFile);

    exportArchiveButton?.addEventListener("click", async () => {
        exportArchiveButton.disabled = true;
        try {
            await exportPublication();
        } catch (error) {
            console.error("Erreur pendant l’export du site :", error);
            alert(error.message || "Impossible d’exporter le site scrollytelling.");
        } finally {
            exportArchiveButton.disabled = false;
        }
    });

    openButton.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];

        if (!file) {
            return;
        }

        try {
            await importProjectFile(file);
            initializeMap();
            alert("Le projet a été ouvert.");
        } catch (error) {
            console.error("Erreur pendant l’ouverture :", error);
            alert("Impossible d’ouvrir ce projet.");
        } finally {
            fileInput.value = "";
        }
    });

    newButton.addEventListener("click", () => {
        const confirmed = confirm(
            "Créer un nouveau projet ? Le projet actuel sera remplacé."
        );

        if (!confirmed) {
            return;
        }

        createNewProject();
        // Détruit immédiatement l’ancienne carte et affiche l’état vide,
        // puisque le token et le style du nouveau projet sont vierges.
        initializeMap();
    });

    addButton.addEventListener("click", addChapter);

    window.addEventListener("resize", resizeMap);
}

function startApplication() {
    console.info(`Story Builder ${APP_VERSION}`);

    setupApplicationEvents();
    setupToolbarEvents();
    setupMapEditorPanel();
    setupViewPanel();
    setupLayersPanel();
    setupPropertiesPanel();
    setupRightPanels();
    setupLegendPanel();
    setupAssetsPanel();
    setupChapterStyleClipboard();
    setupProductivityShortcuts();
    setupReaderMode();

    setProject(loadInitialProject());
    resetHistory();
    document.body.dataset.projectDirty = "false";

    if (getMapboxToken()) {
        initializeMap();
    }
}

startApplication();
