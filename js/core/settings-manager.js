// Runtime Synchronization for Serious Mode, Deep Focus Mode, Gamification & Audio Chimes
import { state, savePreferences } from "../state.js";
import { themeManager } from "./theme-manager.js";
import { lightingManager } from "./lighting-manager.js";
import { audioManager, AUDIO_CHANNELS } from "./audio-manager.js";
import {
  resolveSeriousModeTransition,
  isSeriousTheme,
  isThemeAccessibleInMode,
  SERIOUS_OBJECT_NAMES
} from "../utils/room-settings.js";

const SELECTOR_FEATURE_PAIRS = [
  [".desk-clock", "focus"],
  [".desk-hourglass", "register"],
  [".wall-calendar", "calendar"],
  [".pinboard", "tasks"],
  [".desk-notebook", "diary"],
  [".desk-headphones", "audio"],
  [".merchant-bird", "shop"],
  [".desk-plant", "customization"],
  [".window-frame-btn", "environment"],
  [".photo-frame", "profile"],
  [".desk-phone", "friends"],
  [".desk-computer", "community"],
  [".mascot", "buddy"],
  [".bookshelf", "library"],
  [".cabinet-drawer", "cabinet"],
  [".trophy", "achievements"],
  [".coffee-mug", "coffee"],
  [".custom-prop", "customProp"],
  [".settings-panel", "settings"]
];

export function isStrictFocusLockActive() {
  const sess = state.activeSession;
  return Boolean(
    state.preferences?.strictFocusLock &&
      sess &&
      sess.status === "running" &&
      sess.mode === "focus"
  );
}

export function applyRoomSettingsToDocument() {
  const prefs = state.preferences || {};
  const root = document.documentElement;
  const seriousMode = Boolean(prefs.seriousMode);

  root.dataset.seriousMode = String(seriousMode);
  root.dataset.deepFocus = String(Boolean(prefs.deepFocusMode));
  root.dataset.hideGamification = String(Boolean(prefs.hideGamification));
  root.dataset.muteChimes = String(Boolean(prefs.muteChimes));
  root.dataset.strictLock = String(isStrictFocusLockActive());

  for (const [selector, feature] of SELECTOR_FEATURE_PAIRS) {
    const el = document.querySelector(selector);
    if (!el) continue;
    if (!el.dataset.defaultLabel) {
      el.dataset.defaultLabel = el.dataset.label || "";
    }
    if (seriousMode && SERIOUS_OBJECT_NAMES[feature]) {
      el.dataset.label = SERIOUS_OBJECT_NAMES[feature];
    } else if (el.dataset.defaultLabel) {
      el.dataset.label = el.dataset.defaultLabel;
    }
  }
}

export function setSeriousMode(enabled, { preferredThemeId = null } = {}) {
  const prefs = state.preferences || {};
  const transition = resolveSeriousModeTransition({
    nextSeriousMode: enabled,
    currentThemeId: prefs.theme || "comic",
    preSeriousThemeId: prefs.preSeriousTheme || "comic",
    ownedItemIds: state.ownedItemIds || [],
    skinsMap: prefs.skins || {}
  });

  const targetThemeId =
    enabled && isSeriousTheme(preferredThemeId)
      ? preferredThemeId
      : transition.themeId;

  savePreferences(
    {
      seriousMode: transition.seriousMode,
      preSeriousTheme: transition.preSeriousTheme,
      skins: transition.skins
    },
    { replaceSkins: true }
  );

  themeManager.apply(targetThemeId, { persist: true });
  applyRoomSettingsToDocument();
  lightingManager.apply();
  return { ...transition, themeId: targetThemeId };
}

export function setSeriousPresetTheme(themeId) {
  if (!isSeriousTheme(themeId)) return null;
  if (!state.preferences?.seriousMode) {
    return setSeriousMode(true, { preferredThemeId: themeId });
  }
  themeManager.apply(themeId, { persist: true });
  applyRoomSettingsToDocument();
  lightingManager.apply();
  return themeId;
}

export function toggleDeepFocusMode(enabled) {
  savePreferences({ deepFocusMode: Boolean(enabled) });
  applyRoomSettingsToDocument();
  lightingManager.apply();
}

export function toggleHideGamification(enabled) {
  savePreferences({ hideGamification: Boolean(enabled) });
  applyRoomSettingsToDocument();
}

export function toggleMuteChimes(enabled) {
  savePreferences({ muteChimes: Boolean(enabled) });
  applyRoomSettingsToDocument();
}

export function toggleStrictFocusLock(enabled) {
  savePreferences({ strictFocusLock: Boolean(enabled) });
  applyRoomSettingsToDocument();
}

export function toggleAutoCycleBreaks(enabled) {
  savePreferences({ autoCycleBreaks: Boolean(enabled) });
}

export function setDefaultFocusMinutes(minutes) {
  const clean = Math.min(180, Math.max(5, Math.round(Number(minutes) || 25)));
  savePreferences({ defaultFocusMinutes: clean });
  return clean;
}

export function applyWorkspaceProfile(profile) {
  if (!profile?.settings) return false;
  const s = profile.settings;

  if (typeof s.seriousMode === "boolean") {
    setSeriousMode(s.seriousMode, {
      preferredThemeId: isSeriousTheme(s.theme) ? s.theme : null
    });
  }

  if (
    s.theme &&
    isThemeAccessibleInMode(s.theme, {
      ownedItemIds: state.ownedItemIds,
      seriousMode: Boolean(state.preferences?.seriousMode)
    })
  ) {
    themeManager.apply(s.theme, { persist: true });
  }

  const patch = {};
  if (typeof s.deepFocusMode === "boolean") patch.deepFocusMode = s.deepFocusMode;
  if (typeof s.hideGamification === "boolean") patch.hideGamification = s.hideGamification;
  if (typeof s.strictFocusLock === "boolean") patch.strictFocusLock = s.strictFocusLock;
  if (typeof s.autoCycleBreaks === "boolean") patch.autoCycleBreaks = s.autoCycleBreaks;
  if (typeof s.defaultFocusMinutes === "number") patch.defaultFocusMinutes = s.defaultFocusMinutes;
  if (s.timeOfDay) patch.timeOfDay = s.timeOfDay;
  if (s.weather) patch.weather = s.weather;
  if (typeof s.lampKelvin === "number") {
    patch.lighting = { lampKelvin: s.lampKelvin, lampOn: true };
  }
  if (typeof s.lowPassHz === "number") {
    patch.lowPassHz = s.lowPassHz;
    audioManager.setLowPassFilter(s.lowPassHz);
  }
  if (Object.keys(patch).length > 0) {
    savePreferences(patch);
  }

  if (s.audioMix && typeof s.audioMix === "object") {
    for (const ch of AUDIO_CHANNELS) {
      audioManager.setChannelLevel(ch.id, Number(s.audioMix[ch.id] || 0));
    }
  }

  applyRoomSettingsToDocument();
  lightingManager.apply();
  return true;
}
