import { emit, EVENTS, on } from "../../core/events.js";
import { saveProjectLocally } from "../../core/project-service.js";
import { getProject } from "../../core/store.js";
import { deleteSelectedModelInstance, duplicateSelectedModelInstance, getSelectedModelInstanceId, isSelectedInstanceMoveModeActive, renderModelInstances, selectModelInstance, setSelectedInstanceMoveMode, snapSelectedInstanceToTerrain } from "./models3d-map.js";

export function setupModels3dInstancePanel() {
    on(EVENTS.MODEL3D_INSTANCE_SELECTED, renderInstanceEditor);
    on(EVENTS.PROJECT_REPLACED, () => {
        selectModelInstance(null);
        renderInstanceEditor();
    });
    renderInstanceEditor();
}

export function renderInstanceEditor() {
    const container = document.getElementById("model3dInstanceEditor");
    if (!container) return;
    container.replaceChildren();
    const project = getProject();
    const instances = Array.isArray(project?.models3dInstances) ? project.models3dInstances : [];
    const browser = document.createElement("section");
    browser.className = "models3d-object-browser";
    const browserTitle = document.createElement("h3");
    browserTitle.textContent = `Objets placés (${instances.length})`;
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Rechercher un objet";
    const list = document.createElement("div");
    list.className = "models3d-object-list";
    const renderList = () => {
        list.replaceChildren();
        const query = search.value.trim().toLowerCase();
        instances.forEach((item, index) => {
            const source = project?.assets?.models?.find(model => model.id === item.modelId);
            const name = item.name || source?.name || `Objet ${index + 1}`;
            if (query && !name.toLowerCase().includes(query)) return;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "models3d-object-row";
            button.classList.toggle("is-selected", item.id === getSelectedModelInstanceId());
            button.textContent = `${item.visible === false ? "○" : "●"} ${name}`;
            button.addEventListener("click", () => selectModelInstance(item.id));
            list.append(button);
        });
    };
    search.addEventListener("input", renderList);
    browser.append(browserTitle, search, list);
    container.append(browser);
    renderList();
    const instance = instances.find(item => item.id === getSelectedModelInstanceId());
    if (!instance) return;
    const model = project?.assets?.models?.find(item => item.id === instance.modelId);

    const card = document.createElement("section");
    card.className = "models3d-instance-card";
    const heading = document.createElement("h3");
    heading.textContent = model?.name || "Instance 3D";
    const hint = document.createElement("p");
    hint.textContent = "Instance sélectionnée sur la carte";
    const details = document.createElement("dl");
    details.className = "models3d-instance-details";
    appendDetail(details, "Longitude", Number(instance.longitude).toFixed(6));
    appendDetail(details, "Latitude", Number(instance.latitude).toFixed(6));
    appendDetail(details, "Altitude", `${Number(instance.altitude || 0).toFixed(2)} m`);
    const moveButton = document.createElement("button");
    moveButton.type = "button";
    moveButton.className = "ui-button ui-button--secondary models3d-instance-move";
    const moving = isSelectedInstanceMoveModeActive();
    moveButton.textContent = moving ? "Terminer le déplacement" : "Déplacer sur la carte";
    moveButton.setAttribute("aria-pressed", String(moving));
    moveButton.addEventListener("click", () => {
        setSelectedInstanceMoveMode(!isSelectedInstanceMoveModeActive());
        renderInstanceEditor();
    });
    const rotationEditor = document.createElement("fieldset");
    rotationEditor.className = "models3d-transform-editor";
    const rotationLegend = document.createElement("legend");
    rotationLegend.textContent = "Rotation";
    rotationEditor.append(rotationLegend);
    const rotation = Array.isArray(instance.rotation) ? instance.rotation : [0, 0, 0];
    ["Tangage", "Roulis", "Cap"].forEach((label, index) => {
        rotationEditor.append(createNumberField(label, rotation[index] || 0, -360, 360, 1, value => {
            instance.rotation ??= [0, 0, 0];
            instance.rotation[index] = value;
            commitInstanceChange();
        }));
    });
    const scaleEditor = document.createElement("fieldset");
    scaleEditor.className = "models3d-transform-editor models3d-scale-editor";
    const scaleLegend = document.createElement("legend");
    scaleLegend.textContent = "Échelle";
    scaleEditor.append(scaleLegend, createNumberField("Facteur uniforme", Number(instance.scale) || 1, 0.01, 1000, 0.1, value => {
        instance.scale = value;
        commitInstanceChange();
    }));
    const terrainEditor = document.createElement("fieldset");
    terrainEditor.className = "models3d-transform-editor models3d-terrain-editor";
    const terrainLegend = document.createElement("legend");
    terrainLegend.textContent = "Altitude et terrain";
    const altitudeField = createNumberField("Altitude (m)", Number(instance.altitude) || 0, -12000, 100000, 0.1, value => {
        instance.altitude = value;
        instance.snapToTerrain = false;
        commitInstanceChange();
        renderInstanceEditor();
    });
    const snapButton = document.createElement("button");
    snapButton.type = "button";
    snapButton.className = "ui-button ui-button--secondary";
    snapButton.textContent = instance.snapToTerrain ? "Recalculer sur le terrain" : "Poser sur le terrain";
    snapButton.addEventListener("click", () => {
        const result = snapSelectedInstanceToTerrain();
        if (!result.ok) window.alert(result.message);
        renderInstanceEditor();
    });
    const followLabel = document.createElement("label");
    followLabel.className = "models3d-terrain-follow";
    const followInput = document.createElement("input");
    followInput.type = "checkbox";
    followInput.checked = Boolean(instance.snapToTerrain);
    followInput.addEventListener("change", () => {
        instance.snapToTerrain = followInput.checked;
        if (followInput.checked) {
            const result = snapSelectedInstanceToTerrain();
            if (!result.ok) {
                instance.snapToTerrain = false;
                followInput.checked = false;
                window.alert(result.message);
            }
        } else {
            commitInstanceChange();
        }
        renderInstanceEditor();
    });
    const followText = document.createElement("span");
    followText.textContent = "Suivre le relief pendant le déplacement";
    followLabel.append(followInput, followText);
    terrainEditor.append(terrainLegend, altitudeField, snapButton, followLabel);
    const lightingEditor = document.createElement("fieldset");
    lightingEditor.className = "models3d-transform-editor models3d-lighting-editor";
    const lightingLegend = document.createElement("legend");
    lightingLegend.textContent = "Éclairage";
    instance.lighting ??= { ambient: 1.35, sun: 1.55, shadows: false };
    const shadowLabel = document.createElement("label");
    shadowLabel.className = "models3d-terrain-follow";
    const shadowInput = document.createElement("input");
    shadowInput.type = "checkbox";
    shadowInput.checked = Boolean(instance.lighting.shadows);
    shadowInput.addEventListener("change", () => { instance.lighting.shadows = shadowInput.checked; commitInstanceChange(); });
    shadowLabel.append(shadowInput, document.createTextNode(" Ombres du modèle"));
    lightingEditor.append(lightingLegend,
        createNumberField("Lumière ambiante", Number(instance.lighting.ambient ?? 1.35), 0, 5, 0.05, value => { instance.lighting.ambient = value; commitInstanceChange(); }),
        createNumberField("Lumière solaire", Number(instance.lighting.sun ?? 1.55), 0, 5, 0.05, value => { instance.lighting.sun = value; commitInstanceChange(); }),
        shadowLabel
    );
    const animationEditor = document.createElement("fieldset");
    animationEditor.className = "models3d-transform-editor models3d-animation-editor";
    const animationLegend = document.createElement("legend");
    animationLegend.textContent = "Animation GLB";
    instance.animation ??= { enabled: true, clip: "", loop: true, speed: 1 };
    const clips = Array.isArray(instance.availableAnimations) ? instance.availableAnimations : [];
    const clipSelect = document.createElement("select");
    clipSelect.disabled = clips.length === 0;
    clipSelect.append(new Option(clips.length ? "Première animation" : "Aucune animation", ""));
    clips.forEach(name => clipSelect.append(new Option(name, name)));
    clipSelect.value = instance.animation.clip || "";
    clipSelect.addEventListener("change", () => { instance.animation.clip = clipSelect.value; commitInstanceChange(); });
    const enabled = createCheckboxField("Lire l’animation", instance.animation.enabled !== false, checked => { instance.animation.enabled = checked; commitInstanceChange(); });
    const loop = createCheckboxField("Boucle", instance.animation.loop !== false, checked => { instance.animation.loop = checked; commitInstanceChange(); });
    animationEditor.append(animationLegend, clipSelect, createNumberField("Vitesse", Number(instance.animation.speed) || 1, 0.05, 10, 0.05, value => { instance.animation.speed = value; commitInstanceChange(); }), enabled, loop);
    const duplicateButton = document.createElement("button");
    duplicateButton.type = "button";
    duplicateButton.className = "ui-button ui-button--secondary";
    duplicateButton.textContent = "Dupliquer l’instance";
    duplicateButton.addEventListener("click", () => duplicateSelectedModelInstance());
    const stateEditor = document.createElement("fieldset");
    stateEditor.className = "models3d-transform-editor models3d-state-editor";
    const stateLegend = document.createElement("legend");
    stateLegend.textContent = "État";
    stateEditor.append(stateLegend,
        createCheckboxField("Visible", instance.visible !== false, checked => { instance.visible = checked; commitInstanceChange(); }),
        createCheckboxField("Verrouillé", Boolean(instance.locked), checked => { instance.locked = checked; if (checked) setSelectedInstanceMoveMode(false); commitInstanceChange(); renderInstanceEditor(); })
    );
    moveButton.disabled = Boolean(instance.locked);
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ui-button ui-button--secondary models3d-action--danger";
    deleteButton.textContent = "Supprimer l’instance";
    deleteButton.addEventListener("click", () => { if (confirm("Supprimer cette instance 3D ?")) deleteSelectedModelInstance(); });
    card.append(heading, hint, details, moveButton, duplicateButton, deleteButton, stateEditor, rotationEditor, scaleEditor, terrainEditor, lightingEditor, animationEditor);
    container.append(card);
}

function appendDetail(list, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    list.append(term, description);
}

function createNumberField(labelText, value, min, max, step, onChange) {
    const label = document.createElement("label");
    label.className = "models3d-transform-field";
    const text = document.createElement("span");
    text.textContent = labelText;
    const input = document.createElement("input");
    input.type = "number";
    input.value = String(value);
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.addEventListener("change", () => {
        const next = Math.min(max, Math.max(min, Number(input.value) || 0));
        input.value = String(next);
        onChange(next);
    });
    label.append(text, input);
    return label;
}

function createCheckboxField(labelText, checked, onChange) {
    const label = document.createElement("label");
    label.className = "models3d-terrain-follow";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked));
    label.append(input, document.createTextNode(` ${labelText}`));
    return label;
}

function commitInstanceChange() {
    emit(EVENTS.PROJECT_DIRTY_CHANGED, { isDirty: true });
    saveProjectLocally();
    renderModelInstances();
}
