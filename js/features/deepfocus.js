// Deep Focus Studio — Pure-Zen Stage, Top-Left Switcher, Radial Menu & Bottom-Right Friends Popover
import { APP_CONFIG } from "../../config.js";
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { bus } from "../core/event-bus.js";
import { themeManager, ROOM_THEMES } from "../core/theme-manager.js";
import { audioManager } from "../core/audio-manager.js";
import { deepFocusParticles } from "../core/deepfocus-particles.js";
import {
  setAppMode,
  getEffectiveColorMode,
  setColorMode,
  isStrictFocusLockActive,
  toggleStrictFocusLock,
  toggleAutoCycleBreaks,
  setSeriousMode,
  setDefaultFocusMinutes,
  applyWorkspaceProfile
} from "../core/settings-manager.js";
import { parseCurrentPage, navigateToPage, PAGE_ROUTES } from "../router.js";
import { openCommandPalette } from "./command-palette.js";
import { createDeepFocusModalController } from "./deepfocus-modals.js";
import { finishActiveFocusSession } from "./focus.js";
import { presenceService } from "../services/presence-service.js";
import { supabase } from "../services/supabase.js";
import { visitFriendRoom, updateFocusSessionSubject } from "../services/database-service.js";
import {
  DEEPFOCUS_SCENES,
  DEEPFOCUS_PARTICLES,
  THEME_DEEPFOCUS_MAP,
  DEFAULT_DEEPFOCUS_PREFS,
  resolveDeepFocusAppearance,
  isParticleOwned,
  sanitizeBackdropUrl,
  computeRadialOrbPositions
} from "../utils/deepfocus-config.js";
import { isThemeAccessibleInMode } from "../utils/room-settings.js";
import { SHOP_CATALOG } from "../utils/shop-catalog.js";
import { renderMiniThumbnail } from "../utils/shop-preview.js";
import { BUILTIN_WORKSPACE_PROFILES } from "../utils/study-tools.js";
import { sanitizeAvatarUrl } from "../utils/profile-helpers.js";
import {
  createFocusSession,
  computeElapsedActiveSeconds,
  computeRemainingSeconds,
  pauseFocusSession,
  resumeFocusSession,
  summarizeFocusMinutes
} from "../utils/timer-math.js";
import { escapeHtml, formatDuration, todayIsoDate, generateId } from "../utils/dom.js";

