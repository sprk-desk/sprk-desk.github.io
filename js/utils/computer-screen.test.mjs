import test from "node:test";
import assert from "node:assert/strict";
import {
  isFlatComputerSkin,
  resolveEffectiveComputerSkinKey,
  getComputerScreenFrameBox,
  validateScreenMediaFile,
  sanitizeComputerScreenPrefs
} from "./computer-screen.js";

test("isFlatComputerSkin detects flat starter skins and flat theme monitors", () => {
  assert.equal(isFlatComputerSkin({ skinId: "default", roomThemeId: "comic" }), false);
  assert.equal(isFlatComputerSkin({ skinId: "default", roomThemeId: "modern" }), true);
  assert.equal(isFlatComputerSkin({ skinId: "default", roomThemeId: "editorial" }), true);
  assert.equal(isFlatComputerSkin({ skinId: "theme:modern", roomThemeId: "comic" }), true);
  assert.equal(isFlatComputerSkin({ skinId: "theme:editorial", roomThemeId: "noir" }), true);
  assert.equal(isFlatComputerSkin({ skinId: "flat-dark", roomThemeId: "comic" }), true);
  assert.equal(isFlatComputerSkin({ skinId: "flat-light", roomThemeId: "noir" }), true);
  assert.equal(isFlatComputerSkin({ skinId: "theme:comic", roomThemeId: "editorial" }), false);
});

test("getComputerScreenFrameBox returns inset screen rect for flat monitors only", () => {
  const key = resolveEffectiveComputerSkinKey({ skinId: "flat-dark", roomThemeId: "comic" });
  const box = getComputerScreenFrameBox(key);
  assert.equal(box.left, "3.2%");
  assert.equal(getComputerScreenFrameBox("comic"), null);
});

test("validateScreenMediaFile validates image/video types and local size caps", () => {
  assert.equal(validateScreenMediaFile({ name: "notes.png", type: "image/png", size: 1024 }).ok, true);
  assert.equal(validateScreenMediaFile({ name: "clip.mp4", type: "video/mp4", size: 4 * 1024 * 1024 }).ok, true);
  assert.equal(validateScreenMediaFile({ name: "huge.mp4", type: "video/mp4", size: 25 * 1024 * 1024 }).ok, false);
  assert.equal(validateScreenMediaFile({ name: "script.svg", type: "image/svg+xml", size: 512 }).ok, false);
});

test("sanitizeComputerScreenPrefs blocks unsafe urls and preserves valid settings", () => {
  const xss = sanitizeComputerScreenPrefs({ mode: "url", url: "javascript:alert(1)" });
  assert.equal(xss.mode, "none");
  assert.equal(xss.url, "");

  const clean = sanitizeComputerScreenPrefs({
    mode: "url",
    mediaType: "video",
    url: "https://example.com/loop.mp4",
    fit: "contain",
    muted: false,
    label: "Rain loop"
  });
  assert.equal(clean.mode, "url");
  assert.equal(clean.mediaType, "video");
  assert.equal(clean.fit, "contain");
  assert.equal(clean.muted, false);
  assert.equal(clean.label, "Rain loop");
});
