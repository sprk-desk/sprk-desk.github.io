import test from "node:test";
import assert from "node:assert/strict";
import {
  computeDropPlacement,
  canModifyRoomLayout,
  isImmovableRoomObject,
  sanitizeRoomLayoutMap
} from "./layout-geometry.js";

test("computeDropPlacement clamps objects inside desk bounds", () => {
  const result = computeDropPlacement({
    clientX: 2000,
    clientY: -50,
    targetRect: { left: 0, top: 0, bottom: 200, width: 1000, height: 200 },
    objectRect: { width: 80, height: 60 },
    isDesk: true
  });
  assert.equal(result.bottom, "auto");
  assert.equal(parseFloat(result.left), 91.2);
  assert.equal(parseFloat(result.top), 4);
});

test("spectators and locked rooms cannot modify layout", () => {
  assert.equal(canModifyRoomLayout({ isSpectator: true, isLocked: false }), false);
  assert.equal(canModifyRoomLayout({ isSpectator: false, isLocked: true }), false);
  assert.equal(canModifyRoomLayout({ isSpectator: false, isLocked: false }), true);
});

test("computer is marked immovable and stripped from saved layout positions", () => {
  assert.equal(isImmovableRoomObject("computer"), true);
  assert.equal(isImmovableRoomObject("coffee"), false);
  const sanitized = sanitizeRoomLayoutMap({
    computer: { target: "desk", left: "10%", top: "20%", bottom: "auto" },
    coffee: { target: "shelf-one", left: "40%", top: "auto", bottom: "10%" }
  });
  assert.equal("computer" in sanitized, false);
  assert.deepEqual(sanitized.coffee, {
    target: "shelf-one",
    left: "40%",
    top: "auto",
    bottom: "10%"
  });
});
