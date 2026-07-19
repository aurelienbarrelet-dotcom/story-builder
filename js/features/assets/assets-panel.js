import { MAX_IMAGE_SIZE } from "../../core/config.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getProject, getSelectedChapter } from "../../core/store.js";
import { readFileAsDataUrl } from "../../core/utils.js";

let selectedAssetId = null;

function getImages() {
    const project = getProject();
    project.assets ??= { images: [], icons: [], fonts: [] };
    project.assets.images ??= [];
    return project.assets.images;
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

function deleteAsset(asset) {
    const images = getImages();
    const index = images.findIndex(item => item.id === asset.id);
    if (index < 0) return;

    const chapter = getSelectedChapter();
    if (chapter?.image === asset.data) {
        chapter.image = null;
        chapter.imageName = "";
        chapter.imageCaption = "";
    }

    images.splice(index, 1);
    selectedAssetId = null;
    commitProjectChange();
}

export function renderAssetsPanel() {
    const container = document.getElementById("assetsPanelContent");
    if (!container) return;
    const images = getImages();

    if (selectedAssetId && !images.some(asset => asset.id === selectedAssetId)) selectedAssetId = null;

    container.innerHTML = images.length ? `
        <div class="assets-grid">
            ${images.map(asset => {
                const isActive = getSelectedChapter()?.image === asset.data;
                const isSelected = selectedAssetId === asset.id;
                return `
                <article class="asset-card ${isSelected ? "selected" : ""} ${isActive ? "active" : ""}" data-select-asset="${asset.id}">
                    <button type="button" class="asset-preview" data-toggle-asset="${asset.id}" aria-pressed="${isActive}" aria-label="${isActive ? "Retirer" : "Ajouter"} cette image au chapitre">
                        <img src="${asset.data}" alt="">
                        <span class="asset-selection-check" aria-hidden="true">✓</span>
                    </button>
                    <div class="asset-card-body">
                        ${isSelected ? `
                            <input class="asset-name-input" data-asset-name="${asset.id}" value="${escapeHtml(asset.name)}" aria-label="Nom de l’image">
                            <input class="asset-caption-input" data-asset-caption="${asset.id}" value="${escapeHtml(asset.caption ?? "")}" placeholder="Ajouter une légende…" aria-label="Légende de l’image">
                            <div class="asset-card-actions">
                                <button type="button" class="button button-secondary" data-use-asset="${asset.id}">Ajouter l’image</button>
                                <button type="button" class="button button-danger" data-delete-asset="${asset.id}">Supprimer</button>
                            </div>
                        ` : `
                            <p class="asset-name-static">${escapeHtml(asset.name)}</p>
                            <p class="asset-caption-static">${escapeHtml(asset.caption || "Aucune légende")}</p>
                        `}
                    </div>
                </article>`;
            }).join("")}
        </div>` : `
        <p class="assets-empty-state">Aucune image.<br>Clique sur « Importer des images » ci-dessous.</p>`;

    container.querySelectorAll("[data-select-asset]").forEach(card => {
        card.addEventListener("click", event => {
            if (event.target.closest("button, input")) return;
            selectedAssetId = card.dataset.selectAsset;
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
        button.addEventListener("click", event => {
            event.stopPropagation();
            const asset = getImages().find(item => item.id === button.dataset.toggleAsset);
            if (!asset) return;
            selectedAssetId = asset.id;
            const isActive = getSelectedChapter()?.image === asset.data;
            if (isActive) removeAssetFromChapter(asset);
            else useAsset(asset);
        });
    });

    container.querySelectorAll("[data-use-asset]").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const asset = getImages().find(item => item.id === button.dataset.useAsset);
            if (asset) useAsset(asset);
        });
    });

    container.querySelectorAll("[data-delete-asset]").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const asset = getImages().find(item => item.id === button.dataset.deleteAsset);
            if (asset) deleteAsset(asset);
        });
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
        selectedAssetId = asset.id;
    }
    commitProjectChange();
}

export function setupAssetsPanel() {
    const button = document.getElementById("importAssetsButton");
    const input = document.getElementById("assetsFileInput");
    if (!button || !input) return;
    button.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
        try { await importImages([...input.files]); }
        catch (error) { alert(error.message || "Impossible d’importer ces images."); }
        finally { input.value = ""; }
    });
}
