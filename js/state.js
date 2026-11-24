// Central client state store with explicit local & Supabase cloud persistence boundaries
import { APP_CONFIG, isSupabaseConfigured } from "../config.js";
import { bus } from "./core/event-bus.js";
import { DEFAULT_DECORATIONS, normalizeDecorationsMap } from "./utils/decorations.js";
import { DEFAULT_DEEPFOCUS_PREFS, sanitizeDeepFocusSettings } from "./utils/deepfocus-config.js";

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
  user: null, // { id, email, publicId, displayName, username, avatarPreset, avatarUrl, bio, courseClass, examAim, favoriteSubjects, privacy, role, isPremium }
  spectatingRoom: null, // null | spectator-safe object
  localProfile: readStorage("local_profile", {
    displayName: "Local Student",
    username: "",
    avatarPreset: "☺",
    avatarUrl: "",
    bannerUrl: "",
    bio: "",
    courseClass: "",
    examAim: "",
    favoriteSubjects: [],
    privacy: {
      showOnlineStatus: true,
      showStudyActivity: true,
      allowRoomVisits: true,
      roomVisibility: "friends"
    }
  }),
  preferences: (() => {
    const saved = readStorage("preferences", {});
    const { deepFocusMode: _legacyDeepFocus, ...cleanSaved } = saved || {};
    return {
      appMode: cleanSaved.appMode === "deepfocus" ? "deepfocus" : APP_CONFIG.defaults.appMode,
      theme: APP_CONFIG.defaults.theme,
      colorMode: cleanSaved.colorMode === "dark" || cleanSaved.colorMode === "light" ? cleanSaved.colorMode : null,
      timeOfDay: APP_CONFIG.defaults.timeOfDay,
      weather: APP_CONFIG.defaults.weather,
      seriousMode: APP_CONFIG.defaults.seriousMode,
      preSeriousTheme: APP_CONFIG.defaults.theme,
      studyTogetherVisualMode: APP_CONFIG.defaults.studyTogetherVisualMode,
      hideGamification: APP_CONFIG.defaults.hideGamification,
      muteChimes: APP_CONFIG.defaults.muteChimes,
      autoCycleBreaks: APP_CONFIG.defaults.autoCycleBreaks,
      strictFocusLock: APP_CONFIG.defaults.strictFocusLock,
      autoDuskLamp: APP_CONFIG.defaults.autoDuskLamp,
      defaultFocusMinutes: APP_CONFIG.defaults.focus.focusMinutes,
      lowPassHz: 18000,
      pomodoroCyclesCompleted: 0,
      reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
      lowPerformance: false,
      layoutLocked: false,
      skins: {},
      lockedSkins: {},
      activeLayoutName: "Default Desk",
      ...cleanSaved,
      deepFocus: sanitizeDeepFocusSettings(cleanSaved.deepFocus || DEFAULT_DEEPFOCUS_PREFS),
      lighting: { ...APP_CONFIG.defaults.lighting, ...(cleanSaved.lighting || {}) },
      decorations: normalizeDecorationsMap(cleanSaved.decorations || DEFAULT_DECORATIONS),
      customProp: {
        imageUrl: "",
        label: "Custom Keepsake",
        size: "md",
        frameStyle: "sprite",
        ...(cleanSaved.customProp || {})
      }
    };
  })(),
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
  localFlashcards: readStorage("flashcards", [
    {
      id: "card_starter_1",
      deck: "Study Method",
      front: "What is the testing effect in cognitive psychology?",
      back: "Long-term memory retention improves significantly when retrieving information actively rather than passively rereading.",
      reps: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueAtMs: 0,
      lastReviewedAtMs: null,
      createdAtMs: 1700000000000
    },
    {
      id: "card_starter_2",
      deck: "Mathematics",
      front: "State the derivative of e^(kx) with respect to x.",
      back: "k · e^(kx) by the chain rule.",
      reps: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueAtMs: 0,
      lastReviewedAtMs: null,
      createdAtMs: 1700000000000
    }
  ]),
  localExams: readStorage("exams", []),
  localSubjectBudgets: readStorage("subject_budgets", []),
  localWorkspaceProfiles: readStorage("workspace_profiles", []),
  bodyDoublingRoom: readStorage("body_doubling_room", null),
  pendingCheckInRecordId: null,

  // Authoritative server-synced collections (populated when signed in to Supabase)
  wallet: { balance: 0, earned: 0, spent: 0, ledger: [] },
  ownedItemIds: [
    "theme_comic",
    "music_rainy_vinyl",
    "ambience_golden_hour",
    "deco_penstand_classic",
    "deco_penstand_mint",
    "deco_charm_terrarium"
  ],
  equippedItems: {},
  achievements: [],
  unlockedAchievementIds: [],
  friends: [],
  friendRequests: { incoming: [], outgoing: [] },
  notifications: [],
  studyGroups: [],
  groupMemberships: {},
  activeGroupWorkspace: null,
  socialFeed: [],
  likedPostIds: [],
  suggestedStudents: [],
  studyRooms: [],
  libraryResources: [],
  announcements: []
};

export function savePreferences(patch, { replaceSkins = false, skipCloudSync = false, skipRender = false } = {}) {
  state.preferences = {
    ...state.preferences,
    ...patch,
    lighting: patch.lighting
      ? { ...state.preferences.lighting, ...patch.lighting }
      : state.preferences.lighting,
    skins: patch.skins
      ? (replaceSkins ? { ...patch.skins } : { ...state.preferences.skins, ...patch.skins })
      : state.preferences.skins,
    lockedSkins: patch.lockedSkins
      ? { ...(state.preferences.lockedSkins || {}), ...patch.lockedSkins }
      : (state.preferences.lockedSkins || {}),
    decorations: patch.decorations
      ? normalizeDecorationsMap(patch.decorations)
      : normalizeDecorationsMap(state.preferences.decorations),
    customProp: patch.customProp
      ? { ...(state.preferences.customProp || {}), ...patch.customProp }
      : (state.preferences.customProp || { imageUrl: "", label: "Custom Keepsake", size: "md", frameStyle: "sprite" }),
    deepFocus: patch.deepFocus
      ? sanitizeDeepFocusSettings({ ...(state.preferences.deepFocus || DEFAULT_DEEPFOCUS_PREFS), ...patch.deepFocus })
      : sanitizeDeepFocusSettings(state.preferences.deepFocus || DEFAULT_DEEPFOCUS_PREFS)
  };
  writeStorage("preferences", state.preferences);
  bus.emit("preferences:changed", { preferences: state.preferences, skipCloudSync, skipRender });
}

export function saveLocalProfile(patch) {
  state.localProfile = {
    ...(state.localProfile || {}),
    ...patch
  };
  writeStorage("local_profile", state.localProfile);
  if (state.localProfile.displayName) {
    savePreferences({ localDisplayName: state.localProfile.displayName }, { skipCloudSync: true });
  }
  bus.emit("profile:changed", state.localProfile);
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
    localFlashcards: "flashcards",
    localExams: "exams",
    localSubjectBudgets: "subject_budgets",
    localWorkspaceProfiles: "workspace_profiles",
    bodyDoublingRoom: "body_doubling_room",
    savedLayouts: "saved_layouts"
  };
  if (map[key]) writeStorage(map[key], value);
  bus.emit(`state:${key}`, value);
}

export function isSpectatorMode() {
  return Boolean(state.spectatingRoom);
}
