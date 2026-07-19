import { MAX_IMAGE_SIZE } from "../../core/config.js";
import { commitProjectChange } from "../../core/project-service.js";
import { getSelectedChapter } from "../../core/store.js";
import { readFileAsDataUrl } from "../../core/utils.js";

export async function importSelectedChapterImage(file) {
    const chapter = getSelectedChapter();

    if (!chapter || !file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        throw new Error("Choisis un fichier image.");
    }

    if (file.size > MAX_IMAGE_SIZE) {
        throw new Error(
            "Cette image dépasse 2,5 Mo. Réduis sa taille avant de l’importer."
        );
    }

    chapter.image = await readFileAsDataUrl(file);
    chapter.imageName = file.name;

    commitProjectChange();
}

export function removeSelectedChapterImage() {
    const chapter = getSelectedChapter();

    if (!chapter) {
        return;
    }

    chapter.image = null;
    chapter.imageName = "";
    chapter.imageCaption = "";

    commitProjectChange();
}
