import { emit, EVENTS } from "../../core/events.js";
import { escapeHtmlAttribute, escapeHtmlContent } from "../../core/utils.js";
import { getStory } from "../../core/store.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getMapboxToken, initializeMap, saveMapboxToken, updateMapStyle } from "../map/map-service.js";
import {
  getMeta, updateMetaField, updateAuthor, addAuthor, removeAuthor,
  importAuthorImage, removeAuthorImage
} from "./meta-service.js";

export function renderMetaProperties(container) {
  const meta = getMeta();
  if (!meta) return;

  const story = getStory();

  container.innerHTML = `
    <details class="property-module" data-module-key="project-name" open>
      <summary><span>Projet</span></summary>
      <div class="property-module-content">
        <div class="property"><label for="projectNameInput">Nom du projet</label><input id="projectNameInput" value="${escapeHtmlAttribute(story?.projectName ?? "")}" placeholder="Projet sans titre"></div>
      </div>
    </details>
    <details class="property-module" data-module-key="story-title" open>
      <summary><span>Slide de titre</span></summary>
      <div class="property-module-content">
        <div class="property"><label for="metaTitleInput">Titre</label><input id="metaTitleInput" value="${escapeHtmlAttribute(meta.title)}"></div>
        <div class="property"><label for="metaDekInput">Chapeau</label><textarea id="metaDekInput">${escapeHtmlContent(meta.dek)}</textarea></div>
      </div>
    </details>
    <details class="property-module" data-module-key="authors" open>
      <summary><span>Auteurs</span></summary>
      <div class="property-module-content collection-list" id="authorsList">
        ${meta.authors.map((author, index) => authorRow(author, index)).join("")}
        <button class="button button-primary collection-add" id="addAuthorButton" type="button">+ Ajouter un auteur</button>
      </div>
    </details>
    <details class="property-module" data-module-key="footer" open>
      <summary><span>Footer</span></summary>
      <div class="property-module-content">
        <div class="property"><label for="footerSignaturesInput">Signatures</label><textarea id="footerSignaturesInput">${escapeHtmlContent(meta.footer.signatures)}</textarea></div>
        <div class="property"><label for="footerSourcesInput">Sources</label><textarea id="footerSourcesInput">${escapeHtmlContent(meta.footer.sources)}</textarea></div>
      </div>
    </details>
    <details class="property-module" data-module-key="mapbox-settings" open>
      <summary><span>Paramètres Mapbox</span></summary>
      <div class="property-module-content">
        <div class="property">
          <label for="metaMapboxTokenInput">Token public Mapbox</label>
          <input id="metaMapboxTokenInput" type="password" autocomplete="off" placeholder="pk.eyJ1…" value="${escapeHtmlAttribute(getMapboxToken())}">
          <span class="property-help">Le token est enregistré dans le fichier projet et suit le projet lors de son partage.</span>
        </div>
        <div class="property">
          <label for="metaMapStyleInput">Style Mapbox</label>
          <input id="metaMapStyleInput" type="text" placeholder="mapbox://styles/mapbox/standard" value="${escapeHtmlAttribute(getStory()?.mapStyle ?? "mapbox://styles/mapbox/standard")}">
        </div>
        <div id="metaMapboxMessage" class="settings-message" aria-live="polite"></div>
        <button id="applyMapboxSettingsButton" class="button button-primary" type="button">Enregistrer et connecter</button>
      </div>
    </details>`;

  bindMetaEvents();
  bindModules();
}

function authorRow(author, index) {
  return `<details class="collection-card author-card" data-author="${index}">
    <summary class="collection-card-header">
      <span class="author-card-title">${author.image ? `<img src="${escapeHtmlAttribute(author.image)}" alt="">` : `<span class="author-avatar-placeholder" aria-hidden="true">A</span>`}<strong>${escapeHtmlContent(author.name || `Auteur ${index + 1}`)}</strong></span>
      <span class="author-actions">
        <button class="chapter-menu-button author-menu-button" type="button" aria-label="Actions de l’auteur" aria-expanded="false">⋯</button>
        <span class="chapter-menu author-menu" hidden><button type="button" data-remove-author="${index}" class="danger">Supprimer</button></span>
      </span>
    </summary>
    <div class="collection-card-content">
      <div class="property"><label>Nom</label><input data-author-field="name" value="${escapeHtmlAttribute(author.name)}"></div>
      <div class="property"><label>Lien</label><input data-author-field="url" type="url" placeholder="https://…" value="${escapeHtmlAttribute(author.url)}"></div>
      <div class="author-image-row">${author.image ? `<img src="${escapeHtmlAttribute(author.image)}" alt="">` : `<span>Portrait</span>`}<button type="button" class="button button-light" data-author-image="${index}">${author.image ? "Remplacer" : "Choisir"}</button>${author.image ? `<button type="button" class="text-danger" data-remove-author-image="${index}">Retirer</button>` : ""}<input data-author-file="${index}" type="file" accept="image/*" hidden></div>
    </div>
  </details>`;
}

