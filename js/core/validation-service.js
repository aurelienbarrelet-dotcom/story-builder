import { PROJECT_FORMAT, PROJECT_FORMAT_VERSION } from "./config.js";

export function validateProjectDocument(project) {
    if (!project || typeof project !== "object" || Array.isArray(project)) {
        throw new Error("Le projet doit être un objet.");
    }
    if (project.format !== PROJECT_FORMAT || Number(project.formatVersion) !== PROJECT_FORMAT_VERSION) {
        throw new Error(`Format de projet non pris en charge. Format attendu : ${PROJECT_FORMAT} v${PROJECT_FORMAT_VERSION}.`);
    }
    if (!project.metadata || typeof project.metadata !== "object") throw new Error("Les métadonnées du projet sont manquantes.");
    if (!project.settings || typeof project.settings !== "object") throw new Error("Les paramètres du projet sont manquants.");
    if (!project.story || typeof project.story !== "object") throw new Error("Le contenu story est manquant.");
    if (!project.assets || typeof project.assets !== "object") throw new Error("Le registre des ressources est manquant.");
    if (!Array.isArray(project.story.chapters)) throw new Error("Les chapitres sont invalides.");
    if (project.story.motions !== undefined && !Array.isArray(project.story.motions)) throw new Error("Les trajectoires sont invalides.");

    const ids = new Set();
    project.story.chapters.forEach((chapter, index) => {
        const id = String(chapter?.id ?? "").trim();
        if (!id) throw new Error(`Le chapitre ${index + 1} ne possède pas d’identifiant.`);
        if (ids.has(id)) throw new Error(`Identifiant de chapitre dupliqué : ${id}.`);
        ids.add(id);
    });
    return project;
}
