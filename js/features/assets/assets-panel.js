import { MAX_IMAGE_SIZE } from "../../core/config.js";
import { on, EVENTS } from "../../core/events.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getProject, getSelectedChapter } from "../../core/store.js";
import { readFileAsDataUrl } from "../../core/utils.js";
import {
    createCollectionSelection,
    renderCollectionSelectionBar
} from "../../ui/collection-panel.js";
import { beginModelPlacement, removeInstancesForModel } from "../models3d/models3d-map.js";

const MAX_MODEL_SIZE = 100 * 1024 * 1024;
const assetSelection = createCollectionSelection();
const previewUrls = new Set();

function getImages() {
    const project = getProject();
    project.assets ??= { images: [], icons: [], fonts: [] };
    project.assets.images ??= [];
    return project.assets.images;
}

function getModels() {
    const project = getProject();
    project.assets ??= { images: [], icons: [], fonts: [] };
    project.assets.models ??= [];
    return project.assets.models;
}

function getAssetKey(type, id) {
    return `${type}:${id}`;
}

function parseAssetKey(key) {
    const separator = String(key ?? "").indexOf(":");
    if (separator < 0) return { type: "", id: "" };
    return { type: key.slice(0, separator), id: key.slice(separator + 1) };
}

function getAssetEntries() {
    return [
        ...getImages().map(asset => ({ type: "image", asset, key: getAssetKey("image", asset.id) })),
        ...getModels().map(asset => ({ type: "model", asset, key: getAssetKey("model", asset.id) }))
    ];
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function useAsset(asset) {
    const chapter = getSelectedChapter();
    if (!chapter) return alert("Sélectionne d’abord un chapitre.");

    chapter.image = asset.data;
    chapter.imageName = asset.name;
    chapter.imageCaption = asset.caption ?? "";
    commitProjectChange();
}

function removeAssetFromChapter(asset) {
    const chapter = getSelectedChapter();
    if (!chapter || chapter.image !== asset.data) return;

    chapter.image = null;
    chapter.imageName = "";
    chapter.imageCaption = "";
    commitProjectChange();
}

function toggleAssetForChapter(asset) {
    const isActive = getSelectedChapter()?.image === asset.data;
    if (isActive) removeAssetFromChapter(asset);
    else useAsset(asset);
}

function deleteSelectedAssets() {
    const selectedKeys = [...assetSelection.ids];
    if (!selectedKeys.length) return;
    if (!confirm(`Supprimer ${selectedKeys.length > 1 ? "ces médias" : "ce média"} du projet ?`)) return;

    const imageIds = new Set();
    const modelIds = new Set();
    selectedKeys.forEach(key => {
        const { type, id } = parseAssetKey(key);
        if (type === "image") imageIds.add(id);
        if (type === "model") modelIds.add(id);
    });

    const images = getImages();
    const chapter = getSelectedChapter();
    if (chapter && images.some(asset => imageIds.has(asset.id) && chapter.image === asset.data)) {
        chapter.image = null;
        chapter.imageName = "";
        chapter.imageCaption = "";
    }
    images.splice(0, images.length, ...images.filter(asset => !imageIds.has(asset.id)));

    const models = getModels();
    models.splice(0, models.length, ...models.filter(model => !modelIds.has(model.id)));
    modelIds.forEach(removeInstancesForModel);

    assetSelection.clear();
    commitProjectChange();
}

function renderImageInspector(asset) {
    const isActive = getSelectedChapter()?.image === asset.data;
    return `
        <section class="asset-editor" aria-labelledby="assetEditorTitle">
            <div class="asset-editor-heading">
                <div>
                    <p class="asset-editor-eyebrow">Image sélectionnée</p>
                    <h3 id="assetEditorTitle">${escapeHtml(asset.name)}</h3>
                </div>
                <span class="asset-editor-status ${isActive ? "active" : ""}">${isActive ? "Utilisée" : "Disponible"}</span>
            </div>
            <label class="asset-editor-field">
                <span>Titre</span>
                <input data-asset-name="${asset.id}" value="${escapeHtml(asset.name)}" aria-label="Titre de l’image">
            </label>
            <label class="asset-editor-field">
                <span>Légende</span>
                <textarea data-asset-caption="${asset.id}" rows="3" placeholder="Ajouter une légende…" aria-label="Légende de l’image">${escapeHtml(asset.caption ?? "")}</textarea>
            </label>
            <div class="asset-editor-actions">
                <button type="button" class="button button-primary" data-toggle-asset="${asset.id}">
                    ${isActive ? "Retirer l’image" : "Ajouter l’image"}
                </button>
            </div>
        </section>`;
}

function renderModelInspector(model) {
    return `
        <section class="asset-editor" aria-labelledby="assetEditorTitle">
            <div class="asset-editor-heading">
                <div>
                    <p class="asset-editor-eyebrow">Modèle 3D sélectionné</p>
                    <h3 id="assetEditorTitle">${escapeHtml(model.name || "Modèle 3D")}</h3>
                </div>
                <span class="asset-editor-status">GLB</span>
            </div>
            <label class="asset-editor-field">
                <span>Nom</span>
                <input data-model-name="${model.id}" value="${escapeHtml(model.name || "modèle.glb")}" aria-label="Nom du modèle 3D">
            </label>
            <dl class="asset-metadata">
                <dt>Format</dt><dd>${escapeHtml(model.mimeType || "model/gltf-binary")}</dd>
                <dt>Taille</dt><dd>${formatFileSize(Number(model.size) || 0)}</dd>
            </dl>
            <div class="asset-editor-actions">
                <button type="button" class="button button-primary models3d-action--place" data-place-model="${model.id}">Placer sur la carte</button>
                <button type="button" class="button button-danger" data-delete-model="${model.id}">Supprimer</button>
            </div>
        </section>`;
}

function renderAssetCard(entry) {
    const isSelected = assetSelection.has(entry.key);
    if (entry.type === "image") {
        const isActive = getSelectedChapter()?.image === entry.asset.data;
        return `
            <button type="button" class="asset-card ${isSelected ? "selected" : ""} ${isActive ? "active" : ""}"
                data-select-media="${entry.key}" aria-pressed="${isSelected}"
                title="Cliquer pour sélectionner cette image.">
                <span class="asset-preview">
                    <img src="${entry.asset.data}" alt="">
                    <span class="asset-use-dot" aria-hidden="true"></span>
                </span>
                <span class="asset-kind">Image</span>
                <span class="asset-name-static">${escapeHtml(entry.asset.name)}</span>
            </button>`;
    }

    return `
        <button type="button" class="asset-card asset-card--model ${isSelected ? "selected" : ""}"
            data-select-media="${entry.key}" aria-pressed="${isSelected}"
            title="Cliquer pour sélectionner ce modèle 3D.">
            <span class="asset-preview asset-preview--model" data-model-preview="${entry.asset.id}"></span>
            <span class="asset-kind">Modèle 3D</span>
            <span class="asset-name-static">${escapeHtml(entry.asset.name || "modèle.glb")}</span>
        </button>`;
}

export function renderAssetsPanel() {
    const container = document.getElementById("assetsPanelContent");
    if (!container) return;

    releasePreviewUrls();
    const entries = getAssetEntries();
    assetSelection.prune(new Set(entries.map(entry => entry.key)));
    const selectedEntry = entries.find(entry => entry.key === assetSelection.primaryId) ?? null;

    const galleryMarkup = entries.length ? `
        <div class="assets-grid" role="list" aria-label="Médias du projet">
            ${entries.map(renderAssetCard).join("")}
        </div>` : `
        <p class="assets-empty-state">Aucun média.<br>Clique sur le bouton « + » dans l’en-tête.</p>`;

    const inspectorMarkup = selectedEntry
        ? selectedEntry.type === "image" ? renderImageInspector(selectedEntry.asset) : renderModelInspector(selectedEntry.asset)
        : `<section class="asset-inspector-empty" aria-live="polite">
            <p class="asset-editor-eyebrow">Inspecteur</p>
            <h3>Aucun média sélectionné</h3>
            <p>Sélectionne une carte pour modifier ses propriétés ou l’utiliser dans le récit.</p>
        </section>`;

    container.innerHTML = `
        <div class="assets-workspace">
            <div class="assets-gallery-column">
                <div class="assets-gallery" aria-label="Bibliothèque des médias">
                    ${galleryMarkup}
                </div>
                <div class="collection-selection-bar assets-selection-bar" aria-live="polite" hidden></div>
            </div>
            <aside class="asset-inspector" aria-label="Inspecteur du média sélectionné">
                ${inspectorMarkup}
            </aside>
        </div>`;

    renderModelPreviews();

    container.querySelectorAll("[data-select-media]").forEach(card => {
        card.addEventListener("click", event => {
            assetSelection.select(card.dataset.selectMedia, getAssetEntries().map(entry => entry.key), event);
            renderAssetsPanel();
        });
    });

    container.querySelectorAll("[data-asset-name]").forEach(input => {
        input.addEventListener("change", () => {
            const asset = getImages().find(item => item.id === input.dataset.assetName);
            if (!asset) return;
            asset.name = input.value.trim() || asset.originalName || "Image";
            const chapter = getSelectedChapter();
            if (chapter?.image === asset.data) chapter.imageName = asset.name;
            commitProjectChange();
        });
    });

    container.querySelectorAll("[data-asset-caption]").forEach(input => {
        input.addEventListener("change", () => {
            const asset = getImages().find(item => item.id === input.dataset.assetCaption);
            if (!asset) return;
            asset.caption = input.value.trim();
            const chapter = getSelectedChapter();
            if (chapter?.image === asset.data) chapter.imageCaption = asset.caption;
            commitProjectChange();
        });
    });

    container.querySelectorAll("[data-toggle-asset]").forEach(button => {
        button.addEventListener("click", () => {
            const asset = getImages().find(item => item.id === button.dataset.toggleAsset);
            if (asset) toggleAssetForChapter(asset);
        });
    });

    container.querySelectorAll("[data-model-name]").forEach(input => {
        input.addEventListener("change", () => {
            const model = getModels().find(item => item.id === input.dataset.modelName);
            if (!model) return;
            model.name = input.value.trim() || "modèle.glb";
            commitProjectChange();
        });
    });

    container.querySelectorAll("[data-place-model]").forEach(button => {
        button.addEventListener("click", () => {
            if (!beginModelPlacement(button.dataset.placeModel)) {
                alert("Initialisez la carte Mapbox avant de placer un modèle.");
            }
        });
    });

    container.querySelectorAll("[data-delete-model]").forEach(button => {
        button.addEventListener("click", () => {
            const model = getModels().find(item => item.id === button.dataset.deleteModel);
            if (!model || !confirm(`Supprimer définitivement « ${model.name || "ce modèle"} » du projet ?`)) return;
            const models = getModels();
            models.splice(models.indexOf(model), 1);
            removeInstancesForModel(model.id);
            assetSelection.clear();
            commitProjectChange();
        });
    });

    renderCollectionSelectionBar(container.querySelector(".assets-selection-bar"), {
        count: assetSelection.count,
        singular: "média",
        plural: "médias",
        onDelete: deleteSelectedAssets,
        deleteLabel: "Supprimer les médias sélectionnés"
    });
}

async function importImages(files) {
    for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_IMAGE_SIZE) throw new Error(`${file.name} dépasse la limite de 2,5 Mo.`);
        const data = await readFileAsDataUrl(file);
        const asset = {
            id: crypto.randomUUID(),
            name: file.name,
            caption: "",
            originalName: file.name,
            type: file.type,
            size: file.size,
            data,
            createdAt: new Date().toISOString()
        };
        getImages().push(asset);
        assetSelection.replace([getAssetKey("image", asset.id)], getAssetKey("image", asset.id));
    }
}

