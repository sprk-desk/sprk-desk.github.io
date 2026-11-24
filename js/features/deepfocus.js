// DeepFocus Studio — Distraction-Free Glassmorphic Workspace Sharing Full Database with Cozy Study Room
import { APP_CONFIG } from "../../config.js";
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { bus } from "../core/event-bus.js";
import { themeManager, ROOM_THEMES } from "../core/theme-manager.js";
import { audioManager, AUDIO_CHANNELS } from "../core/audio-manager.js";
import { deepFocusParticles } from "../core/deepfocus-particles.js";
import {
  setAppMode,
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
import { visitFriendRoom } from "../services/database-service.js";
import {
  DEEPFOCUS_SCENES,
  DEEPFOCUS_PARTICLES,
  THEME_DEEPFOCUS_MAP,
  DEFAULT_DEEPFOCUS_PREFS,
  resolveDeepFocusAppearance,
  isParticleOwned,
  sanitizeBackdropUrl
} from "../utils/deepfocus-config.js";
import { isThemeAccessibleInMode } from "../utils/room-settings.js";
import { SHOP_CATALOG } from "../utils/shop-catalog.js";
import { partitionMusicDiscs } from "../utils/audio-loops.js";
import { BUILTIN_WORKSPACE_PROFILES } from "../utils/study-tools.js";
import { sanitizeAvatarUrl } from "../utils/profile-helpers.js";
import {
  createFocusSession,
  computeElapsedActiveSeconds,
  computeRemainingSeconds,
  pauseFocusSession,
  resumeFocusSession
} from "../utils/timer-math.js";
import { escapeHtml, formatDuration, todayIsoDate, generateId } from "../utils/dom.js";

const BUILTIN_DISCS = [
  { id: "disc_rainy", name: "Rainy Study", mix: { rain: 0.65, wind: 0.25, lofi: 0.35 } },
  { id: "disc_hearth", name: "Cozy Hearth", mix: { fireplace: 0.7, rain: 0.25 } },
  { id: "disc_keys", name: "Lo-Fi Keys", mix: { lofi: 0.6, whiteNoise: 0.2 } }
];

export function initDeepFocusWorkspace() {
  const modeSwitcherEl = document.getElementById("sprk-mode-switcher");
  const shellEl = document.getElementById("deepfocus-shell");
  if (!modeSwitcherEl || !shellEl) return;

  let activeDrawer = null; // null | "settings"
  let timerTab = state.preferences?.deepFocus?.timerTab || "pomodoro";
  let pomodoroPhase = "focus"; // focus | short_break | long_break
  let selectedCustomMins = Number(state.preferences?.defaultFocusMinutes || 25);
  let selectedSubject = "General Study";
  let selectedTaskId = "";
  let selectedCheckInQuality = 4;
  let zenMode = Boolean(state.preferences?.deepFocus?.zenMode);
  let friendsCollapsed = false;
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
    const isWorkspacePage = page === PAGE_ROUTES.COZY || page === PAGE_ROUTES.DEEPFOCUS;
    const isSpectating = Boolean(state.spectatingRoom);

    if (!isWorkspacePage || isSpectating) {
      modeSwitcherEl.hidden = true;
      return;
    }

    const mode = page === PAGE_ROUTES.DEEPFOCUS ? "deepfocus" : "cozy";
    modeSwitcherEl.hidden = false;
    modeSwitcherEl.innerHTML = `
      <div class="sprk-mode-switch" role="group" aria-label="Workspace mode">
        <button type="button" class="sprk-mode-switch-btn ${mode === "cozy" ? "is-active" : ""}" data-switch-mode="cozy">Cozy Study</button>
        <button type="button" class="sprk-mode-switch-btn ${mode === "deepfocus" ? "is-active" : ""}" data-switch-mode="deepfocus">DeepFocus</button>
      </div>
    `;
    modeSwitcherEl.querySelectorAll("[data-switch-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextMode = btn.dataset.switchMode;
        if (nextMode !== mode) {
          setAppMode(nextMode, { syncUrl: false });
          navigateToPage(nextMode === "deepfocus" ? PAGE_ROUTES.DEEPFOCUS : PAGE_ROUTES.COZY);
        }
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

    shellEl.style.setProperty("--df-accent", appearance.accent);
    shellEl.style.setProperty("--df-accent-soft", appearance.accentSoft);
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

  const renderFriendsWidgetHtml = () => {
    const { entries, summary, signedIn } = presenceService.getSnapshot(Date.now());
    const activeFriends = entries.filter((e) => e.status === "studying" || e.status === "online");
    const studyingList = entries.filter((e) => e.status === "studying");

    return `
      <aside class="df-friends-panel ${friendsCollapsed ? "is-collapsed" : ""}" aria-label="Friends studying live">
        <div class="df-friends-head">
          <div class="df-friends-title">
            <span class="df-live-indicator ${summary.studyingCount > 0 ? "is-live" : ""}" aria-hidden="true"></span>
            <span>Studying Together</span>
            <span class="df-muted tabular-nums">${signedIn ? `${summary.studyingCount} live` : "Offline"}</span>
          </div>
          <div class="df-friends-head-actions">
            <button type="button" class="df-icon-btn" id="df-friends-manage" title="Manage Friends & Invites">Manage</button>
            <button type="button" class="df-icon-btn" id="df-friends-collapse" aria-expanded="${!friendsCollapsed}" aria-label="${friendsCollapsed ? "Expand friends list" : "Minimize friends list"}">
              ${friendsCollapsed ? "+" : "−"}
            </button>
          </div>
        </div>
        ${friendsCollapsed ? "" : `
          <div class="df-friends-body">
            ${!signedIn ? `
              <div class="df-friends-empty">
                <p>Sign in to see friends studying in real time alongside your session.</p>
                <button type="button" class="df-btn-subtle" id="df-friends-signin">Sign In via /account</button>
              </div>
            ` : entries.length === 0 ? `
              <div class="df-friends-empty">
                <p>No friends connected yet. Add classmates to study live together.</p>
                <button type="button" class="df-btn-subtle" id="df-friends-find">Find Friends</button>
              </div>
            ` : activeFriends.length === 0 ? `
              <div class="df-friends-empty">
                <p>${entries.length} friend${entries.length === 1 ? "" : "s"} added · None currently online.</p>
              </div>
            ` : `
              <div class="df-friends-list">
                ${(studyingList.length > 0 ? studyingList : activeFriends).slice(0, 4).map((friend) => {
                  const safeAvatar = sanitizeAvatarUrl(friend.avatarUrl || "");
                  return `
                    <div class="df-friend-row">
                      <div class="df-friend-avatar">
                        ${safeAvatar
                          ? `<img src="${escapeHtml(safeAvatar)}" alt="" referrerpolicy="no-referrer" />`
                          : `<span>${escapeHtml(friend.avatarPreset || friend.displayName.slice(0, 1).toUpperCase())}</span>`}
                      </div>
                      <div class="df-friend-meta">
                        <div class="df-friend-name">${escapeHtml(friend.displayName)}</div>
                        <div class="df-friend-sub">
                          <span>${friend.status === "studying" ? escapeHtml(friend.subject || "Focusing") : "Online"}</span>
                          ${friend.elapsedLabel ? ` · <span class="tabular-nums">${escapeHtml(friend.elapsedLabel)}</span>` : ""}
                        </div>
                      </div>
                      <button type="button" class="df-btn-subtle" data-df-visit="${escapeHtml(friend.id)}">Visit</button>
                    </div>
                  `;
                }).join("")}
              </div>
            `}
          </div>
        `}
      </aside>
    `;
  };

  const bindFriendsWidgetEvents = () => {
    shellEl.querySelector("#df-friends-collapse")?.addEventListener("click", () => {
      friendsCollapsed = !friendsCollapsed;
      renderShell();
    });
    shellEl.querySelector("#df-friends-manage")?.addEventListener("click", () => {
      modals.open("community", "friends");
    });
    shellEl.querySelector("#df-friends-find")?.addEventListener("click", () => {
      modals.open("community", "friends");
    });
    shellEl.querySelector("#df-friends-signin")?.addEventListener("click", () => {
      navigateToPage(PAGE_ROUTES.ACCOUNT);
    });
    shellEl.querySelectorAll("[data-df-visit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await visitFriendRoom(btn.dataset.dfVisit);
        if (!error) {
          setAppMode("cozy", { syncUrl: false });
          navigateToPage(PAGE_ROUTES.COZY);
        }
      });
    });
  };

  const renderSettingsDrawerHtml = (appearance) => {
    const s = appearance.settings;
    const seriousMode = Boolean(state.preferences?.seriousMode);
    const ownedIds = state.ownedItemIds || [];
    const currentTheme = state.preferences?.theme || "comic";
    const locked = isStrictFocusLockActive();
    const unownedParticles = DEEPFOCUS_PARTICLES.filter((p) => p.shopItemId && !isParticleOwned(p.id, ownedIds));
    const profiles = [...BUILTIN_WORKSPACE_PROFILES, ...(state.localWorkspaceProfiles || [])];

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
              <button type="button" class="df-link-btn" id="df-open-themes-shop">Catalog</button>
            </div>
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
    const todayFocusMins = Math.round(
      todayFocusRecords.reduce((sum, r) => sum + (r.durationSeconds || 0), 0) / 60
    );
    const blocksDone = Number(prefs.pomodoroCyclesCompleted || todayFocusRecords.length || 0);
    const dailyGoalBlocks = appearance.settings.dailyBlockGoal || 8;
    const openTasks = (state.localTasks || []).filter((t) => !t.completed);
    const activeDiscId = prefs.activeMusicId || "disc_rainy";
    const { ownedDiscs } = partitionMusicDiscs({
      builtinDiscs: BUILTIN_DISCS,
      catalogItems: SHOP_CATALOG,
      ownedItemIds: state.ownedItemIds || []
    });
    const pendingCheckIn = state.pendingCheckInRecordId
      ? (state.localStudyRecords || []).find((r) => r.id === state.pendingCheckInRecordId)
      : null;

    const activeModal = modals.getActiveModal();
    const userLabel = state.user ? (state.user.displayName || "Account") : "Account";

    shellEl.innerHTML = `
      <div class="df-backdrop-wrap" aria-hidden="true">
        <img id="df-backdrop-img" class="df-backdrop-img" src="${escapeHtml(appearance.backdropUrl)}" alt="" draggable="false" referrerpolicy="no-referrer" />
        <div class="df-backdrop-scrim"></div>
        <canvas id="df-particle-canvas" class="df-particle-canvas"></canvas>
      </div>

      <div class="df-layout ${zenMode ? "is-zen" : ""} ${activeDrawer ? "has-drawer" : ""}">
        ${zenMode ? `
          <button type="button" class="df-zen-exit" id="df-exit-zen">Exit Zen Mode (F)</button>
        ` : `
          <header class="df-topbar">
            <div class="df-top-left">
              <div class="df-mode-slot-spacer" aria-hidden="true"></div>
              <button type="button" class="df-brand-link" id="df-go-home" title="Main SPRK Desk Website">Home</button>
              <span class="df-top-sep" aria-hidden="true">/</span>
              <button type="button" class="df-brand-link" id="df-go-account" title="Profile, Friends & Room Visits">${escapeHtml(userLabel)}</button>
            </div>

            <nav class="df-nav" aria-label="DeepFocus Studio navigation">
              <button type="button" class="df-nav-link ${activeModal === "plan" ? "is-active" : ""}" data-df-modal="plan">Plan (${openTasks.length})</button>
              <button type="button" class="df-nav-link ${activeModal === "knowledge" ? "is-active" : ""}" data-df-modal="knowledge">Notes &amp; Cards</button>
              <button type="button" class="df-nav-link ${activeModal === "insights" ? "is-active" : ""}" data-df-modal="insights">Insights</button>
              <button type="button" class="df-nav-link ${activeModal === "community" ? "is-active" : ""}" data-df-modal="community">Rooms</button>
              <button type="button" class="df-nav-link ${activeModal === "catalog" ? "is-active" : ""}" data-df-modal="catalog">Catalog</button>
            </nav>

            <div class="df-top-right">
              <button type="button" class="df-util-btn ${activeModal === "break" ? "is-active" : ""}" data-df-modal="break" title="Eye Rest &amp; Scheduled Break">Break</button>
              <button type="button" class="df-util-btn" id="df-btn-zen" title="Zen Mode (F)">Zen</button>
              <button type="button" class="df-util-btn" id="df-btn-palette" title="Command Palette (Ctrl/Cmd+K)">⌘K</button>
              <button type="button" class="df-util-btn is-icon ${activeDrawer === "settings" ? "is-active" : ""}" id="df-btn-settings" aria-label="Workspace Settings">⚙</button>
            </div>
          </header>
        `}

        <main class="df-stage" aria-label="DeepFocus Timer Stage">
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

            ${!sess ? `
              <div class="df-task-bind-row">
                <select id="df-task-select" class="df-select-inline" aria-label="Active focus task">
                  <option value="">No task linked</option>
                  ${openTasks.map((t) => `<option value="${escapeHtml(t.id)}" ${selectedTaskId === t.id ? "selected" : ""}>${escapeHtml(t.title)}</option>`).join("")}
                </select>
                <input id="df-subject-input" class="df-input-inline" type="text" maxlength="36" value="${escapeHtml(selectedSubject)}" placeholder="Subject..." aria-label="Study subject" />
              </div>
            ` : `
              <div class="df-active-session-line">
                <span>Studying: <strong>${escapeHtml(sess.subject)}</strong></span>
                ${prefs.strictFocusLock && sess.mode === "focus" ? `<span class="tabular-nums">· Strict Lock (${sess.interruptions || 0} switches)</span>` : ""}
              </div>
            `}

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
                  <span>Session Check-In · ${escapeHtml(pendingCheckIn.subject)}</span>
                  <div class="df-seg-mini">
                    ${[1, 2, 3, 4, 5].map((q) => `
                      <button type="button" class="df-mini-act ${selectedCheckInQuality === q ? "is-accent" : ""}" data-df-q="${q}">${q}</button>
                    `).join("")}
                  </div>
                </div>
                <div class="df-custom-bg-row">
                  <input id="df-checkin-note" class="df-input" type="text" maxlength="140" placeholder="Quick reflection..." />
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
              </div>
            `}
          </section>
          ${zenMode ? "" : renderFriendsWidgetHtml()}
        </main>

        ${zenMode ? "" : `
          <footer class="df-sound-dock" aria-label="Ambient sound mixer dock">
            <button type="button" class="df-dock-mixer-btn ${activeModal === "music" ? "is-active" : ""}" id="df-open-audio-modal" title="Open Music Player &amp; 8-Channel Mixer">
              Music &amp; Mixer
            </button>
            <div class="df-dock-sliders">
              ${["rain", "wind", "fireplace"].map((chId) => {
                const ch = AUDIO_CHANNELS.find((c) => c.id === chId);
                const pct = Math.round((audioManager.levels[chId] || 0) * 100);
                return `
                  <label class="df-dock-ch">
                    <span>${escapeHtml(ch?.label || chId)}</span>
                    <input type="range" min="0" max="100" value="${pct}" data-df-audio-ch="${chId}" aria-label="${escapeHtml(ch?.label || chId)} volume" />
                    <span class="tabular-nums df-muted" id="df-ch-pct-${chId}">${pct}%</span>
                  </label>
                `;
              }).join("")}
            </div>
            <div class="df-dock-right">
              <select id="df-disc-select" class="df-dock-disc-select" aria-label="Owned sound discs">
                ${ownedDiscs.map((d) => `
                  <option value="${escapeHtml(d.id)}" ${d.id === activeDiscId ? "selected" : ""}>${escapeHtml(d.name)}</option>
                `).join("")}
                <option value="__browse__">+ Browse Music Discs…</option>
              </select>
              <button type="button" class="df-dock-play ${audioManager.isPlaying ? "is-playing" : ""}" id="df-dock-master-play" aria-label="${audioManager.isPlaying ? "Mute audio" : "Play audio"}">
                ${audioManager.isPlaying ? "⏸" : "▶"}
              </button>
            </div>
          </footer>
        `}

        ${!zenMode && activeDrawer === "settings" ? renderSettingsDrawerHtml(appearance) : ""}
      </div>

      ${modals.renderModalHtml()}
    `;

    syncParticlesAndBackdrop();
    bindShellEvents(ownedDiscs);
    modals.bindModalEvents();
  };

  const bindShellEvents = (ownedDiscs) => {
    shellEl.querySelector("#df-go-home")?.addEventListener("click", () => {
      modals.close();
      navigateToPage(PAGE_ROUTES.HOME);
    });
    shellEl.querySelector("#df-go-account")?.addEventListener("click", () => {
      modals.close();
      navigateToPage(PAGE_ROUTES.ACCOUNT);
    });

    shellEl.querySelectorAll("[data-df-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.dfModal;
        if (modals.getActiveModal() === name) {
          modals.close();
        } else {
          modals.open(name);
        }
      });
    });

    shellEl.querySelector("#df-btn-zen")?.addEventListener("click", () => {
      zenMode = true;
      activeDrawer = null;
      modals.close();
      savePreferences({ deepFocus: { zenMode: true } });
      renderShell();
    });
    shellEl.querySelector("#df-exit-zen")?.addEventListener("click", () => {
      zenMode = false;
      savePreferences({ deepFocus: { zenMode: false } });
      renderShell();
    });
    shellEl.querySelector("#df-btn-palette")?.addEventListener("click", () => openCommandPalette());
    shellEl.querySelector("#df-btn-settings")?.addEventListener("click", () => {
      activeDrawer = activeDrawer === "settings" ? null : "settings";
      settingsNotice = "";
      renderShell();
    });

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

    shellEl.querySelector("#df-task-select")?.addEventListener("change", (e) => {
      selectedTaskId = e.target.value;
      const t = (state.localTasks || []).find((x) => x.id === selectedTaskId);
      if (t?.subject && t.subject !== "General") {
        selectedSubject = t.subject;
        const subInput = shellEl.querySelector("#df-subject-input");
        if (subInput) subInput.value = selectedSubject;
      }
    });

    shellEl.querySelector("#df-subject-input")?.addEventListener("input", (e) => {
      selectedSubject = e.target.value;
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
      renderShell();
    });

    shellEl.querySelector("#df-reset-btn")?.addEventListener("click", () => {
      persistLocalCollection("activeSession", null);
      renderShell();
    });

    // Post-Session Check-In
    shellEl.querySelectorAll("[data-df-q]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedCheckInQuality = Number(btn.dataset.dfQ) || 4;
        renderShell();
      });
    });
    shellEl.querySelector("#df-checkin-save")?.addEventListener("click", () => {
      const recId = state.pendingCheckInRecordId;
      const note = shellEl.querySelector("#df-checkin-note")?.value.trim() || "";
      const next = (state.localStudyRecords || []).map((r) =>
        r.id === recId ? { ...r, focusQuality: selectedCheckInQuality, reflection: note } : r
      );
      persistLocalCollection("localStudyRecords", next);
      state.pendingCheckInRecordId = null;
      renderShell();
    });
    shellEl.querySelector("#df-checkin-skip")?.addEventListener("click", () => {
      state.pendingCheckInRecordId = null;
      renderShell();
    });

    // Friends Widget
    bindFriendsWidgetEvents();

    // Sound Mixer Dock
    shellEl.querySelector("#df-open-audio-modal")?.addEventListener("click", () => {
      modals.open("music", "discs");
    });

    shellEl.querySelectorAll("[data-df-audio-ch]").forEach((slider) => {
      slider.addEventListener("input", async (e) => {
        const chId = e.target.dataset.dfAudioCh;
        const pct = Number(e.target.value);
        audioManager.setChannelLevel(chId, pct / 100);
        const pctEl = shellEl.querySelector(`#df-ch-pct-${chId}`);
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (pct > 0 && !audioManager.isPlaying) {
          await audioManager.togglePlay(true).catch(() => {});
          const playBtn = shellEl.querySelector("#df-dock-master-play");
          if (playBtn) {
            playBtn.classList.add("is-playing");
            playBtn.textContent = "⏸";
          }
        }
      });
    });

    shellEl.querySelector("#df-disc-select")?.addEventListener("change", async (e) => {
      const val = e.target.value;
      if (val === "__browse__") {
        modals.open("music", "discs");
        return;
      }
      const disc = ownedDiscs.find((d) => d.id === val);
      if (!disc) return;
      for (const ch of AUDIO_CHANNELS) {
        audioManager.setChannelLevel(ch.id, disc.mix?.[ch.id] || 0);
      }
      savePreferences({ activeMusicId: disc.id });
      if (!audioManager.isPlaying) await audioManager.togglePlay(true).catch(() => {});
      renderShell();
    });

    shellEl.querySelector("#df-dock-master-play")?.addEventListener("click", async () => {
      await audioManager.togglePlay();
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
          savePreferences({ deepFocus: { particleOpacity: val / 100 } });
        } else {
          const readout = shellEl.querySelector(`#df-val-${key}`);
          if (readout) readout.textContent = `${val}${unit}`;
          savePreferences({ deepFocus: { [key]: val } });
        }
        syncParticlesAndBackdrop();
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

  // Global DeepFocus keyboard shortcuts (Space, S, R, F, Escape)
  window.addEventListener("keydown", (event) => {
    if (!isDeepFocusActive()) return;
    if (document.getElementById("sprk-command-dialog")?.open) return;

    const tag = event.target?.tagName?.toLowerCase();
    const isTyping = tag === "input" || tag === "textarea" || tag === "select" || event.target?.isContentEditable;
    const key = event.key.toLowerCase();

    if (key === "escape") {
      if (modals.getActiveModal()) {
        event.preventDefault();
        modals.close();
        return;
      }
      if (activeDrawer || zenMode) {
        event.preventDefault();
        activeDrawer = null;
        zenMode = false;
        savePreferences({ deepFocus: { zenMode: false } });
        renderShell();
        return;
      }
    }

    if (isTyping || modals.getActiveModal()) return;

    if (event.code === "Space") {
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
        activeDrawer = null;
        modals.close();
      }
      savePreferences({ deepFocus: { zenMode } });
      renderShell();
    }
  });

  renderShell();

  bus.on("page:changed", () => renderShell());
  bus.on("preferences:changed", () => renderShell());
  bus.on("state:activeSession", () => renderShell());
  bus.on("auth:changed", () => renderShell());
  bus.on("profile:changed", () => renderShell());
  bus.on("economy:updated", () => renderShell());
  bus.on("spectator:changed", () => renderModeSwitcher());

  bus.on("deepfocus:open", ({ modal, subTab } = {}) => {
    if (!isDeepFocusActive()) return;
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
      if (isDeepFocusActive() && modals.getActiveModal()) {
        renderShell();
      }
    });
  }

  bus.on("studyCircle:changed", () => {
    if (!isDeepFocusActive()) return;
    const widget = shellEl.querySelector(".df-friends-panel");
    if (widget) {
      const tmp = document.createElement("div");
      tmp.innerHTML = renderFriendsWidgetHtml();
      const fresh = tmp.firstElementChild;
      if (fresh) {
        widget.replaceWith(fresh);
        bindFriendsWidgetEvents();
      }
    }
  });

  window.setInterval(() => {
    if (!isDeepFocusActive()) return;
    if (state.activeSession?.status === "running") {
      updateClockDomOnly();
    }
  }, 1000);
}
