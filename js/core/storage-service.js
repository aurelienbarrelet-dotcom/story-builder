import { createSlug, downloadTextFile } from "./utils.js";
import { parseProjectDocument, serializeProjectDocument } from "./project-format.js";

const localAdapter = Object.freeze({
    id: "local",
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

let activeAdapter = localAdapter;

export const projectStorage = Object.freeze({
    use(adapter) {
        if (!adapter?.save || !adapter?.load) throw new Error("Adaptateur de stockage invalide.");
        activeAdapter = adapter;
    },
    getProvider() { return activeAdapter.id ?? "custom"; },
    save(project, storageKey) { return activeAdapter.save(project, storageKey); },
    load(storageKey) { return activeAdapter.load(storageKey); },
    remove(storageKey) { return activeAdapter.remove?.(storageKey); },
    download(project) {
        const filename = `${createSlug(project.metadata?.name || project.story?.projectName) || "story-project"}.story.json`;
        downloadTextFile(filename, serializeProjectDocument(project, true), "application/json;charset=utf-8");
        return filename;
    },
    openText(text) { return parseProjectDocument(text); }
});
