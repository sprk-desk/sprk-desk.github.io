import test from "node:test";
import assert from "node:assert/strict";
import {
  SHOP_CATEGORIES,
  SHOP_CATALOG,
  THEME_PALETTES,
  normalizeShopCategory,
  filterShopCatalog,
  getShopCategoryCounts,
  groupShopCatalogByCategory,
  getShopPreviewDescriptor
} from "./shop-catalog.js";

test("shop categories include all, theme, skin, deco, music, and ambience", () => {
  const ids = SHOP_CATEGORIES.map((c) => c.id);
  assert.deepEqual(ids, ["all", "theme", "skin", "deco", "music", "ambience"]);
});

test("normalizeShopCategory resolves valid categories and falls back to all", () => {
  assert.equal(normalizeShopCategory("theme"), "theme");
  assert.equal(normalizeShopCategory(" SKIN "), "skin");
  assert.equal(normalizeShopCategory("deco"), "deco");
  assert.equal(normalizeShopCategory("music"), "music");
  assert.equal(normalizeShopCategory("ambience"), "ambience");
  assert.equal(normalizeShopCategory("unknown"), "all");
  assert.equal(normalizeShopCategory(null), "all");
});

test("filterShopCatalog and getShopCategoryCounts cover every catalog item", () => {
  const counts = getShopCategoryCounts(SHOP_CATALOG);
  assert.equal(counts.all, SHOP_CATALOG.length);
  assert.equal(counts.theme, 16);
  assert.equal(counts.skin, 10);
  assert.equal(counts.deco, 14);
  assert.equal(counts.music, 11);
  assert.equal(counts.ambience, 4);

  for (const cat of ["theme", "skin", "deco", "music", "ambience"]) {
    const filtered = filterShopCatalog(SHOP_CATALOG, cat);
    assert.equal(filtered.length, counts[cat]);
    assert.ok(filtered.every((item) => item.category === cat));
  }

  const grouped = groupShopCatalogByCategory(SHOP_CATALOG);
  assert.equal(grouped.length, 5);
  assert.deepEqual(grouped.map((g) => g.category.id), ["theme", "skin", "deco", "music", "ambience"]);
});

test("every theme in SHOP_CATALOG has a valid palette and room preview descriptor", () => {
  const themes = filterShopCatalog(SHOP_CATALOG, "theme");
  assert.equal(SHOP_CATALOG.find((item) => item.id === "theme_comic").price, 0);
  assert.ok(SHOP_CATALOG.find((item) => item.id === "theme_modern").price > 0);
  assert.ok(SHOP_CATALOG.find((item) => item.id === "theme_editorial").price > 0);
  assert.ok(SHOP_CATALOG.find((item) => item.id === "theme_noir").price > 0);

  for (const item of themes) {
    assert.ok(THEME_PALETTES[item.themeId], `Missing palette for ${item.themeId}`);
    const desc = getShopPreviewDescriptor(item);
    assert.equal(desc.mode, "room");
    assert.equal(desc.themeId, item.themeId);
    assert.ok(desc.featuredSprite);
  }
});

test("object skin preview descriptor returns object-only mode with target object styling", () => {
  const plantSkin = SHOP_CATALOG.find((i) => i.id === "skin_plant_lavender");
  const plantDesc = getShopPreviewDescriptor(plantSkin, "comic");
  assert.equal(plantDesc.mode, "object");
  assert.equal(plantDesc.targetObject, "plant");
  assert.equal(plantDesc.renderKind, "sprite");
  assert.equal(plantDesc.spriteSrc, "./assets/sprites/themes/comic/plant.png");
  assert.match(plantDesc.filterCss, /hue-rotate/);

  const clockSkin = SHOP_CATALOG.find((i) => i.id === "skin_clock_midnight");
  const clockDesc = getShopPreviewDescriptor(clockSkin, "comic");
  assert.equal(clockDesc.mode, "object");
  assert.equal(clockDesc.renderKind, "svg");
  assert.equal(clockDesc.cssVars["--clock-shell"], "#323c59");
});

test("music and ambience items resolve audio and ambience preview descriptors", () => {
  const music = SHOP_CATALOG.find((i) => i.id === "music_sakura_chimes");
  const musicDesc = getShopPreviewDescriptor(music);
  assert.equal(musicDesc.mode, "audio");
  assert.ok(musicDesc.audioMix.lofi > 0);

  for (const loopId of ["music_loop_rain", "music_loop_forest", "music_loop_cafe", "music_loop_brown"]) {
    const loopDisc = SHOP_CATALOG.find((i) => i.id === loopId);
    assert.ok(loopDisc, `Missing ${loopId}`);
    assert.ok(loopDisc.price > 0, `${loopId} should be purchasable`);
    const loopDesc = getShopPreviewDescriptor(loopDisc);
    assert.equal(loopDesc.mode, "audio");
    assert.ok(Object.keys(loopDesc.audioMix).length > 0);
  }

  const ambience = SHOP_CATALOG.find((i) => i.id === "ambience_firefly_meadow");
  const ambienceDesc = getShopPreviewDescriptor(ambience, "space");
  assert.equal(ambienceDesc.mode, "ambience");
  assert.equal(ambienceDesc.preset.weather, "fireflies");
  assert.equal(ambienceDesc.preset.timeOfDay, "night");
});
