// Window-scoped pointer-events room object placement, immovable computer enforcement, cloud sync & spectator layout
import { state, persistLocalCollection, isSpectatorMode } from "../state.js";
import { bus } from "./event-bus.js";
import { lightingManager } from "./lighting-manager.js";
import { computeDropPlacement, canModifyRoomLayout, isImmovableRoomObject } from "../utils/layout-geometry.js";

const DEFAULT_PARENTS = [
  [".desk-clock", ".shelf-one"],
  [".desk-plant", ".shelf-one"],
  [".wall-calendar", ".shelf-two"],
  [".trophy", ".shelf-two"],
  [".mascot", ".shelf-three"],
  [".photo-frame", ".shelf-three"],
  [".bookshelf", ".shelf-four"],
  [".custom-prop", ".shelf-four"],
  [".desk-lamp", ".desk"],
  [".desk-computer", ".desk"],
  [".desk-hourglass", ".desk"],
  [".desk-phone", ".desk"],
  [".desk-notebook", ".desk"],
  [".desk-headphones", ".desk"],
  [".settings-panel", ".desk"],
  [".coffee-mug", ".desk"]
];

class LayoutManager {
  constructor() {
    this.dragState = null;
    this.shelfTargets = [];
    this.deskTarget = null;
    this.draggableObjects = [];

    this._onWindowPointerMove = this._onWindowPointerMove.bind(this);
    this._onWindowPointerUp = this._onWindowPointerUp.bind(this);
    this._onWindowPointerCancel = this._onWindowPointerCancel.bind(this);
  }

  getObjectKey(el) {
    return (
      el.dataset.objectType ||
      Array.from(el.classList).find(
        (c) =>
          c !== "room-object" &&
          c !== "interactive-object" &&
          c !== "is-placed" &&
          c !== "draggable-object" &&
          c !== "is-drag-preview"
      ) ||
      "object"
    );
  }

