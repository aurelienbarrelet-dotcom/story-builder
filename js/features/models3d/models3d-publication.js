const THREE_VERSION = "0.180.0";
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
const NORMALIZED_MODEL_SIZE_METERS = 50;

export function collectUsedModels3d(project) {
    const instances = Array.isArray(project?.models3dInstances)
        ? project.models3dInstances.filter(instance => instance?.modelId)
        : [];
    if (!instances.length) return { models: [], instances: [] };

    const usedIds = new Set(instances.map(instance => instance.modelId));
    const models = Array.isArray(project?.assets?.models)
        ? project.assets.models.filter(model => usedIds.has(model?.id))
        : [];
    const availableIds = new Set(models.map(model => model.id));

    return {
        models,
        instances: instances.filter(instance => availableIds.has(instance.modelId))
    };
}

export function createModels3dRuntimeScript(payload) {
    const serializedPayload = JSON.stringify(payload).replace(/<\/script/gi, "<\\/script");

    return `<script type="module" id="story-builder-models3d-runtime">
        import * as THREE from "https://esm.sh/three@${THREE_VERSION}";
        import { GLTFLoader } from "https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/GLTFLoader.js";
        import { DRACOLoader } from "https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/DRACOLoader.js";

        const payload = ${serializedPayload};
        const DRACO_DECODER_PATH = ${JSON.stringify(DRACO_DECODER_PATH)};
        const NORMALIZED_MODEL_SIZE_METERS = ${NORMALIZED_MODEL_SIZE_METERS};
        const LAYER_ID = "story-builder-models3d-publication";
        const objectUrls = [];
        const renderEntries = [];
        let renderer = null;
        let warningElement = null;

        function getProjectionName() {
            return window.map?.getProjection?.()?.name || "mercator";
        }

        function isProjectionCompatible() {
            return getProjectionName() === "mercator";
        }

        function showProjectionWarning() {
            if (warningElement) return;
            warningElement = document.createElement("div");
            warningElement.setAttribute("role", "status");
            warningElement.textContent = "Les objets 3D sont masqués : la projection Mapbox « " + getProjectionName() + " » n’est pas compatible avec ce moteur 3D. La projection du style est conservée.";
            Object.assign(warningElement.style, {
                position: "fixed", left: "50%", top: "12px", transform: "translateX(-50%)",
                zIndex: "9999", maxWidth: "min(680px, calc(100vw - 32px))", padding: "10px 14px",
                borderRadius: "6px", background: "rgba(127, 29, 29, 0.95)", color: "white",
                font: "600 13px/1.4 system-ui, sans-serif", boxShadow: "0 4px 18px rgba(0,0,0,.25)"
            });
            document.body.appendChild(warningElement);
            console.warn(warningElement.textContent);
        }

        function clearProjectionWarning() {
            warningElement?.remove();
            warningElement = null;
        }

        function createObjectUrl(model) {
            if (model?.url) return model.url;
            if (model?.encoding !== "base64" || !model?.data) return "";
            const binary = atob(model.data);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
            const url = URL.createObjectURL(new Blob([bytes], { type: model.mimeType || "model/gltf-binary" }));
            objectUrls.push(url);
            return url;
        }

        function degreesToRadians(value) {
            return Number(value || 0) * Math.PI / 180;
        }

        function normalizeModel(root) {
            root.updateMatrixWorld(true);
            const bounds = new THREE.Box3().setFromObject(root);
            if (bounds.isEmpty()) throw new Error("Le modèle ne contient aucun maillage visible.");
            const size = bounds.getSize(new THREE.Vector3());
            const longestSide = Math.max(size.x, size.y, size.z);
            if (!Number.isFinite(longestSide) || longestSide <= 0) throw new Error("Dimensions 3D invalides.");
            const center = bounds.getCenter(new THREE.Vector3());
            root.position.x -= center.x;
            root.position.y -= bounds.min.y;
            root.position.z -= center.z;
            root.updateMatrixWorld(true);
            return NORMALIZED_MODEL_SIZE_METERS / longestSide;
        }

        function createScene(root, instance) {
            const scene = new THREE.Scene();
            scene.add(root);
            const lighting = instance?.lighting || {};
            scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7280, Number(lighting.ambient) || 1.35));
            const sun = new THREE.DirectionalLight(0xffffff, Number(lighting.directional) || 1.55);
            sun.position.set(30, -20, 50);
            scene.add(sun);
            return scene;
        }

        async function loadEntries() {
            const modelsById = new Map((payload.models || []).map(model => [model.id, model]));
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
            const loader = new GLTFLoader();
            loader.setDRACOLoader(dracoLoader);

            for (const instance of payload.instances || []) {
                if (instance?.visible === false) continue;
                const model = modelsById.get(instance?.modelId);
                const longitude = Number(instance?.longitude);
                const latitude = Number(instance?.latitude);
                if (!model || !Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;

                try {
                    const gltf = await loader.loadAsync(createObjectUrl(model));
                    const root = gltf.scene || gltf.scenes?.[0];
                    if (!root) continue;
                    const normalizationScale = normalizeModel(root);
                    const rotation = Array.isArray(instance.rotation) ? instance.rotation : [0, 0, 0];
                    const altitude = Number(instance.altitude) || 0;
                    const mercator = mapboxgl.MercatorCoordinate.fromLngLat([longitude, latitude], altitude);
                    const clips = Array.isArray(gltf.animations) ? gltf.animations : [];
                    let mixer = null;
                    if (clips.length && instance.animation?.enabled !== false) {
                        const clip = clips.find(item => item.name === instance.animation?.clip) || clips[0];
                        mixer = new THREE.AnimationMixer(root);
                        const action = mixer.clipAction(clip);
                        action.setLoop(instance.animation?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
                        action.timeScale = Number(instance.animation?.speed) || 1;
                        action.play();
                    }
                    renderEntries.push({
                        scene: createScene(root, instance), mixer,
                        transform: {
                            translateX: mercator.x, translateY: mercator.y, translateZ: mercator.z,
                            rotateX: Math.PI / 2 + degreesToRadians(rotation[0]),
                            rotateY: degreesToRadians(rotation[1]), rotateZ: degreesToRadians(rotation[2]),
                            scale: mercator.meterInMercatorCoordinateUnits() * normalizationScale * (Number(instance.scale) || 1)
                        }
                    });
                } catch (error) {
                    console.warn("Impossible de charger un modèle 3D dans la publication.", error);
                }
            }
        }

        const clock = new THREE.Clock();
        const customLayer = {
            id: LAYER_ID, type: "custom", renderingMode: "3d",
            onAdd(currentMap, gl) {
                renderer = new THREE.WebGLRenderer({ canvas: currentMap.getCanvas(), context: gl, antialias: true });
                renderer.autoClear = false;
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                loadEntries().then(() => currentMap.triggerRepaint());
            },
            render(gl, matrix) {
                if (!renderer) return;
                const mapMatrix = new THREE.Matrix4().fromArray(matrix);
                const camera = new THREE.Camera();
                const delta = clock.getDelta();
                renderer.resetState();
                for (const entry of renderEntries) {
                    entry.mixer?.update(delta);
                    const transform = entry.transform;
                    const localMatrix = new THREE.Matrix4()
                        .makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
                        .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
                        .multiply(new THREE.Matrix4().makeRotationX(transform.rotateX))
                        .multiply(new THREE.Matrix4().makeRotationY(transform.rotateY))
                        .multiply(new THREE.Matrix4().makeRotationZ(transform.rotateZ));
                    camera.projectionMatrix = mapMatrix.clone().multiply(localMatrix);
                    renderer.render(entry.scene, camera);
                }
                renderer.resetState();
                window.map.triggerRepaint();
            },
            onRemove() {
                renderer?.dispose();
                renderer = null;
                renderEntries.length = 0;
            }
        };

        function syncLayer() {
            if (!window.map || !window.mapboxgl) return setTimeout(syncLayer, 50);
            if (!isProjectionCompatible()) {
                if (window.map.getLayer(LAYER_ID)) window.map.removeLayer(LAYER_ID);
                showProjectionWarning();
                return;
            }
            clearProjectionWarning();
            if (!window.map.getLayer(LAYER_ID)) window.map.addLayer(customLayer);
        }

        const install = () => {
            if (!window.map) return setTimeout(install, 50);
            if (window.map.loaded()) syncLayer();
            else window.map.once("load", syncLayer);
            window.map.on("style.load", syncLayer);
        };

        window.addEventListener("beforeunload", () => {
            if (window.map?.getLayer(LAYER_ID)) window.map.removeLayer(LAYER_ID);
            objectUrls.forEach(url => URL.revokeObjectURL(url));
            clearProjectionWarning();
        }, { once: true });
        install();
    <\/script>`;
}
