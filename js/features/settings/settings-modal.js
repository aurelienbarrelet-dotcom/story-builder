import { getStory } from "../../core/store.js";
import {
    getMapboxToken,
    initializeMap,
    saveMapboxToken,
    updateMapStyle
} from "../map/map-service.js";

let previouslyFocusedElement = null;

export function setupSettingsModal() {
    const modal = document.getElementById("settingsModal");
    const openButton = document.getElementById("openSettingsButton");
    const closeButton = document.getElementById("closeSettingsButton");
    const cancelButton = document.getElementById("cancelSettingsButton");
    const saveButton = document.getElementById("saveSettingsButton");
    const tokenInput = document.getElementById("settingsMapboxTokenInput");
    const styleInput = document.getElementById("settingsMapStyleInput");
    const message = document.getElementById("settingsMessage");

    function openModal() {
        previouslyFocusedElement = document.activeElement;

        tokenInput.value = getMapboxToken();
        styleInput.value =
            getStory()?.mapStyle ??
            "mapbox://styles/mapbox/standard";

        message.textContent = "";
        message.classList.remove("error");

        modal.hidden = false;
        document.body.classList.add("modal-open");

        requestAnimationFrame(() => {
            tokenInput.focus();
        });
    }

    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove("modal-open");

        previouslyFocusedElement?.focus();
    }

    function saveSettings() {
        const token = tokenInput.value.trim();
        const style = styleInput.value.trim();

        if (token && !token.startsWith("pk.")) {
            message.textContent =
                "Le token public Mapbox doit commencer par « pk. ».";
            message.classList.add("error");
            tokenInput.focus();
            return;
        }

        if (!style) {
            message.textContent =
                "Indique une URL de style Mapbox.";
            message.classList.add("error");
            styleInput.focus();
            return;
        }

        saveMapboxToken(token);
        updateMapStyle(style);

        if (token) {
            initializeMap();
        }

        closeModal();
    }

    openButton.addEventListener("click", openModal);
    closeButton.addEventListener("click", closeModal);
    cancelButton.addEventListener("click", closeModal);
    saveButton.addEventListener("click", saveSettings);

    modal
        .querySelector("[data-close-settings]")
        .addEventListener("click", closeModal);

    document.addEventListener("keydown", event => {
        if (modal.hidden) {
            return;
        }

        if (event.key === "Escape") {
            closeModal();
        }

        if (
            event.key === "Enter" &&
            (event.ctrlKey || event.metaKey)
        ) {
            saveSettings();
        }
    });
}
