// Command Palette (Ctrl/Cmd + K) -> Fast Keyboard Navigation, Focus Sprints, Modes & Profiles
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { dialogManager } from "../core/dialog-manager.js";
import { lightingManager } from "../core/lighting-manager.js";
import {
  setSeriousMode,
  toggleStudyTogetherVisualMode,
  toggleStrictFocusLock,
  applyWorkspaceProfile
} from "../core/settings-manager.js";
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
  dialogManager.open("focus", document.querySelector(".desk-clock"));
}

function getCommands() {
  const prefs = state.preferences || {};
  const serious = Boolean(prefs.seriousMode);
  const profiles = [...BUILTIN_WORKSPACE_PROFILES, ...(state.localWorkspaceProfiles || [])];

  const baseCommands = [
    {
      id: "cmd_focus_view",
      group: "Quick Actions",
      label: "Open Focus View Dashboard",
      hint: "Shift+F",
      keywords: "dashboard focus shift+f sprint",
      run: () => dialogManager.open("settings", document.querySelector(".settings-panel"), "focus")
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
      id: "obj_library",
      group: "Room Objects",
      label: "Desk Reference · Guides & Flashcards",
      hint: "Bookshelf",
      keywords: "bookshelf flashcards srs spaced repetition guides library",
      run: () => dialogManager.open("library", document.querySelector(".bookshelf"))
    },
    {
      id: "obj_diary",
      group: "Room Objects",
      label: "Study Notes · Markdown Notebook & Export",
      hint: "Notebook",
      keywords: "diary notes markdown export journal",
      run: () => dialogManager.open("diary", document.querySelector(".desk-notebook"))
    },
    {
      id: "obj_calendar",
      group: "Room Objects",
      label: "Wall Calendar · Streaks, Budgets & Exams",
      hint: "Analytics",
      keywords: "calendar streaks budgets weekly exams countdown",
      run: () => dialogManager.open("calendar", document.querySelector(".wall-calendar"))
    },
    {
      id: "obj_register",
      group: "Room Objects",
      label: "Session Log · History & CSV/Markdown Export",
      hint: "Hourglass",
      keywords: "hourglass register history csv export quality",
      run: () => dialogManager.open("register", document.querySelector(".desk-hourglass"))
    },
    {
      id: "obj_community",
      group: "Room Objects",
      label: "Workstation · Silent Body-Doubling & Rooms",
      hint: "Computer",
      keywords: "computer body doubling synced pomodoro community groups",
      run: () => dialogManager.open("community", document.querySelector(".desk-computer"))
    },
    {
      id: "obj_audio",
      group: "Room Objects",
      label: "Audio Monitor · Brown Noise & Low-Pass Mixer",
      hint: "Headphones",
      keywords: "headphones audio brown pink noise lofi low-pass warmth",
      run: () => dialogManager.open("audio", document.querySelector(".desk-headphones"))
    },
    {
      id: "obj_env",
      group: "Room Objects",
      label: "Window · Sky, Weather & Lamp Color Temp",
      hint: "Environment",
      keywords: "window weather sky dusk kelvin lighting",
      run: () => dialogManager.open("environment", document.querySelector(".window-frame-btn"))
    },
    {
      id: "obj_tasks",
      group: "Room Objects",
      label: "Planning Board · Tasks & Goals",
      hint: "Pinboard",
      keywords: "pinboard tasks todo goals checklist",
      run: () => dialogManager.open("tasks", document.querySelector(".pinboard"))
    },
    {
      id: "obj_cabinet",
      group: "Room Objects",
      label: "Personal Archive · Inventory & JSON Backup",
      hint: "Cabinet",
      keywords: "cabinet drawer inventory backup json restore",
      run: () => dialogManager.open("cabinet", document.querySelector(".cabinet-drawer"))
    },
    {
      id: "obj_settings",
      group: "Room Objects",
      label: "Control Panel · Modes, Profiles & Preferences",
      hint: "Switchboard",
      keywords: "settings control panel serious strict lock",
      run: () => dialogManager.open("settings", document.querySelector(".settings-panel"))
    },
    {
      id: "obj_shop",
      group: "Room Objects",
      label: "Supply Catalog · Themes, Audio & Decor",
      hint: "Merchant",
      keywords: "shop catalog buy themes items",
      run: () => dialogManager.open("shop", document.querySelector(".merchant-bird"))
    },
    {
      id: "obj_custom",
      group: "Room Objects",
      label: "Desk Plant · Theme & Skin Studio",
      hint: "Studio",
      keywords: "plant studio themes skins layout",
      run: () => dialogManager.open("customization", document.querySelector(".desk-plant"))
    }
  ];

  return baseCommands;
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
