// Pure Per-Object Skin Inventory, Cross-Theme Overrides & Skin Locking Logic
import { SHOP_CATALOG, SKIN_STYLES, THEME_PALETTES } from "./shop-catalog.js";
import { hasCustomSpritePack, resolveObjectSpriteSrc } from "./theme-sprites.js";

export const FEATURE_OBJECT_TYPE = {
  focus: "clock",
  register: "hourglass",
  calendar: "calendar",
  tasks: "pinboard",
  diary: "notebook",
  audio: "headphones",
  shop: "bird",
  customization: "plant",
  environment: "window",
  profile: "photo-frame",
  friends: "phone",
  community: "computer",
  buddy: "mascot",
  library: "bookshelf",
  cabinet: "drawer",
  achievements: "trophy",
  coffee: "coffee",
  lamp: "lamp"
};

export const OBJECT_TYPE_LABELS = {
  clock: "Wall Clock",
  hourglass: "Hourglass",
  calendar: "Wall Calendar",
  pinboard: "Cork Pinboard",
  notebook: "Desk Notebook",
  headphones: "Headphones",
  bird: "Merchant Bird",
  plant: "Desk Plant",
  window: "Garden Window",
  "photo-frame": "Photo Frame",
  phone: "Desk Phone",
  computer: "Study Computer",
  mascot: "Study Buddy",
  bookshelf: "Bookshelf",
  drawer: "Cabinet Drawer",
  trophy: "Shelf Trophy",
  coffee: "Coffee Mug",
  lamp: "Desk Lamp"
};

export const THEME_BUNDLE_IDS = [
  "comic",
  "modern",
  "vintage",
  "space",
  "jungle",
  "anime",
  "ocean",
  "alchemy"
];

export const STARTER_OBJECT_SKINS = {
  bookshelf: [{ skinName: "pastel", name: "Pastel Cloth", swatch: "#e8a4a4" }],
  "photo-frame": [{ skinName: "walnut", name: "Walnut Wood", swatch: "#8b5a3c" }],
  pinboard: [{ skinName: "mint", name: "Mint Cork", swatch: "#9fc9b1" }],
  drawer: [{ skinName: "brass", name: "Antique Brass", swatch: "#b4863f" }],
  calendar: [{ skinName: "ocean", name: "Seafoam Header", swatch: "#4e99ad" }]
};

const SPRITE_OBJECT_KEYS = {
  bird: "bird",
  plant: "plant",
  mascot: "buddy",
  lamp: "lamp",
  computer: "computer",
  headphones: "headphones",
  coffee: "mug",
  trophy: "trophy"
};

export function getObjectTypeForFeature(feature) {
  return FEATURE_OBJECT_TYPE[feature] || null;
}

export function isThemeBundleSkinId(skinId) {
  return typeof skinId === "string" && skinId.startsWith("theme:") && skinId.length > 6;
}

export function extractThemeFromSkinId(skinId) {
  return isThemeBundleSkinId(skinId) ? skinId.slice(6) : null;
}

export function getObjectVisualConfig(objectType, skinId, roomThemeId = "comic") {
  const spriteKey = SPRITE_OBJECT_KEYS[objectType] || null;
  const themeOverride = extractThemeFromSkinId(skinId);
  const effectiveThemeId = themeOverride || roomThemeId || "comic";
  const isCustomSkin = skinId && skinId !== "default" && !themeOverride;
  const styleEntry = isCustomSkin ? (SKIN_STYLES[`${objectType}:${skinId}`] || {}) : {};
  const palette = THEME_PALETTES[effectiveThemeId] || THEME_PALETTES.comic;

  let spriteSrc = null;
  if (objectType === "trophy") {
    spriteSrc = hasCustomSpritePack(effectiveThemeId)
      ? resolveObjectSpriteSrc(effectiveThemeId, "trophy")
      : null;
  } else if (spriteKey) {
    spriteSrc = resolveObjectSpriteSrc(effectiveThemeId, spriteKey);
  }

  return {
    objectType,
    skinId: skinId || "default",
    effectiveThemeId,
    palette,
    spriteKey,
    spriteSrc,
    filterCss: styleEntry.filter || "",
    cssVars: styleEntry.vars || {}
  };
}

