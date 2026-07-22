const MAX_PREVIEW_SIZE_BYTES = 100 * 1024 * 1024;

let selectedModelFile = null;

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
            await file.arrayBuffer();
            selectedModelFile = file;
            renderSelection();
        } catch (error) {
            selectedModelFile = null;
            renderSelection(error instanceof Error ? error.message : "Impossible de lire ce fichier.");
        }
    });
}

function validateGlbFile(file) {
    const isGlb = file.name.toLowerCase().endsWith(".glb");
    if (!isGlb) {
        throw new Error("Sélectionnez un fichier au format GLB.");
    }
    if (file.size === 0) {
        throw new Error("Le fichier sélectionné est vide.");
    }
    if (file.size > MAX_PREVIEW_SIZE_BYTES) {
        throw new Error("Le fichier dépasse la limite temporaire de 100 Mo.");
    }
}

function renderSelection(errorMessage = "") {
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

    if (!selectedModelFile) {
        const empty = document.createElement("p");
        empty.className = "panel-empty-state";
        empty.textContent = "Aucun modèle sélectionné.";
        container.append(empty);
        return;
    }

    const details = document.createElement("dl");
    details.className = "models3d-file-details";
    appendDetail(details, "Nom", selectedModelFile.name);
    appendDetail(details, "Taille", formatFileSize(selectedModelFile.size));
    appendDetail(details, "Type", selectedModelFile.type || "model/gltf-binary");
    appendDetail(details, "État", "Fichier chargé en mémoire");
    container.append(details);
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
