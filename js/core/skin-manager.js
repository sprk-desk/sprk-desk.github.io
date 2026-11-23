// Centralized object-skin registry
import { state, savePreferences } from "../state.js";

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
    for (const [type, skinName] of Object.entries(saved)) {
      this.applySkin(type, skinName, { persist: false });
    }
  }

  listAvailableSkins() {
    const out = [];
    for (const obj of this.objects) {
      const type = obj.definition?.type;
      const skins = obj.definition?.skins || {};
      const keys = Object.keys(skins);
      if (keys.length > 1) {
        out.push({
          type,
          label: obj.definition?.hoverText || type,
          current: obj.skin || "default",
          skins: keys
        });
      }
    }
    return out;
  }

  applySkin(objectType, skinName, { persist = true } = {}) {
    const matching = this.objects.filter((o) => o.definition?.type === objectType);
    for (const obj of matching) {
      if (obj.definition?.skins?.[skinName]) {
        obj.applySkin(skinName);
      }
    }
    if (persist) {
      savePreferences({
        skins: {
          ...(state.preferences.skins || {}),
          [objectType]: skinName
        }
      });
    }
  }

  resetAll() {
    for (const obj of this.objects) {
      if (obj.definition?.skins?.default) {
        obj.applySkin("default");
      }
    }
    savePreferences({ skins: {} });
  }
}

export const skinManager = new SkinManager();