export function getObjectSkinInventory({
  objectType,
  ownedItemIds = [],
  roomThemeId = "comic",
  activeSkins = {},
  lockedSkins = {},
  catalog = SHOP_CATALOG
} = {}) {
  const ownedSet = new Set(ownedItemIds || []);
  const currentSkin = activeSkins?.[objectType] || "default";
  const isLocked = Boolean(lockedSkins?.[objectType]);
  const explicitTheme = extractThemeFromSkinId(currentSkin);
  const effectiveSkinId = currentSkin === "default" ? `theme:${roomThemeId || "comic"}` : currentSkin;

  const owned = [];
  const unowned = [];

  // 1. Starter object skins (e.g. pastel bookshelf, walnut frame, mint pinboard, brass drawer, ocean calendar)
  const starters = STARTER_OBJECT_SKINS[objectType] || [];
  for (const starter of starters) {
    const active = currentSkin === starter.skinName;
    owned.push({
      skinId: starter.skinName,
      skinName: starter.skinName,
      name: starter.name,
      kind: "starter-skin",
      targetObject: objectType,
      swatch: starter.swatch,
      price: 0,
      rarity: "starter",
      owned: true,
      active
    });
  }

  // 2. Standalone shop skins for this specific object
  const shopSkins = catalog.filter(
    (item) => item.category === "skin" && item.targetObject === objectType
  );
  for (const item of shopSkins) {
    const isOwned = ownedSet.has(item.id);
    const entry = {
      skinId: item.skinName,
      skinName: item.skinName,
      name: item.name,
      description: item.description,
      kind: "shop-skin",
      targetObject: objectType,
      swatch: item.swatch,
      price: item.price,
      rarity: item.rarity,
      shopItemId: item.id,
      owned: isOwned,
      active: currentSkin === item.skinName
    };
    if (isOwned) owned.push(entry);
    else unowned.push(entry);
  }

  // 3. Theme-bundled skins (themes act as bundles of matching object skins)
  const bundleItems = catalog.filter(
    (item) => item.category === "theme" && THEME_BUNDLE_IDS.includes(item.themeId)
  );
  for (const themeItem of bundleItems) {
    const themeId = themeItem.themeId;
    const bundleSkinId = `theme:${themeId}`;
    const isOwned = ownedSet.has(themeItem.id) || themeId === "comic";
    const isActive =
      currentSkin === bundleSkinId ||
      (currentSkin === "default" && (roomThemeId || "comic") === themeId) ||
      (!explicitTheme && currentSkin === "default" && themeId === "comic" && !THEME_BUNDLE_IDS.includes(roomThemeId));

    const entry = {
      skinId: bundleSkinId,
      skinName: themeId,
      themeId,
      name: themeItem.name,
      description: `Included in ${themeItem.name} theme bundle`,
      kind: "theme-bundle",
      targetObject: objectType,
      swatch: themeItem.swatch,
      price: themeItem.price,
      rarity: themeItem.rarity,
      shopItemId: themeItem.id,
      bundleName: themeItem.name,
      owned: isOwned,
      active: isActive
    };
    if (isOwned) owned.push(entry);
    else unowned.push(entry);
  }

  return {
    objectType,
    objectLabel: OBJECT_TYPE_LABELS[objectType] || objectType,
    currentSkin,
    effectiveSkinId,
    isLocked,
    owned,
    unowned
  };
}

export function resolveThemeChangeSkins({
  nextThemeId = "comic",
  currentThemeId = "comic",
  currentSkins = {},
  lockedSkins = {}
} = {}) {
  const nextSkins = {};
  const keys = new Set([
    ...Object.keys(currentSkins || {}),
    ...Object.keys(lockedSkins || {})
  ]);

  for (const objType of keys) {
    if (lockedSkins?.[objType]) {
      const existing = currentSkins?.[objType];
      if (existing && existing !== "default") {
        nextSkins[objType] = existing;
      } else {
        // Freeze the previous room theme onto this locked object before switching themes
        nextSkins[objType] = `theme:${currentThemeId || "comic"}`;
      }
    }
    // Unlocked objects drop per-object overrides so they match nextThemeId seamlessly
  }

  return {
    themeId: nextThemeId,
    skins: nextSkins
  };
}

export function toggleObjectSkinLock({
  objectType,
  currentThemeId = "comic",
  currentSkins = {},
  lockedSkins = {}
} = {}) {
  const wasLocked = Boolean(lockedSkins?.[objectType]);
  const nextLocked = !wasLocked;
  const nextLockedMap = { ...(lockedSkins || {}), [objectType]: nextLocked };
  const nextSkins = { ...(currentSkins || {}) };

  if (nextLocked && (!nextSkins[objectType] || nextSkins[objectType] === "default")) {
    nextSkins[objectType] = `theme:${currentThemeId || "comic"}`;
  }

  return {
    isLocked: nextLocked,
    lockedSkins: nextLockedMap,
    skins: nextSkins
  };
}
