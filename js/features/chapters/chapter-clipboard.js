import { emit, EVENTS } from '../../core/events.js';
import { cloneObject } from '../../core/utils.js';
import { getChapters, getSelectedChapterIndices, getSelectedSection, selectChapter, setChapterMultiSelection } from '../../core/store.js';
import { commitProjectChange } from '../../core/project-service.js';
import { generateUniqueChapterId } from './chapter-service.js';

let clipboard = [];
export function hasChapterClipboard() { return clipboard.length > 0; }
export function copySelectedChapters() {
    if (getSelectedSection() !== 'chapter') return false;
    clipboard = getSelectedChapterIndices().map(i => cloneObject(getChapters()[i])).filter(Boolean);
    emit(EVENTS.CLIPBOARD_CHANGED, { hasClipboard: hasChapterClipboard(), count: clipboard.length });
    return clipboard.length > 0;
}
function prepareCopies(source, duplicateLabel = false) {
    const usedIds = new Set(getChapters().map(chapter => chapter.id));
    return source.map(chapter => {
        const copy = cloneObject(chapter);
        if (duplicateLabel) copy.title = copy.title ? `${copy.title} — copie` : '';
        const base = generateUniqueChapterId(copy.title || copy.id || 'chapitre');
        let id = base;
        let suffix = 2;
        while (usedIds.has(id)) id = `${base}-${suffix++}`;
        usedIds.add(id);
        copy.id = id;
        return copy;
    });
}

export function pasteChapters() {
    if (!clipboard.length) return;
    const chapters = getChapters();
    const selected = getSelectedChapterIndices();
    const insertAt = selected.length ? selected[selected.length - 1] + 1 : chapters.length;
    const copies = prepareCopies(clipboard, false);
    chapters.splice(insertAt, 0, ...copies);
    commitProjectChange();
    selectChapter(insertAt);
    for (let i = 1; i < copies.length; i++) setChapterMultiSelection(insertAt + i, { toggle: true });
}
export function duplicateSelectedChapters() {
    if (getSelectedSection() !== 'chapter') return;
    const chapters = getChapters();
    const indices = getSelectedChapterIndices();
    if (!indices.length) return;
    const copies = prepareCopies(indices.map(i => chapters[i]), true);
    const insertAt = indices[indices.length - 1] + 1;
    chapters.splice(insertAt, 0, ...copies);
    commitProjectChange();
    selectChapter(insertAt);
    for (let i = 1; i < copies.length; i++) setChapterMultiSelection(insertAt + i, { toggle: true });
}
