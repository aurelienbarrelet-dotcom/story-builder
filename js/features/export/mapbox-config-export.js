import { getStory } from "../../core/store.js";
import { downloadTextFile } from "../../core/utils.js";
import { getMapboxToken } from "../map/map-service.js";

const OPACITY_SUFFIX = "-opacity";

function normalizeText(value) {
    return typeof value === "string" ? value : String(value ?? "");
}

function escapeHtml(value) {
    return normalizeText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeAuthorUrl(value) {
    const url = normalizeText(value).trim();
    if (!url) return "";

    // Les adresses complètes sont conservées. Une adresse saisie sans protocole
    // reçoit https:// afin de produire un lien réellement cliquable.
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
    return `https://${url}`;
}

export function buildByline(authors = []) {
    const renderedAuthors = authors.flatMap(author => {
        const name = normalizeText(author?.name).trim();
        const image = normalizeText(author?.image).trim();
        const url = normalizeAuthorUrl(author?.url);

        if (!name && !image) return [];

        const portrait = image
            ? `<img src="${escapeHtml(image)}" alt="${name ? `Portrait de ${escapeHtml(name)}` : "Portrait de l’auteur"}">`
            : "";
        const label = name
            ? (url
                ? `<a class="auteur" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`
                : `<span class="auteur">${escapeHtml(name)}</span>`)
            : "";

        return [`<span class="author">${portrait}${label}</span>`];
    });

    if (!renderedAuthors.length) return "";
    return `<div class="byline-authors">${renderedAuthors.join("")}</div>`;
}

function buildFooter(footer = {}) {
    const signatures = normalizeText(footer.signatures).trim();
    const sources = normalizeText(footer.sources).trim();
    const blocks = [];

    // Les contenus restent compatibles avec le HTML saisi par l’auteur.
    // Les classes correspondent exactement à celles du gabarit maître afin
    // de conserver les tailles et espacements définis dans son CSS.
    if (signatures) {
        blocks.push(`<span class="signature">${signatures}</span>`);
    }

    if (sources) {
        blocks.push(`<span class="sources">${sources}</span>`);
    }

    return blocks.join("\n");
}

function findExplicitOpacity(layerStyle) {
    const paint = layerStyle?.paint;
    if (!paint || typeof paint !== "object") return undefined;

    const opacityEntry = Object.entries(paint).find(([property, value]) =>
        property.endsWith(OPACITY_SUFFIX) && Number.isFinite(Number(value))
    );

    return opacityEntry ? Number(opacityEntry[1]) : undefined;
}

function buildChapterLayerEntries(chapter) {
    const layerIds = new Set([
        ...Object.keys(chapter.layerOpacity ?? {}),
        ...Object.keys(chapter.layerStyles ?? {})
    ]);

    return [...layerIds].flatMap(layerId => {
        const legacyOpacity = chapter.layerOpacity?.[layerId];
        const styleOpacity = findExplicitOpacity(chapter.layerStyles?.[layerId]);
        const opacity = Number.isFinite(Number(legacyOpacity))
            ? Number(legacyOpacity)
            : styleOpacity;

        if (!Number.isFinite(opacity)) return [];

        return [{
            layer: layerId,
            opacity: Math.max(0, Math.min(1, opacity)),
            duration: chapter.layerTransition?.enabled === false
                ? 0
                : Math.max(0, Number(chapter.layerTransition?.duration) || 0)
        }];
    });
}

function cloneLayerStyles(value) {
    if (!value || typeof value !== "object") return {};
    try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
}

function buildLayerStyleState(chapter = {}) {
    return {
        layerOpacity: { ...(chapter.layerOpacity ?? {}) },
        layerStyles: cloneLayerStyles(chapter.layerStyles ?? {}),
        transition: {
            duration: chapter.layerTransition?.enabled === false
                ? 0
                : Math.max(0, Number(chapter.layerTransition?.duration) || 0),
            delay: chapter.layerTransition?.enabled === false
                ? 0
                : Math.max(0, Number(chapter.layerTransition?.delay) || 0)
        }
    };
}

function mergeProjectLayerState(projectConfig, chapter) {
    const merged = {
        ...chapter,
        layerOpacity: { ...(projectConfig?.layerOpacity ?? {}), ...(chapter.layerOpacity ?? {}) },
        layerStyles: structuredClone(projectConfig?.layerStyles ?? {})
    };
    Object.entries(chapter.layerStyles ?? {}).forEach(([layerId, style]) => {
        merged.layerStyles[layerId] ??= { paint: {}, layout: {} };
        merged.layerStyles[layerId].paint = { ...(merged.layerStyles[layerId].paint ?? {}), ...(style.paint ?? {}) };
        merged.layerStyles[layerId].layout = { ...(merged.layerStyles[layerId].layout ?? {}), ...(style.layout ?? {}) };
    });
    return merged;
}

function exportChapter(chapter, index, projectConfig = {}) {
    const transition = chapter.transition ?? {};
    const effectiveChapter = mergeProjectLayerState(projectConfig, chapter);

    return {
        id: normalizeText(chapter.id).trim() || `chapitre-${index + 1}`,
        alignment: "center",
        hidden: false,
        title: normalizeText(chapter.title),
        image: chapter.image || "",
        description: normalizeText(chapter.description),
        location: {
            center: Array.isArray(chapter.location?.center)
                ? chapter.location.center.map(Number)
                : [0, 0],
            zoom: Number(chapter.location?.zoom) || 0,
            pitch: Number(chapter.location?.pitch) || 0,
            bearing: Number(chapter.location?.bearing) || 0,
            duration: Math.max(0, Number(transition.duration) || 0),
            essential: transition.essential !== false
        },
        ...(chapter.mobileLocation ? {
            locationMobile: {
                center: Array.isArray(chapter.mobileLocation.center) ? chapter.mobileLocation.center.map(Number) : [0, 0],
                zoom: Number(chapter.mobileLocation.zoom) || 0,
                pitch: Number(chapter.mobileLocation.pitch) || 0,
                bearing: Number(chapter.mobileLocation.bearing) || 0,
                duration: Math.max(0, Number(transition.duration) || 0),
                essential: transition.essential !== false
            }
        } : {}),
        mapAnimation: ["flyTo", "easeTo", "jumpTo"].includes(transition.method)
            ? transition.method
            : "flyTo",
        rotateAnimation: false,
        callback: "",
        onChapterEnter: buildChapterLayerEntries(effectiveChapter),
        onChapterExit: [],
        layerState: buildLayerStyleState(effectiveChapter),
        legend: Array.isArray(chapter.legend) ? chapter.legend : [],
        mapboxStoryBuilder: {
            imageCaption: normalizeText(chapter.imageCaption),
            transition: {
                control: ["automatic", "scroll", "smooth-scroll"].includes(transition.control)
                    ? transition.control
                    : "automatic",
                duration: Math.max(0, Number(transition.duration) || 0),
                smoothing: Math.min(0.5, Math.max(0.04, Number(transition.smoothing) || 0.18)),
                essential: transition.essential !== false,
                easing: transition.easing || "ease-in-out"
            },
            layerMode: chapter.layerMode === "inherit" ? "inherit" : "snapshot",
            layerTransition: {
                enabled: chapter.layerTransition?.enabled !== false,
                duration: chapter.layerTransition?.enabled === false
                    ? 0
                    : Math.max(0, Number(chapter.layerTransition?.duration) || 0),
                delay: chapter.layerTransition?.enabled === false
                    ? 0
                    : Math.max(0, Number(chapter.layerTransition?.delay) || 0)
            },
            layerTransitions: cloneLayerStyles(chapter.layerTransitions ?? {}),
            layerStyles: chapter.layerStyles ?? {},
            legend: chapter.legend ?? {}
        }
    };
}

export function createMapboxScrollytellingConfig(story = getStory()) {
    if (!story || !Array.isArray(story.chapters)) {
        throw new Error("Le projet ne contient aucun chapitre exportable.");
    }

    const meta = story.meta ?? {};

    return {
        style: normalizeText(story.mapStyle) || "mapbox://styles/mapbox/standard",
        accessToken: getMapboxToken(),
        showMarkers: false,
        markerColor: "#3FB1CE",
        inset: false,
        theme: "light",
        use3dTerrain: false,
        auto: false,
        initialLocation: story.projectConfig?.location ?? story.chapters[0]?.location ?? { center: [0, 0], zoom: 0, pitch: 0, bearing: 0 },
        ...(story.projectConfig?.mobileLocation ? { initialLocationMobile: story.projectConfig.mobileLocation } : {}),
        projectLayerState: buildChapterLayerEntries(story.projectConfig ?? {}),
        projectLayerStyles: buildLayerStyleState(story.projectConfig ?? {}),
        title: normalizeText(meta.title ?? story.title),
        subtitle: normalizeText(meta.dek),
        byline: buildByline(meta.authors),
        footer: buildFooter(meta.footer),
        chapters: story.chapters.map((chapter, index) => exportChapter(chapter, index, story.projectConfig))
    };
}

export function serializeMapboxConfig(config) {
    return `const config = ${JSON.stringify(config, null, 4)};\n`;
}

export function downloadMapboxConfig() {
    const story = getStory();
    const config = createMapboxScrollytellingConfig(story);
    downloadTextFile(
        "config.js",
        serializeMapboxConfig(config),
        "text/javascript;charset=utf-8"
    );
}
