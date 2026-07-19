import { parseProjectDocument, serializeProjectDocument } from "../project-format.js";

export const localStorageAdapter = Object.freeze({
    id: "local",
    label: "Navigateur local",
    isAvailable() {
        return typeof window !== "undefined" && Boolean(window.localStorage);
    },
    save(project, storageKey) {
        localStorage.setItem(storageKey, serializeProjectDocument(project));
    },
    load(storageKey) {
        const value = localStorage.getItem(storageKey);
        return value ? parseProjectDocument(value) : null;
    },
    remove(storageKey) {
        localStorage.removeItem(storageKey);
    }
});
