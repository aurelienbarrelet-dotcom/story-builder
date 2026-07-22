import { EVENTS, on } from "../../core/events.js";
import { getProject } from "../../core/store.js";
import { getSelectedModelInstanceId, selectModelInstance } from "./models3d-map.js";

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
    const instance = project?.models3dInstances?.find(item => item.id === getSelectedModelInstanceId());
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
    card.append(heading, hint, details);
    container.append(card);
}

function appendDetail(list, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    list.append(term, description);
}
