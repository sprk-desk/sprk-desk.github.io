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
import { applyRoomSettingsToDocument, setAppMode } from "./core/settings-manager.js";
import {
  initRouter,
  parseHashRoute,
  parseCurrentPage,
  recordWorkspaceVisit,
  PAGE_ROUTES
} from "./router.js";
import { restoreSession } from "./services/auth-service.js";
import {
  syncAuthenticatedUserData,
  scheduleCloudPreferencesSync,
  scheduleCloudLayoutSync,
  exitSpectatorRoom
} from "./services/database-service.js";
import { sanitizeAvatarUrl } from "./utils/profile-helpers.js";
import {
  SELECTOR_FEATURE_PAIRS,
  isFeatureDisabled,
  isFeatureAllowedForSpectator
} from "./utils/room-settings.js";

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
import { settingsFeature } from "./features/settings.js";
import { adminFeature } from "./features/admin.js";
import { initCommandPalette, openCommandPalette } from "./features/command-palette.js";
import { presenceService } from "./services/presence-service.js";
import { initStudyCircle } from "./features/study-circle.js";
import { initDeepFocusWorkspace } from "./features/deepfocus.js";
import { initLandingPage } from "./features/landing.js";
import { initAccountPage } from "./features/account-page.js";

async function bootstrap() {
  const roomObjects = createRoomObjects();

  themeManager.registerObjects(roomObjects);
  skinManager.registerObjects(roomObjects);

  // Align persisted workspace mode and track visit frequency when opening /cozy-study or /deep-focus
  const initialPageInfo = parseCurrentPage();
  let lastRecordedWorkspacePage = null;
  if (initialPageInfo.page === PAGE_ROUTES.COZY) {
    if (state.preferences.appMode !== "cozy") savePreferences({ appMode: "cozy" });
    recordWorkspaceVisit("cozy");
    lastRecordedWorkspacePage = PAGE_ROUTES.COZY;
  } else if (initialPageInfo.page === PAGE_ROUTES.DEEPFOCUS) {
    if (state.preferences.appMode !== "deepfocus") savePreferences({ appMode: "deepfocus" });
    recordWorkspaceVisit("deepfocus");
    lastRecordedWorkspacePage = PAGE_ROUTES.DEEPFOCUS;
  }

  // Apply saved theme, skins, fixed decorations, custom prop, study modes, and layered lighting
  themeManager.apply(state.preferences.theme || "comic", { persist: false });
  skinManager.applySavedSkins();
  decorationManager.init();
  applyRoomSettingsToDocument();
  lightingManager.init();
  layoutManager.init();
  dialogManager.init();
  initCommandPalette();
  presenceService.init();
  initStudyCircle();
  initLandingPage();
  initAccountPage();
  initDeepFocusWorkspace();

  // Register all object-launched Cozy dialogs
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
  dialogManager.register("settings", settingsFeature);
  dialogManager.register("ops", adminFeature);

  // Wire physical room object buttons
  for (const [selector, feature] of SELECTOR_FEATURE_PAIRS) {
    if (isFeatureDisabled(feature)) continue;
    const el = document.querySelector(selector);
    if (!el) continue;
    el.addEventListener("click", () => {
      if (state.spectatingRoom && !isFeatureAllowedForSpectator(feature)) {
        return; // Spectators may only inspect profile, achievements, streaks calendar, and bookshelf
      }
      if (feature === "coffee") {
        audioManager.playChime("sip");
      }
      dialogManager.open(feature, el);
    });
  }

  // Interactive ambient lamp toggle (owner only)
  document.querySelector(".desk-lamp")?.addEventListener("click", () => {
    if (state.spectatingRoom) return;
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
    if (state.activeSession && parseCurrentPage().page === PAGE_ROUTES.COZY) {
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
    applyRoomSettingsToDocument();
    decorationManager.apply();
    decorationManager.applyCustomProp();
  });

  // Automatic cloud persistence & runtime mode sync
  bus.on("preferences:changed", ({ preferences, skipCloudSync }) => {
    applyRoomSettingsToDocument();
    if (!skipCloudSync) {
      scheduleCloudPreferencesSync(preferences);
    }
  });
  bus.on("state:activeSession", () => {
    applyRoomSettingsToDocument();
  });
  bus.on("layout:changed", ({ layoutName, layout }) => {
    scheduleCloudLayoutSync(layoutName, layout);
  });

  // Multi-page route change coordination
  bus.on("page:changed", ({ page }) => {
    if (page !== PAGE_ROUTES.COZY && dialogManager.dialog?.open) {
      dialogManager.close({ syncHash: false });
    }
    let switchedMode = false;
    if (page === PAGE_ROUTES.COZY) {
      if (state.preferences.appMode !== "cozy") {
        setAppMode("cozy", { syncUrl: false });
        switchedMode = true;
      }
      if (lastRecordedWorkspacePage !== PAGE_ROUTES.COZY) {
        recordWorkspaceVisit("cozy");
        lastRecordedWorkspacePage = PAGE_ROUTES.COZY;
      }
    } else if (page === PAGE_ROUTES.DEEPFOCUS) {
      if (state.preferences.appMode !== "deepfocus") {
        setAppMode("deepfocus", { syncUrl: false });
        switchedMode = true;
      }
      if (lastRecordedWorkspacePage !== PAGE_ROUTES.DEEPFOCUS) {
        recordWorkspaceVisit("deepfocus");
        lastRecordedWorkspacePage = PAGE_ROUTES.DEEPFOCUS;
      }
    } else {
      lastRecordedWorkspacePage = null;
    }
    if (!switchedMode) {
      applyRoomSettingsToDocument();
      lightingManager.apply();
    }
  });

  // Home (/) directly renders the unified Social Study & Theme website without auto-redirecting.

  // Global keyboard shortcuts: Ctrl/Cmd+K (Command Palette) & Shift+F (Focus View)
  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if (!event.shiftKey || event.key.toLowerCase() !== "f") return;
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || event.target?.isContentEditable) {
      return;
    }
    const page = parseCurrentPage().page;
    if (page === PAGE_ROUTES.DEEPFOCUS) {
      event.preventDefault();
      bus.emit("deepfocus:open", { modal: "settings" });
      return;
    }
    if (page !== PAGE_ROUTES.COZY) return;
    event.preventDefault();
    if (dialogManager.dialog?.open && dialogManager.activeFeature === "settings" && dialogManager.activeParam === "focus") {
      dialogManager.close();
    } else {
      dialogManager.open("settings", document.querySelector(".settings-panel"), "focus");
    }
  });

  // Hash navigation sync for Cozy Study Room dialogs
  initRouter();
  bus.on("route:changed", ({ feature, param }) => {
    if (parseCurrentPage().page !== PAGE_ROUTES.COZY) return;
    if (feature === "room") {
      dialogManager.close({ syncHash: false });
    } else if (
      isFeatureDisabled(feature) ||
      (state.spectatingRoom && !isFeatureAllowedForSpectator(feature)) ||
      (feature === "ops" && state.user?.role !== "admin")
    ) {
      dialogManager.close({ syncHash: true });
    } else {
      dialogManager.open(feature, null, param, { syncHash: false });
    }
  });

  const initialRoute = parseHashRoute();
  if (initialPageInfo.page === PAGE_ROUTES.COZY && initialRoute.feature !== "room") {
    if (
      !isFeatureDisabled(initialRoute.feature) &&
      !(state.spectatingRoom && !isFeatureAllowedForSpectator(initialRoute.feature)) &&
      !(initialRoute.feature === "ops" && state.user?.role !== "admin")
    ) {
      dialogManager.open(initialRoute.feature, null, initialRoute.param, { syncHash: false });
    }
  }

  initFocusBackgroundLoop();

  bus.on("sync:completed", () => {
    audioManager.setLowPassFilter(state.preferences?.lowPassHz || 18000);
    applyRoomSettingsToDocument();
  });

  if (state.supabaseConfigured) {
    const user = await restoreSession();
    if (user) {
      await syncAuthenticatedUserData();
    }
  }
}

bootstrap();
