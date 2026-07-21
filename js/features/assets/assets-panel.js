import { MAX_IMAGE_SIZE } from "../../core/config.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getProject, getSelectedChapter } from "../../core/store.js";
import { readFileAsDataUrl } from "../../core/utils.js";

let selectedAssetId = null;
let selectedAssetIds = new Set();
let selectionAnchorId = null;

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

function toggleAssetForChapter(asset) {
    const isActive = getSelectedChapter()?.image === asset.data;
    if (isActive) removeAssetFromChapter(asset);
    else useAsset(asset);
}

function deleteSelectedAssets() {
    const images = getImages();
    const ids = new Set(selectedAssetIds);
    if (!ids.size) return;

    const label = ids.size > 1 ? `${ids.size} images` : "cette image";
    if (!confirm(`Supprimer ${label} du projet ?`)) return;

    const chapter = getSelectedChapter();
    if (chapter && images.some(asset => ids.has(asset.id) && chapter.image === asset.data)) {
        chapter.image = null;
        chapter.imageName = "";
        chapter.imageCaption = "";
    }

    const remaining = images.filter(asset => !ids.has(asset.id));
    images.splice(0, images.length, ...remaining);
    selectedAssetIds.clear();
    selectedAssetId = null;
    selectionAnchorId = null;
    commitProjectChange();
}

function renderSelectedAssetEditor(asset) {
    if (!asset) return "";
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
                <span>Nom</span>
                <input data-asset-name="${asset.id}" value="${escapeHtml(asset.name)}" aria-label="Nom de l’image">
            </label>
            <label class="asset-editor-field">
                <span>Légende</span>
                <textarea data-asset-caption="${asset.id}" rows="3" placeholder="Ajouter une légende…" aria-label="Légende de l’image">${escapeHtml(asset.caption ?? "")}</textarea>
            </label>
            <div class="asset-editor-actions">
                <button type="button" class="button button-primary" data-toggle-asset="${asset.id}">
                    ${isActive ? "Retirer du chapitre" : "Utiliser dans le chapitre"}
                </button>
            </div>
        </section>`;
}

export function renderAssetsPanel() {
    const container = document.getElementById("assetsPanelContent");
    if (!container) return;

    const images = getImages();
    const existingIds = new Set(images.map(asset => asset.id));
    selectedAssetIds = new Set([...selectedAssetIds].filter(id => existingIds.has(id)));
    if (selectedAssetId && !existingIds.has(selectedAssetId)) selectedAssetId = null;

    const selectedAsset = images.find(asset => asset.id === selectedAssetId) ?? null;
    const selectedCount = selectedAssetIds.size;

    const galleryMarkup = images.length ? `
        <div class="assets-grid" role="list" aria-label="Images du projet">
            ${images.map(asset => {
                const isActive = getSelectedChapter()?.image === asset.data;
                const isSelected = selectedAssetIds.has(asset.id);
                return `
                <button type="button"
                    class="asset-card ${isSelected ? "selected" : ""} ${isActive ? "active" : ""}"
                    data-select-asset="${asset.id}"
                    aria-pressed="${isSelected}"
                    title="Cliquer pour sélectionner. Double-cliquer pour ${isActive ? "retirer du" : "utiliser dans le"} chapitre.">
                    <span class="asset-preview">
                        <img src="${asset.data}" alt="">
                        <span class="asset-use-dot" aria-hidden="true"></span>
                    </span>
                    <span class="asset-name-static">${escapeHtml(asset.name)}</span>
                </button>`;
            }).join("")}
        </div>` : `
        <p class="assets-empty-state">Aucune image.<br>Clique sur le bouton « + » dans l’en-tête.</p>`;

    const inspectorMarkup = selectedAsset ? renderSelectedAssetEditor(selectedAsset) : `
        <section class="asset-inspector-empty" aria-live="polite">
            <p class="asset-editor-eyebrow">Inspecteur</p>
            <h3>Aucune image sélectionnée</h3>
            <p>Sélectionne une miniature pour modifier son nom, sa légende ou son utilisation dans le chapitre.</p>
        </section>`;

    container.innerHTML = `
        <div class="assets-workspace">
            <div class="assets-gallery-column">
                <div class="assets-gallery" aria-label="Galerie d’images">
                    ${galleryMarkup}
                </div>
                <div class="assets-selection-bar ${selectedCount ? "visible" : ""}" aria-live="polite">
                    <span>${selectedCount} image${selectedCount > 1 ? "s" : ""} sélectionnée${selectedCount > 1 ? "s" : ""}</span>
                    <button type="button" class="assets-delete-selected" data-delete-selected>Supprimer</button>
                </div>
            </div>
            <aside class="asset-inspector" aria-label="Propriétés de l’image sélectionnée">
                ${inspectorMarkup}
            </aside>
        </div>`;

    container.querySelectorAll("[data-select-asset]").forEach(card => {
        card.addEventListener("click", event => {
            const assetId = card.dataset.selectAsset;
            const images = getImages();

            if (event.shiftKey && selectionAnchorId) {
                const anchorIndex = images.findIndex(asset => asset.id === selectionAnchorId);
                const currentIndex = images.findIndex(asset => asset.id === assetId);
                if (anchorIndex >= 0 && currentIndex >= 0) {
                    const [start, end] = [anchorIndex, currentIndex].sort((a, b) => a - b);
                    selectedAssetIds = new Set(images.slice(start, end + 1).map(asset => asset.id));
                }
            } else if (event.ctrlKey || event.metaKey) {
                if (selectedAssetIds.has(assetId)) selectedAssetIds.delete(assetId);
                else selectedAssetIds.add(assetId);
                selectionAnchorId = assetId;
            } else {
                selectedAssetIds = new Set([assetId]);
                selectionAnchorId = assetId;
            }

            selectedAssetId = selectedAssetIds.has(assetId)
                ? assetId
                : [...selectedAssetIds].at(-1) ?? null;
            renderAssetsPanel();
        });

        card.addEventListener("dblclick", event => {
            event.preventDefault();
            const asset = getImages().find(item => item.id === card.dataset.selectAsset);
            if (!asset) return;
            selectedAssetId = asset.id;
            selectedAssetIds = new Set([asset.id]);
            selectionAnchorId = asset.id;
            toggleAssetForChapter(asset);
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

    container.querySelector("[data-delete-selected]")?.addEventListener("click", deleteSelectedAssets);
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
        selectedAssetIds = new Set([asset.id]);
        selectionAnchorId = asset.id;
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
