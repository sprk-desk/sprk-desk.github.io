// Central client state store with explicit local persistence boundaries
import { APP_CONFIG, isSupabaseConfigured } from "../config.js";
import { bus } from "./core/event-bus.js";

const STORAGE_PREFIX = "sprk_desk_v1:";

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export const state = {
  supabaseConfigured: isSupabaseConfigured(),
  user: null, // { id, email, publicId, displayName, username, avatarPreset, bio, role, isPremium }
  spectatingRoom: null, // null | spectator-safe object
  preferences: readStorage("preferences", {
    theme: APP_CONFIG.defaults.theme,
    timeOfDay: APP_CONFIG.defaults.timeOfDay,
    weather: APP_CONFIG.defaults.weather,
    lighting: { ...APP_CONFIG.defaults.lighting },
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
    lowPerformance: false,
    layoutLocked: false,
    skins: {},
    activeLayoutName: "Default Desk"
  }),
  savedLayouts: readStorage("saved_layouts", {}),
  activeSession: readStorage("active_session", null),
  localStudyRecords: readStorage("study_records", []),
  localTasks: readStorage("tasks", [
    {
      id: "task_welcome_1",
      title: "Choose your study theme via the plant",
      subject: "Getting Started",
      priority: "medium",
      dueDate: "",
      completed: false,
      noteColor: "butter"
    },
    {
      id: "task_welcome_2",
      title: "Start a 25-minute focus block on the clock",
      subject: "Focus Habit",
      priority: "high",
      dueDate: "",
      completed: false,
      noteColor: "mint"
    }
  ]),
  localGoals: readStorage("goals", [
    {
      id: "goal_daily_1",
      title: "Daily Focus Target",
      scope: "daily",
      targetMinutes: 90,
      subject: "All Subjects"
    }
  ]),
  localDiary: readStorage("diary_notes", []),
  localSavedResources: readStorage("saved_resources", []),
  localAudioPresets: readStorage("audio_presets", {}),

  // Authoritative server-synced collections (populated when signed in to Supabase)
  wallet: { balance: 0, earned: 0, spent: 0, ledger: [] },
  ownedItemIds: ["theme_comic", "theme_modern"],
  equippedItems: {},
  achievements: [],
  unlockedAchievementIds: [],
  friends: [],
  friendRequests: [],
  notifications: [],
  studyGroups: [],
  studyRooms: [],
  libraryResources: [],
  announcements: []
};

export function savePreferences(patch) {
  state.preferences = {
    ...state.preferences,
    ...patch,
    lighting: patch.lighting
      ? { ...state.preferences.lighting, ...patch.lighting }
      : state.preferences.lighting,
    skins: patch.skins
      ? { ...state.preferences.skins, ...patch.skins }
      : state.preferences.skins
  };
  writeStorage("preferences", state.preferences);
  bus.emit("preferences:changed", state.preferences);
}

export function persistLocalCollection(key, value) {
  state[key] = value;
  const map = {
    activeSession: "active_session",
    localStudyRecords: "study_records",
    localTasks: "tasks",
    localGoals: "goals",
    localDiary: "diary_notes",
    localSavedResources: "saved_resources",
    localAudioPresets: "audio_presets",
    savedLayouts: "saved_layouts"
  };
  if (map[key]) writeStorage(map[key], value);
  bus.emit(`state:${key}`, value);
}

export function isSpectatorMode() {
  return Boolean(state.spectatingRoom);
}
