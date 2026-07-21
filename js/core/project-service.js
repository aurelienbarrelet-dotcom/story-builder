import { MAPBOX_TOKEN_KEY, STORAGE_KEY } from "./config.js";
import { projectStorage } from "./storage-service.js";
import { defaultLocation, defaultStory } from "./default-project.js";
import { createProject, touchProject } from "./project-model.js";
import { emit, EVENTS } from "./events.js";
import { getProject, getStory, setProject } from "./store.js";
import { recordHistoryChange, resetHistory } from "./history.js";
import {
    cloneObject,
    readFileAsText
} from "./utils.js";

export function validateProject(project) {
    if (!project || typeof project !== "object") {
        throw new Error("Le projet doit être un objet.");
    }

    if (!Array.isArray(project.chapters)) {
        throw new Error("Les chapitres sont invalides.");
    }

    project.projectName = String(project.projectName ?? project.title ?? "").trim();
    project.title = String(project.title ?? "Story sans titre");
    project.mapboxToken = String(project.mapboxToken ?? "").trim();
    project.mapStyle = String(project.mapStyle ?? "mapbox://styles/mapbox/standard");
    project.meta = validateMeta(project.meta, project.title);
    const projectConfigSource = project.projectConfig && typeof project.projectConfig === "object" ? project.projectConfig : {};
    project.projectConfig = {
        location: validateLocation(projectConfigSource.location ?? project.chapters[0]?.location),
        ...(projectConfigSource.mobileLocation ? { mobileLocation: validateLocation(projectConfigSource.mobileLocation) } : {}),
        layerOpacity: validateLayerOpacity(projectConfigSource.layerOpacity),
        layerStyles: validateLayerStyles(projectConfigSource.layerStyles, projectConfigSource.layerOpacity),
        legend: validateLegend(projectConfigSource.legend),
        layerTransition: validateLayerTransition(projectConfigSource.layerTransition)
    };

    project.chapters.forEach((chapter, index) => {
        if (!chapter || typeof chapter !== "object") {
            throw new Error(`Le chapitre ${index + 1} est invalide.`);
        }

        chapter.id = String(chapter.id ?? `chapitre-${index + 1}`);
        chapter.title = String(chapter.title ?? "");
        chapter.description = String(chapter.description ?? "");
        chapter.image = chapter.image || null;
        chapter.imageName = String(chapter.imageName ?? "");
        chapter.imageCaption = String(chapter.imageCaption ?? "");
        chapter.location = validateLocation(chapter.location);
        if (chapter.mobileLocation) chapter.mobileLocation = validateLocation(chapter.mobileLocation);
        else delete chapter.mobileLocation;
        chapter.layerOpacity = validateLayerOpacity(chapter.layerOpacity);
        chapter.layerStyles = validateLayerStyles(chapter.layerStyles, chapter.layerOpacity);
        chapter.legend = validateLegend(chapter.legend);
        chapter.layerMode = chapter.layerMode === "inherit" ? "inherit" : "snapshot";
        chapter.layerTransition = validateLayerTransition(chapter.layerTransition);
        chapter.transition = validateTransition(chapter.transition);
    });

    return project;
}



function validateMeta(value, fallbackTitle) {
    const source = value && typeof value === "object" ? value : {};
    const footer = source.footer && typeof source.footer === "object" ? source.footer : {};
    const authors = Array.isArray(source.authors) ? source.authors : [];

    const signatures = Array.isArray(footer.signatures)
        ? footer.signatures.map(item => [item?.role, item?.name].filter(Boolean).join(": ")).filter(Boolean).join("\n")
        : String(footer.signatures ?? "");
    const sources = Array.isArray(footer.sources)
        ? footer.sources.map(item => item?.url ? `${item?.label ?? ""} ${item.url}`.trim() : String(item?.label ?? "")).filter(Boolean).join("\n")
        : String(footer.sources ?? "");

    return {
        title: String(source.title ?? fallbackTitle ?? "Story sans titre"),
        dek: String(source.dek ?? ""),
        authors: (authors.length ? authors : [{ name: "", url: "", image: null, imageName: "" }]).map(item => ({
            name: String(item?.name ?? ""), url: String(item?.url ?? ""), image: item?.image || null, imageName: String(item?.imageName ?? "")
        })),
        footer: { signatures, sources }
    };
}

function validateLayerStyles(value, legacyOpacity = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const styles = {};

    Object.entries(source).forEach(([layerId, layerStyle]) => {
        if (!layerStyle || typeof layerStyle !== "object" || Array.isArray(layerStyle)) return;
        const paint = layerStyle.paint && typeof layerStyle.paint === "object" && !Array.isArray(layerStyle.paint)
            ? { ...layerStyle.paint }
            : {};
        const layout = layerStyle.layout && typeof layerStyle.layout === "object" && !Array.isArray(layerStyle.layout)
            ? { ...layerStyle.layout }
            : {};
        styles[String(layerId)] = { paint, layout };
    });

    Object.entries(legacyOpacity).forEach(([layerId, opacity]) => {
        styles[layerId] ??= { paint: {}, layout: {} };
    });

    return styles;
}

function validateLegend(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item, index) => {
        const source = item && typeof item === "object" ? item : {};
        const symbol = source.symbol && typeof source.symbol === "object" ? source.symbol : {};
        return {
            id: String(source.id ?? `legend-${index + 1}`),
            layerId: String(source.layerId ?? ""),
            label: String(source.label ?? source.layerId ?? "Élément de légende"),
            styleMode: source.styleMode === "custom" ? "custom" : "linked",
            symbol: {
                type: String(symbol.type ?? "fill"),
                color: String(symbol.color ?? "#4b78ff"),
                outlineColor: String(symbol.outlineColor ?? "#4b78ff"),
                opacity: Math.max(0, Math.min(1, Number(symbol.opacity ?? 1))),
                width: Math.max(1, Number(symbol.width ?? 2))
            }
        };
    });
}

