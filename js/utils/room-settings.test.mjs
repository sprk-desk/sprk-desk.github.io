import test from "node:test";
import assert from "node:assert/strict";
import {
  SERIOUS_THEME_IDS,
  isSeriousTheme,
  isThemeFreeInMode,
  isThemeAccessibleInMode,
  getThemeDisplayPrice,
  resolveSeriousModeTransition,
  resolveObjectDisplayName,
  resolveFeatureTabLabel,
  isFeatureHiddenInSeriousMode,
  isObjectHiddenInSeriousMode,
  isShopCategoryHiddenInSeriousMode
} from "./room-settings.js";

test("SERIOUS_THEME_IDS covers editorial and noir only", () => {
  assert.deepEqual([...SERIOUS_THEME_IDS], ["editorial", "noir"]);
  assert.equal(isSeriousTheme("editorial"), true);
  assert.equal(isSeriousTheme("noir"), true);
  assert.equal(isSeriousTheme("comic"), false);
});

test("editorial and noir are free in Serious Mode and paid in Regular Mode unless owned", () => {
  assert.equal(isThemeFreeInMode("editorial", true), true);
  assert.equal(isThemeFreeInMode("noir", true), true);
  assert.equal(isThemeFreeInMode("editorial", false), false);
  assert.equal(isThemeFreeInMode("noir", false), false);
  assert.equal(isThemeFreeInMode("comic", false), true);

  // Regular mode accessibility requires ownership for editorial/noir
  assert.equal(
    isThemeAccessibleInMode("editorial", { ownedItemIds: ["theme_comic"], seriousMode: false }),
    false
  );
  assert.equal(
    isThemeAccessibleInMode("noir", { ownedItemIds: ["theme_comic"], seriousMode: false }),
    false
  );
  assert.equal(
    getThemeDisplayPrice("editorial", 30, { ownedItemIds: ["theme_comic"], seriousMode: false }),
    30
  );
  assert.equal(
    getThemeDisplayPrice("noir", 35, { ownedItemIds: ["theme_comic"], seriousMode: false }),
    35
  );

  // Serious mode makes both free even without ownership
  assert.equal(
    isThemeAccessibleInMode("editorial", { ownedItemIds: ["theme_comic"], seriousMode: true }),
    true
  );
  assert.equal(
    isThemeAccessibleInMode("noir", { ownedItemIds: ["theme_comic"], seriousMode: true }),
    true
  );
  assert.equal(
    getThemeDisplayPrice("editorial", 30, { ownedItemIds: ["theme_comic"], seriousMode: true }),
    0
  );
  assert.equal(
    getThemeDisplayPrice("noir", 35, { ownedItemIds: ["theme_comic"], seriousMode: true }),
    0
  );

  // Owned in regular mode remains accessible & 0 to re-equip
  assert.equal(
    isThemeAccessibleInMode("noir", { ownedItemIds: ["theme_comic", "theme_noir"], seriousMode: false }),
    true
  );
  assert.equal(
    getThemeDisplayPrice("noir", 35, { ownedItemIds: ["theme_comic", "theme_noir"], seriousMode: false }),
    0
  );
});

test("enabling Serious Mode switches light themes to editorial, dark themes to noir, and saves preSeriousTheme", () => {
  const lightEnter = resolveSeriousModeTransition({
    nextSeriousMode: true,
    currentThemeId: "comic",
    ownedItemIds: ["theme_comic"]
  });
  assert.equal(lightEnter.seriousMode, true);
  assert.equal(lightEnter.themeId, "editorial");
  assert.equal(lightEnter.preSeriousTheme, "comic");

  const darkEnter = resolveSeriousModeTransition({
    nextSeriousMode: true,
    currentThemeId: "space",
    ownedItemIds: ["theme_comic", "theme_space"]
  });
  assert.equal(darkEnter.themeId, "noir");
  assert.equal(darkEnter.preSeriousTheme, "space");
});

test("exiting Serious Mode reverts unowned serious themes and strips unowned serious skin overrides", () => {
  const exitUnowned = resolveSeriousModeTransition({
    nextSeriousMode: false,
    currentThemeId: "noir",
    preSeriousThemeId: "modern",
    ownedItemIds: ["theme_comic", "theme_modern"],
    skinsMap: { computer: "theme:noir", plant: "theme:modern" }
  });
  assert.equal(exitUnowned.seriousMode, false);
  assert.equal(exitUnowned.themeId, "modern");
  assert.equal(exitUnowned.skins.computer, undefined);
  assert.equal(exitUnowned.skins.plant, "theme:modern");

  const exitOwned = resolveSeriousModeTransition({
    nextSeriousMode: false,
    currentThemeId: "editorial",
    preSeriousThemeId: "comic",
    ownedItemIds: ["theme_comic", "theme_editorial"],
    skinsMap: { computer: "theme:editorial" }
  });
  assert.equal(exitOwned.themeId, "editorial");
  assert.equal(exitOwned.skins.computer, "theme:editorial");
});

test("serious mode resolves sober emoji-free dialog names and tabs", () => {
  assert.equal(resolveObjectDisplayName("shop", "Merchant Bird", false), "Merchant Bird");
  assert.equal(resolveObjectDisplayName("shop", "Merchant Bird", true), "Workspace Catalog");
  assert.equal(resolveFeatureTabLabel("tasks", "📌 Board", true), "Tasks");
});

test("serious mode hides playful features, non-essential objects, and shop decor", () => {
  assert.equal(isFeatureHiddenInSeriousMode("coffee", false), false);
  assert.equal(isFeatureHiddenInSeriousMode("coffee", true), true);
  assert.equal(isFeatureHiddenInSeriousMode("buddy", true), true);
  assert.equal(isFeatureHiddenInSeriousMode("achievements", true), true);
  assert.equal(isFeatureHiddenInSeriousMode("customProp", true), true);
  assert.equal(isFeatureHiddenInSeriousMode("focus", true), false);
  assert.equal(isObjectHiddenInSeriousMode("mascot", true), true);
  assert.equal(isObjectHiddenInSeriousMode("settings", true), false);
  assert.equal(isShopCategoryHiddenInSeriousMode("deco", true), true);
  assert.equal(isShopCategoryHiddenInSeriousMode("theme", true), false);
});
