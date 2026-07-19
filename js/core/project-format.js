import { PROJECT_FORMAT, PROJECT_FORMAT_VERSION } from "./config.js";
import { cloneObject } from "./utils.js";
import { validateProjectDocument } from "./validation-service.js";

export function serializeProjectDocument(project, pretty = false) {
    validateProjectDocument(project);
    return `${JSON.stringify(project, null, pretty ? 2 : 0)}${pretty ? "\n" : ""}`;
}

export function parseProjectDocument(text) {
    let value;
    try {
        value = JSON.parse(text);
    } catch {
        throw new Error("Le fichier ne contient pas un JSON valide.");
    }
    validateProjectDocument(value);
    return cloneObject(value);
}

export function assertSupportedFormat(value) {
    if (value?.format !== PROJECT_FORMAT || Number(value?.formatVersion) !== PROJECT_FORMAT_VERSION) {
        throw new Error(`Format Story Builder attendu : ${PROJECT_FORMAT} v${PROJECT_FORMAT_VERSION}.`);
    }
}
