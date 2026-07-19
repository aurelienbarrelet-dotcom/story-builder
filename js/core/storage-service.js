import { createSlug, downloadTextFile } from "./utils.js";
import { createProjectDocument } from "./project-format.js";

export const projectStorage = Object.freeze({
    saveToBrowser(story, storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(story));
    },

    loadFromBrowser(storageKey) {
        const value = localStorage.getItem(storageKey);
        return value ? JSON.parse(value) : null;
    },

    downloadProject(story) {
        const document = createProjectDocument(story);
        const filename = `${createSlug(story.projectName) || "story-project"}.story.json`;
        downloadTextFile(filename, `${JSON.stringify(document, null, 2)}\n`, "application/json;charset=utf-8");
        return filename;
    }
});
