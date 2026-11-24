// Pure DeepFocus Mode Configuration, Theme Mapping, Purchasable Particles, Kanban & 28-Day Analytics Helpers
import { computeStudyStreaks } from "./timer-math.js";

const SAFE_BACKDROP_DATA_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

export const DEEPFOCUS_SCENES = Object.freeze([
  {
    id: "ocean_coast",
    name: "Serene Ocean Coast",
    url: "./assets/backdrops/ocean_coast.jpg",
    mood: "Golden hour surf & calm coastal air"
  },
  {
    id: "alpine_rain",
    name: "Misty Alpine Lake",
    url: "./assets/backdrops/alpine_rain.jpg",
    mood: "Blue-hour mountain pines & still water"
  },
  {
    id: "library_midnight",
    name: "Rainlit Midnight Study",
    url: "./assets/backdrops/library_midnight.jpg",
    mood: "Dim amber desk & rain-streaked glass"
  },
  {
    id: "orbital_space",
    name: "Orbital Earthrise",
    url: "./assets/backdrops/orbital_space.jpg",
    mood: "Deep low-orbit horizon & silent starfield"
  },
  {
    id: "minimal_monochrome",
    name: "Monochrome Horizon",
    url: "./assets/backdrops/minimal_monochrome.jpg",
    mood: "Editorial silver mist & still water"
  }
]);

export const DEEPFOCUS_PARTICLES = Object.freeze([
  {
    id: "none",
    name: "None (Still Backdrop)",
    description: "Pure uninterrupted photograph with zero particle motion.",
    price: 0,
    rarity: "starter",
    swatch: "#475569",
    shopItemId: null
  },
  {
    id: "ambient_drift",
    name: "Coastal Light Motes",
    description: "Subtle slow-drifting ambient light dust for gentle depth.",
    price: 0,
    rarity: "starter",
    swatch: "#38bdf8",
    shopItemId: null
  },
  {
    id: "rain",
    name: "Gentle Rain Streaks",
    description: "Layered diagonal rain streaks with soft atmospheric mist.",
    price: 20,
    rarity: "common",
    swatch: "#7dd3fc",
    shopItemId: "particle_rain"
  },
  {
    id: "fireflies",
    name: "Evening Fireflies",
    description: "Warm amber bokeh fireflies drifting and pulsing softly.",
    price: 25,
    rarity: "rare",
    swatch: "#fbbf24",
    shopItemId: "particle_fireflies"
  },
  {
    id: "snow",
    name: "Soft Snowfall",
    description: "Multi-depth drifting snow crystals with gentle wind sway.",
    price: 25,
    rarity: "rare",
    swatch: "#e2e8f0",
    shopItemId: "particle_snow"
  },
  {
    id: "breeze",
    name: "Spring Breeze Leaves",
    description: "Soft botanical leaves gliding slowly across the canvas.",
    price: 20,
    rarity: "common",
    swatch: "#6ee7b7",
    shopItemId: "particle_breeze"
  },
  {
    id: "starlight",
    name: "Orbital Starfield",
    description: "Twinkling deep-space stars and subtle cosmic drift.",
    price: 30,
    rarity: "artisan",
    swatch: "#22d3ee",
    shopItemId: "particle_starlight"
  }
]);

export const PARTICLE_SHOP_ITEMS = Object.freeze(
  DEEPFOCUS_PARTICLES
    .filter((p) => Boolean(p.shopItemId))
    .map((p) => ({
      id: p.shopItemId,
      category: "particles",
      targetObject: "particles",
      particleId: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      rarity: p.rarity,
      premiumOnly: false,
      swatch: p.swatch
    }))
);

export const THEME_DEEPFOCUS_MAP = Object.freeze({
  comic: { accent: "#38bdf8", accentSoft: "rgba(56, 189, 248, 0.16)", sceneId: "ocean_coast", particleId: "ambient_drift" },
  modern: { accent: "#2dd4bf", accentSoft: "rgba(45, 212, 191, 0.16)", sceneId: "ocean_coast", particleId: "ambient_drift" },
  vintage: { accent: "#d97706", accentSoft: "rgba(217, 119, 6, 0.18)", sceneId: "library_midnight", particleId: "fireflies" },
  japanese: { accent: "#6ee7b7", accentSoft: "rgba(110, 231, 183, 0.16)", sceneId: "alpine_rain", particleId: "breeze" },
  rainy: { accent: "#60a5fa", accentSoft: "rgba(96, 165, 250, 0.18)", sceneId: "alpine_rain", particleId: "rain" },
  cottagecore: { accent: "#4ade80", accentSoft: "rgba(74, 222, 128, 0.16)", sceneId: "alpine_rain", particleId: "breeze" },
  space: { accent: "#22d3ee", accentSoft: "rgba(34, 211, 238, 0.18)", sceneId: "orbital_space", particleId: "starlight" },
  autumn: { accent: "#f97316", accentSoft: "rgba(249, 115, 22, 0.18)", sceneId: "library_midnight", particleId: "breeze" },
  winter: { accent: "#93c5fd", accentSoft: "rgba(147, 197, 253, 0.18)", sceneId: "alpine_rain", particleId: "snow" },
  midnight: { accent: "#fbbf24", accentSoft: "rgba(251, 191, 36, 0.18)", sceneId: "library_midnight", particleId: "fireflies" },
  jungle: { accent: "#34d399", accentSoft: "rgba(52, 211, 153, 0.16)", sceneId: "alpine_rain", particleId: "fireflies" },
  anime: { accent: "#f472b6", accentSoft: "rgba(244, 114, 182, 0.18)", sceneId: "ocean_coast", particleId: "ambient_drift" },
  ocean: { accent: "#06b6d4", accentSoft: "rgba(6, 182, 212, 0.18)", sceneId: "ocean_coast", particleId: "rain" },
  alchemy: { accent: "#a78bfa", accentSoft: "rgba(167, 139, 250, 0.18)", sceneId: "library_midnight", particleId: "starlight" },
  editorial: { accent: "#e5e7eb", accentSoft: "rgba(229, 231, 235, 0.14)", sceneId: "minimal_monochrome", particleId: "none" },
  noir: { accent: "#f8fafc", accentSoft: "rgba(248, 250, 252, 0.14)", sceneId: "minimal_monochrome", particleId: "none" }
});

