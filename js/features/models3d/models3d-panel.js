import { emit, EVENTS, on } from "../../core/events.js";
import { saveProjectLocally } from "../../core/project-service.js";
import { getProject } from "../../core/store.js";

const MAX_PREVIEW_SIZE_BYTES = 100 * 1024 * 1024;
const previewUrls = new Set();

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
    releasePreviewUrls();
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
        const card = document.createElement("article");
        card.className = "models3d-card";

        const details = document.createElement("dl");
        details.className = "models3d-file-details";
        appendDetail(details, "Nom", model.name);
        appendDetail(details, "Taille", formatFileSize(Number(model.size) || 0));
        appendDetail(details, "Type", model.mimeType || "model/gltf-binary");
        appendDetail(details, "État", "Inclus dans la sauvegarde JSON");
        const dimensionsValue = appendDetail(details, "Dimensions", "Analyse…");
        const meshesValue = appendDetail(details, "Maillages", "Analyse…");
        const materialsValue = appendDetail(details, "Matériaux", "Analyse…");
        const animationsValue = appendDetail(details, "Animations", "Analyse…");

        const preview = createModelPreview(model, {
            dimensionsValue,
            meshesValue,
            materialsValue,
            animationsValue
        });
        card.append(preview, details);
        container.append(card);
    });
}

function createModelPreview(model, metadataElements) {
    const preview = document.createElement("model-viewer");
    preview.className = "models3d-preview";
    preview.setAttribute("camera-controls", "");
    preview.setAttribute("auto-rotate", "");
    preview.setAttribute("interaction-prompt", "none");
    preview.setAttribute("shadow-intensity", "0.8");
    preview.setAttribute("environment-image", "neutral");
    preview.setAttribute("alt", `Aperçu 3D de ${model.name || "ce modèle"}`);

    try {
        const url = createGlbObjectUrl(model);
        previewUrls.add(url);
        preview.src = url;
        updateStructuralMetadata(model, metadataElements);
    } catch (error) {
        preview.classList.add("models3d-preview--error");
        preview.textContent = error instanceof Error ? error.message : "Aperçu indisponible.";
    }
    preview.addEventListener("load", () => {
        updateDimensionsMetadata(preview, metadataElements.dimensionsValue);
    }, { once: true });
    preview.addEventListener("error", () => {
        preview.classList.add("models3d-preview--error");
        preview.textContent = "Impossible d’afficher ce modèle GLB.";
        metadataElements.dimensionsValue.textContent = "Indisponibles";
    }, { once: true });
    return preview;
}

function createGlbObjectUrl(model) {
    if (model.encoding !== "base64" || !model.data) throw new Error("Données GLB indisponibles.");
    const binary = atob(model.data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const blob = new Blob([bytes], { type: model.mimeType || "model/gltf-binary" });
    return URL.createObjectURL(blob);
}

function updateStructuralMetadata(model, elements) {
    try {
        const gltf = readGlbJson(model);
        elements.meshesValue.textContent = formatCount(gltf.meshes?.length ?? 0, "maillage");
        elements.materialsValue.textContent = formatCount(gltf.materials?.length ?? 0, "matériau", "matériaux");
        elements.animationsValue.textContent = formatCount(gltf.animations?.length ?? 0, "animation");
    } catch {
        elements.meshesValue.textContent = "Indisponible";
        elements.materialsValue.textContent = "Indisponibles";
        elements.animationsValue.textContent = "Indisponibles";
    }
}

function updateDimensionsMetadata(preview, element) {
    try {
        const dimensions = preview.getDimensions();
        element.textContent = [dimensions.x, dimensions.y, dimensions.z]
            .map(value => formatDimension(value))
            .join(" × ");
    } catch {
        element.textContent = "Indisponibles";
    }
}

function readGlbJson(model) {
    if (model.encoding !== "base64" || !model.data) throw new Error("Données GLB indisponibles.");
    const binary = atob(model.data);
    if (binary.length < 20 || binary.slice(0, 4) !== "glTF") throw new Error("En-tête GLB invalide.");
    const view = new DataView(new ArrayBuffer(8));
    const header = new Uint8Array(view.buffer);
    for (let index = 0; index < 8; index += 1) header[index] = binary.charCodeAt(12 + index);
    const chunkLength = view.getUint32(0, true);
    const chunkType = view.getUint32(4, true);
    if (chunkType !== 0x4E4F534A || 20 + chunkLength > binary.length) throw new Error("Bloc JSON GLB invalide.");
    const jsonText = binary.slice(20, 20 + chunkLength).replace(/\u0000+$/g, "").trimEnd();
    return JSON.parse(jsonText);
}

function formatDimension(value) {
    if (!Number.isFinite(value)) return "—";
    return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m`;
}

function formatCount(count, singular, plural = `${singular}s`) {
    return `${count.toLocaleString("fr-FR")} ${count > 1 ? plural : singular}`;
}

function releasePreviewUrls() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls.clear();
}

function appendDetail(list, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    list.append(term, description);
    return description;
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
