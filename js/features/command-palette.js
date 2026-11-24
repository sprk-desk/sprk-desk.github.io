// Command Palette (Ctrl/Cmd + K) -> Route-Aware Fast Keyboard Navigation Across /, /cozy-study, /deep-focus & /account
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { bus } from "../core/event-bus.js";
import { dialogManager } from "../core/dialog-manager.js";
import { lightingManager } from "../core/lighting-manager.js";
import {
  setAppMode,
  setSeriousMode,
  toggleStudyTogetherVisualMode,
  toggleStrictFocusLock,
  applyWorkspaceProfile
} from "../core/settings-manager.js";
import { parseCurrentPage, navigateToPage, PAGE_ROUTES } from "../router.js";
import { isFeatureHiddenInSeriousMode, isFeatureAllowedForSpectator } from "../utils/room-settings.js";
import { exitSpectatorRoom } from "../services/database-service.js";
import { BUILTIN_WORKSPACE_PROFILES } from "../utils/study-tools.js";
import { createFocusSession } from "../utils/timer-math.js";
import { escapeHtml, generateId } from "../utils/dom.js";

let dialogEl = null;
let inputEl = null;
let listEl = null;
let selectedIndex = 0;
let currentItems = [];

function startQuickFocus(minutes, subject = "Deep Focus") {
  if (!state.activeSession) {
    const newSess = createFocusSession({
      id: generateId("focus"),
      mode: "focus",
      targetSeconds: minutes * 60,
      scope: "personal",
      subject
    });
    persistLocalCollection("activeSession", newSess);
  }
  const currentPage = parseCurrentPage().page;
  if (currentPage === PAGE_ROUTES.COZY) {
    dialogManager.open("focus", document.querySelector(".desk-clock"));
  } else if (currentPage !== PAGE_ROUTES.DEEPFOCUS) {
    setAppMode("deepfocus", { syncUrl: false });
    navigateToPage(PAGE_ROUTES.DEEPFOCUS);
  }
}

function openWorkspaceTool(cozyFeature, cozySelector, cozyParam, dfModal, dfSubTab = "") {
  const page = parseCurrentPage().page;
  if (page === PAGE_ROUTES.DEEPFOCUS) {
    bus.emit("deepfocus:open", { modal: dfModal, subTab: dfSubTab });
    return;
  }
  if (page !== PAGE_ROUTES.COZY) {
    setAppMode("cozy", { syncUrl: false });
    navigateToPage(PAGE_ROUTES.COZY);
  }
  const triggerEl = cozySelector ? document.querySelector(cozySelector) : null;
  dialogManager.open(cozyFeature, triggerEl, cozyParam);
}

