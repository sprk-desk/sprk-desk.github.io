// Applies fixed non-draggable room decorations & custom movable prop appearance to the room DOM
import { state, savePreferences, isSpectatorMode } from "../state.js";
import { bus } from "./event-bus.js";
import {
  DECORATION_SLOTS,
  normalizeDecorationsMap,
  applyDecorationPatch,
  renderDecorationSvg
} from "../utils/decorations.js";
import { sanitizeAvatarUrl } from "../utils/profile-helpers.js";

const CUSTOM_PROP_SCALES = {
  sm: "0.78",
  md: "1",
  lg: "1.28"
};

class DecorationManager {
  init() {
    this.apply();
    this.applyCustomProp();
  }

  getActiveDecorations() {
    const raw = state.spectatingRoom
      ? state.spectatingRoom.decorations
      : state.preferences.decorations;
    return normalizeDecorationsMap(raw);
  }

  apply() {
    const active = this.getActiveDecorations();
    for (const slot of DECORATION_SLOTS) {
      const el = document.querySelector(slot.selector);
      if (!el) continue;
      const styleId = active[slot.id] || slot.defaultStyle;
      if (styleId === "none") {
        el.hidden = true;
        el.innerHTML = "";
        delete el.dataset.decoStyle;
      } else {
        el.hidden = false;
        el.dataset.decoStyle = styleId;
        el.innerHTML = renderDecorationSvg(slot.id, styleId);
      }
    }
  }

  setSlotStyle(slotId, styleId, { persist = true } = {}) {
    if (isSpectatorMode()) return;
    const next = applyDecorationPatch(state.preferences.decorations, slotId, styleId);
    if (persist) {
      savePreferences({ decorations: next });
    }
    this.apply();
    bus.emit("decorations:changed", next);
  }

  getActiveCustomProp() {
    const raw = state.spectatingRoom
      ? (state.spectatingRoom.customProp || {})
      : (state.preferences.customProp || {});
    return {
      imageUrl: sanitizeAvatarUrl(raw.imageUrl || ""),
      label: String(raw.label || "Custom Keepsake").trim().slice(0, 32) || "Custom Keepsake",
      size: CUSTOM_PROP_SCALES[raw.size] ? raw.size : "md",
      frameStyle: raw.frameStyle === "framed" ? "framed" : "sprite"
    };
  }

  applyCustomProp() {
    const el = document.querySelector(".custom-prop");
    if (!el) return;
    const prop = this.getActiveCustomProp();
    const img = el.querySelector(".custom-prop-img");

    el.dataset.label = prop.label;
    el.setAttribute("aria-label", prop.label);
    el.dataset.frameStyle = prop.frameStyle;
    el.style.setProperty("--custom-prop-scale", CUSTOM_PROP_SCALES[prop.size] || "1");

    if (img && prop.imageUrl) {
      if (img.getAttribute("src") !== prop.imageUrl) {
        img.setAttribute("src", prop.imageUrl);
      }
      el.classList.add("has-custom-image");
    } else {
      img?.removeAttribute("src");
      el.classList.remove("has-custom-image");
    }
  }
}

export const decorationManager = new DecorationManager();
