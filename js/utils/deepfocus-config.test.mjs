import test from "node:test";
import assert from "node:assert/strict";
import {
  DEEPFOCUS_SCENES,
  DEEPFOCUS_PARTICLES,
  PARTICLE_SHOP_ITEMS,
  THEME_DEEPFOCUS_MAP,
  sanitizeBackdropUrl,
  sanitizeDeepFocusSettings,
  isParticleOwned,
  resolveDeepFocusAppearance,
  groupTasksForKanban,
  moveTaskToKanbanColumn,
  computeDeepFocusAnalytics
} from "./deepfocus-config.js";
import { SHOP_CATALOG } from "./shop-catalog.js";

test("THEME_DEEPFOCUS_MAP maps every theme in SHOP_CATALOG to accent, scene, and particle", () => {
  const themeIds = SHOP_CATALOG.filter((i) => i.category === "theme").map((i) => i.themeId);
  const sceneIds = new Set(DEEPFOCUS_SCENES.map((s) => s.id));
  const particleIds = new Set(DEEPFOCUS_PARTICLES.map((p) => p.id));

  assert.equal(themeIds.length, 16);
  for (const id of themeIds) {
    const spec = THEME_DEEPFOCUS_MAP[id];
    assert.ok(spec, `Missing DeepFocus mapping for theme "${id}"`);
    assert.match(spec.accent, /^#[0-9a-f]{6}$/i);
    assert.ok(sceneIds.has(spec.sceneId), `Invalid scene "${spec.sceneId}" for theme "${id}"`);
    assert.ok(particleIds.has(spec.particleId), `Invalid particle "${spec.particleId}" for theme "${id}"`);
  }
});

test("purchasable particle packs require shop ownership while starter particles are free", () => {
  assert.equal(PARTICLE_SHOP_ITEMS.length, 5);
  assert.equal(isParticleOwned("none", []), true);
  assert.equal(isParticleOwned("ambient_drift", []), true);
  assert.equal(isParticleOwned("rain", []), false);
  assert.equal(isParticleOwned("fireflies", ["particle_fireflies"]), true);
  assert.equal(isParticleOwned("starlight", ["particle_rain"]), false);
});

test("resolveDeepFocusAppearance applies theme palette and scene while respecting particle ownership", () => {
  const spaceUnowned = resolveDeepFocusAppearance({
    themeId: "space",
    deepFocusPrefs: { followThemeScene: true, followThemeParticle: true },
    ownedItemIds: []
  });
  assert.equal(spaceUnowned.accent, "#22d3ee");
  assert.equal(spaceUnowned.sceneId, "orbital_space");
  assert.equal(spaceUnowned.backdropUrl, "./assets/backdrops/orbital_space.jpg");
  assert.equal(spaceUnowned.particleId, "ambient_drift");

  const spaceOwned = resolveDeepFocusAppearance({
    themeId: "space",
    deepFocusPrefs: { followThemeScene: true, followThemeParticle: true },
    ownedItemIds: ["particle_starlight"]
  });
  assert.equal(spaceOwned.particleId, "starlight");
});

test("sanitizeBackdropUrl and sanitizeDeepFocusSettings clamp sliders and block unsafe URLs", () => {
  assert.equal(sanitizeBackdropUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeBackdropUrl("https://example.com/bg.jpg"), "https://example.com/bg.jpg");
  assert.equal(sanitizeBackdropUrl("./assets/backdrops/ocean_coast.jpg"), "./assets/backdrops/ocean_coast.jpg");

  const sanitized = sanitizeDeepFocusSettings({
    blur: 99,
    brightness: 10,
    particleSpeed: 9,
    particleOpacity: 0,
    particleDensity: 500,
    timerTab: "invalid"
  });
  assert.equal(sanitized.blur, 24);
  assert.equal(sanitized.brightness, 40);
  assert.equal(sanitized.particleSpeed, 2.5);
  assert.equal(sanitized.particleOpacity, 0.1);
  assert.equal(sanitized.particleDensity, 140);
  assert.equal(sanitized.timerTab, "pomodoro");
});

test("groupTasksForKanban separates todo, in-progress, and done tasks cleanly", () => {
  const grouped = groupTasksForKanban([
    { id: "1", title: "A", completed: false },
    { id: "2", title: "B", completed: false, kanbanStatus: "progress" },
    { id: "3", title: "C", completed: true },
    { id: "4", title: "D", completed: false, kanbanStatus: "done" }
  ]);
  assert.deepEqual(grouped.todo.map((t) => t.id), ["1"]);
  assert.deepEqual(grouped.progress.map((t) => t.id), ["2"]);
  assert.deepEqual(grouped.done.map((t) => t.id), ["3", "4"]);
});

test("moveTaskToKanbanColumn moves tasks between todo, progress, and done via drag-and-drop", () => {
  const initial = [
    { id: "t1", title: "Read Ch. 4", completed: false, kanbanStatus: "todo" },
    { id: "t2", title: "Quiz Prep", completed: true, kanbanStatus: "done" }
  ];

  const step1 = moveTaskToKanbanColumn(initial, "t1", "progress");
  assert.equal(step1.changed, true);
  assert.equal(step1.updatedTask.kanbanStatus, "progress");
  assert.equal(step1.updatedTask.completed, false);

  const step2 = moveTaskToKanbanColumn(step1.tasks, "t1", "done");
  assert.equal(step2.changed, true);
  assert.equal(step2.updatedTask.kanbanStatus, "done");
  assert.equal(step2.updatedTask.completed, true);

  const step3 = moveTaskToKanbanColumn(step2.tasks, "t2", "todo");
  assert.equal(step3.changed, true);
  assert.equal(step3.updatedTask.kanbanStatus, "todo");
  assert.equal(step3.updatedTask.completed, false);

  const invalid = moveTaskToKanbanColumn(step3.tasks, "t2", "archived");
  assert.equal(invalid.changed, false);
  assert.equal(invalid.updatedTask, null);
});

test("computeDeepFocusAnalytics produces 28-day matrix, streak, and subject percentages", () => {
  const analytics = computeDeepFocusAnalytics([
    { date: "2026-11-23", mode: "focus", durationSeconds: 3600, subject: "Physics" },
    { date: "2026-11-22", mode: "focus", durationSeconds: 1800, subject: "Calculus" },
    { date: "2026-11-23", mode: "short_break", durationSeconds: 300, subject: "Break" }
  ], "2026-11-23");

  assert.equal(analytics.totalMinutes, 90);
  assert.equal(analytics.sessionCount, 2);
  assert.equal(analytics.currentStreak, 2);
  assert.equal(analytics.heatmapDays.length, 28);
  assert.equal(analytics.heatmapDays[27].date, "2026-11-23");
  assert.equal(analytics.heatmapDays[27].minutes, 60);
  assert.equal(analytics.heatmapDays[27].level, 3);
  assert.equal(analytics.subjectAllocation[0].subject, "Physics");
  assert.equal(analytics.subjectAllocation[0].minutes, 60);
});
