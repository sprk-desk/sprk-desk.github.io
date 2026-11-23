// SPRK Desk — Main Application Controller
import { createRoomObjects } from "../objects/index.js";
import { state, savePreferences } from "./state.js";
import { bus } from "./core/event-bus.js";
import { themeManager } from "./core/theme-manager.js";
import { skinManager } from "./core/skin-manager.js";
import { lightingManager } from "./core/lighting-manager.js";
import { layoutManager } from "./core/layout-manager.js";
import { dialogManager } from "./core/dialog-manager.js";
import { audioManager } from "./core/audio-manager.js";
import { initRouter, parseHashRoute } from "./router.js";
import { restoreSession } from "./services/auth-service.js";
import { syncAuthenticatedUserData } from "./services/database-service.js";

import { focusFeature, initFocusBackgroundLoop } from "./features/focus.js";
import { registerFeature } from "./features/register.js";
import { calendarFeature } from "./features/calendar.js";
import { tasksFeature } from "./features/tasks.js";
import { diaryFeature } from "./features/diary.js";
import { audioFeature } from "./features/audio.js";
import { shopFeature } from "./features/shop.js";
import { customizationFeature } from "./features/customization.js";
import { environmentFeature } from "./features/environment.js";
import { profileFeature } from "./features/profile.js";
import { friendsFeature } from "./features/friends.js";
import { communityFeature } from "./features/community.js";
import { libraryFeature } from "./features/library.js";
import { cabinetFeature } from "./features/cabinet.js";
import { achievementsFeature } from "./features/achievements.js";
import { adminFeature } from "./features/admin.js";

const FEATURE_OBJECT_MAP = [
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
  [".mascot", "community"],
  [".bookshelf", "library"],
  [".cabinet-drawer", "cabinet"],
  [".trophy", "achievements"]
];

async function bootstrap() {
  const roomObjects = createRoomObjects();

  themeManager.registerObjects(roomObjects);
  skinManager.registerObjects(roomObjects);

  // Apply saved theme, skins, and layered lighting
  themeManager.apply(state.preferences.theme || "comic", { persist: false });
  skinManager.applySavedSkins();
  lightingManager.init();
  layoutManager.init();
  dialogManager.init();

  // Register all object-launched dialogs
  dialogManager.register("focus", focusFeature);
  dialogManager.register("register", registerFeature);
  dialogManager.register("calendar", calendarFeature);
  dialogManager.register("tasks", tasksFeature);
  dialogManager.register("diary", diaryFeature);
  dialogManager.register("audio", audioFeature);
  dialogManager.register("shop", shopFeature);
  dialogManager.register("customization", customizationFeature);
  dialogManager.register("environment", environmentFeature);
  dialogManager.register("profile", profileFeature);
  dialogManager.register("friends", friendsFeature);
  dialogManager.register("community", communityFeature);
  dialogManager.register("library", libraryFeature);
  dialogManager.register("cabinet", cabinetFeature);
  dialogManager.register("achievements", achievementsFeature);
  dialogManager.register("ops", adminFeature);

  // Wire physical room object buttons
  for (const [selector, feature] of FEATURE_OBJECT_MAP) {
    const el = document.querySelector(selector);
    if (!el) continue;
    el.addEventListener("click", () => {
      if (state.spectatingRoom && (feature === "diary" || feature === "tasks" || feature === "cabinet")) {
        return; // Spectators cannot open owner-only private features
      }
      dialogManager.open(feature, el);
    });
  }

  // Interactive ambient props
  document.querySelector(".desk-lamp")?.addEventListener("click", () => {
    const lampOn = state.preferences.lighting?.lampOn === false;
    savePreferences({ lighting: { lampOn } });
    lightingManager.apply();
  });

  document.querySelector(".coffee-mug")?.addEventListener("click", () => {
    audioManager.playChime("sip");
    const whisper = document.getElementById("room-active-whisper");
    if (whisper && !state.activeSession && !state.spectatingRoom) {
      whisper.hidden = false;
      whisper.textContent = "Take a sip of water and breathe gently.";
      window.setTimeout(() => {
        if (!state.activeSession && !state.spectatingRoom) whisper.hidden = true;
      }, 3600);
    }
  });

  // Active focus timer / spectator exit whisper
  document.getElementById("room-active-whisper")?.addEventListener("click", () => {
    if (state.spectatingRoom) {
      state.spectatingRoom = null;
      themeManager.apply(state.preferences.theme || "comic", { persist: false });
      const w = document.getElementById("room-active-whisper");
      if (w) w.hidden = true;
      return;
    }
    if (state.activeSession) {
      dialogManager.open("focus");
    }
  });

  // Portrait nameplate updates
  const syncPortraitBadge = () => {
    const badge = document.querySelector(".portrait-badge");
    if (!badge) return;
    badge.textContent = state.user?.displayName || state.preferences.localDisplayName || "Local Student";
  };
  syncPortraitBadge();
  bus.on("auth:changed", syncPortraitBadge);

  // Hash navigation sync
  initRouter();
  bus.on("route:changed", ({ feature, param }) => {
    if (feature === "room") {
      dialogManager.close({ syncHash: false });
    } else if (feature === "ops" && state.user?.role !== "admin") {
      dialogManager.close({ syncHash: true });
    } else {
      dialogManager.open(feature, null, param, { syncHash: false });
    }
  });

  const initialRoute = parseHashRoute();
  if (initialRoute.feature !== "room") {
    if (!(initialRoute.feature === "ops" && state.user?.role !== "admin")) {
      dialogManager.open(initialRoute.feature, null, initialRoute.param, { syncHash: false });
    }
  }

  initFocusBackgroundLoop();

  if (state.supabaseConfigured) {
    const user = await restoreSession();
    if (user) await syncAuthenticatedUserData();
  }
}

bootstrap();
