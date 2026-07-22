import { emit, EVENTS, on } from "../../core/events.js";
import {
    getSelectedChapterIndex,
    getSelectedSection,
    getProject,
    getStory,
    selectChapter,
    selectGeneralInformation
} from "../../core/store.js";
import { getEditingViewMode, setEditingViewMode } from "../map/view-panel.js";
import {
    createMapboxScrollytellingConfig,
    serializeMapboxConfig
} from "../export/mapbox-config-export.js";

const MASTER_INDEX_URL = new URL(
    "../../../templates/scrollytelling/index.html",
    import.meta.url
);

const MASTER_STYLE_URL = new URL(
    "../../../templates/scrollytelling/style.css",
    import.meta.url
);

let active = false;
let previewMode = "desktop";
let renderTimer = null;
let masterIndexPromise = null;
let renderRevision = 0;

export function setupReaderMode() {
    document.getElementById("toggleReaderModeButton")?.addEventListener("click", toggleReaderMode);
    document.getElementById("readerDeviceToggle")?.addEventListener("click", togglePreviewMode);

    on(EVENTS.RENDER_REQUESTED, () => {
        if (active) scheduleReaderRender();
    });
}

export function toggleReaderMode() {
    setReaderMode(!active);
}

export function setReaderMode(value) {
    const nextState = Boolean(value);
    if (nextState === active) return;

    active = nextState;
    document.body.classList.toggle("reader-mode", active);

    const overlay = document.getElementById("readerOverlay");
    const toggleButton = document.getElementById("toggleReaderModeButton");

    overlay?.toggleAttribute("hidden", !active);
    if (toggleButton) {
        toggleButton.dataset.mode = active ? "reader" : "edit";
        toggleButton.setAttribute("aria-checked", String(active));
        toggleButton.setAttribute("aria-label", active ? "Revenir au mode édition" : "Passer au mode lecture");
    }

    if (active) {
        previewMode = getEditingViewMode();
        setPreviewMode(previewMode);
        scheduleReaderRender(0);
    } else {
        clearTimeout(renderTimer);
        const frame = document.getElementById("readerFrame");
        syncEditorToReaderPosition(frame);
        setEditingViewMode(previewMode);
        if (frame) frame.removeAttribute("srcdoc");
    }

    emit(EVENTS.READER_MODE_CHANGED, { active });
}

function togglePreviewMode() {
    setPreviewMode(previewMode === "desktop" ? "mobile" : "desktop");
}

function setPreviewMode(mode) {
    previewMode = mode === "mobile" ? "mobile" : "desktop";

    const viewport = document.getElementById("readerViewport");
    const toggle = document.getElementById("readerDeviceToggle");
    if (!viewport) return;

    viewport.classList.toggle("desktop", previewMode === "desktop");
    viewport.classList.toggle("mobile", previewMode === "mobile");
    viewport.setAttribute("aria-label", `Fenêtre de prévisualisation ${previewMode}`);

    const frame = document.getElementById("readerFrame");
    if (frame) {
        frame.style.width = previewMode === "mobile" ? "390px" : "100%";
        frame.style.maxWidth = "100%";

        requestAnimationFrame(() => {
            try {
                frame.contentWindow?.dispatchEvent(new Event("resize"));
            } catch (error) {
                console.debug("Redimensionnement de l’aperçu différé.", error);
            }
        });
    }

    if (toggle) {
        toggle.dataset.mode = previewMode;
        toggle.setAttribute("aria-checked", String(previewMode === "mobile"));
    }
}

function scheduleReaderRender(delay = 120) {
    clearTimeout(renderTimer);
    const revision = ++renderRevision;
    renderTimer = setTimeout(() => {
        renderReaderPreview(revision).catch(error => {
            console.error("Impossible de générer l’aperçu lecture :", error);
            showPreviewError(error.message || "Aperçu indisponible.");
        });
    }, delay);
}

async function loadMasterIndex() {
    if (!masterIndexPromise) {
        masterIndexPromise = fetch(MASTER_INDEX_URL).then(response => {
            if (!response.ok) {
                throw new Error(`Impossible de charger le gabarit (${response.status}).`);
            }
            return response.text();
        });
    }

    return masterIndexPromise;
}

