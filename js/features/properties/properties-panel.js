const COLLAPSED_KEY = "storyBuilderPropertiesPanelCollapsed";

const icons = {
    properties: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/></svg>`,
    arrow: "›"
};

export function setupPropertiesPanel() {
    const panel = document.getElementById("properties");
    const button = document.getElementById("togglePropertiesPanelButton");
    if (!panel || !button) return;

    setCollapsedState(panel, button, localStorage.getItem(COLLAPSED_KEY) === "true");
    button.addEventListener("click", () => {
        const collapsed = !panel.classList.contains("collapsed");
        setCollapsedState(panel, button, collapsed);
        localStorage.setItem(COLLAPSED_KEY, String(collapsed));
        window.dispatchEvent(new Event("resize"));
    });
}

function setCollapsedState(panel, button, collapsed) {
    panel.classList.toggle("collapsed", collapsed);
    button.innerHTML = collapsed ? icons.properties : icons.arrow;
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", collapsed ? "Ouvrir la colonne Propriétés" : "Réduire la colonne Propriétés");
    button.title = collapsed ? "Ouvrir Propriétés" : "Réduire la colonne";
}