function getCommands() {
  const prefs = state.preferences || {};
  const serious = Boolean(prefs.seriousMode);
  const profiles = [...BUILTIN_WORKSPACE_PROFILES, ...(state.localWorkspaceProfiles || [])];
  const currentPage = parseCurrentPage().page;
  const isDeepFocus = currentPage === PAGE_ROUTES.DEEPFOCUS;

  if (state.spectatingRoom) {
    const ownerName = state.spectatingRoom.profile?.displayName || "Student";
    return [
      {
        id: "spec_exit",
        group: `Visiting ${ownerName}`,
        label: "Return to My Study Room",
        hint: "Exit Visit",
        keywords: "exit leave return home my room",
        run: () => exitSpectatorRoom()
      },
      {
        id: "spec_profile",
        group: `Visiting ${ownerName}`,
        label: `View ${ownerName}'s Profile Card`,
        hint: "Portrait",
        keywords: "profile bio subjects friend",
        run: () => openWorkspaceTool("profile", ".photo-frame", null, "community", "")
      },
      {
        id: "spec_achievements",
        group: `Visiting ${ownerName}`,
        label: `View ${ownerName}'s Achievements`,
        hint: "Trophy",
        keywords: "achievements badges milestones",
        run: () => openWorkspaceTool("achievements", ".trophy", null, "insights", "milestones")
      },
      {
        id: "spec_calendar",
        group: `Visiting ${ownerName}`,
        label: `View ${ownerName}'s Streaks & Calendar`,
        hint: "Calendar",
        keywords: "streaks calendar heatmap study stats",
        run: () => openWorkspaceTool("calendar", ".wall-calendar", null, "insights", "analytics")
      },
      {
        id: "spec_library",
        group: `Visiting ${ownerName}`,
        label: `Inspect ${ownerName}'s Bookshelf`,
        hint: "Bookshelf",
        keywords: "bookshelf library books guides",
        run: () => openWorkspaceTool("library", ".bookshelf", null, "knowledge", "guides")
      }
    ].filter((cmd) => cmd.id === "spec_exit" || isFeatureAllowedForSpectator(cmd.id.replace("spec_", "")));
  }

  return [
    {
      id: "nav_home",
      group: "Pages",
      label: "Open Main Website (/)",
      hint: "Landing",
      keywords: "home landing website main about",
      run: () => navigateToPage(PAGE_ROUTES.HOME)
    },
    {
      id: "nav_cozy",
      group: "Pages",
      label: "Open Cozy Study Room (/cozy-study)",
      hint: "Cozy",
      keywords: "cozy study room desk gamified",
      run: () => {
        setAppMode("cozy", { syncUrl: false });
        navigateToPage(PAGE_ROUTES.COZY);
      }
    },
    {
      id: "nav_deepfocus",
      group: "Pages",
      label: "Open Deep Focus Studio (/deep-focus)",
      hint: "DeepFocus",
      keywords: "deep focus studio minimal distraction free",
      run: () => {
        setAppMode("deepfocus", { syncUrl: false });
        navigateToPage(PAGE_ROUTES.DEEPFOCUS);
      }
    },
    {
      id: "nav_account",
      group: "Pages",
      label: "Open Account, Profile & Friends (/account)",
      hint: "Account",
      keywords: "account login register profile friends visit room",
      run: () => navigateToPage(PAGE_ROUTES.ACCOUNT)
    },
    {
      id: "cmd_start_25",
      group: "Quick Actions",
      label: "Start 25m Focus Session",
      hint: "Pomodoro",
      keywords: "timer start 25 pomodoro focus",
      run: () => startQuickFocus(25, "Focus Sprint")
    },
    {
      id: "cmd_start_50",
      group: "Quick Actions",
      label: "Start 50m Deep Block",
      hint: "Extended",
      keywords: "timer start 50 deep work focus",
      run: () => startQuickFocus(50, "Deep Work")
    },
    {
      id: "cmd_serious",
      group: "Modes",
      label: serious ? "Switch to Regular Mode" : "Enable Serious Mode (Monochrome)",
      hint: serious ? "Active" : "Free Themes",
      keywords: "serious monochrome minimal bw black white theme",
      run: () => setSeriousMode(!serious)
    },
    {
      id: "cmd_study_circle",
      group: "Modes",
      label: prefs.studyTogetherVisualMode ? "Hide Live Study Circle" : "Show Live Study Circle (Friends)",
      hint: prefs.studyTogetherVisualMode ? "Visible" : "Visual Mode",
      keywords: "friends studying together study circle visual mode live",
      run: () => toggleStudyTogetherVisualMode(!prefs.studyTogetherVisualMode)
    },
    {
      id: "cmd_strict_lock",
      group: "Modes",
      label: prefs.strictFocusLock ? "Disable Strict Focus Lock" : "Enable Strict Focus Lock",
      hint: prefs.strictFocusLock ? "Locked" : "Guard",
      keywords: "strict lock focus guard distraction audit",
      run: () => toggleStrictFocusLock(!prefs.strictFocusLock)
    },
    {
      id: "cmd_lamp",
      group: "Modes",
      label: prefs.lighting?.lampOn === false ? "Turn Desk Lamp On" : "Turn Desk Lamp Off",
      hint: `${prefs.lighting?.lampKelvin || 3200}K`,
      keywords: "lamp light kelvin dusk",
      run: () => {
        savePreferences({ lighting: { lampOn: prefs.lighting?.lampOn === false } });
        lightingManager.apply();
      }
    },
    ...profiles.map((p) => ({
      id: `cmd_prof_${p.id}`,
      group: "Workspace Profiles",
      label: `Apply Profile: ${p.name}`,
      hint: `${p.settings?.defaultFocusMinutes || 25}m`,
      keywords: `profile workspace preset ${p.name} ${p.description || ""}`.toLowerCase(),
      run: () => applyWorkspaceProfile(p)
    })),
    {
      id: "tool_tasks",
      group: "Study Tools",
      label: "Plan & Execute · Draggable Kanban, Goals & Exams",
      hint: isDeepFocus ? "Plan" : "Pinboard",
      keywords: "pinboard tasks todo kanban goals budgets exams",
      run: () => openWorkspaceTool("tasks", ".pinboard", null, "plan", "kanban")
    },
    {
      id: "tool_diary",
      group: "Study Tools",
      label: "Notes & Diary · Markdown Journal & Export",
      hint: isDeepFocus ? "Knowledge" : "Notebook",
      keywords: "diary notes markdown export journal",
      run: () => openWorkspaceTool("diary", ".desk-notebook", null, "knowledge", "notes")
    },
    {
      id: "tool_library",
      group: "Study Tools",
      label: "Flashcards & Guides · Spaced Repetition & Library",
      hint: isDeepFocus ? "Knowledge" : "Bookshelf",
      keywords: "bookshelf flashcards srs spaced repetition guides library",
      run: () => openWorkspaceTool("library", ".bookshelf", null, "knowledge", "flashcards")
    },
    {
      id: "tool_audio",
      group: "Study Tools",
      label: "Music Studio · Sound Discs & 9-Channel Mixer",
      hint: isDeepFocus ? "Music" : "Headphones",
      keywords: "headphones audio music brown pink noise lofi low-pass warmth mixer",
      run: () => openWorkspaceTool("audio", ".desk-headphones", null, "music", "discs")
    },
    {
      id: "tool_calendar",
      group: "Study Tools",
      label: "Analytics & Calendar · Streaks, Heatmap & Insights",
      hint: isDeepFocus ? "Insights" : "Calendar",
      keywords: "calendar streaks heatmap analytics budgets",
      run: () => openWorkspaceTool("calendar", ".wall-calendar", null, "insights", "analytics")
    },
    {
      id: "tool_register",
      group: "Study Tools",
      label: "Session Register · History & CSV/Markdown Export",
      hint: isDeepFocus ? "Insights" : "Hourglass",
      keywords: "hourglass register history csv markdown export quality",
      run: () => openWorkspaceTool("register", ".desk-hourglass", null, "insights", "register")
    },
    {
      id: "tool_milestones",
      feature: "achievements",
      group: "Study Tools",
      label: "Focus Milestones & Study Passport",
      hint: isDeepFocus ? "Insights" : "Trophy",
      keywords: "achievements trophy milestones passport streaks",
      run: () => openWorkspaceTool("achievements", ".trophy", null, "insights", "milestones")
    },
    {
      id: "tool_cabinet",
      group: "Study Tools",
      label: "Archive & JSON Backup / Restore",
      hint: isDeepFocus ? "Insights" : "Cabinet",
      keywords: "cabinet drawer inventory backup json restore",
      run: () => openWorkspaceTool("cabinet", ".cabinet-drawer", null, "insights", "archive")
    },
    {
      id: "tool_community",
      group: "Study Tools",
      label: "Silent Body-Doubling Halls, Friends & Rooms",
      hint: isDeepFocus ? "Rooms" : "Computer",
      keywords: "computer body doubling synced pomodoro community groups friends",
      run: () => openWorkspaceTool("community", ".desk-computer", null, "community", "halls")
    },
    {
      id: "tool_shop",
      group: "Study Tools",
      label: "Catalog · Scenes, Particles, Music Discs & Themes",
      hint: isDeepFocus ? "Catalog" : "Merchant",
      keywords: "shop catalog buy themes particles music items",
      run: () => openWorkspaceTool("shop", ".merchant-bird", null, "catalog", "all")
    },
    {
      id: "tool_break",
      feature: "coffee",
      group: "Study Tools",
      label: "Recovery & 20-20-20 Eye Rest Break",
      hint: isDeepFocus ? "Break" : "Coffee",
      keywords: "coffee mug break rest eye timer",
      run: () => openWorkspaceTool("coffee", ".coffee-mug", null, "break", "rest")
    },
    {
      id: "tool_settings",
      group: "Study Tools",
      label: "Workspace Settings, Scenes & Focus Controls",
      hint: "Settings",
      keywords: "settings control panel serious strict lock backdrop particles",
      run: () => openWorkspaceTool("settings", ".settings-panel", null, "settings", "")
    }
  ].filter((cmd) => !cmd.feature || !isFeatureHiddenInSeriousMode(cmd.feature, serious));
}