const RADIAL_ICONS = {
  music: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  account: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  home: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`,
  plan: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="14" rx="1.5"/></svg>`,
  knowledge: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  insights: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>`,
  community: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  catalog: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  break: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  friends: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a3.5 3.5 0 0 1 0 6.74"/></svg>`,
  caretUp: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`
};

export function initDeepFocusWorkspace() {
  const modeSwitcherEl = document.getElementById("sprk-mode-switcher");
  const shellEl = document.getElementById("deepfocus-shell");
  if (!modeSwitcherEl || !shellEl) return;

  let hubExpanded = false;
  let friendsPopoverOpen = false;
  let activeDrawer = null; // null | "settings"
  let timerTab = state.preferences?.deepFocus?.timerTab || "pomodoro";
  let pomodoroPhase = "focus"; // focus | short_break | long_break
  let selectedCustomMins = Number(state.preferences?.defaultFocusMinutes || 25);
  let selectedSubject = "General Study";
  let selectedTaskId = "";
  let selectedCheckInQuality = 4;
  let zenMode = Boolean(state.preferences?.deepFocus?.zenMode);
  let settingsNotice = "";

  const isDeepFocusActive = () => parseCurrentPage().page === PAGE_ROUTES.DEEPFOCUS;

  let renderShell = () => {};

  const modals = createDeepFocusModalController({
    shellEl,
    getSelectedTaskId: () => selectedTaskId,
    onSelectFocusTask: (taskId) => {
      selectedTaskId = taskId;
      const task = (state.localTasks || []).find((x) => x.id === taskId);
      if (task?.subject && task.subject !== "General") {
        selectedSubject = task.subject;
      }
      renderShell();
    },
    onWorkspaceMutated: () => renderShell()
  });

  const renderModeSwitcher = () => {
    const page = parseCurrentPage().page;
    const isSpectating = Boolean(state.spectatingRoom);

    if (page !== PAGE_ROUTES.DEEPFOCUS) {
      document.documentElement.classList.remove("df-overlay-active");
    }

    if ((page !== PAGE_ROUTES.COZY && page !== PAGE_ROUTES.DEEPFOCUS) || isSpectating) {
      modeSwitcherEl.hidden = true;
      modeSwitcherEl.classList.remove("is-pure-zen");
      return;
    }

    const isDf = page === PAGE_ROUTES.DEEPFOCUS;
    const colorMode = getEffectiveColorMode();
    modeSwitcherEl.hidden = false;
    modeSwitcherEl.classList.toggle("is-pure-zen", Boolean(zenMode && isDf));
    modeSwitcherEl.innerHTML = `
      <div class="sprk-mode-switch" role="group" aria-label="Workspace mode">
        <button type="button" class="sprk-mode-switch-btn ${!isDf ? "is-active" : ""}" data-switch-mode="cozy">Cozy Study</button>
        <button type="button" class="sprk-mode-switch-btn ${isDf ? "is-active" : ""}" data-switch-mode="deepfocus">Deep Focus</button>
      </div>
      <div class="sprk-color-mode-switch" role="group" aria-label="Theme color mode">
        <button type="button" class="sprk-color-mode-btn ${colorMode === "light" ? "is-active" : ""}" data-color-mode="light" title="Light mode">☀ Light</button>
        <button type="button" class="sprk-color-mode-btn ${colorMode === "dark" ? "is-active" : ""}" data-color-mode="dark" title="Dark mode">🌙 Dark</button>
      </div>
    `;
    modeSwitcherEl.querySelectorAll("[data-switch-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextMode = btn.dataset.switchMode;
        if (nextMode === "deepfocus" && page !== PAGE_ROUTES.DEEPFOCUS) {
          setAppMode("deepfocus", { syncUrl: false });
          navigateToPage(PAGE_ROUTES.DEEPFOCUS);
        } else if (nextMode === "cozy" && page !== PAGE_ROUTES.COZY) {
          setAppMode("cozy", { syncUrl: false });
          navigateToPage(PAGE_ROUTES.COZY);
        }
      });
    });
    modeSwitcherEl.querySelectorAll("[data-color-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setColorMode(btn.dataset.colorMode);
        renderModeSwitcher();
      });
    });
  };

  const getActiveCountdownSeconds = () => {
    const sess = state.activeSession;
    if (sess) {
      if (sess.isStopwatch) return computeElapsedActiveSeconds(sess);
      return computeRemainingSeconds(sess);
    }
    if (timerTab === "stopwatch") return 0;
    if (timerTab === "timer") return selectedCustomMins * 60;
    if (pomodoroPhase === "short_break") return APP_CONFIG.defaults.focus.shortBreakMinutes * 60;
    if (pomodoroPhase === "long_break") return APP_CONFIG.defaults.focus.longBreakMinutes * 60;
    return Number(state.preferences?.defaultFocusMinutes || 25) * 60;
  };

  const getTimerPhaseStatusLabel = () => {
    const sess = state.activeSession;
    if (sess) {
      if (sess.isStopwatch) return sess.status === "paused" ? "Stopwatch · Paused" : "Stopwatch · Running";
      if (sess.mode === "short_break") return sess.status === "paused" ? "Short Break · Paused" : "Short Break";
      if (sess.mode === "long_break") return sess.status === "paused" ? "Long Break · Paused" : "Long Break";
      return sess.status === "paused" ? "Focus Phase · Paused" : "Focus Phase";
    }
    if (timerTab === "stopwatch") return "Stopwatch Ready";
    if (timerTab === "timer") return `Custom Timer · ${selectedCustomMins}m`;
    if (pomodoroPhase === "short_break") return "Rest Phase · Short Break";
    if (pomodoroPhase === "long_break") return "Rest Phase · Long Break";
    return "Focus Phase · Ready";
  };

  const updateClockDomOnly = () => {
    if (!isDeepFocusActive()) return;
    const readout = shellEl.querySelector("#df-clock-display");
    if (readout) {
      readout.textContent = formatDuration(getActiveCountdownSeconds());
    }
    const statusLine = shellEl.querySelector("#df-phase-status");
    if (statusLine) {
      statusLine.textContent = getTimerPhaseStatusLabel();
    }
  };

  const startDeepFocusSession = async () => {
    if (state.activeSession) return;
    const openTask = (state.localTasks || []).find((t) => t.id === selectedTaskId);
    const subject = (openTask?.subject && openTask.subject !== "General" ? openTask.subject : selectedSubject).trim() || "General Study";

    let mode = "focus";
    let targetSeconds = Number(state.preferences?.defaultFocusMinutes || 25) * 60;
    let isStopwatch = false;

    if (timerTab === "pomodoro") {
      mode = pomodoroPhase;
      if (pomodoroPhase === "short_break") targetSeconds = APP_CONFIG.defaults.focus.shortBreakMinutes * 60;
      else if (pomodoroPhase === "long_break") targetSeconds = APP_CONFIG.defaults.focus.longBreakMinutes * 60;
    } else if (timerTab === "timer") {
      mode = "focus";
      targetSeconds = Math.max(1, selectedCustomMins) * 60;
    } else {
      mode = "focus";
      targetSeconds = 21600;
      isStopwatch = true;
    }

    const newSess = createFocusSession({
      id: generateId("focus"),
      mode,
      targetSeconds,
      scope: "personal",
      subject: openTask ? `${openTask.title.slice(0, 32)}` : subject,
      isStopwatch,
      taskId: openTask?.id || null
    });
    newSess.interruptions = 0;

    if (supabase.configured && state.user?.id) {
      const { data } = await supabase.insert("focus_sessions", {
        id: newSess.id,
        user_id: state.user.id,
        mode: newSess.mode,
        scope: newSess.scope,
        subject: newSess.subject,
        target_seconds: newSess.targetSeconds,
        status: "running",
        started_at: new Date(newSess.startedAtMs).toISOString()
      });
      if (data?.[0]?.id) newSess.serverSessionId = data[0].id;
    }

    state.pendingNextPomodoroStep = null;
    persistLocalCollection("activeSession", newSess);
    renderShell();
  };

  const playTransitionChime = () => {
    const chime = state.preferences?.deepFocus?.chimeSound || "bowl";
    if (chime === "mute" || state.preferences?.muteChimes) return;
    audioManager.playChime(chime === "bell" ? "focus" : "complete");
  };

  const syncParticlesAndBackdrop = () => {
    if (!isDeepFocusActive()) {
      deepFocusParticles.stop();
      return null;
    }
    const appearance = resolveDeepFocusAppearance({
      themeId: state.preferences?.theme || "comic",
      deepFocusPrefs: state.preferences?.deepFocus || DEFAULT_DEEPFOCUS_PREFS,
      ownedItemIds: state.ownedItemIds || []
    });

    shellEl.style.removeProperty("--df-accent");
    shellEl.style.removeProperty("--df-accent-soft");
    shellEl.style.setProperty("--df-bg-filter", appearance.filterCss);

    const imgEl = shellEl.querySelector("#df-backdrop-img");
    if (imgEl && imgEl.getAttribute("src") !== appearance.backdropUrl) {
      imgEl.setAttribute("src", appearance.backdropUrl);
    }

    const canvas = shellEl.querySelector("#df-particle-canvas");
    if (canvas) {
      deepFocusParticles.mount(canvas);
      deepFocusParticles.configure({
        active: true,
        particleId: appearance.particleId,
        speed: appearance.settings.particleSpeed,
        opacity: appearance.settings.particleOpacity,
        density: appearance.settings.particleDensity,
        reducedMotion: Boolean(state.preferences?.reducedMotion) || Boolean(state.preferences?.lowPerformance)
      });
    }
    return appearance;
  };

  const renderFriendsPopoverBodyHtml = ({ entries, onlineFriends, signedIn }) => {
    if (!signedIn) {
      return `
        <div class="df-fpop-empty">
          <span>Sign in to see classmates online, what they are studying, and visit their study rooms.</span>
          <button type="button" class="df-btn-accent" id="df-friends-signin">Sign In</button>
        </div>
      `;
    }
    if (entries.length === 0) {
      return `
        <div class="df-fpop-empty">
          <span>No friends connected yet. Add classmates to study side by side.</span>
          <button type="button" class="df-btn-subtle" id="df-friends-find">Find Friends</button>
        </div>
      `;
    }
    if (onlineFriends.length === 0) {
      return `
        <div class="df-fpop-empty">
          <span>${entries.length} friend${entries.length === 1 ? "" : "s"} connected · None online right now</span>
          <button type="button" class="df-btn-subtle" id="df-friends-find">View All</button>
        </div>
      `;
    }
    return `
      <div class="df-friends-list">
        ${onlineFriends.map((friend) => {
          const safeAvatar = sanitizeAvatarUrl(friend.avatarUrl || "");
          const isStudying = friend.status === "studying";
          const statusLabel = isStudying
            ? (friend.isStudyingWithUser ? "Studying with you" : "Studying")
            : "Online";
          return `
            <article class="df-friend-row is-${escapeHtml(friend.status)}">
              <div class="df-friend-top">
                <div class="df-friend-avatar">
                  ${safeAvatar
                    ? `<img src="${escapeHtml(safeAvatar)}" alt="" referrerpolicy="no-referrer" />`
                    : `<span>${escapeHtml(friend.avatarPreset || friend.displayName.slice(0, 1).toUpperCase())}</span>`}
                </div>
                <div class="df-friend-meta">
                  <div class="df-friend-name-row">
                    <span class="df-live-indicator ${isStudying ? "is-live" : "is-online"}" aria-hidden="true"></span>
                    <span class="df-friend-name">${escapeHtml(friend.displayName)}</span>
                  </div>
                  <div class="df-friend-sub">
                    <span>${escapeHtml(statusLabel)}</span>
                    ${isStudying && friend.elapsedLabel
                      ? `<span aria-hidden="true">·</span><span class="df-friend-dur tabular-nums">${escapeHtml(friend.elapsedLabel)}</span>`
                      : ""}
                  </div>
                </div>
                ${friend.roomVisibility === "private"
                  ? `<button type="button" class="df-btn-subtle" disabled title="Room is set to Private" style="opacity:0.55;cursor:not-allowed;">Private</button>`
                  : `<button type="button" class="df-btn-subtle" data-df-visit="${escapeHtml(friend.id)}">Visit</button>`}
              </div>
              ${isStudying ? `
                <div class="df-friend-subject">${escapeHtml(friend.subject || "General Study")}</div>
                ${friend.progressPct > 0 ? `
                  <div class="df-friend-progress-track" aria-hidden="true">
                    <div class="df-friend-progress-fill" style="width:${friend.progressPct}%;"></div>
                  </div>
                ` : ""}
              ` : ""}
            </article>
          `;
        }).join("")}
      </div>
    `;
  };

  const renderBottomFriendsDockHtml = () => {
    const { entries, summary, signedIn } = presenceService.getSnapshot(Date.now());
    const onlineFriends = entries.filter((e) => e.status === "studying" || e.status === "online");
    const onlineCount = onlineFriends.length;
    const studyingCount = summary.studyingCount || 0;
    const hasOnline = onlineCount > 0;

    return `
      <aside class="df-friends-dock ${friendsPopoverOpen ? "is-open" : ""} ${zenMode ? "is-pure-zen" : ""}" id="df-friends-dock" aria-label="Friends online">
        ${friendsPopoverOpen ? `
          <div class="df-friends-popover" id="df-friends-popover" role="dialog" aria-label="Friends online studying">
            <header class="df-fpop-head">
              <div class="df-friends-title">
                <span class="df-live-indicator ${hasOnline ? "is-live" : ""}" id="df-fpop-live-dot" aria-hidden="true"></span>
                <span>Currently Online</span>
                <span class="df-muted tabular-nums" id="df-fpop-status-summary">
                  ${signedIn ? `${onlineCount} online${studyingCount > 0 ? ` · ${studyingCount} focusing` : ""}` : "Offline"}
                </span>
              </div>
              <button type="button" class="df-hub-inline-link" id="df-friends-manage">Manage →</button>
            </header>

            <div class="df-fpop-body" id="df-fpop-body">
              ${renderFriendsPopoverBodyHtml({ entries, onlineFriends, signedIn })}
            </div>
          </div>
        ` : ""}

        <button
          type="button"
          class="df-friends-pill"
          id="df-friends-pill"
          aria-expanded="${friendsPopoverOpen}"
          aria-controls="df-friends-popover"
          title="Friends online studying">
          <span class="df-live-indicator ${hasOnline ? "is-live" : ""}" id="df-pill-live-dot" aria-hidden="true"></span>
          <span class="df-friends-ico" aria-hidden="true">${RADIAL_ICONS.friends}</span>
          <span class="df-friends-pill-text tabular-nums" id="df-pill-count-text">
            ${signedIn ? `<strong>${onlineCount}</strong> online` : "<strong>0</strong> online"}
          </span>
          <span class="df-friends-caret ${friendsPopoverOpen ? "is-open" : ""}" aria-hidden="true">${RADIAL_ICONS.caretUp}</span>
        </button>
      </aside>
    `;
  };

  const bindPopoverBodyActionEvents = () => {
    shellEl.querySelector("#df-friends-find")?.addEventListener("click", () => {
      friendsPopoverOpen = false;
      modals.open("community", "friends");
    });
    shellEl.querySelector("#df-friends-signin")?.addEventListener("click", () => {
      friendsPopoverOpen = false;
      navigateToPage(PAGE_ROUTES.ACCOUNT);
    });
    shellEl.querySelectorAll("[data-df-visit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await visitFriendRoom(btn.dataset.dfVisit);
        if (!error) {
          friendsPopoverOpen = false;
          setAppMode("cozy", { syncUrl: false });
          navigateToPage(PAGE_ROUTES.COZY);
        }
      });
    });
  };

  const bindBottomFriendsDockEvents = () => {
    shellEl.querySelector("#df-friends-pill")?.addEventListener("click", (e) => {
      e.stopPropagation();
      friendsPopoverOpen = !friendsPopoverOpen;
      if (friendsPopoverOpen) hubExpanded = false;
      renderShell();
    });
    shellEl.querySelector("#df-friends-popover")?.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    shellEl.querySelector("#df-friends-manage")?.addEventListener("click", () => {
      friendsPopoverOpen = false;
      modals.open("community", "friends");
    });
    bindPopoverBodyActionEvents();
  };

  const refreshBottomFriendsDock = () => {
    if (!isDeepFocusActive()) return;
    const dock = shellEl.querySelector("#df-friends-dock");
    if (!dock) return;

    const { entries, summary, signedIn } = presenceService.getSnapshot(Date.now());
    const onlineFriends = entries.filter((e) => e.status === "studying" || e.status === "online");
    const onlineCount = onlineFriends.length;
    const studyingCount = summary.studyingCount || 0;
    const hasOnline = onlineCount > 0;

    const pillDot = dock.querySelector("#df-pill-live-dot");
    if (pillDot) pillDot.classList.toggle("is-live", hasOnline);

    const pillText = dock.querySelector("#df-pill-count-text");
    if (pillText) {
      pillText.innerHTML = signedIn ? `<strong>${onlineCount}</strong> online` : "<strong>0</strong> online";
    }

    if (friendsPopoverOpen) {
      const popDot = dock.querySelector("#df-fpop-live-dot");
      if (popDot) popDot.classList.toggle("is-live", hasOnline);

      const popSummary = dock.querySelector("#df-fpop-status-summary");
      if (popSummary) {
        popSummary.textContent = signedIn
          ? `${onlineCount} online${studyingCount > 0 ? ` · ${studyingCount} focusing` : ""}`
          : "Offline";
      }

      const popBody = dock.querySelector("#df-fpop-body");
      if (popBody) {
        popBody.innerHTML = renderFriendsPopoverBodyHtml({ entries, onlineFriends, signedIn });
        bindPopoverBodyActionEvents();
      }
    }
  };

  const renderRadialMenuHtml = ({ openTasks }) => {
    const activeModal = modals.getActiveModal();
    const audioPlaying = Boolean(audioManager.isPlaying);
    const userShort = state.user ? (state.user.displayName || "Account").split(" ")[0] : "Account";

    const innerItems = [
      { id: "music", label: audioPlaying ? "Playing" : "Music", icon: RADIAL_ICONS.music, action: "music", active: activeModal === "music" || audioPlaying, title: "Music & 9-Channel Mixer" },
      { id: "settings", label: "Settings", icon: RADIAL_ICONS.settings, action: "settings", active: activeDrawer === "settings", title: "Workspace Settings & Scenes" },
      { id: "account", label: userShort, icon: RADIAL_ICONS.account, action: "account", active: false, title: "Account, Profile & Friends" },
      { id: "home", label: "Home", icon: RADIAL_ICONS.home, action: "home", active: false, title: "Main SPRK Desk Website" }
    ];

    const outerItems = [
      { id: "plan", label: "Plan", icon: RADIAL_ICONS.plan, modal: "plan", active: activeModal === "plan", title: `Plan & Kanban (${openTasks.length} open)` },
      { id: "knowledge", label: "Notes", icon: RADIAL_ICONS.knowledge, modal: "knowledge", active: activeModal === "knowledge", title: "Diary, Notes & Flashcards" },
      { id: "insights", label: "Insights", icon: RADIAL_ICONS.insights, modal: "insights", active: activeModal === "insights", title: "Stats, Heatmap, Register & Backup" },
      { id: "community", label: "Halls", icon: RADIAL_ICONS.community, modal: "community", active: activeModal === "community", title: "Silent Halls & Friends" },
      { id: "catalog", label: "Catalog", icon: RADIAL_ICONS.catalog, modal: "catalog", active: activeModal === "catalog", title: "Scenes, Particles, Discs & Themes" },
      { id: "break", label: "Rest", icon: RADIAL_ICONS.break, modal: "break", active: activeModal === "break", title: "20-20-20 Eye Rest" },
      { id: "palette", label: "Search", icon: RADIAL_ICONS.search, action: "palette", active: false, title: "Command Palette (Ctrl/Cmd+K)" }
    ];

    const innerCoords = computeRadialOrbPositions({ count: innerItems.length, radiusPx: 162, startDeg: 4, endDeg: 86 });
    const outerCoords = computeRadialOrbPositions({ count: outerItems.length, radiusPx: 308, startDeg: 2, endDeg: 88 });

    const renderOrb = (item, pos, delayMs) => `
      <button
        type="button"
        class="df-radial-node ${item.active ? "is-active" : ""}"
        style="--rx:${pos.rx}px;--ry:${pos.ry}px;--delay:${delayMs}ms;"
        ${item.modal ? `data-df-modal="${escapeHtml(item.modal)}"` : `data-df-action="${escapeHtml(item.action)}"`}
        aria-label="${escapeHtml(item.title)}"
        title="${escapeHtml(item.title)}">
        <span class="df-radial-orb">${item.icon}</span>
        <span class="df-radial-label">${escapeHtml(item.label)}</span>
      </button>
    `;

    return `
      ${hubExpanded ? `<div class="df-radial-backdrop" id="df-radial-backdrop" aria-hidden="true"></div>` : ""}

      <div class="df-radial-menu ${hubExpanded ? "is-open" : ""} ${zenMode ? "is-pure-zen" : ""}" id="df-radial-menu">
        ${hubExpanded ? `
          <svg class="df-radial-arcs" viewBox="0 0 360 360" width="360" height="360" aria-hidden="true">
            <path class="df-orbit-arc is-inner" d="M 198 0 A 162 162 0 0 0 360 162" />
            <path class="df-orbit-arc is-outer" d="M 52 0 A 308 308 0 0 0 360 308" />
          </svg>

          <nav class="df-radial-stage" id="df-hub-panel" aria-label="Studio radial menu">
            ${innerItems.map((item, idx) => renderOrb(item, innerCoords[idx], idx * 26)).join("")}
            ${outerItems.map((item, idx) => renderOrb(item, outerCoords[idx], 50 + idx * 24)).join("")}
          </nav>
        ` : ""}

        <button
          type="button"
          class="df-radial-trigger ${hubExpanded ? "is-open" : ""} ${audioPlaying ? "is-audio-live" : ""}"
          id="df-hub-toggle"
          aria-expanded="${hubExpanded}"
          aria-controls="df-hub-panel"
          aria-label="${hubExpanded ? "Close Studio Menu" : "Open Studio Menu"}"
          title="Studio Menu (M)">
          ${hubExpanded ? `
            <span class="df-trigger-close" aria-hidden="true">×</span>
          ` : `
            <span class="df-hub-glyph ${audioPlaying ? "is-active" : ""}" aria-hidden="true">
              <span></span><span></span><span></span><span></span>
            </span>
            <span class="df-trigger-text">Menu</span>
          `}
        </button>
      </div>
    `;
  };

  const renderSettingsDrawerHtml = (appearance) => {
    const s = appearance.settings;
    const seriousMode = Boolean(state.preferences?.seriousMode);
    const ownedIds = state.ownedItemIds || [];
    const currentTheme = state.preferences?.theme || "comic";
    const locked = isStrictFocusLockActive();
    const unownedParticles = DEEPFOCUS_PARTICLES.filter((p) => p.shopItemId && !isParticleOwned(p.id, ownedIds));
    const profiles = [...BUILTIN_WORKSPACE_PROFILES, ...(state.localWorkspaceProfiles || [])];

    const currentThemeItem = SHOP_CATALOG.find((i) => i.category === "theme" && i.themeId === currentTheme);

    return `
      <aside class="df-drawer df-drawer-settings" aria-label="Workspace settings">
        <header class="df-drawer-head">
          <h2>Workspace Settings</h2>
          <button type="button" class="df-icon-btn" id="df-close-drawer" aria-label="Close settings drawer">×</button>
        </header>

        <div class="df-settings-scroll">
          ${settingsNotice ? `<div class="df-notice">${escapeHtml(settingsNotice)}</div>` : ""}

          <section class="df-settings-group">
            <div class="df-settings-label-row">
              <h3>Workspace Profiles</h3>
            </div>
            <div class="df-profile-chips">
              ${profiles.map((prof) => `
                <button type="button" class="df-btn-subtle" data-df-profile-id="${escapeHtml(prof.id)}" title="${escapeHtml(prof.description || "")}">
                  ${escapeHtml(prof.name)}
                </button>
              `).join("")}
            </div>
            <form id="df-save-profile-form" class="df-custom-bg-row">
              <input id="df-new-profile-name" class="df-input" type="text" maxlength="32" placeholder="Save current setup as preset..." aria-label="New workspace preset name" />
              <button type="submit" class="df-btn-accent">Save</button>
            </form>
          </section>

          <section class="df-settings-group">
            <div class="df-settings-label-row">
              <h3>Theme &amp; Ambient Scene</h3>
              <button type="button" class="df-link-btn" id="df-open-themes-shop">Preview Themes →</button>
            </div>
            ${currentThemeItem ? `
              <div class="df-settings-preview-row">
                ${renderMiniThumbnail(currentThemeItem, currentTheme)}
                <div style="min-width:0;flex:1;">
                  <strong style="font-size:12.5px;display:block;">${escapeHtml(currentThemeItem.name)}</strong>
                  <span class="df-muted">${escapeHtml(appearance.sceneName)}</span>
                </div>
                <button type="button" class="df-btn-subtle" id="df-open-cosmetics-shop">Cosmetics</button>
              </div>
            ` : ""}
            <label class="df-field">
              <span>Color &amp; Theme Preset</span>
              <select id="df-theme-select" class="df-select" ${locked ? "disabled" : ""}>
                ${ROOM_THEMES.map((t) => {
                  const accessible = isThemeAccessibleInMode(t.id, { ownedItemIds: ownedIds, seriousMode });
                  const item = SHOP_CATALOG.find((i) => i.category === "theme" && i.themeId === t.id);
                  const suffix = accessible ? "" : ` (Catalog · ${item?.price || 30} SC)`;
                  return `<option value="${escapeHtml(t.id)}" ${currentTheme === t.id ? "selected" : ""}>${escapeHtml(t.name)}${suffix}</option>`;
                }).join("")}
              </select>
            </label>

            <label class="df-field">
              <span>Background Scene</span>
              <select id="df-scene-select" class="df-select">
                <option value="theme" ${s.followThemeScene ? "selected" : ""}>Match Active Theme (${escapeHtml(appearance.sceneName)})</option>
                ${DEEPFOCUS_SCENES.map((sc) => `
                  <option value="${escapeHtml(sc.id)}" ${!s.followThemeScene && s.sceneId === sc.id ? "selected" : ""}>${escapeHtml(sc.name)}</option>
                `).join("")}
              </select>
            </label>

            <div class="df-custom-bg-row">
              <input id="df-custom-bg-url" class="df-input" type="url" value="${escapeHtml(s.customBackdropUrl || "")}" placeholder="Custom image URL (https://...)..." aria-label="Custom background URL" />
              <button type="button" class="df-btn-subtle" id="df-apply-bg-url">Apply</button>
              ${s.customBackdropUrl ? `<button type="button" class="df-btn-subtle" id="df-clear-bg-url">Clear</button>` : ""}
            </div>
          </section>

          <section class="df-settings-group">
            <div class="df-settings-label-row">
              <h3>Background Tuning</h3>
              <button type="button" class="df-link-btn" id="df-reset-tuning">Reset</button>
            </div>
            ${[
              ["blur", "Blur", 0, 24, 1, "px", s.blur],
              ["brightness", "Brightness", 40, 130, 1, "%", s.brightness],
              ["contrast", "Contrast", 70, 140, 1, "%", s.contrast],
              ["saturation", "Saturation", 0, 160, 1, "%", s.saturation]
            ].map(([key, label, min, max, step, unit, val]) => `
              <label class="df-slider-row">
                <div class="df-slider-head">
                  <span>${label}</span>
                  <span class="tabular-nums" id="df-val-${key}">${val}${unit}</span>
                </div>
                <input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-df-slider="${key}" data-unit="${unit}" />
              </label>
            `).join("")}
          </section>

          <section class="df-settings-group">
            <div class="df-settings-label-row">
              <h3>Atmospheric Particle Engine</h3>
              <button type="button" class="df-link-btn" id="df-open-particles-shop">Catalog</button>
            </div>

            <label class="df-field">
              <span>Active Particle Layer</span>
              <select id="df-particle-select" class="df-select">
                <option value="theme" ${s.followThemeParticle ? "selected" : ""}>Match Active Theme</option>
                ${DEEPFOCUS_PARTICLES.map((p) => {
                  const owned = isParticleOwned(p.id, ownedIds);
                  const selected = !s.followThemeParticle && s.particleId === p.id;
                  return `<option value="${escapeHtml(p.id)}" ${selected ? "selected" : ""}>${escapeHtml(p.name)}${owned ? "" : ` (${p.price} SC)`}</option>`;
                }).join("")}
              </select>
            </label>

            ${unownedParticles.length > 0 ? `
              <div class="df-shop-hint-row">
                <span>${unownedParticles.length} particle packs available</span>
                <button type="button" class="df-btn-subtle" id="df-buy-particles-btn">Browse Particles</button>
              </div>
            ` : ""}

            <label class="df-slider-row">
              <div class="df-slider-head">
                <span>Speed</span>
                <span class="tabular-nums" id="df-val-particleSpeed">${s.particleSpeed}x</span>
              </div>
              <input type="range" min="0.2" max="2.5" step="0.1" value="${s.particleSpeed}" data-df-slider="particleSpeed" data-unit="x" />
            </label>

            <label class="df-slider-row">
              <div class="df-slider-head">
                <span>Opacity</span>
                <span class="tabular-nums" id="df-val-particleOpacity">${Math.round(s.particleOpacity * 100)}%</span>
              </div>
              <input type="range" min="10" max="100" step="5" value="${Math.round(s.particleOpacity * 100)}" data-df-slider="particleOpacityPct" data-unit="%" />
            </label>

            <label class="df-slider-row">
              <div class="df-slider-head">
                <span>Density</span>
                <span class="tabular-nums" id="df-val-particleDensity">${s.particleDensity}</span>
              </div>
              <input type="range" min="15" max="140" step="5" value="${s.particleDensity}" data-df-slider="particleDensity" data-unit="" />
            </label>
          </section>

          <section class="df-settings-group">
            <h3>Focus &amp; Chime Controls</h3>
            <div class="df-custom-bg-row">
              <select id="df-chime-select" class="df-select" aria-label="Transition chime sound" style="flex:1;">
                <option value="bowl" ${s.chimeSound === "bowl" ? "selected" : ""}>Tibetan Singing Bowl</option>
                <option value="bell" ${s.chimeSound === "bell" ? "selected" : ""}>Soft Focus Bell</option>
                <option value="mute" ${s.chimeSound === "mute" ? "selected" : ""}>Muted</option>
              </select>
              <button type="button" class="df-btn-subtle" id="df-test-chime">Test</button>
            </div>

            <div class="df-toggle-row">
              <span>Default Focus Block</span>
              <div class="df-seg-mini">
                ${[25, 50, 90].map((m) => `
                  <button type="button" class="df-mini-act ${Number(state.preferences?.defaultFocusMinutes || 25) === m ? "is-accent" : ""}" data-df-block-mins="${m}">${m}m</button>
                `).join("")}
              </div>
            </div>

            <label class="df-check-row">
              <input type="checkbox" id="df-strict-lock" ${state.preferences?.strictFocusLock ? "checked" : ""} />
              <span>Strict Focus Lock (tab audit &amp; catalog guard)</span>
            </label>

            <label class="df-check-row">
              <input type="checkbox" id="df-auto-cycle" ${state.preferences?.autoCycleBreaks !== false ? "checked" : ""} />
              <span>Auto-advance break and focus phases</span>
            </label>

            <label class="df-check-row">
              <input type="checkbox" id="df-serious-mode" ${state.preferences?.seriousMode ? "checked" : ""} />
              <span>Serious Mode (free monochrome Editorial &amp; Noir themes)</span>
            </label>
          </section>
        </div>
      </aside>
    `;
  };

  renderShell = () => {
    renderModeSwitcher();
    const active = isDeepFocusActive();
    shellEl.hidden = !active;
    if (!active) {
      deepFocusParticles.stop();
      return;
    }

    const prefs = state.preferences || {};
    const appearance = resolveDeepFocusAppearance({
      themeId: prefs.theme || "comic",
      deepFocusPrefs: prefs.deepFocus || DEFAULT_DEEPFOCUS_PREFS,
      ownedItemIds: state.ownedItemIds || []
    });
    const sess = state.activeSession;
    const today = todayIsoDate();
    const todayFocusRecords = (state.localStudyRecords || []).filter(
      (r) => r.date === today && (r.mode || "focus") === "focus"
    );
    const todayFocusMins = summarizeFocusMinutes(todayFocusRecords).totalMinutes;
    const blocksDone = todayFocusRecords.length;
    const dailyGoalBlocks = appearance.settings.dailyBlockGoal || 8;
    const openTasks = (state.localTasks || []).filter((t) => !t.completed);
    const pendingCheckIn = state.pendingCheckInRecordId
      ? (state.localStudyRecords || []).find((r) => r.id === state.pendingCheckInRecordId)
      : null;
    const prevDrawerScrollTop = activeDrawer === "settings"
      ? (shellEl.querySelector(".df-settings-scroll")?.scrollTop || 0)
      : 0;

    shellEl.innerHTML = `
      <div class="df-backdrop-wrap" aria-hidden="true">
        <img id="df-backdrop-img" class="df-backdrop-img" src="${escapeHtml(appearance.backdropUrl)}" alt="" draggable="false" referrerpolicy="no-referrer" />
        <div class="df-backdrop-scrim"></div>
        <canvas id="df-particle-canvas" class="df-particle-canvas"></canvas>
      </div>

      <div class="df-layout is-zen ${activeDrawer ? "has-drawer" : ""}">
        ${renderRadialMenuHtml({ openTasks })}

        <main class="df-stage" aria-label="Deep Focus Timer Stage">
          <section class="df-timer-card" aria-label="Focus timer">
            <div class="df-segmented" role="tablist" aria-label="Timer type">
              <button type="button" class="df-seg-btn ${timerTab === "pomodoro" ? "is-active" : ""}" data-df-tab="pomodoro">Pomodoro</button>
              <button type="button" class="df-seg-btn ${timerTab === "timer" ? "is-active" : ""}" data-df-tab="timer">Timer</button>
              <button type="button" class="df-seg-btn ${timerTab === "stopwatch" ? "is-active" : ""}" data-df-tab="stopwatch">Stopwatch</button>
            </div>

            ${timerTab === "pomodoro" ? `
              <div class="df-phase-pills" role="tablist" aria-label="Pomodoro phase">
                <button type="button" class="df-phase-btn ${pomodoroPhase === "focus" ? "is-active" : ""}" data-df-phase="focus">Focus Phase</button>
                <button type="button" class="df-phase-btn ${pomodoroPhase === "short_break" ? "is-active" : ""}" data-df-phase="short_break">Short Break</button>
                <button type="button" class="df-phase-btn ${pomodoroPhase === "long_break" ? "is-active" : ""}" data-df-phase="long_break">Long Break</button>
              </div>
              <div class="df-goal-line tabular-nums">
                <span>${blocksDone} of ${dailyGoalBlocks} blocks today</span>
                <span aria-hidden="true">·</span>
                <span>${todayFocusMins}m focused</span>
              </div>
            ` : timerTab === "timer" ? `
              <div class="df-phase-pills" aria-label="Quick durations">
                ${[15, 25, 50, 90].map((m) => `
                  <button type="button" class="df-phase-btn ${selectedCustomMins === m ? "is-active" : ""}" data-df-timer-mins="${m}">${m}m</button>
                `).join("")}
                <input id="df-custom-mins-input" class="df-mins-inline tabular-nums" type="number" min="1" max="180" value="${selectedCustomMins}" aria-label="Custom minutes" ${sess ? "disabled" : ""} />
              </div>
            ` : `
              <div class="df-goal-line">
                <span>Open Focus Stopwatch</span>
                <span aria-hidden="true">·</span>
                <span class="tabular-nums">${todayFocusMins}m logged today</span>
              </div>
            `}

            <div class="df-clock-wrap">
              <div id="df-clock-display" class="df-clock-readout tabular-nums">${formatDuration(getActiveCountdownSeconds())}</div>
              <div id="df-phase-status" class="df-phase-status">${escapeHtml(getTimerPhaseStatusLabel())}</div>
            </div>

            ${(() => {
              const pinnedTask = selectedTaskId ? (state.localTasks || []).find((t) => t.id === selectedTaskId && !t.completed) : null;
              if (!sess) {
                return pinnedTask ? `
                  <div class="df-active-session-line">
                    <span>Pinned task: <strong>${escapeHtml(pinnedTask.title)}</strong></span>
                    <button type="button" class="df-hub-inline-link" id="df-unpin-task">Clear</button>
                  </div>
                ` : "";
              }
              return `
                <div class="df-active-session-line">
                  <span>Studying: <strong>${escapeHtml(sess.subject)}</strong></span>
                  ${prefs.strictFocusLock && sess.mode === "focus" ? `<span class="tabular-nums">· Strict Lock (${sess.interruptions || 0} switches)</span>` : ""}
                </div>
              `;
            })()}

            <div class="df-controls-row">
              ${!sess ? `
                <button type="button" class="df-play-cta" id="df-start-btn" aria-label="Start focus session">
                  <span class="df-play-icon" aria-hidden="true">▶</span>
                  <span>Start</span>
                </button>
              ` : `
                <button type="button" class="df-play-cta" id="df-play-pause-btn" aria-label="${sess.status === "running" ? "Pause timer" : "Resume timer"}">
                  <span aria-hidden="true">${sess.status === "running" ? "⏸" : "▶"}</span>
                  <span>${sess.status === "running" ? "Pause" : "Resume"}</span>
                </button>
                <button type="button" class="df-ctrl-btn" id="df-finish-btn" title="Complete & log session (S)">✓ Complete</button>
                <button type="button" class="df-ctrl-btn" id="df-reset-btn" title="Discard session (R)">↺ Reset</button>
              `}
            </div>

            ${pendingCheckIn ? `
              <div class="df-checkin-bar">
                <div class="df-checkin-head">
                  <span>Name &amp; Log Completed Session</span>
                  <div class="df-seg-mini">
                    ${[1, 2, 3, 4, 5].map((q) => `
                      <button type="button" class="df-mini-act ${selectedCheckInQuality === q ? "is-accent" : ""}" data-df-q="${q}">${q}</button>
                    `).join("")}
                  </div>
                </div>
                <input id="df-checkin-subject" class="df-input" type="text" maxlength="48" value="${escapeHtml(pendingCheckIn.subject || "General Study")}" placeholder="Session name (e.g. General Study)" aria-label="Session name" />
                <div class="df-custom-bg-row">
                  <input id="df-checkin-note" class="df-input" type="text" maxlength="140" placeholder="Quick reflection (optional)..." />
                  <button type="button" class="df-btn-accent" id="df-checkin-save">Save</button>
                  <button type="button" class="df-btn-subtle" id="df-checkin-skip">Skip</button>
                </div>
              </div>
            ` : `
              <div class="df-shortcuts-hint">
                <span>Space Play/Pause</span>
                <span aria-hidden="true">·</span>
                <span>S Complete</span>
                <span aria-hidden="true">·</span>
                <span>R Reset</span>
                <span aria-hidden="true">·</span>
                <span>F Zen</span>
                <span aria-hidden="true">·</span>
                <span>M Menu</span>
              </div>
            `}
          </section>
        </main>

        ${renderBottomFriendsDockHtml()}
        ${activeDrawer === "settings" ? renderSettingsDrawerHtml(appearance) : ""}
      </div>

      ${modals.renderModalHtml()}
    `;

    if (activeDrawer === "settings" && prevDrawerScrollTop > 0) {
      const nextScrollEl = shellEl.querySelector(".df-settings-scroll");
      if (nextScrollEl) nextScrollEl.scrollTop = prevDrawerScrollTop;
    }
    document.documentElement.classList.toggle(
      "df-overlay-active",
      Boolean(hubExpanded || modals.getActiveModal() || activeDrawer === "settings")
    );
    syncParticlesAndBackdrop();
    bindShellEvents();
    modals.bindModalEvents();
  };

  const bindShellEvents = () => {
    shellEl.querySelector("#df-hub-toggle")?.addEventListener("click", (e) => {
      e.stopPropagation();
      hubExpanded = !hubExpanded;
      if (hubExpanded) {
        activeDrawer = null;
        friendsPopoverOpen = false;
      }
      renderShell();
    });

    shellEl.querySelector("#df-radial-backdrop")?.addEventListener("click", () => {
      hubExpanded = false;
      renderShell();
    });

    shellEl.querySelector(".df-stage")?.addEventListener("click", () => {
      if (hubExpanded || friendsPopoverOpen) {
        hubExpanded = false;
        friendsPopoverOpen = false;
        renderShell();
      }
    });

    shellEl.querySelectorAll("[data-df-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.dfAction;
        hubExpanded = false;
        if (action === "music") {
          modals.open("music", "discs");
        } else if (action === "settings") {
          activeDrawer = activeDrawer === "settings" ? null : "settings";
          settingsNotice = "";
          renderShell();
        } else if (action === "account") {
          modals.close();
          navigateToPage(PAGE_ROUTES.ACCOUNT);
        } else if (action === "home") {
          modals.close();
          navigateToPage(PAGE_ROUTES.HOME, { explicitHome: true });
        } else if (action === "palette") {
          renderShell();
          openCommandPalette();
        }
      });
    });

    shellEl.querySelectorAll("[data-df-modal]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = btn.dataset.dfModal;
        hubExpanded = false;
        if (modals.getActiveModal() === name) {
          modals.close();
        } else {
          modals.open(name);
        }
      });
    });

    bindBottomFriendsDockEvents();

    // Timer Card Events
    shellEl.querySelectorAll("[data-df-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        timerTab = btn.dataset.dfTab;
        savePreferences({ deepFocus: { timerTab } });
        renderShell();
      });
    });

    shellEl.querySelectorAll("[data-df-phase]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.activeSession) return;
        pomodoroPhase = btn.dataset.dfPhase;
        renderShell();
      });
    });

    shellEl.querySelectorAll("[data-df-timer-mins]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.activeSession) return;
        selectedCustomMins = Number(btn.dataset.dfTimerMins);
        renderShell();
      });
    });

    shellEl.querySelector("#df-custom-mins-input")?.addEventListener("change", (e) => {
      selectedCustomMins = Math.min(180, Math.max(1, Number(e.target.value) || 25));
      e.target.value = String(selectedCustomMins);
      updateClockDomOnly();
    });

    shellEl.querySelector("#df-unpin-task")?.addEventListener("click", () => {
      selectedTaskId = "";
      selectedSubject = "General Study";
      renderShell();
    });

    shellEl.querySelector("#df-start-btn")?.addEventListener("click", startDeepFocusSession);
    shellEl.querySelector("#df-play-pause-btn")?.addEventListener("click", () => {
      const sess = state.activeSession;
      if (!sess) return;
      const updated = sess.status === "running"
        ? pauseFocusSession(sess, Date.now(), "manual")
        : resumeFocusSession(sess, Date.now());
      persistLocalCollection("activeSession", updated);
      renderShell();
    });

    shellEl.querySelector("#df-finish-btn")?.addEventListener("click", async () => {
      playTransitionChime();
      await finishActiveFocusSession({ autoCompleted: false });
      selectedTaskId = "";
      selectedSubject = "General Study";
      renderShell();
    });

    shellEl.querySelector("#df-reset-btn")?.addEventListener("click", () => {
      persistLocalCollection("activeSession", null);
      selectedTaskId = "";
      selectedSubject = "General Study";
      renderShell();
    });

    // Post-Session Check-In
    shellEl.querySelectorAll("[data-df-q]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedCheckInQuality = Number(btn.dataset.dfQ) || 4;
        renderShell();
      });
    });
    shellEl.querySelector("#df-checkin-save")?.addEventListener("click", async () => {
      const recId = state.pendingCheckInRecordId;
      const sessionName = shellEl.querySelector("#df-checkin-subject")?.value.trim() || "General Study";
      const note = shellEl.querySelector("#df-checkin-note")?.value.trim() || "";
      const next = (state.localStudyRecords || []).map((r) =>
        r.id === recId ? { ...r, subject: sessionName, focusQuality: selectedCheckInQuality, reflection: note } : r
      );
      persistLocalCollection("localStudyRecords", next);
      await updateFocusSessionSubject(recId, sessionName);
      state.pendingCheckInRecordId = null;
      renderShell();
    });
    shellEl.querySelector("#df-checkin-skip")?.addEventListener("click", () => {
      state.pendingCheckInRecordId = null;
      renderShell();
    });

    // Settings Drawer
    shellEl.querySelector("#df-close-drawer")?.addEventListener("click", () => {
      activeDrawer = null;
      renderShell();
    });

    shellEl.querySelectorAll("[data-df-profile-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const profiles = [...BUILTIN_WORKSPACE_PROFILES, ...(state.localWorkspaceProfiles || [])];
        const found = profiles.find((p) => p.id === btn.dataset.dfProfileId);
        if (found && applyWorkspaceProfile(found)) {
          settingsNotice = `Applied "${found.name}" workspace profile.`;
          renderShell();
        }
      });
    });

    shellEl.querySelector("#df-save-profile-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = shellEl.querySelector("#df-new-profile-name")?.value.trim();
      if (!name) return;
      const newProf = {
        id: generateId("prof"),
        name,
        description: "Custom Deep Focus preset",
        settings: {
          theme: state.preferences?.theme || "comic",
          seriousMode: Boolean(state.preferences?.seriousMode),
          hideGamification: Boolean(state.preferences?.hideGamification),
          strictFocusLock: Boolean(state.preferences?.strictFocusLock),
          autoCycleBreaks: state.preferences?.autoCycleBreaks !== false,
          defaultFocusMinutes: Number(state.preferences?.defaultFocusMinutes || 25),
          lowPassHz: audioManager.lowPassHz,
          audioMix: { ...audioManager.levels }
        }
      };
      persistLocalCollection("localWorkspaceProfiles", [newProf, ...(state.localWorkspaceProfiles || [])]);
      settingsNotice = `Saved "${name}" preset.`;
      renderShell();
    });

    shellEl.querySelector("#df-open-themes-shop")?.addEventListener("click", () => {
      activeDrawer = null;
      modals.open("catalog", "theme");
    });
    shellEl.querySelector("#df-open-cosmetics-shop")?.addEventListener("click", () => {
      activeDrawer = null;
      modals.open("catalog", "cosmetics");
    });
    shellEl.querySelector("#df-open-particles-shop")?.addEventListener("click", () => {
      activeDrawer = null;
      modals.open("catalog", "particles");
    });
    shellEl.querySelector("#df-buy-particles-btn")?.addEventListener("click", () => {
      activeDrawer = null;
      modals.open("catalog", "particles");
    });

    shellEl.querySelector("#df-theme-select")?.addEventListener("change", (e) => {
      const nextTheme = e.target.value;
      const accessible = isThemeAccessibleInMode(nextTheme, {
        ownedItemIds: state.ownedItemIds || [],
        seriousMode: Boolean(state.preferences?.seriousMode)
      });
      if (!accessible) {
        activeDrawer = null;
        modals.open("catalog", "theme");
        return;
      }
      settingsNotice = "";
      themeManager.apply(nextTheme, { persist: true });
      const mapped = THEME_DEEPFOCUS_MAP[nextTheme];
      if (mapped) {
        savePreferences({
          deepFocus: {
            followThemeScene: true,
            sceneId: mapped.sceneId,
            followThemeParticle: true,
            particleId: isParticleOwned(mapped.particleId, state.ownedItemIds) ? mapped.particleId : "ambient_drift"
          }
        });
      }
      renderShell();
    });

    shellEl.querySelector("#df-scene-select")?.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "theme") {
        savePreferences({ deepFocus: { followThemeScene: true } });
      } else {
        savePreferences({ deepFocus: { followThemeScene: false, sceneId: val } });
      }
      renderShell();
    });

    shellEl.querySelector("#df-apply-bg-url")?.addEventListener("click", () => {
      const raw = shellEl.querySelector("#df-custom-bg-url")?.value.trim() || "";
      const safe = sanitizeBackdropUrl(raw);
      if (raw && !safe) {
        settingsNotice = "Please enter a valid https:// or http:// image URL.";
        renderShell();
        return;
      }
      settingsNotice = "";
      savePreferences({ deepFocus: { customBackdropUrl: safe } });
      renderShell();
    });

    shellEl.querySelector("#df-clear-bg-url")?.addEventListener("click", () => {
      savePreferences({ deepFocus: { customBackdropUrl: "" } });
      renderShell();
    });

    shellEl.querySelector("#df-reset-tuning")?.addEventListener("click", () => {
      savePreferences({
        deepFocus: {
          blur: DEFAULT_DEEPFOCUS_PREFS.blur,
          brightness: DEFAULT_DEEPFOCUS_PREFS.brightness,
          contrast: DEFAULT_DEEPFOCUS_PREFS.contrast,
          saturation: DEFAULT_DEEPFOCUS_PREFS.saturation
        }
      });
      renderShell();
    });

    shellEl.querySelector("#df-particle-select")?.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "theme") {
        savePreferences({ deepFocus: { followThemeParticle: true } });
        settingsNotice = "";
        renderShell();
        return;
      }
      if (!isParticleOwned(val, state.ownedItemIds || [])) {
        activeDrawer = null;
        modals.open("catalog", "particles");
        return;
      }
      settingsNotice = "";
      savePreferences({
        deepFocus: {
          followThemeParticle: false,
          particleId: val
        }
      });
      renderShell();
    });

    shellEl.querySelectorAll("[data-df-slider]").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const key = e.target.dataset.dfSlider;
        const unit = e.target.dataset.unit || "";
        const val = Number(e.target.value);

        if (key === "particleOpacityPct") {
          const readout = shellEl.querySelector("#df-val-particleOpacity");
          if (readout) readout.textContent = `${val}%`;
          savePreferences({ deepFocus: { particleOpacity: val / 100 } }, { skipCloudSync: true, skipRender: true });
        } else {
          const readout = shellEl.querySelector(`#df-val-${key}`);
          if (readout) readout.textContent = `${val}${unit}`;
          savePreferences({ deepFocus: { [key]: val } }, { skipCloudSync: true, skipRender: true });
        }
        syncParticlesAndBackdrop();
      });

      slider.addEventListener("change", () => {
        savePreferences({ deepFocus: state.preferences?.deepFocus || {} }, { skipRender: true });
      });
    });

    shellEl.querySelector("#df-chime-select")?.addEventListener("change", (e) => {
      savePreferences({ deepFocus: { chimeSound: e.target.value } });
    });
    shellEl.querySelector("#df-test-chime")?.addEventListener("click", () => {
      const chime = shellEl.querySelector("#df-chime-select")?.value || "bowl";
      if (chime !== "mute") audioManager.playChime(chime === "bell" ? "focus" : "complete");
    });

    shellEl.querySelectorAll("[data-df-block-mins]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setDefaultFocusMinutes(Number(btn.dataset.dfBlockMins));
        renderShell();
      });
    });

    shellEl.querySelector("#df-strict-lock")?.addEventListener("change", (e) => {
      toggleStrictFocusLock(e.target.checked);
    });
    shellEl.querySelector("#df-auto-cycle")?.addEventListener("change", (e) => {
      toggleAutoCycleBreaks(e.target.checked);
    });
    shellEl.querySelector("#df-serious-mode")?.addEventListener("change", (e) => {
      setSeriousMode(e.target.checked);
      renderShell();
    });
  };

  // Global Deep Focus keyboard shortcuts (Space, S, R, F, M, Escape)
  window.addEventListener("keydown", (event) => {
    if (!isDeepFocusActive()) return;
    if (document.getElementById("sprk-command-dialog")?.open) return;

    const tag = event.target?.tagName?.toLowerCase();
    const isTyping = tag === "input" || tag === "textarea" || tag === "select" || event.target?.isContentEditable;
    const key = event.key.toLowerCase();

    if (key === "escape") {
      if (modals.hasPreviewOpen?.()) {
        event.preventDefault();
        modals.closePreview();
        return;
      }
      if (modals.getActiveModal()) {
        event.preventDefault();
        modals.close();
        return;
      }
      if (hubExpanded || friendsPopoverOpen || activeDrawer || zenMode) {
        event.preventDefault();
        hubExpanded = false;
        friendsPopoverOpen = false;
        activeDrawer = null;
        zenMode = false;
        savePreferences({ deepFocus: { zenMode: false } });
        renderShell();
        return;
      }
    }

    if (isTyping || modals.getActiveModal()) return;

    if (key === "m" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      hubExpanded = !hubExpanded;
      if (hubExpanded) {
        activeDrawer = null;
        friendsPopoverOpen = false;
      }
      renderShell();
    } else if (event.code === "Space") {
      event.preventDefault();
      if (!state.activeSession) {
        startDeepFocusSession();
      } else {
        const updated = state.activeSession.status === "running"
          ? pauseFocusSession(state.activeSession, Date.now(), "manual")
          : resumeFocusSession(state.activeSession, Date.now());
        persistLocalCollection("activeSession", updated);
        renderShell();
      }
    } else if (key === "s" && state.activeSession) {
      event.preventDefault();
      playTransitionChime();
      finishActiveFocusSession({ autoCompleted: false }).then(() => renderShell());
    } else if (key === "r" && state.activeSession) {
      event.preventDefault();
      persistLocalCollection("activeSession", null);
      renderShell();
    } else if (key === "f" && !event.shiftKey) {
      event.preventDefault();
      zenMode = !zenMode;
      if (zenMode) {
        hubExpanded = false;
        friendsPopoverOpen = false;
        activeDrawer = null;
        modals.close();
      }
      savePreferences({ deepFocus: { zenMode } });
      renderShell();
    }
  });

  renderShell();

  bus.on("page:changed", () => renderShell());
  bus.on("preferences:changed", (payload) => {
    if (!payload?.skipRender) renderShell();
  });
  bus.on("state:activeSession", () => renderShell());
  bus.on("auth:changed", () => renderShell());
  bus.on("profile:changed", () => renderShell());
  bus.on("economy:updated", () => renderShell());
  bus.on("spectator:changed", () => renderModeSwitcher());

  bus.on("deepfocus:open", ({ modal, subTab } = {}) => {
    if (!isDeepFocusActive()) return;
    hubExpanded = false;
    friendsPopoverOpen = false;
    if (modal === "settings") {
      modals.close();
      activeDrawer = "settings";
      renderShell();
    } else if (modal) {
      activeDrawer = null;
      modals.open(modal, subTab || "");
    }
  });

  for (const ev of [
    "state:localTasks",
    "state:localDiary",
    "state:localFlashcards",
    "state:localGoals",
    "state:localExams",
    "state:localSubjectBudgets",
    "state:localStudyRecords"
  ]) {
    bus.on(ev, () => {
      if (isDeepFocusActive() && (modals.getActiveModal() || hubExpanded)) {
        renderShell();
      }
    });
  }

  bus.on("studyCircle:changed", () => refreshBottomFriendsDock());
  bus.on("friends:changed", () => refreshBottomFriendsDock());

  window.setInterval(() => {
    if (!isDeepFocusActive()) return;
    if (state.activeSession?.status === "running") {
      updateClockDomOnly();
    }
  }, 1000);

  window.setInterval(() => {
    if (isDeepFocusActive() && friendsPopoverOpen) {
      refreshBottomFriendsDock();
    }
  }, 15_000);
}
