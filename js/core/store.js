import { emit, EVENTS } from "./events.js";

const state = {
    project: null,
    selectedChapterIndex: 0,
    draggedChapterIndex: null,
    selectedChapterIndices: new Set([0]),
    selectionAnchorIndex: 0,
    selectedSection: "chapter"
};

export function getProject() {
    return state.project;
}

export function getStory() {
    return state.project?.story ?? null;
}

export function setProject(project) {
    state.project = project;
    const story = project.story;
    state.selectedChapterIndex = 0;
    state.draggedChapterIndex = null;
    state.selectedChapterIndices = new Set(story?.chapters?.length ? [0] : []);
    state.selectionAnchorIndex = 0;
    state.selectedSection = story?.chapters?.length ? "chapter" : "meta";

    emit(EVENTS.PROJECT_REPLACED, { story });
    emit(EVENTS.RENDER_REQUESTED);
}

export function setStory(story) {
    if (!state.project) throw new Error("Aucun projet actif.");
    state.project.story = story;
    setProject(state.project);
}

export function getChapters() {
    return getStory()?.chapters ?? [];
}

export function getSelectedChapterIndex() {
    return state.selectedChapterIndex;
}

export function getSelectedChapter() {
    return getChapters()[state.selectedChapterIndex] ?? null;
}


export function getProjectConfig() {
    const story = getStory();
    if (!story) return null;
    story.projectConfig ??= {
        location: { center: [6.6323, 46.5197], zoom: 9, pitch: 0, bearing: 0 },
        layerOpacity: {}, layerStyles: {}, legend: [],
        layerTransition: { duration: 600, delay: 0 }
    };
    return story.projectConfig;
}

export function getSelectedMapTarget() {
    return state.selectedSection === "meta" ? getProjectConfig() : getSelectedChapter();
}

export function getSelectedMapTargets() {
    return state.selectedSection === "meta" ? [getProjectConfig()].filter(Boolean) : getSelectedChapters();
}

export function getSelectedChapterIndices() {
    return [...state.selectedChapterIndices]
        .filter(index => index >= 0 && index < getChapters().length)
        .sort((a, b) => a - b);
}

export function getSelectedChapters() {
    return getSelectedChapterIndices().map(index => getChapters()[index]);
}

export function isChapterMultiSelected(index) {
    return state.selectedChapterIndices.has(index);
}

export function setChapterMultiSelection(index, options = {}) {
    state.selectedSection = "chapter";
    const chapters = getChapters();
    if (index < 0 || index >= chapters.length) return;

    if (options.range) {
        const start = Math.min(state.selectionAnchorIndex, index);
        const end = Math.max(state.selectionAnchorIndex, index);
        state.selectedChapterIndices = new Set(
            Array.from({ length: end - start + 1 }, (_, offset) => start + offset)
        );
    } else if (options.toggle) {
        if (state.selectedChapterIndices.has(index) && state.selectedChapterIndices.size > 1) {
            state.selectedChapterIndices.delete(index);
        } else {
            state.selectedChapterIndices.add(index);
        }
        state.selectionAnchorIndex = index;
    } else {
        state.selectedChapterIndices = new Set([index]);
        state.selectionAnchorIndex = index;
    }

    state.selectedChapterIndex = index;
    emit(EVENTS.SELECTION_CHANGED, {
        index,
        chapter: getSelectedChapter(),
        indices: getSelectedChapterIndices()
    });
    emit(EVENTS.RENDER_REQUESTED);
}

export function selectChapter(index) {
    state.selectedSection = "chapter";
    const chapters = getChapters();
    const normalized = chapters.length === 0
        ? 0
        : Math.max(0, Math.min(index, chapters.length - 1));

    state.selectedChapterIndex = normalized;
    state.selectedChapterIndices = chapters.length ? new Set([normalized]) : new Set();
    state.selectionAnchorIndex = normalized;

    emit(EVENTS.SELECTION_CHANGED, {
        index: normalized,
        chapter: getSelectedChapter(),
        indices: getSelectedChapterIndices()
    });
    emit(EVENTS.RENDER_REQUESTED);
}

export function setSelectionAfterDeletion(preferredIndex = 0) {
    const chapters = getChapters();
    const normalized = chapters.length
        ? Math.max(0, Math.min(preferredIndex, chapters.length - 1))
        : 0;
    state.selectedChapterIndex = normalized;
    state.selectedChapterIndices = chapters.length ? new Set([normalized]) : new Set();
    state.selectionAnchorIndex = normalized;
    emit(EVENTS.SELECTION_CHANGED, {
        index: normalized,
        chapter: getSelectedChapter(),
        indices: getSelectedChapterIndices()
    });
    emit(EVENTS.RENDER_REQUESTED);
}

export function normalizeSelection() {
    selectChapter(state.selectedChapterIndex);
}

export function getDraggedChapterIndex() {
    return state.draggedChapterIndex;
}

export function setDraggedChapterIndex(index) {
    state.draggedChapterIndex = index;
}

export function clearDraggedChapterIndex() {
    state.draggedChapterIndex = null;
}

export function getSelectedSection() {
    return state.selectedSection;
}

export function selectGeneralInformation() {
    state.selectedSection = "meta";
    state.selectedChapterIndices = new Set();
    emit(EVENTS.SELECTION_CHANGED, { section: "meta" });
    emit(EVENTS.RENDER_REQUESTED);
}

export function selectChapterSection(index, options = {}) {
    state.selectedSection = "chapter";
    setChapterMultiSelection(index, options);
}


export function getEditorStateSnapshot() {
    return {
        selectedChapterIndex: state.selectedChapterIndex,
        selectedChapterIndices: [...state.selectedChapterIndices],
        selectionAnchorIndex: state.selectionAnchorIndex,
        selectedSection: state.selectedSection
    };
}

export function restoreEditorState(story, editor = {}) {
    state.project.story = story;
    state.draggedChapterIndex = null;
    state.selectedSection = editor.selectedSection === "meta" ? "meta" : "chapter";
    const max = Math.max(0, (story?.chapters?.length ?? 1) - 1);
    state.selectedChapterIndex = Math.max(0, Math.min(Number(editor.selectedChapterIndex) || 0, max));
    const valid = (editor.selectedChapterIndices ?? []).filter(index => index >= 0 && index <= max);
    state.selectedChapterIndices = state.selectedSection === "chapter" && story?.chapters?.length
        ? new Set(valid.length ? valid : [state.selectedChapterIndex])
        : new Set();
    state.selectionAnchorIndex = Math.max(0, Math.min(Number(editor.selectionAnchorIndex) || state.selectedChapterIndex, max));
    emit(EVENTS.PROJECT_REPLACED, { story, reason: "history" });
    emit(EVENTS.SELECTION_CHANGED, { index: state.selectedChapterIndex, chapter: getSelectedChapter(), indices: getSelectedChapterIndices() });
    emit(EVENTS.RENDER_REQUESTED);
}
