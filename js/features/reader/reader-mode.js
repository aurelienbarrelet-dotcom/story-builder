import { emit, EVENTS, on } from "../../core/events.js";
import {
    getSelectedChapterIndex,
    getSelectedSection,
    getStory,
    selectChapter,
    selectGeneralInformation
} from "../../core/store.js";
import { getEditingViewMode, setEditingViewMode } from "../map/view-panel.js";
import {
    createMapboxScrollytellingConfig,
    serializeMapboxConfig
} from "../export/mapbox-config-export.js";

const MASTER_INDEX_URL = new URL(
    "../../../templates/scrollytelling/index.html",
    import.meta.url
);

const MASTER_STYLE_URL = new URL(
    "../../../templates/scrollytelling/style.css",
    import.meta.url
);

let active = false;
let previewMode = "desktop";
let renderTimer = null;
let masterIndexPromise = null;
let renderRevision = 0;

export function setupReaderMode() {
    document.getElementById("toggleReaderModeButton")?.addEventListener("click", toggleReaderMode);
    document.getElementById("readerDeviceToggle")?.addEventListener("click", togglePreviewMode);

    on(EVENTS.RENDER_REQUESTED, () => {
        if (active) scheduleReaderRender();
    });
}

export function toggleReaderMode() {
    setReaderMode(!active);
}

export function setReaderMode(value) {
    const nextState = Boolean(value);
    if (nextState === active) return;

    active = nextState;
    document.body.classList.toggle("reader-mode", active);

    const overlay = document.getElementById("readerOverlay");
    const toggleButton = document.getElementById("toggleReaderModeButton");

    overlay?.toggleAttribute("hidden", !active);
    if (toggleButton) {
        toggleButton.dataset.mode = active ? "reader" : "edit";
        toggleButton.setAttribute("aria-checked", String(active));
        toggleButton.setAttribute("aria-label", active ? "Revenir au mode édition" : "Passer au mode lecture");
    }

    if (active) {
        previewMode = getEditingViewMode();
        setPreviewMode(previewMode);
        scheduleReaderRender(0);
    } else {
        clearTimeout(renderTimer);
        const frame = document.getElementById("readerFrame");
        syncEditorToReaderPosition(frame);
        setEditingViewMode(previewMode);
        if (frame) frame.removeAttribute("srcdoc");
    }

    emit(EVENTS.READER_MODE_CHANGED, { active });
}

function togglePreviewMode() {
    setPreviewMode(previewMode === "desktop" ? "mobile" : "desktop");
}

function setPreviewMode(mode) {
    previewMode = mode === "mobile" ? "mobile" : "desktop";

    const viewport = document.getElementById("readerViewport");
    const toggle = document.getElementById("readerDeviceToggle");
    if (!viewport) return;

    viewport.classList.toggle("desktop", previewMode === "desktop");
    viewport.classList.toggle("mobile", previewMode === "mobile");
    viewport.setAttribute("aria-label", `Fenêtre de prévisualisation ${previewMode}`);

    const frame = document.getElementById("readerFrame");
    if (frame) {
        frame.style.width = previewMode === "mobile" ? "390px" : "100%";
        frame.style.maxWidth = "100%";

        requestAnimationFrame(() => {
            try {
                frame.contentWindow?.dispatchEvent(new Event("resize"));
            } catch (error) {
                console.debug("Redimensionnement de l’aperçu différé.", error);
            }
        });
    }

    if (toggle) {
        toggle.dataset.mode = previewMode;
        toggle.setAttribute("aria-checked", String(previewMode === "mobile"));
    }
}

function scheduleReaderRender(delay = 120) {
    clearTimeout(renderTimer);
    const revision = ++renderRevision;
    renderTimer = setTimeout(() => {
        renderReaderPreview(revision).catch(error => {
            console.error("Impossible de générer l’aperçu lecture :", error);
            showPreviewError(error.message || "Aperçu indisponible.");
        });
    }, delay);
}

async function loadMasterIndex() {
    if (!masterIndexPromise) {
        masterIndexPromise = fetch(MASTER_INDEX_URL).then(response => {
            if (!response.ok) {
                throw new Error(`Impossible de charger le gabarit (${response.status}).`);
            }
            return response.text();
        });
    }

    return masterIndexPromise;
}

async function renderReaderPreview(revision = ++renderRevision) {
    const frame = document.getElementById("readerFrame");
    if (!frame || !active) return;

    const story = getStory();
    const config = createMapboxScrollytellingConfig(story);
    const masterIndex = await loadMasterIndex();
    const configScript = `<script>${escapeClosingScript(serializeMapboxConfig(config))}<\/script>`;
    const styleLink = `<link rel="stylesheet" href="${escapeAttribute(MASTER_STYLE_URL.href)}">`;
    const previewScrollbarStyle = `<style id="story-builder-preview-style">
        html, body, #story, #features {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }
        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        #story::-webkit-scrollbar,
        #features::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
    </style>`;

    let documentHtml = masterIndex
        .replace(/<link\s+rel=["']stylesheet["']\s+href=["']style\.css["']\s*\/?>/i, styleLink)
        .replace(/<script\s+src=["']\.\/config\.js["']\s*><\/script>/i, configScript)
        .replace("</head>", `${previewScrollbarStyle}\n</head>`);

    if (!documentHtml.includes(configScript)) {
        documentHtml = documentHtml.replace("</head>", `${configScript}\n</head>`);
    }

    if (revision !== renderRevision || !active) return;

    const selectedSection = getSelectedSection();
    const selectedChapterIndex = getSelectedChapterIndex();
    frame.addEventListener("load", () => {
        try {
            frame.contentWindow?.dispatchEvent(new Event("resize"));
            syncReaderToEditorSelection(frame, selectedSection, selectedChapterIndex);
        } catch (error) {
            console.debug("Impossible de synchroniser l’aperçu lecture.", error);
        }
    }, { once: true });

    if (revision === renderRevision && active) frame.srcdoc = documentHtml;
}

function syncReaderToEditorSelection(frame, section, chapterIndex) {
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!win || !doc) return;

    requestAnimationFrame(() => {
        if (section === "meta") {
            win.scrollTo({ top: 0, behavior: "auto" });
            return;
        }

        const story = getStory();
        const chapter = story?.chapters?.[chapterIndex];
        const step = chapter ? doc.getElementById(chapter.id) : null;
        if (!step) return;
        const top = Math.max(0, step.offsetTop - win.innerHeight * 0.5 + step.offsetHeight * 0.5);
        win.scrollTo({ top, behavior: "auto" });
        setTimeout(() => win.dispatchEvent(new Event("resize")), 0);
    });
}

function syncEditorToReaderPosition(frame) {
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return;

    const activeStep = doc.querySelector(".step.active");
    if (!activeStep) {
        selectGeneralInformation();
        return;
    }

    const story = getStory();
    const index = story?.chapters?.findIndex(chapter => chapter.id === activeStep.id) ?? -1;
    if (index >= 0) selectChapter(index);
}

function showPreviewError(message) {
    const frame = document.getElementById("readerFrame");
    if (!frame) return;

    frame.srcdoc = `<!doctype html><html><body style="font-family:sans-serif;padding:2rem"><p>${escapeHtml(message)}</p></body></html>`;
}

function escapeClosingScript(value) {
    return String(value).replace(/<\/script/gi, "<\\/script");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('"', "&quot;");
}
