export function bindInlineEditor({ element, value, onCommit, emptyValue = "Sans titre", ariaLabel = "Renommer" }) {
    if (!element) return;
    element.classList.add("inline-editable");
    element.tabIndex = 0;
    element.title = "Double-cliquer pour renommer";
    element.setAttribute("aria-label", ariaLabel);

    const start = event => {
        event?.preventDefault();
        event?.stopPropagation();
        if (element.querySelector("input")) return;

        const initial = String(value ?? "");
        const input = document.createElement("input");
        input.type = "text";
        input.className = "ui-input inline-editor-input";
        input.value = initial;
        input.setAttribute("aria-label", ariaLabel);
        element.replaceChildren(input);
        element.classList.add("is-editing");
        input.focus();
        input.select();

        let finished = false;
        const finish = commit => {
            if (finished) return;
            finished = true;
            const next = input.value.trim() || emptyValue;
            element.classList.remove("is-editing");
            element.textContent = commit ? next : (initial || emptyValue);
            if (commit && next !== initial) onCommit(next);
        };
        input.addEventListener("click", e => e.stopPropagation());
        input.addEventListener("dblclick", e => e.stopPropagation());
        input.addEventListener("blur", () => finish(true));
        input.addEventListener("keydown", e => {
            e.stopPropagation();
            if (e.key === "Enter") { e.preventDefault(); finish(true); }
            if (e.key === "Escape") { e.preventDefault(); finish(false); }
        });
    };

    element.addEventListener("dblclick", start);
    element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === "F2") start(event);
    });
}
