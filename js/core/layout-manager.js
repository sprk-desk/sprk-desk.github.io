// Pointer-events room object placement, layout presets, and spectator protection
import { state, persistLocalCollection, isSpectatorMode } from "../state.js";
import { computeDropPlacement, canModifyRoomLayout } from "../utils/layout-geometry.js";

const DEFAULT_PARENTS = [
  [".desk-clock", ".shelf-one"],
  [".desk-plant", ".shelf-one"],
  [".wall-calendar", ".shelf-two"],
  [".trophy", ".shelf-two"],
  [".mascot", ".shelf-three"],
  [".photo-frame", ".shelf-three"],
  [".bookshelf", ".shelf-four"],
  [".desk-lamp", ".desk"],
  [".desk-computer", ".desk"],
  [".desk-hourglass", ".desk"],
  [".desk-phone", ".desk"],
  [".desk-notebook", ".desk"],
  [".desk-headphones", ".desk"],
  [".coffee-mug", ".desk"]
];

class LayoutManager {
  constructor() {
    this.dragState = {
      object: null,
      originalParent: null,
      pointerId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      didDrag: false
    };
  }

  getObjectKey(el) {
    return (
      el.dataset.objectType ||
      Array.from(el.classList).find(
        (c) => c !== "room-object" && c !== "interactive-object" && c !== "is-placed" && c !== "draggable-object"
      ) ||
      "object"
    );
  }