function renderList() {
  if (!listEl || !inputEl) return;
  const query = inputEl.value.trim().toLowerCase();
  const all = getCommands();
  currentItems = query
    ? all.filter((item) =>
        `${item.label} ${item.group} ${item.keywords}`.toLowerCase().includes(query)
      )
    : all;

  if (selectedIndex >= currentItems.length) selectedIndex = 0;

  if (currentItems.length === 0) {
    listEl.innerHTML = `<div class="sprk-empty" style="padding:18px;">No matching commands.</div>`;
    return;
  }

  listEl.innerHTML = currentItems
    .map(
      (item, idx) => `
      <button type="button"
        class="sprk-cmd-item ${idx === selectedIndex ? "is-selected" : ""}"
        data-cmd-idx="${idx}"
        role="option"
        aria-selected="${idx === selectedIndex}">
        <div style="min-width:0;text-align:left;">
          <div style="font-size:13.5px;font-weight:700;color:var(--ink);">${escapeHtml(item.label)}</div>
          <div style="font-size:11px;color:var(--muted);">${escapeHtml(item.group)}</div>
        </div>
        <span class="sprk-cmd-kbd">${escapeHtml(item.hint)}</span>
      </button>
    `
    )
    .join("");

  listEl.querySelectorAll("[data-cmd-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = currentItems[Number(btn.dataset.cmdIdx)];
      if (item) {
        closeCommandPalette();
        item.run();
      }
    });
  });
}