  init() {
    this.shelfTargets = Array.from(document.querySelectorAll(".bookcase .shelf"));
    this.deskTarget = document.querySelector(".desk");
    this.draggableObjects = Array.from(
      document.querySelectorAll(
        ".room-object:not(.merchant-bird):not(.pinboard):not(.window-object):not(.desk-computer), .photo-frame"
      )
    ).filter((el) => !isImmovableRoomObject(this.getObjectKey(el)));

    this.restoreOwnLayout();

    this.draggableObjects.forEach((object) => {
      object.classList.add("draggable-object");
      object.setAttribute("draggable", "false");

      object.addEventListener("dragstart", (event) => {
        event.preventDefault();
      });

      object.addEventListener("click", (event) => {
        if (object.dataset.suppressClick === "true") {
          event.preventDefault();
          event.stopPropagation();
          object.dataset.suppressClick = "false";
        }
      }, true);

      object.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (this.dragState) return;
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
          prevInlineStyle: object.getAttribute("style") || "",
          wasPlaced: object.classList.contains("is-placed"),
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          width: rect.width,
          height: rect.height,
          didDrag: false
        };

        window.addEventListener("pointermove", this._onWindowPointerMove);
        window.addEventListener("pointerup", this._onWindowPointerUp);
        window.addEventListener("pointercancel", this._onWindowPointerCancel);
        window.addEventListener("blur", this._onWindowPointerCancel);
      });
    });
  }

  _detachWindowListeners() {
    window.removeEventListener("pointermove", this._onWindowPointerMove);
    window.removeEventListener("pointerup", this._onWindowPointerUp);
    window.removeEventListener("pointercancel", this._onWindowPointerCancel);
    window.removeEventListener("blur", this._onWindowPointerCancel);
  }

  _clearDropHighlights() {
    for (const target of [...this.shelfTargets, this.deskTarget]) {
      target?.classList.remove("is-drop-target");
    }
  }

  _findDropTarget(clientX, clientY) {
    const dropTargets = [...this.shelfTargets, this.deskTarget].filter(Boolean);
    return dropTargets.find((candidate) => {
      const targetRect = candidate.getBoundingClientRect();
      return (
        clientX >= targetRect.left &&
        clientX <= targetRect.right &&
        clientY >= targetRect.top &&
        clientY <= targetRect.bottom
      );
    }) || null;
  }

  _onWindowPointerMove(event) {
    const ds = this.dragState;
    if (!ds || event.pointerId !== ds.pointerId) return;

    const moved = Math.hypot(event.clientX - ds.startX, event.clientY - ds.startY);
    if (!ds.didDrag && moved < 5) return;

    const object = ds.object;
    if (!ds.didDrag) {
      ds.didDrag = true;
      document.body.classList.add("object-dragging");
      object.classList.add("is-drag-preview");
      document.body.appendChild(object);
      object.style.position = "fixed";
      object.style.zIndex = "120";
      object.style.margin = "0";
      object.style.right = "auto";
      object.style.bottom = "auto";
      object.style.maxWidth = "none";
      object.style.maxHeight = "none";
      object.style.width = `${ds.width}px`;
      object.style.height = `${ds.height}px`;
    }

    object.style.left = `${event.clientX - ds.offsetX}px`;
    object.style.top = `${event.clientY - ds.offsetY}px`;

    if (object.classList.contains("desk-lamp")) {
      lightingManager.updateLampOrigin(object.getBoundingClientRect());
    }

    this._clearDropHighlights();
    const hovered = this._findDropTarget(event.clientX, event.clientY);
    if (hovered) hovered.classList.add("is-drop-target");
  }

  _onWindowPointerUp(event) {
    const ds = this.dragState;
    if (!ds || event.pointerId !== ds.pointerId) return;

    this._detachWindowListeners();
    this._clearDropHighlights();

    const object = ds.object;
    if (!ds.didDrag) {
      this.dragState = null;
      return;
    }

    const rect = object.getBoundingClientRect();
    object.classList.remove("is-drag-preview");
    object.dataset.suppressClick = "true";
    window.setTimeout(() => {
      if (object.dataset.suppressClick === "true") {
        object.dataset.suppressClick = "false";
      }
    }, 120);

    // Reset temporary drag-preview box styles cleanly before placing
    object.style.position = "";
    object.style.zIndex = "";
    object.style.margin = "";
    object.style.maxWidth = "";
    object.style.maxHeight = "";
    object.style.width = "";
    object.style.height = "";

    const target = this._findDropTarget(event.clientX, event.clientY);
    if (target) {
      this.placeObject(object, target, event.clientX, event.clientY, rect);
    } else {
      ds.originalParent?.appendChild(object);
      if (ds.prevInlineStyle) object.setAttribute("style", ds.prevInlineStyle);
      else object.removeAttribute("style");
      object.classList.toggle("is-placed", ds.wasPlaced);
      if (object.classList.contains("desk-lamp")) {
        lightingManager.updateLampOrigin();
      }
    }

    document.body.classList.remove("object-dragging");
    this.dragState = null;
  }

  _onWindowPointerCancel() {
    const ds = this.dragState;
    if (!ds) return;
    this._detachWindowListeners();
    this._clearDropHighlights();

    const object = ds.object;
    if (ds.didDrag) {
      object.classList.remove("is-drag-preview");
      ds.originalParent?.appendChild(object);
      if (ds.prevInlineStyle) object.setAttribute("style", ds.prevInlineStyle);
      else object.removeAttribute("style");
      object.classList.toggle("is-placed", ds.wasPlaced);
      document.body.classList.remove("object-dragging");
      if (object.classList.contains("desk-lamp")) {
        lightingManager.updateLampOrigin();
      }
    }
    this.dragState = null;
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

    if (object.classList.contains("desk-lamp")) {
      lightingManager.updateLampOrigin();
    }

    const targetName = isDesk
      ? "desk"
      : Array.from(target.classList).find((c) => /^shelf-(one|two|three|four)$/.test(c));

    this.saveObjectToActiveLayout(this.getObjectKey(object), {
      target: targetName,
      ...pos
    });
  }

  saveObjectToActiveLayout(key, entry) {
    if (isImmovableRoomObject(key)) return;
    const layoutName = state.preferences.activeLayoutName || "Default Desk";
    const all = { ...(state.savedLayouts || {}) };
    all[layoutName] = {
      ...(all[layoutName] || {}),
      [key]: entry
    };
    persistLocalCollection("savedLayouts", all);
    bus.emit("layout:changed", { layoutName, layout: all[layoutName] });
  }

  _resetObjectsToDefaultDom() {
    for (const [selector, parentSelector] of DEFAULT_PARENTS) {
      const obj = document.querySelector(selector);
      const parent = document.querySelector(parentSelector);
      if (obj && parent) {
        parent.appendChild(obj);
        obj.classList.remove("is-placed", "is-drag-preview");
        obj.removeAttribute("style");
      }
    }
  }

  applyLayoutMap(layoutMap = {}) {
    this._resetObjectsToDefaultDom();
    const deskTarget = this.deskTarget || document.querySelector(".desk");
    const objects = this.draggableObjects.length
      ? this.draggableObjects
      : Array.from(
          document.querySelectorAll(
            ".room-object:not(.merchant-bird):not(.pinboard):not(.window-object):not(.desk-computer), .photo-frame"
          )
        );

    objects.forEach((object) => {
      const key = this.getObjectKey(object);
      if (isImmovableRoomObject(key)) return;
      const saved = layoutMap?.[key];
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
    lightingManager.updateLampOrigin();
  }

  restoreOwnLayout() {
    const layoutName = state.preferences.activeLayoutName || "Default Desk";
    const layout = state.savedLayouts?.[layoutName] || {};
    this.applyLayoutMap(layout);
  }

  applySpectatorLayout(layoutMap = {}) {
    this.applyLayoutMap(layoutMap);
  }

  resetLayout() {
    this._resetObjectsToDefaultDom();
    const layoutName = state.preferences.activeLayoutName || "Default Desk";
    const all = { ...(state.savedLayouts || {}) };
    delete all[layoutName];
    persistLocalCollection("savedLayouts", all);
    bus.emit("layout:changed", { layoutName, layout: {} });
  }
}

export const layoutManager = new LayoutManager();
