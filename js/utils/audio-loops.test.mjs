import test from "node:test";
import assert from "node:assert/strict";
import { AMBIENT_LOOP_DISCS, partitionMusicDiscs } from "./audio-loops.js";
import { SHOP_CATALOG } from "./shop-catalog.js";

test("AMBIENT_LOOP_DISCS defines 6 purchasable ambient loop discs including rain, forest, and cafe", () => {
  assert.equal(AMBIENT_LOOP_DISCS.length, 6);
  const loopIds = AMBIENT_LOOP_DISCS.map((d) => d.loopId);
  assert.ok(loopIds.includes("rain"));
  assert.ok(loopIds.includes("forest"));
  assert.ok(loopIds.includes("cafe"));

  for (const disc of AMBIENT_LOOP_DISCS) {
    assert.equal(disc.category, "music");
    assert.equal(disc.targetObject, "audio");
    assert.ok(disc.price > 0, `${disc.id} should cost Study Credits`);
    assert.ok(Object.keys(disc.audioMix).length > 0);
  }
});

test("partitionMusicDiscs separates owned discs from purchasable loop & music discs", () => {
  const builtinDiscs = [
    { id: "builtin_rain", name: "Soft Rain", icon: "🌧", swatch: "#5fa3b8", mix: { rain: 0.65 } }
  ];

  const initial = partitionMusicDiscs({
    builtinDiscs,
    catalogItems: SHOP_CATALOG,
    ownedItemIds: ["music_rainy_vinyl"]
  });

  assert.equal(initial.ownedDiscs.length, 2);
  assert.ok(initial.ownedDiscs.every((d) => d.owned === true));
  assert.ok(initial.purchasableDiscs.some((d) => d.id === "music_loop_rain" && d.owned === false && d.price === 15));
  assert.ok(initial.purchasableDiscs.some((d) => d.id === "music_loop_cafe" && d.owned === false && d.price === 20));

  const afterBuy = partitionMusicDiscs({
    builtinDiscs,
    catalogItems: SHOP_CATALOG,
    ownedItemIds: ["music_rainy_vinyl", "music_loop_rain", "music_loop_forest"]
  });

  assert.equal(afterBuy.ownedDiscs.length, 4);
  assert.ok(afterBuy.ownedDiscs.some((d) => d.id === "music_loop_rain" && d.owned === true));
  assert.ok(afterBuy.ownedDiscs.some((d) => d.id === "music_loop_forest" && d.owned === true));
  assert.ok(!afterBuy.purchasableDiscs.some((d) => d.id === "music_loop_rain"));
});
