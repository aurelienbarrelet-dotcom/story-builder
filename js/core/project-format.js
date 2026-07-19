import { APP_VERSION, PROJECT_FORMAT, PROJECT_FORMAT_VERSION } from "./config.js";
import { cloneObject } from "./utils.js";

export function createProjectDocument(story) {
    return {
        format: PROJECT_FORMAT,
        formatVersion: PROJECT_FORMAT_VERSION,
        application: {
            name: "Story Builder",
            version: APP_VERSION
        },
        savedAt: new Date().toISOString(),
        project: cloneObject(story)
    };
}

export function parseProjectDocument(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Le fichier de projet est invalide.");
    }

    if (value.format === PROJECT_FORMAT) {
        const version = Number(value.formatVersion);
        if (!Number.isInteger(version) || version < 1) {
            throw new Error("La version du format de projet est invalide.");
        }
        if (version > PROJECT_FORMAT_VERSION) {
            throw new Error(
                `Ce projet utilise le format ${version}, plus récent que le format ${PROJECT_FORMAT_VERSION} pris en charge.`
            );
        }
        if (!value.project || typeof value.project !== "object") {
            throw new Error("Le contenu du projet est manquant.");
        }
        return { project: value.project, sourceFormat: "story-json", formatVersion: version };
    }

    // Compatibilité avec les anciens JSON contenant directement l'objet story.
    if (Array.isArray(value.chapters)) {
        return { project: value, sourceFormat: "legacy-json", formatVersion: 0 };
    }

    throw new Error("Ce fichier n'est pas un projet Story Builder reconnu.");
}
