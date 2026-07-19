import { getProject } from "./store.js";
import { validateProjectDocument } from "./validation-service.js";
import { downloadScrollytellingArchive } from "../features/export/scrollytelling-archive-export.js";

export async function exportPublication() {
    const project = getProject();
    validateProjectDocument(project);
    return downloadScrollytellingArchive();
}
