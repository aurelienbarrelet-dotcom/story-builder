import { emit, EVENTS, on } from "../../core/events.js";
import { saveProjectLocally } from "../../core/project-service.js";
import { getProject } from "../../core/store.js";

const MAX_PREVIEW_SIZE_BYTES = 100 * 1024 * 1024;

export function setupModels3dPanel() {
    const importButton = document.getElementById("importModel3dButton");
    const fileInput = document.getElementById("model3dFileInput");
    if (!importButton || !fileInput) return;

    importButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        fileInput.value = "";
        if (!file) return;
        try {
            validateGlbFile(file);
            const data = await readFileAsBase64(file);
            getModelLibrary().push({
                id: crypto.randomUUID(),
                name: file.name,
                mimeType: file.type || "model/gltf-binary",
                size: file.size,
                encoding: "base64",
                data
            });
            emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: true });
            saveProjectLocally();
            renderModels();
        } catch (error) {
            renderModels(error instanceof Error ? error.message : "Impossible de lire ce fichier.");
        }
    });

    on(EVENTS.PROJECT_REPLACED, () => renderModels());
    renderModels();
}

function getModelLibrary() {
    const project = getProject();
    if (!project) return [];
    project.assets ??= { images: [], icons: [], fonts: [] };
    project.assets.models ??= [];
    return project.assets.models;
}

function validateGlbFile(file) {
    if (!file.name.toLowerCase().endsWith(".glb")) throw new Error("Sélectionnez un fichier au format GLB.");
    if (file.size === 0) throw new Error("Le fichier sélectionné est vide.");
    if (file.size > MAX_PREVIEW_SIZE_BYTES) throw new Error("Le fichier dépasse la limite temporaire de 100 Mo.");
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const result = String(reader.result ?? "");
            resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
        });
        reader.addEventListener("error", () => reject(reader.error ?? new Error("Lecture impossible.")));
        reader.readAsDataURL(file);
    });
}

function renderModels(errorMessage = "") {
    const container = document.getElementById("model3dSelection");
    if (!container) return;
    container.replaceChildren();
    if (errorMessage) {
        const message = document.createElement("p");
        message.className = "models3d-message models3d-message--error";
        message.textContent = errorMessage;
        container.append(message);
        return;
    }
    const models = getModelLibrary();
    if (!models.length) {
        const empty = document.createElement("p");
        empty.className = "panel-empty-state";
        empty.textContent = "Aucun modèle importé.";
        container.append(empty);
        return;
    }
    models.forEach(model => {
        const details = document.createElement("dl");
        details.className = "models3d-file-details";
        appendDetail(details, "Nom", model.name);
        appendDetail(details, "Taille", formatFileSize(Number(model.size) || 0));
        appendDetail(details, "Type", model.mimeType || "model/gltf-binary");
        appendDetail(details, "État", "Inclus dans la sauvegarde JSON");
        container.append(details);
    });
}

function appendDetail(list, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    list.append(term, description);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} octet${bytes > 1 ? "s" : ""}`;
    const units = ["Ko", "Mo", "Go"];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${units[unitIndex]}`;
}
