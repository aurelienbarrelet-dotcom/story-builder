import { emit, EVENTS, on } from "../../core/events.js";
import { saveProjectLocally } from "../../core/project-service.js";
import { getProject } from "../../core/store.js";
import { beginModelPlacement, removeInstancesForModel, renderModelInstances } from "./models3d-map.js";

const MAX_PREVIEW_SIZE_BYTES = 100 * 1024 * 1024;
const previewUrls = new Set();

export function setupModels3dPanel() {
    const importButton = document.getElementById("importModel3dButton");
    const fileInput = document.getElementById("model3dFileInput");
    if (!importButton || !fileInput) return;

    const dropZone = document.getElementById("model3dDropZone");

    importButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
        const files = [...(fileInput.files ?? [])];
        fileInput.value = "";
        await importGlbFiles(files);
    });

    if (dropZone) {
        ["dragenter", "dragover"].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                if (!containsFiles(event)) return;
                dropZone.classList.add("models3d-drop-zone--active");
                if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
            });
        });
        ["dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                dropZone.classList.remove("models3d-drop-zone--active");
            });
        });
        dropZone.addEventListener("drop", async event => {
            if (!containsFiles(event)) return;
            await importGlbFiles([...(event.dataTransfer?.files ?? [])]);
        });
    }

    on(EVENTS.PROJECT_REPLACED, () => renderModels());
    on(EVENTS.MODEL3D_PLACEMENT_CHANGED, ({ active, modelId }) => updatePlacementButtons(active, modelId));
    renderModels();
}

async function importGlbFiles(files) {
    if (!files.length) return;
    const importedModels = [];
    try {
        for (const file of files) {
            validateGlbFile(file);
            importedModels.push({
                id: crypto.randomUUID(),
                name: file.name,
                mimeType: file.type || "model/gltf-binary",
                size: file.size,
                encoding: "base64",
                data: await readFileAsBase64(file)
            });
        }
        getModelLibrary().push(...importedModels);
        emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: true });
        saveProjectLocally();
        renderModels();
    } catch (error) {
        renderModels(error instanceof Error ? error.message : "Impossible de lire ces fichiers.");
    }
}

function containsFiles(event) {
    return [...(event.dataTransfer?.types ?? [])].includes("Files");
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
        const actions = createModelActions(model);
        card.append(preview, details, actions);
        container.append(card);
    });
}


function createModelActions(model) {
    const actions = document.createElement("div");
    actions.className = "models3d-card-actions";

    const placeButton = createActionButton("Placer", "Placer ce modèle sur la carte", "models3d-action--place");
    placeButton.dataset.modelId = model.id;
    placeButton.addEventListener("click", () => {
        if (!beginModelPlacement(model.id)) {
            renderModels("Initialisez la carte Mapbox avant de placer un modèle.");
            return;
        }
        updatePlacementButtons(true, model.id);
    });

    const renameButton = createActionButton("Renommer", "Renommer ce modèle");
    renameButton.addEventListener("click", () => renameModel(model));

    const duplicateButton = createActionButton("Dupliquer", "Dupliquer ce modèle");
    duplicateButton.addEventListener("click", () => duplicateModel(model));

    const deleteButton = createActionButton("Supprimer", "Supprimer ce modèle", "models3d-action--danger");
    deleteButton.addEventListener("click", () => deleteModel(model));

    actions.append(placeButton, renameButton, duplicateButton, deleteButton);
    return actions;
}

function updatePlacementButtons(active, modelId) {
    document.querySelectorAll(".models3d-action--place").forEach(button => {
        const selected = active && button.dataset.modelId === modelId;
        button.classList.toggle("models3d-action--active", selected);
        button.textContent = selected ? "Cliquez sur la carte…" : "Placer";
        button.setAttribute("aria-pressed", String(selected));
    });
}

function createActionButton(label, title, extraClass = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ui-button ui-button--secondary models3d-action ${extraClass}`.trim();
    button.textContent = label;
    button.title = title;
    return button;
}

function renameModel(model) {
    const currentName = model.name || "modèle.glb";
    const requestedName = window.prompt("Nouveau nom du modèle :", currentName);
    if (requestedName === null) return;
    const name = requestedName.trim();
    if (!name || name === currentName) return;
    model.name = name;
    commitModelLibraryChange();
}

function duplicateModel(model) {
    const copy = {
        ...model,
        id: crypto.randomUUID(),
        name: createCopyName(model.name || "modèle.glb")
    };
    getModelLibrary().push(copy);
    commitModelLibraryChange();
}

function deleteModel(model) {
    const confirmed = window.confirm(`Supprimer définitivement « ${model.name || "ce modèle"} » du projet ?`);
    if (!confirmed) return;
    const models = getModelLibrary();
    const index = models.findIndex(candidate => candidate.id === model.id);
    if (index < 0) return;
    models.splice(index, 1);
    removeInstancesForModel(model.id);
    commitModelLibraryChange();
}

function createCopyName(name) {
    const suffix = " — copie";
    const extensionIndex = name.toLowerCase().lastIndexOf(".glb");
    if (extensionIndex < 0) return `${name}${suffix}`;
    return `${name.slice(0, extensionIndex)}${suffix}${name.slice(extensionIndex)}`;
}

function commitModelLibraryChange() {
    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: true });
    saveProjectLocally();
    renderModels();
    renderModelInstances();
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