function validateTransition(value) {
    const source = value && typeof value === "object" ? value : {};
    const allowedControls = new Set(["automatic", "scroll", "smooth-scroll"]);
    const allowedMethods = new Set(["flyTo", "easeTo", "jumpTo"]);
    const allowedEasings = new Set(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]);
    const smoothing = Number(source.smoothing);
    return {
        control: allowedControls.has(source.control) ? source.control : "automatic",
        method: allowedMethods.has(source.method) ? source.method : "flyTo",
        duration: Math.max(0, Number(source.duration) || 1200),
        smoothing: Number.isFinite(smoothing) ? Math.min(0.5, Math.max(0.04, smoothing)) : 0.18,
        essential: source.essential !== false,
        easing: allowedEasings.has(source.easing) ? source.easing : "ease-in-out"
    };
}

function validateLayerTransition(value) {
    const source = value && typeof value === "object" ? value : {};
    const duration = Number(source.duration);
    const delay = Number(source.delay);
    return {
        enabled: source.enabled !== false,
        duration: Number.isFinite(duration) ? Math.max(0, duration) : 600,
        delay: Number.isFinite(delay) ? Math.max(0, delay) : 0
    };
}

function validateLayerOpacity(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    return Object.fromEntries(
        Object.entries(value)
            .map(([id, opacity]) => [String(id), Math.max(0, Math.min(1, Number(opacity)))])
            .filter(([, opacity]) => Number.isFinite(opacity))
    );
}

function validateLocation(location) {
    const source = location && typeof location === "object"
        ? location
        : defaultLocation;

    const center = Array.isArray(source.center) && source.center.length === 2
        ? [Number(source.center[0]), Number(source.center[1])]
        : [...defaultLocation.center];

    return {
        center,
        zoom: Number.isFinite(Number(source.zoom))
            ? Number(source.zoom)
            : defaultLocation.zoom,
        pitch: Number.isFinite(Number(source.pitch))
            ? Number(source.pitch)
            : defaultLocation.pitch,
        bearing: Number.isFinite(Number(source.bearing))
            ? Number(source.bearing)
            : defaultLocation.bearing
    };
}


export function loadInitialProject() {
    const savedProject = localStorage.getItem(STORAGE_KEY);

    if (!savedProject) {
        return createProject(cloneObject(defaultStory));
    }

    try {
        const project = projectStorage.load(STORAGE_KEY);
        project.story = validateProject(project.story);
        return project;
    } catch (error) {
        console.error("Impossible de charger le projet local :", error);
        return createProject(cloneObject(defaultStory));
    }
}

export function saveProjectLocally() {
    try {
        const project = touchProject(getProject());
        validateProject(project.story);
        projectStorage.save(project, STORAGE_KEY);

        emit(EVENTS.SAVE_STATUS_CHANGED, {
            isSaved: true,
            message: "Projet sauvegardé"
        });

        return true;
    } catch (error) {
        console.error("Échec de la sauvegarde locale :", error);

        emit(EVENTS.SAVE_STATUS_CHANGED, {
            isSaved: false,
            message: "Projet trop volumineux pour la sauvegarde locale"
        });

        return false;
    }
}

export function commitProjectChange() {
    const active = document.activeElement;
    const isTextEditor = active && (active.matches?.("input:not([type=checkbox]):not([type=radio]), textarea") || active.isContentEditable);
    const mergeKey = isTextEditor ? `text:${active.id || active.name || active.dataset?.field || active.tagName}` : null;
    recordHistoryChange({ mergeKey });
    emit(EVENTS.PROJECT_CHANGED, { story: getStory() });
    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: true });
    saveProjectLocally();
}

export function downloadProjectFile() {
    const project = touchProject(getProject());
    validateProject(project.story);

    const filename = projectStorage.download(project);
    saveProjectLocally();
    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: false });
    emit(EVENTS.SAVE_STATUS_CHANGED, {
        isSaved: true,
        message: `Projet enregistré : ${filename}`
    });
}

export async function importProjectFile(file) {
    if (!file.name.toLowerCase().endsWith(".story.json")) {
        throw new Error("Seuls les fichiers .story.json sont acceptés.");
    }

    const content = await readFileAsText(file);
    const importedProject = projectStorage.openText(content);
    importedProject.story = validateProject(importedProject.story);

    setProject(importedProject);
    resetHistory();
    saveProjectLocally();
    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: false });
}

export function createNewProject() {
    // Un nouveau projet repart d’un état vierge.
    localStorage.removeItem(MAPBOX_TOKEN_KEY);

    const project = cloneObject(defaultStory);
    project.projectName = "";
    project.title = "";
    project.mapboxToken = "";
    project.mapStyle = "";
    project.projectConfig = {
        location: cloneObject(defaultLocation),
        layerOpacity: {},
        layerStyles: {},
        legend: [],
        layerTransition: { enabled: true, duration: 600, delay: 0 }
    };
    project.meta = {
        title: "",
        dek: "",
        authors: [{ name: "", url: "", image: null, imageName: "" }],
        footer: { signatures: "", sources: "" }
    };
    project.chapters = [];

    setProject(createProject(project));
    resetHistory();
    saveProjectLocally();
    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: false });
}