  init() {
    const shelfTargets = Array.from(document.querySelectorAll(".bookcase .shelf"));
    const deskTarget = document.querySelector(".desk");
    const draggableObjects = document.querySelectorAll(
      ".room-object:not(.merchant-bird):not(.pinboard):not(.window-object), .photo-frame"
    );

    this.restoreCurrentLayout(draggableObjects, deskTarget);

    draggableObjects.forEach((object) => {
      object.classList.add("draggable-object");

      object.addEventListener("click", (event) => {
        if (object.dataset.suppressClick === "true") {
          event.preventDefault();
          event.stopPropagation();
          object.dataset.suppressClick = "false";
        }
      }, true);

      object.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (!canModifyRoomLayout({
          isSpectator: isSpectatorMode(),
          isLocked: state.preferences.layoutLocked
        })) {
          return;
        }
        const rect = object.getBoundingClientRect();
        this.dragState = {
          object,
          originalParent: object.parentElement,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          didDrag: false
        };
      });

      object.addEventListener("pointermove", (event) => {
        const ds = this.dragState;
        if (ds.object !== object || ds.pointerId !== event.pointerId) return;
        const moved = Math.hypot(event.clientX - ds.startX, event.clientY - ds.startY);
        if (!ds.didDrag && moved < 6) return;

        if (!ds.didDrag) {
          ds.didDrag = true;
          document.body.classList.add("object-dragging");
          try {
            object.setPointerCapture(event.pointerId);
          } catch {
            // Pointer capture may not apply to synthetic events
          }
        }

        const rect = object.getBoundingClientRect();
        if (!object.classList.contains("is-drag-preview")) {
          object.classList.add("is-drag-preview");
          document.body.appendChild(object);
          object.style.position = "fixed";
          object.style.zIndex = "100";
          object.style.width = `${rect.width}px`;
          object.style.height = `${rect.height}px`;
        }
        object.style.left = `${event.clientX - ds.offsetX}px`;
        object.style.top = `${event.clientY - ds.offsetY}px`;
        object.style.bottom = "auto";
      });

      object.addEventListener("pointerup", (event) => {
        const ds = this.dragState;
        if (ds.object !== object || ds.pointerId !== event.pointerId) return;

        if (!ds.didDrag) {
          this.dragState.object = null;
          return;
        }

        try {
          if (object.hasPointerCapture?.(event.pointerId)) {
            object.releasePointerCapture(event.pointerId);
          }
        } catch {
          // Ignore release failure
        }

        const rect = object.getBoundingClientRect();
        object.classList.remove("is-drag-preview");
        object.style.position = "";
        object.style.zIndex = "";
        object.style.width = "";
        object.style.height = "";
        object.dataset.suppressClick = "true";

        const dropTargets = [...shelfTargets, deskTarget].filter(Boolean);
        const target = dropTargets.find((candidate) => {
          const targetRect = candidate.getBoundingClientRect();
          return (
            event.clientX >= targetRect.left &&
            event.clientX <= targetRect.right &&
            event.clientY >= targetRect.top &&
            event.clientY <= targetRect.bottom
          );
        });
        if (target) {
          this.placeObject(object, target, event.clientX, event.clientY, rect);
        } else {
          ds.originalParent?.appendChild(object);
          object.removeAttribute("style");
        }

        document.body.classList.remove("object-dragging");
        this.dragState.object = null;
      });

      object.addEventListener("pointercancel", (event) => {
        const ds = this.dragState;
        if (ds.object !== object) return;
        try {
          if (object.hasPointerCapture?.(event.pointerId)) {
            object.releasePointerCapture(event.pointerId);
          }
        } catch {
          // Ignore release failure
        }
        if (ds.didDrag) {
          object.classList.remove("is-drag-preview");
          ds.originalParent?.appendChild(object);
          object.removeAttribute("style");
          document.body.classList.remove("object-dragging");
        }
        this.dragState.object = null;
      });
    });
  }

  placeObject(object, target, clientX, clientY, objectRect) {
    const isDesk = target.classList.contains("desk");
    const targetRect = target.getBoundingClientRect();
    const pos = computeDropPlacement({ clientX, clientY, targetRect, objectRect, isDesk });

    object.classList.add("is-placed");
    object.style.right = "auto";
    object.style.transform = "";
    object.style.left = pos.left;
    object.style.top = pos.top;
    object.style.bottom = pos.bottom;
    target.appendChild(object);

    const targetName = isDesk
      ? "desk"
      : Array.from(target.classList).find((c) => /^shelf-(one|two|three|four)$/.test(c));

    this.saveObjectToActiveLayout(this.getObjectKey(object), {
      target: targetName,
      ...pos
    });
  }

  saveObjectToActiveLayout(key, entry) {
    const layoutName = state.preferences.activeLayoutName || "Default Desk";
    const all = { ...(state.savedLayouts || {}) };
    all[layoutName] = {
      ...(all[layoutName] || {}),
      [key]: entry
    };
    persistLocalCollection("savedLayouts", all);
  }

  restoreCurrentLayout(objects, deskTarget) {
    const layoutName = state.preferences.activeLayoutName || "Default Desk";
    const layout = state.savedLayouts?.[layoutName] || {};
    objects.forEach((object) => {
      const saved = layout[this.getObjectKey(object)];
      if (!saved) return;
      const target = saved.target === "desk"
        ? deskTarget
        : saved.target
          ? document.querySelector(`.${saved.target}`)
          : null;
      if (!target) return;
      target.appendChild(object);
      object.classList.add("is-placed");
      object.style.right = "auto";
      object.style.transform = "";
      if (saved.left) object.style.left = saved.left;
      if (saved.top) object.style.top = saved.top;
      if (saved.bottom) object.style.bottom = saved.bottom;
    });
  }

  resetLayout() {
    for (const [selector, parentSelector] of DEFAULT_PARENTS) {
      const obj = document.querySelector(selector);
      const parent = document.querySelector(parentSelector);
      if (obj && parent) {
        parent.appendChild(obj);
        obj.classList.remove("is-placed");
        obj.removeAttribute("style");
      }
    }
    const layoutName = state.preferences.activeLayoutName || "Default Desk";
    const all = { ...(state.savedLayouts || {}) };
    delete all[layoutName];
    persistLocalCollection("savedLayouts", all);
  }
}

export const layoutManager = new LayoutManager();
