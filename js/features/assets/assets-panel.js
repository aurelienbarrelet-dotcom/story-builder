import { MAX_IMAGE_SIZE } from "../../core/config.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getProject, getSelectedChapter, getStory } from "../../core/store.js";
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

function usageCount(asset) {
    return (getStory()?.chapters ?? []).filter(chapter => chapter.image === asset.data).length;
}

export function renderAssetsPanel() {
    const container = document.getElementById("assetsPanelContent");
    if (!container) return;
    const images = getImages();
    container.innerHTML = images.length ? `
        <div class="assets-grid">
            ${images.map(asset => {
                const isUsedBySelectedChapter = getSelectedChapter()?.image === asset.data;
                return `
                <article class="asset-card ${isUsedBySelectedChapter ? "selected" : ""}" data-asset-id="${asset.id}">
                    <img src="${asset.data}" alt="">
                    <div class="asset-card-body">
                        <input class="asset-name-input" data-asset-name="${asset.id}" value="${escapeHtml(asset.name)}" aria-label="Nom de la ressource">
                        <span>${usageCount(asset)} utilisation(s)</span>
                    </div>
                    <div class="asset-card-actions">
                        <button type="button" class="button ${isUsedBySelectedChapter ? "button-danger" : "button-light"}" data-toggle-asset="${asset.id}">${isUsedBySelectedChapter ? "Retirer" : "Utiliser"}</button>
                    </div>
                </article>`;
            }).join("")}
        </div>` : `
        <div class="assets-empty-state">
            <strong>Aucune ressource</strong>
            <p>Importe des images pour les réutiliser dans plusieurs chapitres.</p>
        </div>`;

    container.querySelectorAll("[data-asset-name]").forEach(input => {
        input.addEventListener("change", () => {
            const asset = getImages().find(item => item.id === input.dataset.assetName);
            if (!asset) return;
            asset.name = input.value.trim() || asset.originalName || "Image";
            commitProjectChange();
        });
    });
    container.querySelectorAll("[data-toggle-asset]").forEach(button => {
        button.addEventListener("click", () => {
            const chapter = getSelectedChapter();
            const asset = getImages().find(item => item.id === button.dataset.toggleAsset);
            if (!chapter || !asset) return alert("Sélectionne d’abord un chapitre.");
            if (chapter.image === asset.data) {
                chapter.image = null;
                chapter.imageName = "";
            } else {
                chapter.image = asset.data;
                chapter.imageName = asset.name;
            }
            commitProjectChange();
        });
    });

}

async function importImages(files) {
    for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_IMAGE_SIZE) throw new Error(`${file.name} dépasse la limite de 2,5 Mo.`);
        const data = await readFileAsDataUrl(file);
        getImages().push({ id: crypto.randomUUID(), name: file.name, originalName: file.name, type: file.type, size: file.size, data, createdAt: new Date().toISOString() });
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
