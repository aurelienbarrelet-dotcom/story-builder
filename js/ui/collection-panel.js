/**
 * Shared interaction primitives for Story Builder collection panels.
 * A collection keeps its own data, while selection, action bars and menus
 * follow one predictable contract.
 */
export function createCollectionSelection() {
    let ids = new Set();
    let anchorId = null;
    let primaryId = null;

    return {
        get ids() { return new Set(ids); },
        get count() { return ids.size; },
        get primaryId() { return primaryId; },
        has(id) { return ids.has(id); },
        clear() {
            ids.clear();
            anchorId = null;
            primaryId = null;
        },
        replace(nextIds, preferredId = null) {
            ids = new Set(nextIds);
            primaryId = preferredId && ids.has(preferredId)
                ? preferredId
                : [...ids].at(-1) ?? null;
            anchorId = primaryId;
        },
        prune(validIds) {
            const valid = validIds instanceof Set ? validIds : new Set(validIds);
            ids = new Set([...ids].filter(id => valid.has(id)));
            if (primaryId && !ids.has(primaryId)) primaryId = [...ids].at(-1) ?? null;
            if (anchorId && !valid.has(anchorId)) anchorId = primaryId;
        },
        select(id, orderedIds, event = {}) {
            const order = Array.from(orderedIds);
            if (event.shiftKey && anchorId) {
                const anchorIndex = order.indexOf(anchorId);
                const currentIndex = order.indexOf(id);
                if (anchorIndex >= 0 && currentIndex >= 0) {
                    const [start, end] = [anchorIndex, currentIndex].sort((a, b) => a - b);
                    ids = new Set(order.slice(start, end + 1));
                }
            } else if (event.ctrlKey || event.metaKey) {
                if (ids.has(id)) ids.delete(id);
                else ids.add(id);
                anchorId = id;
            } else {
                ids = new Set([id]);
                anchorId = id;
            }
            primaryId = ids.has(id) ? id : [...ids].at(-1) ?? null;
            return primaryId;
        }
    };
}

export function renderCollectionSelectionBar(element, {
    count,
    singular,
    plural,
    onDelete,
    deleteLabel
}) {
    if (!element) return;
    const visible = count > 0;
    element.classList.toggle("visible", visible);
    element.hidden = !visible;
    element.innerHTML = visible ? `
        <span>${count} ${count > 1 ? plural : singular} sélectionné${count > 1 ? "s" : ""}</span>
        <button type="button" class="ui-icon-button ui-icon-button--danger collection-delete-button" data-collection-delete aria-label="${deleteLabel}" title="${deleteLabel}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 11H8L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z"/></svg>
        </button>` : "";
    element.querySelector("[data-collection-delete]")?.addEventListener("click", onDelete);
}

export function bindCollectionMenu({ root, trigger, menu, onAction, floating = false }) {
    const originalParent = menu.parentElement;

    const closeMenu = () => {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        if (floating && originalParent && menu.parentElement !== originalParent) originalParent.append(menu);
        menu.style.removeProperty("position");
        menu.style.removeProperty("top");
        menu.style.removeProperty("right");
        menu.style.removeProperty("left");
    };

    menu.closeCollectionMenu = closeMenu;

    trigger.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = menu.hidden;
        document.querySelectorAll("[data-collection-menu]").forEach(other => {
            if (other !== menu) other.closeCollectionMenu?.();
        });
        if (!willOpen) {
            closeMenu();
            return;
        }
        if (floating) {
            document.body.append(menu);
            menu.hidden = false;
            const triggerRect = trigger.getBoundingClientRect();
            const menuWidth = menu.getBoundingClientRect().width;
            menu.style.position = "fixed";
            menu.style.top = `${triggerRect.bottom + 4}px`;
            menu.style.left = `${Math.max(8, triggerRect.right - menuWidth)}px`;
            menu.style.right = "auto";
        } else {
            menu.hidden = false;
        }
        trigger.setAttribute("aria-expanded", "true");
    });

    menu.addEventListener("click", event => {
        const actionButton = event.target.closest("[data-action]");
        if (!actionButton) return;
        event.stopPropagation();
        onAction(actionButton.dataset.action);
        closeMenu();
    });

    root.classList.add("collection-card");
}

export function closeCollectionMenus(event) {
    if (event?.target?.closest?.(".collection-card-actions")) return;
    document.querySelectorAll("[data-collection-menu]").forEach(menu => {
        if (menu.closeCollectionMenu) menu.closeCollectionMenu();
        else {
            menu.hidden = true;
            menu.previousElementSibling?.setAttribute?.("aria-expanded", "false");
        }
    });
}
