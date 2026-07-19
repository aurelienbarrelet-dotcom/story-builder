export function cloneObject(object) {
    return JSON.parse(JSON.stringify(object));
}

export function createSlug(text) {
    return String(text ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function escapeHtmlAttribute(text) {
    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

export function escapeHtmlContent(text) {
    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

export function sanitizeRichText(text) {
    const source = String(text ?? "");
    const template = document.createElement("template");
    template.innerHTML = source;
    const allowedTags = new Set(["STRONG", "B", "EM", "I", "A", "BR"]);

    function cleanNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent ?? "");
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return document.createDocumentFragment();
        }

        const fragment = document.createDocumentFragment();
        const tagName = node.tagName.toUpperCase();

        if (!allowedTags.has(tagName)) {
            [...node.childNodes].forEach(child => fragment.append(cleanNode(child)));
            return fragment;
        }

        const normalizedTag = tagName === "B" ? "strong" : tagName === "I" ? "em" : tagName.toLowerCase();
        const element = document.createElement(normalizedTag);

        if (normalizedTag === "a") {
            const rawHref = String(node.getAttribute("href") ?? "").trim();
            const safeHref = /^(https?:|mailto:|#|\/)/i.test(rawHref) ? rawHref : "";
            if (safeHref) {
                element.setAttribute("href", safeHref);
                if (/^https?:/i.test(safeHref)) {
                    element.setAttribute("target", "_blank");
                    element.setAttribute("rel", "noopener noreferrer");
                }
            }
        }

        [...node.childNodes].forEach(child => element.append(cleanNode(child)));
        return element;
    }

    const output = document.createElement("div");
    [...template.content.childNodes].forEach(node => output.append(cleanNode(node)));
    return output.innerHTML.replace(/\n/g, "<br>");
}

export function downloadTextFile(
    filename,
    content,
    mimeType = "text/plain;charset=utf-8"
) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(reader.error));

        reader.readAsText(file);
    });
}

export function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(reader.error));

        reader.readAsDataURL(file);
    });
}
