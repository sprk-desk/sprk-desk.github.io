import test from "node:test";
import assert from "node:assert/strict";
import {
  DIALOG_OBJECT_DEFS,
  getDialogObjectMeta,
  computeVisualizerBars
} from "./dialog-objects.js";

test("every registered dialog feature resolves an object name and visual picture", () => {
  const features = Object.keys(DIALOG_OBJECT_DEFS);
  assert.ok(features.length >= 15);

  for (const feature of features) {
    const meta = getDialogObjectMeta(feature, "comic");
    assert.ok(meta.objectName && meta.objectName.length > 0, `${feature} missing objectName`);
    assert.ok(
      meta.pictureHtml.includes("<img") || meta.pictureHtml.includes("<svg"),
      `${feature} pictureHtml should render an img or svg`
    );
  }
});

test("theme-aware sprite object pictures resolve themed PNG paths", () => {
  const spaceBird = getDialogObjectMeta("shop", "space");
  assert.match(spaceBird.pictureHtml, /assets\/sprites\/themes\/space\/bird\.png/);
  assert.equal(spaceBird.objectName, "Merchant Bird");

  const spaceTrophy = getDialogObjectMeta("achievements", "space");
  assert.match(spaceTrophy.pictureHtml, /assets\/sprites\/themes\/space\/trophy\.png/);

  const overriddenComputer = getDialogObjectMeta("community", "ocean", { computer: "theme:space" });
  assert.match(overriddenComputer.pictureHtml, /assets\/sprites\/themes\/space\/computer\.png/);

  const comicTrophy = getDialogObjectMeta("achievements", "comic");
  assert.match(comicTrophy.pictureHtml, /<svg/);
});

test("computeVisualizerBars stays low when paused and animates within bounds when playing", () => {
  const paused = computeVisualizerBars({
    isPlaying: false,
    levels: { rain: 0.7 },
    barCount: 16,
    tick: 10
  });
  assert.equal(paused.length, 16);
  assert.ok(paused.every((v) => v <= 0.25));

  const playing = computeVisualizerBars({
    isPlaying: true,
    levels: { rain: 0.7, lofi: 0.5 },
    barCount: 16,
    tick: 12
  });
  assert.equal(playing.length, 16);
  assert.ok(playing.some((v) => v > 0.3));
  assert.ok(playing.every((v) => v >= 0.12 && v <= 1));
});