export const DEFAULT_DEEPFOCUS_PREFS = Object.freeze({
  sceneId: "ocean_coast",
  customBackdropUrl: "",
  followThemeScene: true,
  blur: 0,
  brightness: 78,
  contrast: 102,
  saturation: 100,
  particleId: "ambient_drift",
  followThemeParticle: true,
  particleSpeed: 1,
  particleOpacity: 0.72,
  particleDensity: 55,
  chimeSound: "bowl",
  timerTab: "pomodoro",
  zenMode: false,
  dailyBlockGoal: 8
});

export function sanitizeBackdropUrl(raw = "") {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("./assets/")) return trimmed;
  if (SAFE_BACKDROP_DATA_RE.test(trimmed)) {
    return trimmed.length <= 1_200_000 ? trimmed : "";
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    return "";
  }
  return "";
}

function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeDeepFocusSettings(raw = {}) {
  const validScenes = new Set(DEEPFOCUS_SCENES.map((s) => s.id));
  const validParticles = new Set(DEEPFOCUS_PARTICLES.map((p) => p.id));
  const validTabs = new Set(["pomodoro", "timer", "stopwatch"]);
  const validChimes = new Set(["bowl", "bell", "mute"]);

  return {
    sceneId: validScenes.has(raw.sceneId) ? raw.sceneId : DEFAULT_DEEPFOCUS_PREFS.sceneId,
    customBackdropUrl: sanitizeBackdropUrl(raw.customBackdropUrl || ""),
    followThemeScene: raw.followThemeScene !== false,
    blur: Math.round(clampNum(raw.blur, 0, 24, DEFAULT_DEEPFOCUS_PREFS.blur)),
    brightness: Math.round(clampNum(raw.brightness, 40, 130, DEFAULT_DEEPFOCUS_PREFS.brightness)),
    contrast: Math.round(clampNum(raw.contrast, 70, 140, DEFAULT_DEEPFOCUS_PREFS.contrast)),
    saturation: Math.round(clampNum(raw.saturation, 0, 160, DEFAULT_DEEPFOCUS_PREFS.saturation)),
    particleId: validParticles.has(raw.particleId) ? raw.particleId : DEFAULT_DEEPFOCUS_PREFS.particleId,
    followThemeParticle: raw.followThemeParticle !== false,
    particleSpeed: Number(clampNum(raw.particleSpeed, 0.2, 2.5, DEFAULT_DEEPFOCUS_PREFS.particleSpeed).toFixed(2)),
    particleOpacity: Number(clampNum(raw.particleOpacity, 0.1, 1, DEFAULT_DEEPFOCUS_PREFS.particleOpacity).toFixed(2)),
    particleDensity: Math.round(clampNum(raw.particleDensity, 15, 140, DEFAULT_DEEPFOCUS_PREFS.particleDensity)),
    chimeSound: validChimes.has(raw.chimeSound) ? raw.chimeSound : DEFAULT_DEEPFOCUS_PREFS.chimeSound,
    timerTab: validTabs.has(raw.timerTab) ? raw.timerTab : DEFAULT_DEEPFOCUS_PREFS.timerTab,
    zenMode: Boolean(raw.zenMode),
    dailyBlockGoal: Math.round(clampNum(raw.dailyBlockGoal, 1, 20, DEFAULT_DEEPFOCUS_PREFS.dailyBlockGoal))
  };
}

export function isParticleOwned(particleId, ownedItemIds = []) {
  const meta = DEEPFOCUS_PARTICLES.find((p) => p.id === particleId);
  if (!meta) return false;
  if (!meta.shopItemId || meta.price === 0) return true;
  return new Set(ownedItemIds || []).has(meta.shopItemId);
}

