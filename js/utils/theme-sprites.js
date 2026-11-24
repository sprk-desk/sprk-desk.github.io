// Theme-specific room sprite resolver and safe per-object DOM image switcher

export const BASE_SPRITES = {
  bird: "./assets/sprites/themes/comic/bird.png",
  plant: "./assets/sprites/themes/comic/plant.png",
  buddy: "./assets/sprites/themes/comic/buddy.png",
  lamp: "./assets/sprites/themes/comic/lamp.png",
  computer: "./assets/sprites/themes/comic/computer.png",
  headphones: "./assets/sprites/themes/comic/headphones.png",
  mug: "./assets/sprites/themes/comic/mug.png",
  settings: "./assets/sprites/themes/comic/settings.png",
  trophy: null,
  portrait: "./assets/sprites/portrait_meadow.jpg"
};

export const THEMED_SPRITE_IDS = [
  "space",
  "jungle",
  "vintage",
  "modern",
  "anime",
  "ocean",
  "alchemy",
  "editorial",
  "noir"
];

export const ALL_SPRITE_THEME_IDS = ["comic", ...THEMED_SPRITE_IDS];

export const OBJECT_SPRITE_SELECTORS = {
  bird: ".bird-sprite",
  plant: ".plant-sprite",
  buddy: ".buddy-sprite",
  lamp: ".lamp-sprite",
  computer: ".computer-sprite",
  headphones: ".headphones-sprite",
  mug: ".mug-sprite",
  settings: ".settings-sprite",
  trophy: ".trophy-sprite"
};

export const SPRITE_KEY_TO_OBJECT_TYPE = {
  bird: "bird",
  plant: "plant",
  buddy: "mascot",
  lamp: "lamp",
  computer: "computer",
  headphones: "headphones",
  mug: "coffee",
  settings: "settings",
  trophy: "trophy"
};

export function hasCustomSpritePack(themeId) {
  return THEMED_SPRITE_IDS.includes(themeId);
}

export function resolveEffectiveThemeForObject(objectType, roomThemeId = "comic", skinsMap = {}) {
  const skinId = skinsMap?.[objectType];
  if (typeof skinId === "string" && skinId.startsWith("theme:")) {
    return skinId.slice(6) || roomThemeId;
  }
  return roomThemeId;
}

export function resolveObjectSpriteSrc(themeId, objectKey) {
  if (!Object.prototype.hasOwnProperty.call(BASE_SPRITES, objectKey)) {
    return null;
  }
  if (objectKey === "portrait") {
    return BASE_SPRITES.portrait;
  }
  if (hasCustomSpritePack(themeId)) {
    return `./assets/sprites/themes/${themeId}/${objectKey}.png`;
  }
  return BASE_SPRITES[objectKey];
}

export function resolveThemeSpritePack(themeId) {
  const pack = {};
  for (const key of Object.keys(OBJECT_SPRITE_SELECTORS)) {
    pack[key] = resolveObjectSpriteSrc(themeId, key);
  }
  return pack;
}

export function applyThemeSpritesToDocument(doc, roomThemeId, skinsMap = {}) {
  if (!doc || typeof doc.querySelector !== "function") return;

  for (const [key, selector] of Object.entries(OBJECT_SPRITE_SELECTORS)) {
    const img = doc.querySelector(selector);
    if (!img) continue;

    const objectType = SPRITE_KEY_TO_OBJECT_TYPE[key] || key;
    const effectiveTheme = resolveEffectiveThemeForObject(objectType, roomThemeId, skinsMap);
    const nextSrc = resolveObjectSpriteSrc(effectiveTheme, key);

    if (key === "trophy") {
      const trophyBtn = doc.querySelector(".trophy");
      if (nextSrc) {
        if (img.getAttribute("src") !== nextSrc) {
          img.setAttribute("src", nextSrc);
        }
        trophyBtn?.classList.add("has-trophy-sprite");
      } else {
        img.removeAttribute("src");
        trophyBtn?.classList.remove("has-trophy-sprite");
      }
      continue;
    }

    const fallbackSrc = BASE_SPRITES[key];
    if (nextSrc && img.getAttribute("src") !== nextSrc) {
      img.onerror = () => {
        if (fallbackSrc && img.getAttribute("src") !== fallbackSrc) {
          img.setAttribute("src", fallbackSrc);
        }
      };
      img.setAttribute("src", nextSrc);
    }
  }

  const photoScene = doc.querySelector(".photo-scene");
  if (photoScene) {
    const photoTheme = resolveEffectiveThemeForObject("photo-frame", roomThemeId, skinsMap);
    photoScene.dataset.photoTheme = hasCustomSpritePack(photoTheme) ? photoTheme : "default";
  }
}
