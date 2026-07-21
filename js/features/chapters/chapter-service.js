import {
    getChapters,
    getSelectedChapter,
    getSelectedChapterIndex,
    getSelectedChapterIndices,
    getSelectedChapters,
    getSelectedSection,
    getProjectConfig,
    setSelectionAfterDeletion,
    selectChapter
} from "../../core/store.js";
import { cloneObject, createSlug } from "../../core/utils.js";
import { defaultLocation } from "../../core/default-project.js";
import { commitProjectChange } from "../../core/project-service.js";

export function generateUniqueChapterId(title, ignoredChapter = null) {
    const chapters = getChapters();
    let baseId = createSlug(title) || "chapitre";
    let proposedId = baseId;
    let number = 2;

    while (
        chapters.some(
            chapter =>
                chapter !== ignoredChapter &&
                chapter.id === proposedId
        )
    ) {
        proposedId = `${baseId}-${number}`;
        number++;
    }

    return proposedId;
}

export function addChapter() {
    const chapters = getChapters();
    const title = "";
    const selectedSection = getSelectedSection();
    const selectedIndex = getSelectedChapterIndex();
    const insertIndex = selectedSection === "meta"
        ? 0
        : Math.min(Math.max(selectedIndex + 1, 0), chapters.length);
    // Tout nouveau chapitre part toujours de la configuration globale du Projet,
    // quel que soit le chapitre sélectionné au moment de sa création.
    const referenceChapter = getProjectConfig();

    const chapter = {
        id: generateUniqueChapterId(title),
        title,
        description: "",
        image: null,
        imageName: "",
        imageCaption: "",
        location: cloneObject(referenceChapter?.location ?? defaultLocation),
        ...(referenceChapter?.mobileLocation ? { mobileLocation: cloneObject(referenceChapter.mobileLocation) } : {}),
        layerOpacity: cloneObject(referenceChapter?.layerOpacity ?? {}),
        layerStyles: cloneObject(referenceChapter?.layerStyles ?? {}),
        legend: cloneObject(referenceChapter?.legend ?? []),
        layerMode: referenceChapter?.layerMode ?? "snapshot",
        layerTransition: cloneObject(referenceChapter?.layerTransition ?? { enabled: true, duration: 600, delay: 0 }),
        transition: cloneObject(referenceChapter?.transition ?? { control: "automatic", method: "flyTo", duration: 1200, smoothing: 0.18, essential: true, easing: "ease-in-out" })
    };

    chapters.splice(insertIndex, 0, chapter);

    commitProjectChange();
    selectChapter(insertIndex);

    requestAnimationFrame(() => {
        const titleInput = document.getElementById("titleInput");
        titleInput?.focus();
        titleInput?.select();
    });
}

export function duplicateSelectedChapter() {
    duplicateChapterAt(getSelectedChapterIndex());
}

export function duplicateChapterAt(index) {
    const chapters = getChapters();
    const chapter = chapters[index];
    const selectedIndex = index;

    if (!chapter) return;

    const duplicate = cloneObject(chapter);

    duplicate.title = `${chapter.title} — copie`;
    duplicate.id = generateUniqueChapterId(duplicate.title);

    chapters.splice(selectedIndex + 1, 0, duplicate);

    commitProjectChange();
    selectChapter(selectedIndex + 1);
}

export function deleteSelectedChapter() {
    deleteChapterAt(getSelectedChapterIndex());
}

export function deleteChapterAt(index) {
    const chapters = getChapters();
    const chapter = chapters[index];
    const selectedIndex = index;

    if (!chapter) return;

    const confirmed = confirm(
        `Supprimer le chapitre « ${chapter.title} » ?`
    );

    if (!confirmed) {
        return;
    }

    chapters.splice(selectedIndex, 1);

    commitProjectChange();
    selectChapter(Math.min(selectedIndex, chapters.length - 1));
}


export function deleteSelectedChapters() {
    const chapters = getChapters();
    const indices = getSelectedChapterIndices();
    if (!indices.length) return;

    const label = indices.length === 1
        ? `le chapitre « ${chapters[indices[0]]?.title ?? "sans titre"} »`
        : `${indices.length} chapitres`;

    if (!confirm(`Supprimer ${label} ?`)) return;

    const firstIndex = indices[0];
    [...indices].sort((a, b) => b - a).forEach(index => chapters.splice(index, 1));
    commitProjectChange();
    setSelectionAfterDeletion(firstIndex);
}

export function updateChapterTransition(field, value) {
    const chapters = getSelectedChapters();
    if (!chapters.length) return;
    const normalized = field === "duration"
        ? Math.max(0, Number(value) || 0)
        : field === "smoothing"
            ? Math.min(0.5, Math.max(0.04, Number(value) || 0.18))
            : value;
    chapters.forEach(chapter => {
        chapter.transition ??= { control: "automatic", method: "flyTo", duration: 1200, smoothing: 0.18, essential: true, easing: "ease-in-out" };
        chapter.transition[field] = normalized;
    });
    commitProjectChange();
}

export function updateChapterLayerMode(value) {
    const chapters = getSelectedChapters();
    if (!chapters.length) return;
    const normalized = value === "inherit" ? "inherit" : "snapshot";
    chapters.forEach(chapter => { chapter.layerMode = normalized; });
    commitProjectChange();
}