export function resolveDeepFocusAppearance({
  themeId = "comic",
  deepFocusPrefs = {},
  ownedItemIds = []
} = {}) {
  const clean = sanitizeDeepFocusSettings(deepFocusPrefs);
  const themeSpec = THEME_DEEPFOCUS_MAP[themeId] || THEME_DEEPFOCUS_MAP.comic;

  const sceneId = clean.followThemeScene ? themeSpec.sceneId : clean.sceneId;
  const scene = DEEPFOCUS_SCENES.find((s) => s.id === sceneId) || DEEPFOCUS_SCENES[0];
  const backdropUrl = clean.customBackdropUrl || scene.url;

  const desiredParticle = clean.followThemeParticle ? themeSpec.particleId : clean.particleId;
  const effectiveParticleId = isParticleOwned(desiredParticle, ownedItemIds)
    ? desiredParticle
    : (desiredParticle === "none" ? "none" : "ambient_drift");

  const filterCss = `blur(${clean.blur}px) brightness(${clean.brightness}%) contrast(${clean.contrast}%) saturate(${clean.saturation}%)`;

  return {
    themeId,
    accent: themeSpec.accent,
    accentSoft: themeSpec.accentSoft,
    sceneId: scene.id,
    sceneName: scene.name,
    backdropUrl,
    isCustomBackdrop: Boolean(clean.customBackdropUrl),
    particleId: effectiveParticleId,
    desiredParticleId: desiredParticle,
    filterCss,
    settings: clean
  };
}

export function getTaskKanbanStatus(task) {
  if (!task) return "todo";
  if (task.completed || task.kanbanStatus === "done") return "done";
  if (task.kanbanStatus === "progress") return "progress";
  return "todo";
}

export function groupTasksForKanban(tasks = []) {
  const todo = [];
  const progress = [];
  const done = [];
  for (const task of tasks || []) {
    const col = getTaskKanbanStatus(task);
    if (col === "done") done.push(task);
    else if (col === "progress") progress.push(task);
    else todo.push(task);
  }
  return { todo, progress, done };
}

const VALID_KANBAN_COLUMNS = new Set(["todo", "progress", "done"]);

export function moveTaskToKanbanColumn(tasks = [], taskId, targetCol) {
  if (!taskId || !VALID_KANBAN_COLUMNS.has(targetCol)) {
    return { tasks: Array.isArray(tasks) ? [...tasks] : [], updatedTask: null, changed: false };
  }
  let updatedTask = null;
  let changed = false;
  const nextTasks = (tasks || []).map((t) => {
    if (t.id !== taskId) return t;
    const prevCol = getTaskKanbanStatus(t);
    if (prevCol === targetCol && Boolean(t.completed) === (targetCol === "done")) {
      updatedTask = t;
      return t;
    }
    changed = true;
    updatedTask = {
      ...t,
      kanbanStatus: targetCol,
      completed: targetCol === "done"
    };
    return updatedTask;
  });
  return { tasks: nextTasks, updatedTask, changed };
}

export function computeDeepFocusAnalytics(records = [], todayStr = new Date().toISOString().slice(0, 10)) {
  const focusRecords = (records || []).filter((r) => (r.mode || "focus") === "focus");
  const totalSeconds = focusRecords.reduce((sum, r) => sum + Math.max(0, Number(r.durationSeconds || 0)), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const { currentStreak, longestStreak } = computeStudyStreaks(records, todayStr);

  const minutesByDate = new Map();
  const minutesBySubject = new Map();

  for (const r of focusRecords) {
    const mins = Math.max(0, Number(r.durationSeconds || 0)) / 60;
    if (r.date) {
      minutesByDate.set(r.date, (minutesByDate.get(r.date) || 0) + mins);
    }
    const subj = String(r.subject || "General Study").trim() || "General Study";
    minutesBySubject.set(subj, (minutesBySubject.get(subj) || 0) + mins);
  }

  const anchorMs = new Date(`${todayStr}T00:00:00Z`).getTime();
  const heatmapDays = [];
  for (let i = 27; i >= 0; i -= 1) {
    const date = new Date(anchorMs - i * 86400000).toISOString().slice(0, 10);
    const mins = Math.round(minutesByDate.get(date) || 0);
    let level = 0;
    if (mins >= 120) level = 4;
    else if (mins >= 60) level = 3;
    else if (mins >= 25) level = 2;
    else if (mins > 0) level = 1;
    heatmapDays.push({ date, minutes: mins, level });
  }

  const totalRoundedSubj = Array.from(minutesBySubject.values()).reduce((a, b) => a + b, 0) || 1;
  const subjectAllocation = Array.from(minutesBySubject.entries())
    .map(([subject, rawMins]) => ({
      subject,
      minutes: Math.round(rawMins),
      pct: Math.max(1, Math.round((rawMins / totalRoundedSubj) * 100))
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6);

  return {
    totalMinutes,
    sessionCount: focusRecords.length,
    currentStreak,
    longestStreak,
    heatmapDays,
    subjectAllocation
  };
}