async function renderReaderPreview(revision = ++renderRevision) {
    const frame = document.getElementById("readerFrame");
    if (!frame || !active) return;

    const story = getStory();
    const project = getProject();
    const config = createMapboxScrollytellingConfig(story);
    const masterIndex = await loadMasterIndex();
    const configScript = `<script>${escapeClosingScript(serializeMapboxConfig(config))}<\/script>`;
    const styleLink = `<link rel="stylesheet" href="${escapeAttribute(MASTER_STYLE_URL.href)}">`;
    const previewScrollbarStyle = `<style id="story-builder-preview-style">
        html, body, #story, #features {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }
        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        #story::-webkit-scrollbar,
        #features::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
    </style>`;
    const models3dScript = createReaderModels3dScript(project);
    const modelViewerScript = `<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js"><\/script>`;

    let documentHtml = masterIndex
        .replace(/<link\s+rel=["']stylesheet["']\s+href=["']style\.css["']\s*\/?>/i, styleLink)
        .replace(/<script\s+src=["']\.\/config\.js["']\s*><\/script>/i, configScript)
        .replace("</head>", `${previewScrollbarStyle}\n${modelViewerScript}\n</head>`)
        .replace("</body>", `${models3dScript}\n</body>`);

    if (!documentHtml.includes(configScript)) {
        documentHtml = documentHtml.replace("</head>", `${configScript}\n</head>`);
    }

    if (revision !== renderRevision || !active) return;

    const selectedSection = getSelectedSection();
    const selectedChapterIndex = getSelectedChapterIndex();
    frame.addEventListener("load", () => {
        try {
            frame.contentWindow?.dispatchEvent(new Event("resize"));
            syncReaderToEditorSelection(frame, selectedSection, selectedChapterIndex);
        } catch (error) {
            console.debug("Impossible de synchroniser l’aperçu lecture.", error);
        }
    }, { once: true });

    if (revision === renderRevision && active) frame.srcdoc = documentHtml;
}

function syncReaderToEditorSelection(frame, section, chapterIndex) {
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!win || !doc) return;

    requestAnimationFrame(() => {
        if (section === "meta") {
            win.scrollTo({ top: 0, behavior: "auto" });
            return;
        }

        const story = getStory();
        const chapter = story?.chapters?.[chapterIndex];
        const step = chapter ? doc.getElementById(chapter.id) : null;
        if (!step) return;
        const top = Math.max(0, step.offsetTop - win.innerHeight * 0.5 + step.offsetHeight * 0.5);
        win.scrollTo({ top, behavior: "auto" });
        setTimeout(() => win.dispatchEvent(new Event("resize")), 0);
    });
}

function syncEditorToReaderPosition(frame) {
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return;

    const activeStep = doc.querySelector(".step.active");
    if (!activeStep) {
        selectGeneralInformation();
        return;
    }

    const story = getStory();
    const index = story?.chapters?.findIndex(chapter => chapter.id === activeStep.id) ?? -1;
    if (index >= 0) selectChapter(index);
}

function showPreviewError(message) {
    const frame = document.getElementById("readerFrame");
    if (!frame) return;

    frame.srcdoc = `<!doctype html><html><body style="font-family:sans-serif;padding:2rem"><p>${escapeHtml(message)}</p></body></html>`;
}

function escapeClosingScript(value) {
    return String(value).replace(/<\/script/gi, "<\\/script");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('"', "&quot;");
}


function createReaderModels3dScript(project) {
    const models = Array.isArray(project?.assets?.models) ? project.assets.models : [];
    const instances = Array.isArray(project?.models3dInstances) ? project.models3dInstances : [];
    const payload = JSON.stringify({ models, instances });

    return `<script type="module" id="story-builder-models3d-reader">
        import * as THREE from "https://esm.sh/three@0.180.0";
        import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

        const payload = ${escapeClosingScript(payload)};
        const objectUrls = [];
        const renderEntries = [];
        let renderer = null;

        function createObjectUrl(model) {
            if (!model || model.encoding !== "base64" || !model.data) return "";
            const binary = atob(model.data);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
            }
            const url = URL.createObjectURL(new Blob([bytes], {
                type: model.mimeType || "model/gltf-binary"
            }));
            objectUrls.push(url);
            return url;
        }

        function degreesToRadians(value) {
            return Number(value || 0) * Math.PI / 180;
        }

        function createScene(root) {
            const scene = new THREE.Scene();
            scene.add(root);
            scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7280, 1.35));

            const sun = new THREE.DirectionalLight(0xffffff, 1.55);
            sun.position.set(30, -20, 50);
            scene.add(sun);
            return scene;
        }

        function fitModelToGround(root) {
            const bounds = new THREE.Box3().setFromObject(root);
            if (bounds.isEmpty()) return;

            const center = bounds.getCenter(new THREE.Vector3());
            root.position.x -= center.x;
            root.position.y -= bounds.min.y;
            root.position.z -= center.z;
        }

        async function loadEntries() {
            const modelsById = new Map((payload.models || []).map(model => [model.id, model]));
            const loader = new GLTFLoader();

            for (const instance of payload.instances || []) {
                const model = modelsById.get(instance && instance.modelId);
                const longitude = Number(instance && instance.longitude);
                const latitude = Number(instance && instance.latitude);
                const altitude = Number(instance && instance.altitude) || 0;
                if (!model || !Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;

                try {
                    const gltf = await loader.loadAsync(createObjectUrl(model));
                    const root = gltf.scene || gltf.scenes?.[0];
                    if (!root) continue;

                    fitModelToGround(root);
                    const rotation = Array.isArray(instance.rotation) ? instance.rotation : [0, 0, 0];
                    const mercator = mapboxgl.MercatorCoordinate.fromLngLat([longitude, latitude], altitude);
                    const meterScale = mercator.meterInMercatorCoordinateUnits();
                    const userScale = Number(instance.scale) || 1;

                    renderEntries.push({
                        scene: createScene(root),
                        transform: {
                            translateX: mercator.x,
                            translateY: mercator.y,
                            translateZ: mercator.z,
                            rotateX: Math.PI / 2 + degreesToRadians(rotation[0]),
                            rotateY: degreesToRadians(rotation[1]),
                            rotateZ: degreesToRadians(rotation[2]),
                            scale: meterScale * userScale
                        }
                    });
                } catch (error) {
                    console.warn("Impossible de charger un modèle 3D dans le lecteur.", error);
                }
            }
        }

        const customLayer = {
            id: "story-builder-models3d",
            type: "custom",
            renderingMode: "3d",
            onAdd(currentMap, gl) {
                renderer = new THREE.WebGLRenderer({
                    canvas: currentMap.getCanvas(),
                    context: gl,
                    antialias: true
                });
                renderer.autoClear = false;
                loadEntries().then(() => currentMap.triggerRepaint());
            },
            render(gl, matrix) {
                if (!renderer || renderEntries.length === 0) return;

                const mapMatrix = new THREE.Matrix4().fromArray(matrix);
                const camera = new THREE.Camera();

                for (const entry of renderEntries) {
                    const transform = entry.transform;
                    const localMatrix = new THREE.Matrix4()
                        .makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
                        .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
                        .multiply(new THREE.Matrix4().makeRotationX(transform.rotateX))
                        .multiply(new THREE.Matrix4().makeRotationY(transform.rotateY))
                        .multiply(new THREE.Matrix4().makeRotationZ(transform.rotateZ));

                    camera.projectionMatrix = mapMatrix.clone().multiply(localMatrix);
                    renderer.resetState();
                    renderer.render(entry.scene, camera);
                }

                map.triggerRepaint();
            },
            onRemove() {
                renderer?.dispose();
                renderer = null;
                renderEntries.length = 0;
            }
        };

        function installLayer() {
            if (!window.map || !window.mapboxgl) {
                setTimeout(installLayer, 50);
                return;
            }

            const addLayer = () => {
                if (!map.getLayer(customLayer.id)) map.addLayer(customLayer);
            };

            if (map.loaded()) addLayer();
            else map.once("load", addLayer);

            map.on("style.load", addLayer);
        }

        window.addEventListener("beforeunload", () => {
            if (window.map?.getLayer(customLayer.id)) window.map.removeLayer(customLayer.id);
            objectUrls.forEach(url => URL.revokeObjectURL(url));
        }, { once: true });

        installLayer();
    <\/script>`;
}
