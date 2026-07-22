const PANEL_IDS = ["properties", "transitionPanel", "layersPanel", "viewPanel", "legendPanel", "assetsPanel"];
const ACTIVE_KEY = "storyBuilderActiveRightPanel";

const panelConfig = {
    viewPanel: {
        label: "Vue",
        icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>`
    },
    layersPanel: {
        label: "Calques",
        icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>`
    },
    properties: {
        label: "Propriétés",
        icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/></svg>`
    },
    transitionPanel: {
        label: "Transitions",
        icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h11"/><path d="m11 8 4 4-4 4"/><path d="M18 6v12"/></svg>`
    },
    legendPanel: {
        label: "Légendes",
        icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 4 9 9-5.8 5.8a2.8 2.8 0 0 1-4 0l-1-1a2.8 2.8 0 0 1 0-4L9 8"/><path d="M7.5 10.5h8.8"/><path d="M18.5 13.5s2.5 2.7 2.5 4.5a2.5 2.5 0 0 1-5 0c0-1.8 2.5-4.5 2.5-4.5Z"/></svg>`
    },
    assetsPanel: {
        label: "Images",
        icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 2-2 5 5"/></svg>`
    }
};

let activePanelId = "properties";

export function setupRightPanels() {
    const saved = localStorage.getItem(ACTIVE_KEY);
    activePanelId = PANEL_IDS.includes(saved) ? saved : "properties";

    document.querySelectorAll(".right-panel-rail-button").forEach(button => {
        const panelId = button.dataset.panel;
        const config = panelConfig[panelId];
        if (!config) return;
        button.innerHTML = config.icon;
        button.addEventListener("click", () => activateRightPanel(panelId));
    });

    applyState();
}

export function activateRightPanel(panelId) {
    if (!PANEL_IDS.includes(panelId)) return;
    activePanelId = panelId;
    localStorage.setItem(ACTIVE_KEY, panelId);
    applyState();
}

function applyState() {
    PANEL_IDS.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        const isActive = panelId === activePanelId;
        panel.classList.toggle("active-right-panel", isActive);
        panel.hidden = !isActive;
    });

    document.querySelectorAll(".right-panel-rail-button").forEach(button => {
        const isActive = button.dataset.panel === activePanelId;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    const main = document.querySelector("main");
    main?.classList.toggle("assets-panel-open", activePanelId === "assetsPanel");

    window.dispatchEvent(new Event("resize"));
}
