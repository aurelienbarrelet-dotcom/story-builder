import { getStory } from "../../core/store.js";
import { createSlug } from "../../core/utils.js";
import {
    buildByline,
    createMapboxScrollytellingConfig,
    serializeMapboxConfig
} from "./mapbox-config-export.js";

const MASTER_INDEX_URL = new URL(
    "../../../templates/scrollytelling/index.html",
    import.meta.url
);

const MASTER_STYLE_URL = new URL(
    "../../../templates/scrollytelling/style.css",
    import.meta.url
);

const MIME_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/avif": "avif"
};

function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

async function loadMasterFile(url, filename) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Impossible de charger le fichier maître ${filename} (${response.status}).`
        );
    }

    return response.text();
}

function parseDataImage(dataUrl) {
    if (typeof dataUrl !== "string") return null;

    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
    if (!match) return null;

    return {
        mimeType: match[1].toLowerCase(),
        base64: match[2]
    };
}

function base64ToUint8Array(base64) {
    const binary = atob(base64.replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

function createUniqueFilename(baseName, extension, usedNames) {
    const safeBase = createSlug(baseName) || "image";
    let filename = `${safeBase}.${extension}`;
    let suffix = 2;

    while (usedNames.has(filename)) {
        filename = `${safeBase}-${suffix}.${extension}`;
        suffix += 1;
    }

    usedNames.add(filename);
    return filename;
}


function extractAuthorImages(story, config, zip, usedNames) {
    const authors = Array.isArray(story?.meta?.authors)
        ? story.meta.authors.map(author => ({ ...author }))
        : [];

    authors.forEach((author, index) => {
        const parsedImage = parseDataImage(author.image);
        if (!parsedImage) return;

        const extension = MIME_EXTENSIONS[parsedImage.mimeType] || "bin";
        const originalName = String(author.imageName || "").replace(/\.[^.]+$/, "");
        const filename = createUniqueFilename(
            originalName || author.name || `auteur-${index + 1}`,
            extension,
            usedNames
        );

        zip.file(`assets/${filename}`, base64ToUint8Array(parsedImage.base64));
        author.image = `assets/${filename}`;
    });

    config.byline = buildByline(authors);
}

function extractChapterImages(config, zip, usedNames) {

    config.chapters.forEach((chapter, index) => {
        const parsedImage = parseDataImage(chapter.image);
        if (!parsedImage) return;

        const extension = MIME_EXTENSIONS[parsedImage.mimeType] || "bin";
        const filename = createUniqueFilename(
            chapter.id || chapter.title || `chapitre-${index + 1}`,
            extension,
            usedNames
        );

        zip.file(`assets/${filename}`, base64ToUint8Array(parsedImage.base64));
        chapter.image = `assets/${filename}`;
    });
}

export async function downloadScrollytellingArchive() {
    if (!window.JSZip) {
        throw new Error(
            "La bibliothèque ZIP n’a pas pu être chargée. Vérifiez votre connexion internet."
        );
    }

    const story = getStory();
    const config = createMapboxScrollytellingConfig(story);

    if (!config.accessToken) {
        throw new Error("Ajoutez d’abord votre token Mapbox dans les paramètres.");
    }

    if (config.chapters.length === 0) {
        throw new Error("Ajoutez au moins un chapitre avant l’export.");
    }

    const [masterIndex, masterStyle] = await Promise.all([
        loadMasterFile(MASTER_INDEX_URL, "index.html"),
        loadMasterFile(MASTER_STYLE_URL, "style.css")
    ]);
    const zip = new window.JSZip();

    const usedAssetNames = new Set();
    extractAuthorImages(story, config, zip, usedAssetNames);
    extractChapterImages(config, zip, usedAssetNames);

    // Les deux fichiers maîtres sont copiés tels quels. Seul config.js est généré.
    zip.file("index.html", masterIndex);
    zip.file("style.css", masterStyle);
    zip.file("config.js", serializeMapboxConfig(config));

    const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
    });

    const baseName = createSlug(story.projectName) || "mon-scrollytelling";
    downloadBlob(`${baseName}.zip`, blob);
}