export function openCommandPalette() {
  if (!dialogEl) return;
  selectedIndex = 0;
  if (inputEl) inputEl.value = "";
  renderList();
  if (!dialogEl.open) {
    dialogEl.showModal();
  }
  inputEl?.focus();
}

export function closeCommandPalette() {
  if (dialogEl?.open) {
    dialogEl.close();
  }
}

export function initCommandPalette() {
  dialogEl = document.getElementById("sprk-command-dialog");
  inputEl = document.getElementById("sprk-cmd-input");
  listEl = document.getElementById("sprk-cmd-list");
  const closeBtn = dialogEl?.querySelector("#sprk-cmd-close");

  if (!dialogEl || !inputEl || !listEl) return;

  closeBtn?.addEventListener("click", closeCommandPalette);
  dialogEl.addEventListener("click", (e) => {
    if (e.target === dialogEl) closeCommandPalette();
  });

  inputEl.addEventListener("input", () => {
    selectedIndex = 0;
    renderList();
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (currentItems.length > 0) {
        selectedIndex = (selectedIndex + 1) % currentItems.length;
        renderList();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (currentItems.length > 0) {
        selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
        renderList();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = currentItems[selectedIndex];
      if (item) {
        closeCommandPalette();
        item.run();
      }
    }
  });
}
