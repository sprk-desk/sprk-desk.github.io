// Pure Study Mode, Theme Pricing Unlock & Serious-Mode Copy Rules

export const SERIOUS_THEME_IDS = Object.freeze(["editorial", "noir"]);
export const DARK_THEME_IDS = new Set(["space", "alchemy", "midnight", "noir"]);

export const SERIOUS_OBJECT_NAMES = Object.freeze({
  focus: "Focus Timer",
  register: "Session Log",
  calendar: "Schedule & History",
  tasks: "Task Board",
  diary: "Study Notes",
  audio: "Audio Mixer",
  shop: "Workspace Catalog",
  customization: "Workspace Studio",
  environment: "Environment & Light",
  profile: "Student Profile",
  friends: "Study Contacts",
  community: "Study Rooms",
  buddy: "Session Guide",
  library: "Desk Reference",
  cabinet: "Personal Archive",
  achievements: "Study Milestones",
  coffee: "Break Timer",
  customProp: "Desk Emblem",
  settings: "System Settings",
  ops: "Operations Console"
});

export const SERIOUS_FEATURE_TABS = Object.freeze({
  focus: "Timer",
  register: "Log",
  calendar: "Schedule",
  tasks: "Tasks",
  diary: "Notes",
  audio: "Audio",
  shop: "Catalog",
  customization: "Studio",
  environment: "Environment",
  profile: "Profile",
  friends: "Contacts",
  community: "Rooms",
  buddy: "Guide",
  library: "Reference",
  cabinet: "Archive",
  achievements: "Milestones",
  coffee: "Break",
  customProp: "Emblem",
  settings: "Settings"
});

export function isSeriousTheme(themeId) {
  return SERIOUS_THEME_IDS.includes(String(themeId || ""));
}

export function isThemeFreeInMode(themeId, seriousMode = false) {
  if (themeId === "comic") return true;
  if (Boolean(seriousMode) && isSeriousTheme(themeId)) return true;
  return false;
}

export function isThemeAccessibleInMode(
  themeId,
  { ownedItemIds = [], seriousMode = false } = {}
) {
  if (isThemeFreeInMode(themeId, seriousMode)) return true;
  const owned = new Set(ownedItemIds || []);
  return owned.has(`theme_${themeId}`);
}

export function getThemeDisplayPrice(
  themeId,
  basePrice = 0,
  { ownedItemIds = [], seriousMode = false } = {}
) {
  if (isThemeFreeInMode(themeId, seriousMode)) return 0;
  const owned = new Set(ownedItemIds || []);
  if (owned.has(`theme_${themeId}`)) return 0;
  return Number(basePrice) || 0;
}

export function sanitizeSkinsForMode(
  skinsMap = {},
  { ownedItemIds = [], seriousMode = false } = {}
) {
  const next = {};
  for (const [objType, skinId] of Object.entries(skinsMap || {})) {
    if (typeof skinId === "string" && skinId.startsWith("theme:")) {
      const themeId = skinId.slice(6);
      if (!isThemeAccessibleInMode(themeId, { ownedItemIds, seriousMode })) {
        continue;
      }
    }
    next[objType] = skinId;
  }
  return next;
}

export function resolveSeriousModeTransition({
  nextSeriousMode,
  currentThemeId = "comic",
  preSeriousThemeId = "comic",
  ownedItemIds = [],
  skinsMap = {}
} = {}) {
  const activeSerious = Boolean(nextSeriousMode);

  if (activeSerious) {
    const savedPre = isSeriousTheme(currentThemeId)
      ? (preSeriousThemeId && !isSeriousTheme(preSeriousThemeId) ? preSeriousThemeId : "comic")
      : (currentThemeId || "comic");

    const nextThemeId = isSeriousTheme(currentThemeId)
      ? currentThemeId
      : (DARK_THEME_IDS.has(currentThemeId) ? "noir" : "editorial");

    return {
      seriousMode: true,
      themeId: nextThemeId,
      preSeriousTheme: savedPre,
      skins: sanitizeSkinsForMode(skinsMap, { ownedItemIds, seriousMode: true })
    };
  }

  // Returning to Regular Mode: keep active serious theme ONLY if user actually owns it
  const keepCurrent = isThemeAccessibleInMode(currentThemeId, {
    ownedItemIds,
    seriousMode: false
  });
  const fallbackPre = isThemeAccessibleInMode(preSeriousThemeId, {
    ownedItemIds,
    seriousMode: false
  })
    ? preSeriousThemeId
    : "comic";

  const nextThemeId = keepCurrent ? currentThemeId : fallbackPre;
  return {
    seriousMode: false,
    themeId: nextThemeId,
    preSeriousTheme: fallbackPre,
    skins: sanitizeSkinsForMode(skinsMap, { ownedItemIds, seriousMode: false })
  };
}

export const SERIOUS_HIDDEN_FEATURES = Object.freeze([
  "buddy",
  "achievements",
  "coffee",
  "customProp"
]);

export const SERIOUS_HIDDEN_OBJECT_TYPES = Object.freeze([
  "mascot",
  "trophy",
  "coffee",
  "custom-prop"
]);

export function isFeatureHiddenInSeriousMode(feature, seriousMode = false) {
  return Boolean(seriousMode) && SERIOUS_HIDDEN_FEATURES.includes(String(feature || ""));
}

export function isObjectHiddenInSeriousMode(objectType, seriousMode = false) {
  return Boolean(seriousMode) && SERIOUS_HIDDEN_OBJECT_TYPES.includes(String(objectType || ""));
}

export function isShopCategoryHiddenInSeriousMode(categoryId, seriousMode = false) {
  return Boolean(seriousMode) && String(categoryId || "") === "deco";
}

export function resolveObjectDisplayName(feature, defaultName, seriousMode = false) {
  if (!seriousMode) return defaultName;
  return SERIOUS_OBJECT_NAMES[feature] || defaultName;
}

export function resolveFeatureTabLabel(feature, defaultLabel, seriousMode = false) {
  if (!seriousMode) return defaultLabel;
  return SERIOUS_FEATURE_TABS[feature] || defaultLabel;
}