function rerender() { emit(EVENTS.RENDER_REQUESTED); }

function bindMetaEvents() {
  document.getElementById("projectNameInput").addEventListener("input", event => {
    const story = getStory();
    if (!story) return;
    story.projectName = event.target.value;
    commitProjectChange();
  });
  document.getElementById("metaTitleInput").addEventListener("input", event => {
    updateMetaField("title", event.target.value);
    emit(EVENTS.RENDER_REQUESTED, { preserveProperties: true });
  });
  document.getElementById("metaDekInput").addEventListener("input", event => {
    updateMetaField("dek", event.target.value);
    emit(EVENTS.RENDER_REQUESTED, { preserveProperties: true });
  });
  document.getElementById("footerSignaturesInput").addEventListener("input", event => updateMetaField("footer.signatures", event.target.value));
  document.getElementById("footerSourcesInput").addEventListener("input", event => updateMetaField("footer.sources", event.target.value));

  document.getElementById("applyMapboxSettingsButton").addEventListener("click", () => {
    const tokenInput = document.getElementById("metaMapboxTokenInput");
    const styleInput = document.getElementById("metaMapStyleInput");
    const message = document.getElementById("metaMapboxMessage");
    const token = tokenInput.value.trim();
    const style = styleInput.value.trim();

    message.classList.remove("error");
    if (token && !token.startsWith("pk.")) {
      message.textContent = "Le token public Mapbox doit commencer par « pk. ».";
      message.classList.add("error");
      tokenInput.focus();
      return;
    }
    if (!style) {
      message.textContent = "Indique une URL de style Mapbox.";
      message.classList.add("error");
      styleInput.focus();
      return;
    }

    saveMapboxToken(token);
    updateMapStyle(style);
    initializeMap();
    message.textContent = token ? "Paramètres enregistrés. Carte reconnectée." : "Paramètres enregistrés. Ajoute un token pour afficher la carte.";
  });

  document.querySelectorAll("[data-author]").forEach(card => {
    card.querySelectorAll("[data-author-field]").forEach(input => input.addEventListener("input", () => {
      const index = +card.dataset.author;
      updateAuthor(index, input.dataset.authorField, input.value);
      if (input.dataset.authorField === "name") {
        const title = card.querySelector(".author-card-title strong");
        if (title) title.textContent = input.value.trim() || `Auteur ${index + 1}`;
      }
    }));
  });
  document.querySelectorAll(".author-menu-button").forEach(button => button.onclick = event => {
    event.preventDefault(); event.stopPropagation();
    const menu = button.parentElement.querySelector(".author-menu");
    document.querySelectorAll(".author-menu").forEach(other => { if (other !== menu) other.hidden = true; });
    menu.hidden = !menu.hidden;
    button.setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.querySelectorAll("[data-remove-author]").forEach(button => button.onclick = event => { event.preventDefault(); event.stopPropagation(); removeAuthor(+button.dataset.removeAuthor); rerender(); });
  document.getElementById("addAuthorButton").onclick = () => { addAuthor(); rerender(); };
  document.querySelectorAll("[data-author-image]").forEach(button => button.onclick = () => document.querySelector(`[data-author-file="${button.dataset.authorImage}"]`).click());
  document.querySelectorAll("[data-author-file]").forEach(input => input.onchange = async () => { if (input.files[0]) { await importAuthorImage(+input.dataset.authorFile, input.files[0]); rerender(); } });
  document.querySelectorAll("[data-remove-author-image]").forEach(button => button.onclick = () => { removeAuthorImage(+button.dataset.removeAuthorImage); rerender(); });
}

function bindModules() {
  document.querySelectorAll("[data-module-key]").forEach(module => {
    const key = `storyBuilderPropertyModule:${module.dataset.moduleKey}`;
    const value = localStorage.getItem(key);
    if (value !== null) module.open = value === "true";
    module.addEventListener("toggle", () => localStorage.setItem(key, String(module.open)));
  });
}
