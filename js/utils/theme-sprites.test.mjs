import test from "node:test";
import assert from "node:assert/strict";
import {
  THEMED_SPRITE_IDS,
  hasCustomSpritePack,
  resolveEffectiveThemeForObject,
  resolveObjectSpriteSrc,
  resolveThemeSpritePack
} from "./theme-sprites.js";

test("hasCustomSpritePack identifies all 7 themed sprite packs", () => {
  for (const id of ["space", "jungle", "vintage", "modern", "anime", "ocean", "alchemy"]) {
    assert.equal(hasCustomSpritePack(id), true, `${id} should have custom sprite pack`);
  }
  assert.equal(hasCustomSpritePack("comic"), false);
  assert.equal(hasCustomSpritePack("midnight"), false);
  assert.equal(THEMED_SPRITE_IDS.length, 7);
});

test("resolveObjectSpriteSrc maps custom theme PNGs and preserves default fallbacks", () => {
  assert.equal(resolveObjectSpriteSrc("space", "lamp"), "./assets/sprites/themes/space/lamp.png");
  assert.equal(resolveObjectSpriteSrc("jungle", "buddy"), "./assets/sprites/themes/jungle/buddy.png");
  assert.equal(resolveObjectSpriteSrc("anime", "computer"), "./assets/sprites/themes/anime/computer.png");
  assert.equal(resolveObjectSpriteSrc("vintage", "mug"), "./assets/sprites/themes/vintage/mug.png");
  assert.equal(resolveObjectSpriteSrc("modern", "plant"), "./assets/sprites/themes/modern/plant.png");
  assert.equal(resolveObjectSpriteSrc("ocean", "bird"), "./assets/sprites/themes/ocean/bird.png");
  assert.equal(resolveObjectSpriteSrc("alchemy", "trophy"), "./assets/sprites/themes/alchemy/trophy.png");

  assert.equal(resolveObjectSpriteSrc("comic", "lamp"), "./assets/sprites/themes/comic/lamp.png");
  assert.equal(resolveObjectSpriteSrc("comic", "trophy"), null);
  assert.equal(resolveObjectSpriteSrc("unknown", "headphones"), "./assets/sprites/themes/comic/headphones.png");
});

test("resolveEffectiveThemeForObject lets individual objects override the active room theme", () => {
  assert.equal(resolveEffectiveThemeForObject("computer", "ocean", {}), "ocean");
  assert.equal(resolveEffectiveThemeForObject("computer", "ocean", { computer: "theme:space" }), "space");
  assert.equal(resolveEffectiveThemeForObject("plant", "ocean", { plant: "lavender" }), "ocean");
  assert.equal(resolveEffectiveThemeForObject("trophy", "space", { trophy: "theme:comic" }), "comic");
});

test("resolveThemeSpritePack includes all 8 room sprite slots", () => {
  const pack = resolveThemeSpritePack("jungle");
  assert.deepEqual(Object.keys(pack), [
    "bird",
    "plant",
    "buddy",
    "lamp",
    "computer",
    "headphones",
    "mug",
    "trophy"
  ]);
  for (const src of Object.values(pack)) {
    assert.match(src, /^\.\/assets\/sprites\/themes\/jungle\/[a-z]+\.png$/);
  }
});
