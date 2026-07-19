import { emit, EVENTS } from './events.js';
import { cloneObject } from './utils.js';
import { getEditorStateSnapshot, getStory, restoreEditorState } from './store.js';

const LIMIT = 50;
let undoStack = [];
let redoStack = [];
let baseline = null;
let lastMergeKey = null;
let lastCommitAt = 0;
let restoring = false;

function snapshot() {
    return { story: cloneObject(getStory()), editor: getEditorStateSnapshot() };
}
function sameStory(a, b) { return JSON.stringify(a?.story) === JSON.stringify(b?.story); }
function notify() { emit(EVENTS.HISTORY_CHANGED, { canUndo: canUndo(), canRedo: canRedo() }); }

export function resetHistory() {
    undoStack = [];
    redoStack = [];
    baseline = getStory() ? snapshot() : null;
    lastMergeKey = null;
    lastCommitAt = 0;
    notify();
}

export function recordHistoryChange({ mergeKey = null } = {}) {
    if (restoring || !getStory()) return;
    const current = snapshot();
    if (!baseline) { baseline = current; notify(); return; }
    if (sameStory(current, baseline)) return;

    const now = Date.now();
    const shouldMerge = Boolean(mergeKey && mergeKey === lastMergeKey && now - lastCommitAt < 700);
    if (!shouldMerge) {
        undoStack.push(baseline);
        if (undoStack.length > LIMIT) undoStack.shift();
    }
    baseline = current;
    redoStack = [];
    lastMergeKey = mergeKey;
    lastCommitAt = now;
    notify();
}

export function canUndo() { return undoStack.length > 0; }
export function canRedo() { return redoStack.length > 0; }

function restore(target, destination) {
    if (!target) return;
    destination.push(snapshot());
    restoring = true;
    restoreEditorState(cloneObject(target.story), target.editor);
    restoring = false;
    baseline = snapshot();
    lastMergeKey = null;
    lastCommitAt = 0;
    notify();
    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: true });
}

export function undo() { if (canUndo()) restore(undoStack.pop(), redoStack); }
export function redo() { if (canRedo()) restore(redoStack.pop(), undoStack); }
