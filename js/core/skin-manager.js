// Centralized object-skin registry with cross-theme bundle support & skin locking
import { state, savePreferences } from "../state.js";
import { bus } from "./event-bus.js";
import { applyThemeSpritesToDocument } from "../utils/theme-sprites.js";
import {
  getObjectSkinInventory,
  toggleObjectSkinLock
} from "../utils/object-skins.js";
import { isObjectHiddenInSeriousMode } from "../utils/room-settings.js";
import { syncComputerScreenMedia } from "./settings-manager.js";

class SkinManager {
  constructor() {
    this.objects = [];
  }

  registerObjects(roomObjects) {
    this.objects = roomObjects || [];
    this.applySavedSkins();
  }

  applySavedSkins() {
    const saved = state.preferences.skins || {};
    const roomTheme = state.preferences.theme || "comic";
    for (const [type, skinName] of Object.entries(saved)) {
      this.applySkin(type, skinName, { persist: false, syncSprites: false });
    }
    this._syncComputerFlatBezel(saved.computer);
    applyThemeSpritesToDocument(document, roomTheme, saved);
    syncComputerScreenMedia();
  }

  _syncComputerFlatBezel(skinName) {
    const compBtn = document.querySelector(".desk-computer");
    if (!compBtn) return;
    if (skinName === "flat-light") {
      compBtn.dataset.flatBezel = "light";
    } else if (skinName === "flat-dark") {
      compBtn.dataset.flatBezel = "dark";
    } else {
      delete compBtn.dataset.flatBezel;
    }
  }

  listAvailableSkins() {
    const out = [];
    const seen = new Set();
    const roomTheme = state.preferences.theme || "comic";
    const activeSkins = state.preferences.skins || {};
    const lockedSkins = state.preferences.lockedSkins || {};
    const seriousMode = Boolean(state.preferences?.seriousMode);

    for (const obj of this.objects) {
      const type = obj.definition?.type;
      if (!type || type === "room" || type === "bookcase" || type === "desk" || seen.has(type)) {
        continue;
      }
      if (isObjectHiddenInSeriousMode(type, seriousMode)) {
        continue;
      }
      seen.add(type);
      const inv = getObjectSkinInventory({
        objectType: type,
        ownedItemIds: state.ownedItemIds,
        roomThemeId: roomTheme,
        activeSkins,
        lockedSkins,
        seriousMode: Boolean(state.preferences?.seriousMode)
      });
      out.push({
        type,
        label: inv.objectLabel || obj.definition?.hoverText || type,
        current: activeSkins[type] || "default",
        isLocked: inv.isLocked,
        ownedSkins: inv.owned,
        unownedSkins: inv.unowned,
        skins: inv.owned.map((s) => s.skinId)
      });
    }
    return out;
  }

  isLocked(objectType) {
    return Boolean(state.preferences.lockedSkins?.[objectType]);
  }

  toggleLock(objectType) {
    if (!objectType) return false;
    const res = toggleObjectSkinLock({
      objectType,
      currentThemeId: state.preferences.theme || "comic",
      currentSkins: state.preferences.skins || {},
      lockedSkins: state.preferences.lockedSkins || {}
    });
    savePreferences(
      {
        lockedSkins: res.lockedSkins,
        skins: res.skins
      },
      { replaceSkins: true }
    );
    this.applySkin(objectType, res.skins[objectType] || "default", { persist: false });
    bus.emit("skins:changed", { objectType, locked: res.isLocked });
    return res.isLocked;
  }

  applySkin(objectType, skinName, { persist = true, syncSprites = true } = {}) {
    const matching = this.objects.filter((o) => o.definition?.type === objectType);
    const targetSkin = skinName || "default";
    for (const obj of matching) {
      obj.applySkin(targetSkin);
    }

    let nextSkins = { ...(state.preferences.skins || {}) };
    if (targetSkin === "default") {
      delete nextSkins[objectType];
    } else {
      nextSkins[objectType] = targetSkin;
    }

    if (objectType === "computer") {
      this._syncComputerFlatBezel(targetSkin);
    }

    if (persist) {
      savePreferences({ skins: nextSkins }, { replaceSkins: true });
    }
    if (syncSprites) {
      applyThemeSpritesToDocument(document, state.preferences.theme || "comic", nextSkins);
      if (objectType === "computer") {
        syncComputerScreenMedia();
      }
    }
    if (persist) {
      bus.emit("skins:changed", { objectType, skinName: targetSkin });
    }
  }

  resetAll() {
    for (const obj of this.objects) {
      if (obj.definition?.skins?.default || typeof obj.applySkin === "function") {
        obj.applySkin("default");
      }
    }
    this._syncComputerFlatBezel("default");
    savePreferences({ skins: {}, lockedSkins: {} }, { replaceSkins: true });
    applyThemeSpritesToDocument(document, state.preferences.theme || "comic", {});
    syncComputerScreenMedia();
    bus.emit("skins:changed", { reset: true });
  }
}

export const skinManager = new SkinManager();
