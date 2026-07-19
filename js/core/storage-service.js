import { createSlug, downloadTextFile } from "./utils.js";
import { parseProjectDocument, serializeProjectDocument } from "./project-format.js";
import { localStorageAdapter } from "./storage-adapters/local-storage-adapter.js";

const adapters = new Map();
let activeAdapterId = null;

function assertAdapter(adapter) {
    if (!adapter || typeof adapter !== "object") {
        throw new Error("Adaptateur de stockage invalide.");
    }
    if (!adapter.id || typeof adapter.id !== "string") {
        throw new Error("Chaque adaptateur de stockage doit posséder un identifiant.");
    }
    if (typeof adapter.save !== "function" || typeof adapter.load !== "function") {
        throw new Error("Un adaptateur de stockage doit fournir save() et load().");
    }
}

function getActiveAdapter() {
    const adapter = adapters.get(activeAdapterId);
    if (!adapter) throw new Error("Aucun adaptateur de stockage actif.");
    if (typeof adapter.isAvailable === "function" && !adapter.isAvailable()) {
        throw new Error(`Le stockage « ${adapter.id} » n’est pas disponible.`);
    }
    return adapter;
}

export const projectStorage = Object.freeze({
    register(adapter) {
        assertAdapter(adapter);
        adapters.set(adapter.id, adapter);
        if (!activeAdapterId) activeAdapterId = adapter.id;
        return adapter.id;
    },
    use(adapterOrId) {
        if (typeof adapterOrId === "object") this.register(adapterOrId);
        const adapterId = typeof adapterOrId === "string" ? adapterOrId : adapterOrId.id;
        if (!adapters.has(adapterId)) {
            throw new Error(`Adaptateur de stockage inconnu : ${adapterId}`);
        }
        activeAdapterId = adapterId;
        return this.getProvider();
    },
    listProviders() {
        return [...adapters.values()].map(adapter => ({
            id: adapter.id,
            label: adapter.label ?? adapter.id,
            available: typeof adapter.isAvailable !== "function" || adapter.isAvailable()
        }));
    },
    getProvider() {
        return activeAdapterId;
    },
    save(project, storageKey) {
        return getActiveAdapter().save(project, storageKey);
    },
    load(storageKey) {
        return getActiveAdapter().load(storageKey);
    },
    remove(storageKey) {
        return getActiveAdapter().remove?.(storageKey);
    },
    download(project) {
        const filename = `${createSlug(project.metadata?.name || project.story?.projectName) || "story-project"}.story.json`;
        downloadTextFile(filename, serializeProjectDocument(project, true), "application/json;charset=utf-8");
        return filename;
    },
    openText(text) {
        return parseProjectDocument(text);
    }
});

projectStorage.register(localStorageAdapter);
projectStorage.use("local");
