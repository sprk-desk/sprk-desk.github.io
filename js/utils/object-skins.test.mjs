import test from "node:test";
import assert from "node:assert/strict";
import {
  FEATURE_OBJECT_TYPE,
  THEME_BUNDLE_IDS,
  getObjectTypeForFeature,
  getObjectSkinInventory,
  resolveThemeChangeSkins,
  toggleObjectSkinLock
} from "./object-skins.js";

test("every object-backed dialog feature resolves an object type", () => {
  for (const [feature, objType] of Object.entries(FEATURE_OBJECT_TYPE)) {
    assert.equal(getObjectTypeForFeature(feature), objType);
  }
  assert.equal(getObjectTypeForFeature("ops"), null);
});

test("getObjectSkinInventory splits owned vs unowned skins cleanly for an object", () => {
  const inv = getObjectSkinInventory({
    objectType: "computer",
    ownedItemIds: ["theme_comic", "theme_modern", "theme_space"],
    roomThemeId: "ocean",
    activeSkins: { computer: "theme:space" },
    lockedSkins: { computer: true }
  });

  assert.equal(inv.isLocked, true);
  assert.equal(inv.currentSkin, "theme:space");

  const ownedIds = inv.owned.map((s) => s.skinId);
  assert.ok(ownedIds.includes("theme:comic"));
  assert.ok(ownedIds.includes("theme:modern"));
  assert.ok(ownedIds.includes("theme:space"));
  assert.equal(ownedIds.includes("theme:ocean"), false);

  const spaceEntry = inv.owned.find((s) => s.skinId === "theme:space");
  assert.equal(spaceEntry.active, true);

  const unownedIds = inv.unowned.map((s) => s.skinId);
  assert.ok(unownedIds.includes("theme:ocean"));
  assert.ok(unownedIds.includes("theme:jungle"));
  assert.equal(THEME_BUNDLE_IDS.length, 8);
});

test("new users get only the comic theme bundle for free", () => {
  const inv = getObjectSkinInventory({
    objectType: "computer",
    ownedItemIds: [],
    roomThemeId: "comic"
  });

  assert.ok(inv.owned.some((skin) => skin.skinId === "theme:comic"));
  assert.ok(inv.unowned.some((skin) => skin.skinId === "theme:modern"));
});

test("getObjectSkinInventory separates owned and unowned standalone shop skins", () => {
  const unownedPlant = getObjectSkinInventory({
    objectType: "plant",
    ownedItemIds: ["theme_comic", "theme_modern"],
    roomThemeId: "comic",
    activeSkins: {}
  });
  assert.equal(unownedPlant.unowned.some((s) => s.skinId === "lavender"), true);
  assert.equal(unownedPlant.owned.some((s) => s.skinId === "lavender"), false);

  const ownedPlant = getObjectSkinInventory({
    objectType: "plant",
    ownedItemIds: ["theme_comic", "theme_modern", "skin_plant_lavender"],
    roomThemeId: "comic",
    activeSkins: { plant: "lavender" }
  });
  const lav = ownedPlant.owned.find((s) => s.skinId === "lavender");
  assert.ok(lav);
  assert.equal(lav.active, true);
  assert.equal(ownedPlant.unowned.some((s) => s.skinId === "lavender"), false);
});

test("resolveThemeChangeSkins preserves locked object skins and lets unlocked objects follow the new theme", () => {
  const res = resolveThemeChangeSkins({
    nextThemeId: "ocean",
    currentThemeId: "space",
    currentSkins: {
      computer: "theme:space",
      plant: "lavender",
      clock: "theme:vintage"
    },
    lockedSkins: {
      computer: true,
      clock: false
    }
  });

  assert.equal(res.themeId, "ocean");
  assert.equal(res.skins.computer, "theme:space");
  assert.equal(res.skins.plant, undefined);
  assert.equal(res.skins.clock, undefined);
});

test("toggleObjectSkinLock freezes current room theme skin when locking an unoverridden object", () => {
  const locked = toggleObjectSkinLock({
    objectType: "computer",
    currentThemeId: "space",
    currentSkins: {},
    lockedSkins: {}
  });
  assert.equal(locked.isLocked, true);
  assert.equal(locked.lockedSkins.computer, true);
  assert.equal(locked.skins.computer, "theme:space");

  const afterThemeSwitch = resolveThemeChangeSkins({
    nextThemeId: "ocean",
    currentThemeId: "space",
    currentSkins: locked.skins,
    lockedSkins: locked.lockedSkins
  });
  assert.equal(afterThemeSwitch.skins.computer, "theme:space");

  const unlocked = toggleObjectSkinLock({
    objectType: "computer",
    currentThemeId: "ocean",
    currentSkins: afterThemeSwitch.skins,
    lockedSkins: locked.lockedSkins
  });
  assert.equal(unlocked.isLocked, false);
  assert.equal(unlocked.lockedSkins.computer, false);
});
