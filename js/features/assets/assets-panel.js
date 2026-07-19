import { MAX_IMAGE_SIZE } from "../../core/config.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getProject, getSelectedChapter } from "../../core/store.js";
import { readFileAsDataUrl } from "../../core/utils.js";

function getImages() {
    const project = getProject();
    project.assets ??= { images: [], icons: [], fonts: [] };
    project.assets.images ??= [];
    return project.assets.images;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function toggleAsset(asset) {
    const chapter = getSelectedChapter();
    if (!chapter) return alert("Sélectionne d’abord un chapitre.");

    if (chapter.image === asset.data) {
        chapter.image = null;
        chapter.imageName = "";
        chapter.imageCaption = "";
    } else {
        chapter.image = asset.data;
        chapter.imageName = asset.name;
        chapter.imageCaption = asset.caption ?? "";
    }
    commitProjectChange();
}

export function renderAssetsPanel() {
    const container = document.getElementById("assetsPanelContent");
    if (!container) return;
    const images = getImages();
    container.innerHTML = images.length ? `
        <div class="assets-grid">
            ${images.map(asset => {
                const isSelected = getSelectedChapter()?.image === asset.data;
                return `
                <article class="asset-card ${isSelected ? "selected" : ""}" data-asset-id="${asset.id}">
                    <button type="button" class="asset-preview" data-toggle-asset="${asset.id}" aria-pressed="${isSelected}" aria-label="${isSelected ? "Retirer" : "Utiliser"} cette image">
                        <img src="${asset.data}" alt="">
                        <span class="asset-selection-check" aria-hidden="true">✓</span>
                    </button>
                    <div class="asset-card-body">
                        <input class="asset-name-input" data-asset-name="${asset.id}" value="${escapeHtml(asset.name)}" aria-label="Nom de l’image">
                        <input class="asset-caption-input" data-asset-caption="${asset.id}" value="${escapeHtml(asset.caption ?? "")}" placeholder="Ajouter une légende…" aria-label="Légende de l’image">
                    </div>
                </article>`;
            }).join("")}
        </div>` : `
        <p class="assets-empty-state">Aucune image.<br>Clique sur « Importer des images » ci-dessous.</p>`;

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
            if (asset) toggleAsset(asset);
        });
    });
}

async function importImages(files) {
    for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_IMAGE_SIZE) throw new Error(`${file.name} dépasse la limite de 2,5 Mo.`);
        const data = await readFileAsDataUrl(file);
        getImages().push({
            id: crypto.randomUUID(),
            name: file.name,
            caption: "",
            originalName: file.name,
            type: file.type,
            size: file.size,
            data,
            createdAt: new Date().toISOString()
        });
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
