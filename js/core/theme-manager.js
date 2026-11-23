// Centralized 14-theme registry & synchronized room theme + sprite switcher
import { state, savePreferences } from "../state.js";
import { applyThemeSpritesToDocument, hasCustomSpritePack } from "../utils/theme-sprites.js";
import { resolveThemeChangeSkins } from "../utils/object-skins.js";

export const ROOM_THEMES = [
  { id: "comic", name: "Warm Comic Storybook", metaColor: "#f5ecda", swatch: ["#f7eedb", "#e76d50", "#b97848"], description: "Warm storybook parchment with crisp ink outlines", customSprites: false },
  { id: "modern", name: "Modern Cozy", metaColor: "#dbeaf0", swatch: ["#dbeaf0", "#47c5cd", "#214f65"], description: "Cool coastal teal glass and minimalist studio objects", customSprites: true },
  { id: "vintage", name: "Vintage Study", metaColor: "#ece0ca", swatch: ["#ece0ca", "#9c6334", "#5c4028"], description: "Mahogany woodwork, antique brass props, and warm paper", customSprites: true },
  { id: "space", name: "Space Station", metaColor: "#142235", swatch: ["#142235", "#4dc4d6", "#2c4663"], description: "Orbital viewport, astro-hamster, and telemetry gear", customSprites: true },
  { id: "jungle", name: "Jungle Treehouse", metaColor: "#e6efe0", swatch: ["#e6efe0", "#4c8c4a", "#8c6438"], description: "Bamboo canopy, capybara buddy, and rainforest calm", customSprites: true },
  { id: "anime", name: "Anime Lo-Fi Studio", metaColor: "#f6eefa", swatch: ["#f6eefa", "#df779e", "#897aa8"], description: "Pastel sakura bonsai, neko monitor, and twilight vibe", customSprites: true },
  { id: "ocean", name: "Coral Observatory", metaColor: "#d6eef0", swatch: ["#d6eef0", "#e07a67", "#286575"], description: "Brass submarine porthole, sea otter, and coral reef", customSprites: true },
  { id: "alchemy", name: "Starlight Apothecary", metaColor: "#2b233d", swatch: ["#2b233d", "#c78b4b", "#6e4e44"], description: "Candlelit crystals, wizard cat, and starry potion craft", customSprites: true },
  { id: "japanese", name: "Japanese Minimal", metaColor: "#f2ede2", swatch: ["#f2ede2", "#729477", "#b89668"], description: "Shoji lattice light, hinoki cedar, and quiet calm", customSprites: false },
  { id: "rainy", name: "Rainy Day", metaColor: "#ced9e2", swatch: ["#ced9e2", "#517c9c", "#394d5e"], description: "Cool mist tones contrasted by a snug amber lamp", customSprites: false },
  { id: "cottagecore", name: "Cottagecore", metaColor: "#edf2e1", swatch: ["#edf2e1", "#789e64", "#c5945d"], description: "Meadow sage walls, botanical charm, and honey oak", customSprites: false },
  { id: "autumn", name: "Autumn Evening", metaColor: "#f2dec8", swatch: ["#f2dec8", "#cf6a3c", "#8a4f32"], description: "Amber foliage, warm caramel wood, and late-afternoon sun", customSprites: false },
  { id: "winter", name: "Winter Cabin", metaColor: "#dfeaf2", swatch: ["#dfeaf2", "#6892b0", "#7d543c"], description: "Frosted window frames, cedar timber, and hearth warmth", customSprites: false },
  { id: "midnight", name: "Midnight Library", metaColor: "#1a2036", swatch: ["#1a2036", "#d4a84f", "#3a2e4a"], description: "Deep indigo plaster, walnut shelves, and brass reading glow", customSprites: false }
];

class ThemeManager {
  constructor() {
    this.objects = [];
  }

  registerObjects(roomObjects) {
    this.objects = roomObjects || [];
  }

  apply(themeId, { persist = true } = {}) {
    const theme = ROOM_THEMES.find((t) => t.id === themeId) || ROOM_THEMES[0];
    const previousThemeId = state.preferences.theme || "comic";

    let effectiveSkins = state.preferences.skins || {};
    if (persist) {
      const resolved = resolveThemeChangeSkins({
        nextThemeId: theme.id,
        currentThemeId: previousThemeId,
        currentSkins: effectiveSkins,
        lockedSkins: state.preferences.lockedSkins || {}
      });
      effectiveSkins = resolved.skins;
    }

    document.documentElement.dataset.theme = theme.id;
    document.documentElement.dataset.customSpriteTheme = String(hasCustomSpritePack(theme.id));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.metaColor);

    const isSpectating = Boolean(state.spectatingRoom);
    const activeSkinsForDoc = isSpectating ? (state.spectatingRoom?.skins || {}) : effectiveSkins;
    applyThemeSpritesToDocument(document, theme.id, activeSkinsForDoc);

    this.objects.forEach((obj) => {
      const objType = obj.definition?.type;
      if (typeof obj.setTheme === "function") obj.setTheme(theme.id);
      if (typeof obj.applySkin === "function") {
        obj.applySkin(activeSkinsForDoc[objType] || "default");
      }
    });

    if (persist) {
      savePreferences({ theme: theme.id, skins: effectiveSkins }, { replaceSkins: true });
    }
    return theme;
  }
}

export const themeManager = new ThemeManager();