async function importModels(files) {
    for (const file of files) {
        if (!file.name.toLowerCase().endsWith(".glb")) continue;
        if (file.size === 0) throw new Error(`${file.name} est vide.`);
        if (file.size > MAX_MODEL_SIZE) throw new Error(`${file.name} dépasse la limite temporaire de 100 Mo.`);
        const asset = {
            id: crypto.randomUUID(),
            name: file.name,
            mimeType: file.type || "model/gltf-binary",
            size: file.size,
            encoding: "base64",
            data: await readFileAsBase64(file)
        };
        getModels().push(asset);
        assetSelection.replace([getAssetKey("model", asset.id)], getAssetKey("model", asset.id));
    }
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

function renderModelPreviews() {
    document.querySelectorAll("[data-model-preview]").forEach(container => {
        const model = getModels().find(item => item.id === container.dataset.modelPreview);
        if (!model) return;
        const preview = document.createElement("model-viewer");
        preview.className = "assets-model-preview";
        preview.setAttribute("camera-controls", "");
        preview.setAttribute("interaction-prompt", "none");
        preview.setAttribute("shadow-intensity", "0.8");
        preview.setAttribute("environment-image", "neutral");
        preview.alt = `Aperçu 3D de ${model.name || "ce modèle"}`;
        try {
            const url = createGlbObjectUrl(model);
            previewUrls.add(url);
            preview.src = url;
        } catch {
            preview.textContent = "Aperçu indisponible";
        }
        container.append(preview);
    });
}

function createGlbObjectUrl(model) {
    if (model.encoding !== "base64" || !model.data) throw new Error("Données GLB indisponibles.");
    const binary = atob(model.data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return URL.createObjectURL(new Blob([bytes], { type: model.mimeType || "model/gltf-binary" }));
}

function releasePreviewUrls() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls.clear();
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

export function setupAssetsPanel() {
    const button = document.getElementById("importAssetsButton");
    const input = document.getElementById("assetsFileInput");
    if (!button || !input) return;

    button.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
        const files = [...(input.files ?? [])];
        try {
            await importImages(files);
            await importModels(files);
            commitProjectChange();
        } catch (error) {
            alert(error.message || "Impossible d’importer ces médias.");
        } finally {
            input.value = "";
        }
    });

    on(EVENTS.MODEL3D_PLACEMENT_CHANGED, ({ active, modelId }) => {
        document.querySelectorAll("[data-place-model]").forEach(placeButton => {
            const selected = active && placeButton.dataset.placeModel === modelId;
            placeButton.classList.toggle("models3d-action--active", selected);
            placeButton.textContent = selected ? "Cliquez sur la carte…" : "Placer sur la carte";
            placeButton.setAttribute("aria-pressed", String(selected));
        });
    });
}
