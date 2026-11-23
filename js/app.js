// SPRK Desk — Main Application Controller
import { createRoomObjects } from "../objects/index.js";
import { state, savePreferences } from "./state.js";
import { bus } from "./core/event-bus.js";
import { themeManager } from "./core/theme-manager.js";
import { skinManager } from "./core/skin-manager.js";
import { lightingManager } from "./core/lighting-manager.js";
import { layoutManager } from "./core/layout-manager.js";
import { decorationManager } from "./core/decoration-manager.js";
import { dialogManager } from "./core/dialog-manager.js";
import { audioManager } from "./core/audio-manager.js";
import { initRouter, parseHashRoute } from "./router.js";
import { restoreSession } from "./services/auth-service.js";
import {
  syncAuthenticatedUserData,
  scheduleCloudPreferencesSync,
  scheduleCloudLayoutSync,
  exitSpectatorRoom
} from "./services/database-service.js";
import { sanitizeAvatarUrl } from "./utils/profile-helpers.js";

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
import { buddyFeature } from "./features/buddy.js";
import { coffeeFeature } from "./features/coffee.js";
import { customPropFeature } from "./features/custom-prop.js";
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
  [".mascot", "buddy"],
  [".bookshelf", "library"],
  [".cabinet-drawer", "cabinet"],
  [".trophy", "achievements"],
  [".coffee-mug", "coffee"],
  [".custom-prop", "customProp"]
];

async function bootstrap() {
  const roomObjects = createRoomObjects();

  themeManager.registerObjects(roomObjects);
  skinManager.registerObjects(roomObjects);

  // Apply saved theme, skins, fixed decorations, custom prop, and layered lighting
  themeManager.apply(state.preferences.theme || "comic", { persist: false });
  skinManager.applySavedSkins();
  decorationManager.init();
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
  dialogManager.register("buddy", buddyFeature);
  dialogManager.register("library", libraryFeature);
  dialogManager.register("cabinet", cabinetFeature);
  dialogManager.register("achievements", achievementsFeature);
  dialogManager.register("coffee", coffeeFeature);
  dialogManager.register("customProp", customPropFeature);
  dialogManager.register("ops", adminFeature);

  // Wire physical room object buttons
  for (const [selector, feature] of FEATURE_OBJECT_MAP) {
    const el = document.querySelector(selector);
    if (!el) continue;
    el.addEventListener("click", () => {
      if (state.spectatingRoom && (feature === "diary" || feature === "tasks" || feature === "cabinet")) {
        return; // Spectators cannot open owner-only private features
      }
      if (feature === "coffee") {
        audioManager.playChime("sip");
      }
      dialogManager.open(feature, el);
    });
  }

  // Interactive ambient lamp toggle
  document.querySelector(".desk-lamp")?.addEventListener("click", () => {
    const lampOn = state.preferences.lighting?.lampOn === false;
    savePreferences({ lighting: { lampOn } });
    lightingManager.apply();
  });

  // Active focus timer / spectator exit whisper
  document.getElementById("room-active-whisper")?.addEventListener("click", () => {
    if (state.spectatingRoom) {
      exitSpectatorRoom();
      return;
    }
    if (state.activeSession) {
      dialogManager.open("focus");
    }
  });

  // Portrait nameplate & custom PFP updates
  const syncPortraitBadge = () => {
    const badge = document.querySelector(".portrait-badge");
    const scene = document.querySelector(".photo-frame .photo-scene");
    const artImg = document.querySelector(".photo-frame .photo-art-img");

    const activeProfile = state.spectatingRoom
      ? state.spectatingRoom.profile
      : state.user || state.localProfile;

    if (badge) {
      badge.textContent =
        activeProfile?.displayName ||
        state.preferences.localDisplayName ||
        "Local Student";
    }

    const customUrl = sanitizeAvatarUrl(activeProfile?.avatarUrl || "");
    if (scene && artImg) {
      if (customUrl) {
        artImg.setAttribute("src", customUrl);
        scene.dataset.customPfp = "true";
      } else {
        artImg.setAttribute("src", "./assets/sprites/portrait_meadow.jpg");
        delete scene.dataset.customPfp;
      }
    }
  };
  syncPortraitBadge();
  bus.on("auth:changed", syncPortraitBadge);
  bus.on("profile:changed", syncPortraitBadge);
  bus.on("spectator:changed", () => {
    syncPortraitBadge();
    decorationManager.apply();
    decorationManager.applyCustomProp();
  });

  // Automatic cloud persistence for theme, object skins, lighting, and object positions
  bus.on("preferences:changed", ({ preferences, skipCloudSync }) => {
    if (!skipCloudSync) {
      scheduleCloudPreferencesSync(preferences);
    }
  });
  bus.on("layout:changed", ({ layoutName, layout }) => {
    scheduleCloudLayoutSync(layoutName, layout);
  });

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