export function updateChapterLayerTransition(field, value) {
    const chapters = getSelectedChapters();
    if (!chapters.length) return;
    const normalized = field === "enabled"
        ? value !== false
        : Math.max(0, Number(value) || 0);
    chapters.forEach(chapter => {
        chapter.layerTransition ??= { enabled: true, duration: 600, delay: 0 };
        chapter.layerTransition[field] = normalized;
    });
    commitProjectChange();
}

export function updateSelectedLayerTransitions(layerIds, field, value) {
    const chapters = getSelectedChapters();
    if (!chapters.length || !layerIds.length) return;
    const normalized = field === "enabled"
        ? value !== false
        : field === "effect"
            ? (["fade", "grow", "none"].includes(value) ? value : "fade")
            : Math.max(0, Number(value) || 0);
    chapters.forEach(chapter => {
        chapter.layerTransitions ??= {};
        layerIds.forEach(layerId => {
            const fallback = chapter.layerTransition ?? { enabled: true, duration: 600, delay: 0 };
            chapter.layerTransitions[layerId] ??= {
                enabled: fallback.enabled !== false,
                duration: Math.max(0, Number(fallback.duration) || 0),
                delay: Math.max(0, Number(fallback.delay) || 0),
                effect: "fade"
            };
            chapter.layerTransitions[layerId][field] = normalized;
        });
    });
    commitProjectChange();
}

export function applyLayerTransitionPreset(layerIds, preset) {
    const chapters = getSelectedChapters();
    if (!chapters.length || !layerIds.length) return;
    const presets = {
        fade: { enabled: true, effect: "fade", duration: 600, delay: 0 },
        grow: { enabled: true, effect: "grow", duration: 800, delay: 0 },
        quick: { enabled: true, effect: "fade", duration: 250, delay: 0 },
        instant: { enabled: true, effect: "none", duration: 0, delay: 0 }
    };
    const config = presets[preset];
    if (!config) return;
    chapters.forEach(chapter => {
        chapter.layerTransitions ??= {};
        layerIds.forEach(layerId => {
            chapter.layerTransitions[layerId] = { ...config };
        });
    });
    commitProjectChange();
}

export function addLayerTransitions(layerIds) {
    const chapters = getSelectedChapters();
    if (!chapters.length || !layerIds.length) return;
    chapters.forEach(chapter => {
        chapter.layerTransitions ??= {};
        const fallback = chapter.layerTransition ?? { enabled: true, duration: 600, delay: 0 };
        layerIds.forEach(layerId => {
            chapter.layerTransitions[layerId] ??= {
                enabled: fallback.enabled !== false,
                duration: Math.max(0, Number(fallback.duration) || 0),
                delay: Math.max(0, Number(fallback.delay) || 0),
                effect: "fade"
            };
        });
    });
    commitProjectChange();
}

export function removeLayerTransitions(layerIds) {
    const chapters = getSelectedChapters();
    if (!chapters.length || !layerIds.length) return;
    chapters.forEach(chapter => {
        if (!chapter.layerTransitions) return;
        layerIds.forEach(layerId => delete chapter.layerTransitions[layerId]);
    });
    commitProjectChange();
}

export function sequenceSelectedLayerTransitions(layerIds, step = 200) {
    const chapters = getSelectedChapters();
    if (!chapters.length || !layerIds.length) return;
    const normalizedStep = Math.max(0, Number(step) || 0);
    chapters.forEach(chapter => {
        chapter.layerTransitions ??= {};
        layerIds.forEach((layerId, index) => {
            const fallback = chapter.layerTransition ?? { enabled: true, duration: 600, delay: 0 };
            chapter.layerTransitions[layerId] = {
                enabled: true,
                duration: Math.max(0, Number(chapter.layerTransitions[layerId]?.duration ?? fallback.duration) || 0),
                delay: index * normalizedStep,
                effect: chapter.layerTransitions[layerId]?.effect || "fade"
            };
        });
    });
    commitProjectChange();
}

export function moveChapter(fromIndex, toIndex) {
    const chapters = getChapters();

    if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= chapters.length ||
        toIndex >= chapters.length
    ) {
        return;
    }

    const movedChapter = chapters.splice(fromIndex, 1)[0];

    chapters.splice(toIndex, 0, movedChapter);

    commitProjectChange();
    selectChapter(toIndex);
}

export function updateChapterTitle(value) {
    const chapter = getSelectedChapter();

    if (!chapter) {
        return;
    }

    chapter.title = value;
    commitProjectChange();
}

export function updateChapterDescription(value) {
    const chapter = getSelectedChapter();

    if (!chapter) {
        return;
    }

    chapter.description = value;
    commitProjectChange();
}

export function updateChapterCaption(value) {
    const chapter = getSelectedChapter();

    if (!chapter) {
        return;
    }

    chapter.imageCaption = value;
    commitProjectChange();
}

export function updateChapterId(value) {
    const chapter = getSelectedChapter();

    if (!chapter) {
        return { ok: false, value: "" };
    }

    const cleanedId = createSlug(value);

    if (!cleanedId) {
        return {
            ok: false,
            value: chapter.id,
            message: "L’identifiant ne peut pas être vide."
        };
    }

    const uniqueId = generateUniqueChapterId(cleanedId, chapter);

    if (uniqueId !== cleanedId) {
        return {
            ok: false,
            value: chapter.id,
            message: "Cet identifiant est déjà utilisé."
        };
    }

    chapter.id = cleanedId;
    commitProjectChange();

    return {
        ok: true,
        value: cleanedId
    };
}
