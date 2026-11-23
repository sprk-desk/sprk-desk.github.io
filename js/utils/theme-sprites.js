// Theme-specific room sprite resolver and safe DOM image switcher

export const BASE_SPRITES = {
  bird: "./assets/sprites/bird.png",
  plant: "./assets/sprites/plant.png",
  buddy: "./assets/sprites/buddy.png",
  lamp: "./assets/sprites/lamp.png",
  computer: "./assets/sprites/computer.png",
  headphones: "./assets/sprites/headphones.png",
  mug: "./assets/sprites/mug.png",
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
  "alchemy"
];

export const OBJECT_SPRITE_SELECTORS = {
  bird: ".bird-sprite",
  plant: ".plant-sprite",
  buddy: ".buddy-sprite",
  lamp: ".lamp-sprite",
  computer: ".computer-sprite",
  headphones: ".headphones-sprite",
  mug: ".mug-sprite",
  trophy: ".trophy-sprite"
};

export function hasCustomSpritePack(themeId) {
  return THEMED_SPRITE_IDS.includes(themeId);
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

export function applyThemeSpritesToDocument(doc, themeId) {
  if (!doc || typeof doc.querySelector !== "function") return;
  const pack = resolveThemeSpritePack(themeId);

  for (const [key, selector] of Object.entries(OBJECT_SPRITE_SELECTORS)) {
    const img = doc.querySelector(selector);
    if (!img) continue;
    const nextSrc = pack[key];

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
    photoScene.dataset.photoTheme = hasCustomSpritePack(themeId) ? themeId : "default";
  }
}
