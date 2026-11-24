// DeepFocus Mode — Distraction-Free Glassmorphic Workspace Sharing Full State with Cozy Study Room
import { APP_CONFIG } from "../../config.js";
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { bus } from "../core/event-bus.js";
import { dialogManager } from "../core/dialog-manager.js";
import { themeManager, ROOM_THEMES } from "../core/theme-manager.js";
import { audioManager, AUDIO_CHANNELS } from "../core/audio-manager.js";
import { deepFocusParticles } from "../core/deepfocus-particles.js";
import {
  setAppMode,
  isStrictFocusLockActive,
  toggleStrictFocusLock,
  toggleAutoCycleBreaks,
  setSeriousMode,
  setDefaultFocusMinutes
} from "../core/settings-manager.js";
import { openCommandPalette } from "./command-palette.js";
import { finishActiveFocusSession } from "./focus.js";
import { presenceService } from "../services/presence-service.js";
import { supabase } from "../services/supabase.js";
import { visitFriendRoom, syncTaskUpsert, syncTaskDelete } from "../services/database-service.js";
import {
  DEEPFOCUS_SCENES,
  DEEPFOCUS_PARTICLES,
  THEME_DEEPFOCUS_MAP,
  DEFAULT_DEEPFOCUS_PREFS,
  resolveDeepFocusAppearance,
  isParticleOwned,
  sanitizeBackdropUrl,
  groupTasksForKanban,
  computeDeepFocusAnalytics
} from "../utils/deepfocus-config.js";
import { isThemeAccessibleInMode } from "../utils/room-settings.js";
import { SHOP_CATALOG } from "../utils/shop-catalog.js";
import { partitionMusicDiscs } from "../utils/audio-loops.js";
import { formatStudyRecordsCsv } from "../utils/study-tools.js";
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

function triggerTextDownload(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function initDeepFocusWorkspace() {
  const modeSwitcherEl = document.getElementById("sprk-mode-switcher");
  const shellEl = document.getElementById("deepfocus-shell");
  if (!modeSwitcherEl || !shellEl) return;

  let activeDrawer = null; // null | "tasks" | "settings"
  let analyticsOpen = false;
  let timerTab = state.preferences?.deepFocus?.timerTab || "pomodoro";
  let pomodoroPhase = "focus"; // focus | short_break | long_break
  let selectedCustomMins = Number(state.preferences?.defaultFocusMinutes || 25);
  let selectedSubject = "General Study";
  let selectedTaskId = "";
  let selectedCheckInQuality = 4;
  let zenMode = Boolean(state.preferences?.deepFocus?.zenMode);
  let friendsCollapsed = false;
  let settingsNotice = "";

  const isDeepFocusActive = () => state.preferences?.appMode === "deepfocus";

  const renderModeSwitcher = () => {
    const mode = isDeepFocusActive() ? "deepfocus" : "cozy";
    const isSpectating = Boolean(state.spectatingRoom);
    if (isSpectating) {
      modeSwitcherEl.hidden = true;
      return;
    }
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
          setAppMode(nextMode);
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
      return;
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
                <button type="button" class="df-btn-subtle" id="df-friends-signin">Sign In</button>
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
                ${(studyingList.length > 0 ? studyingList : activeFriends).slice(0, 5).map((friend) => {
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

  const renderKanbanDrawerHtml = () => {
    const tasks = state.localTasks || [];
    const { todo, progress, done } = groupTasksForKanban(tasks);

    const renderCol = (title, colKey, list) => `
      <section class="df-kanban-col" aria-label="${escapeHtml(title)} tasks">
        <header class="df-kanban-col-head">
          <span>${escapeHtml(title)}</span>
          <span class="tabular-nums df-muted">${list.length}</span>
        </header>
        <div class="df-kanban-col-list">
          ${list.length === 0 ? `<div class="df-kanban-empty">Empty</div>` : list.map((t) => `
            <article class="df-kanban-card ${selectedTaskId === t.id ? "is-selected" : ""}">
              <div class="df-kanban-card-top">
                <span class="df-kanban-card-title">${escapeHtml(t.title)}</span>
                <button type="button" class="df-card-x" data-df-del-task="${escapeHtml(t.id)}" aria-label="Delete task ${escapeHtml(t.title)}">×</button>
              </div>
              <div class="df-kanban-card-meta">
                <span>${escapeHtml(t.subject || "General")}</span>
                <span aria-hidden="true">·</span>
                <span>${escapeHtml(t.priority || "medium")}</span>
              </div>
              <div class="df-kanban-card-actions">
                ${colKey !== "todo" ? `<button type="button" class="df-mini-act" data-df-move="${escapeHtml(t.id)}|todo">To Do</button>` : ""}
                ${colKey !== "progress" ? `<button type="button" class="df-mini-act" data-df-move="${escapeHtml(t.id)}|progress">Progress</button>` : ""}
                ${colKey !== "done" ? `<button type="button" class="df-mini-act" data-df-move="${escapeHtml(t.id)}|done">Done</button>` : ""}
                ${colKey !== "done" ? `<button type="button" class="df-mini-act is-accent" data-df-focus-task="${escapeHtml(t.id)}">Focus</button>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    return `
      <aside class="df-drawer df-drawer-kanban" aria-label="Kanban tasks">
        <header class="df-drawer-head">
          <h2>Kanban Tasks</h2>
          <button type="button" class="df-icon-btn" id="df-close-drawer" aria-label="Close tasks drawer">×</button>
        </header>
        <form id="df-task-form" class="df-task-form">
          <input id="df-new-task-title" class="df-input" type="text" maxlength="100" required placeholder="Add task (e.g., Problem Set 4)..." />
          <div class="df-task-form-row">
            <input id="df-new-task-subject" class="df-input" type="text" maxlength="40" value="General" aria-label="Subject" />
            <select id="df-new-task-priority" class="df-select" aria-label="Priority">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
            <button type="submit" class="df-btn-accent">Add</button>
          </div>
        </form>
        <div class="df-kanban-board">
          ${renderCol("To Do", "todo", todo)}
          ${renderCol("In Progress", "progress", progress)}
          ${renderCol("Done", "done", done)}
        </div>
      </aside>
    `;
  };

  const renderSettingsDrawerHtml = (appearance) => {
    const s = appearance.settings;
    const seriousMode = Boolean(state.preferences?.seriousMode);
    const ownedIds = state.ownedItemIds || [];
    const currentTheme = state.preferences?.theme || "comic";
    const locked = isStrictFocusLockActive();
    const unownedParticles = DEEPFOCUS_PARTICLES.filter((p) => p.shopItemId && !isParticleOwned(p.id, ownedIds));

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
              <h3>Theme &amp; Ambient Scene</h3>
              <button type="button" class="df-link-btn" id="df-open-themes-shop">Shop</button>
            </div>
            <label class="df-field">
              <span>Color &amp; Theme Preset</span>
              <select id="df-theme-select" class="df-select" ${locked ? "disabled" : ""}>
                ${ROOM_THEMES.map((t) => {
                  const accessible = isThemeAccessibleInMode(t.id, { ownedItemIds: ownedIds, seriousMode });
                  const item = SHOP_CATALOG.find((i) => i.category === "theme" && i.themeId === t.id);
                  const suffix = accessible ? "" : ` (Shop · ${item?.price || 30} SC)`;
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
              <button type="button" class="df-link-btn" id="df-open-particles-shop">Particle Shop</button>
            </div>

            <label class="df-field">
              <span>Active Particle Layer</span>
              <select id="df-particle-select" class="df-select">
                <option value="theme" ${s.followThemeParticle ? "selected" : ""}>Match Active Theme</option>
                ${DEEPFOCUS_PARTICLES.map((p) => {
                  const owned = isParticleOwned(p.id, ownedIds);
                  const selected = !s.followThemeParticle && s.particleId === p.id;
                  return `<option value="${escapeHtml(p.id)}" ${selected ? "selected" : ""}>${escapeHtml(p.name)}${owned ? "" : ` (Shop · ${p.price} SC)`}</option>`;
                }).join("")}
              </select>
            </label>

            ${unownedParticles.length > 0 ? `
              <div class="df-shop-hint-row">
                <span>${unownedParticles.length} particle effects available in Shop</span>
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
              <span>Strict Focus Lock (tab audit &amp; shop guard)</span>
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

  const renderAnalyticsModalHtml = () => {
    const analytics = computeDeepFocusAnalytics(state.localStudyRecords || [], todayIsoDate());
    return `
      <div class="df-modal-backdrop" id="df-analytics-backdrop" role="dialog" aria-modal="true" aria-labelledby="df-analytics-title">
        <div class="df-modal-card">
          <header class="df-modal-head">
            <h2 id="df-analytics-title">Performance Intelligence</h2>
            <button type="button" class="df-icon-btn" id="df-close-analytics" aria-label="Close analytics">×</button>
          </header>

          <div class="df-kpi-grid">
            <div class="df-kpi-box">
              <span class="df-kpi-label">Total Focus</span>
              <strong class="df-kpi-val tabular-nums">${analytics.totalMinutes}m</strong>
            </div>
            <div class="df-kpi-box">
              <span class="df-kpi-label">Sessions</span>
              <strong class="df-kpi-val tabular-nums">${analytics.sessionCount}</strong>
            </div>
            <div class="df-kpi-box">
              <span class="df-kpi-label">Current Streak</span>
              <strong class="df-kpi-val tabular-nums is-amber">${analytics.currentStreak} Days</strong>
            </div>
          </div>

          <section class="df-analytics-panel">
            <h3>28-Day Focus Heatmap Matrix</h3>
            <div class="df-heatmap-grid" aria-label="28-day study activity matrix">
              ${analytics.heatmapDays.map((d) => `
                <div class="df-heat-cell level-${d.level}" title="${escapeHtml(d.date)}: ${d.minutes}m"></div>
              `).join("")}
            </div>
          </section>

          <section class="df-analytics-panel">
            <h3>Subject Time Allocation</h3>
            ${analytics.subjectAllocation.length === 0
              ? `<p class="df-muted" style="margin:6px 0 0;font-size:13px;">No focus sessions recorded yet.</p>`
              : `<div class="df-subject-bars">
                  ${analytics.subjectAllocation.map((row) => `
                    <div class="df-subj-row">
                      <div class="df-subj-head">
                        <span>${escapeHtml(row.subject)}</span>
                        <span class="tabular-nums df-muted">${row.minutes}m · ${row.pct}%</span>
                      </div>
                      <div class="df-subj-track"><div class="df-subj-fill" style="width:${row.pct}%;"></div></div>
                    </div>
                  `).join("")}
                </div>`}
          </section>

          <footer class="df-analytics-actions">
            <button type="button" class="df-btn-subtle" id="df-an-register">Study Register</button>
            <button type="button" class="df-btn-subtle" id="df-an-calendar">Calendar &amp; Goals</button>
            <button type="button" class="df-btn-subtle" id="df-an-csv">Export CSV</button>
            <button type="button" class="df-btn-subtle" id="df-an-backup">Backup JSON</button>
            <button type="button" class="df-btn-subtle" id="df-an-restore">Restore</button>
          </footer>
        </div>
      </div>
    `;
  };

  const renderShell = () => {
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

    const userLabel = state.user ? (state.user.displayName || "Account") : "Sign In";
    const creditLabel = state.user ? `${state.wallet?.balance || 0} SC` : "Local";

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
              <span class="df-brand">SPRK Focus</span>
              <span class="df-top-meta tabular-nums" id="df-wallet-summary">${escapeHtml(creditLabel)}</span>
            </div>

            <nav class="df-nav" aria-label="DeepFocus navigation">
              <button type="button" class="df-nav-link ${activeDrawer === "tasks" ? "is-active" : ""}" id="df-nav-tasks">Tasks (${openTasks.length})</button>
              <button type="button" class="df-nav-link ${analyticsOpen ? "is-active" : ""}" id="df-nav-analytics">Analytics</button>
              <button type="button" class="df-nav-link" id="df-nav-notes">Notes</button>
              <button type="button" class="df-nav-link" id="df-nav-groups">Groups</button>
              <button type="button" class="df-nav-link" id="df-nav-shop">Shop</button>
            </nav>

            <div class="df-top-right">
              <button type="button" class="df-util-btn" id="df-btn-zen" title="Zen Mode (F)">Zen</button>
              <button type="button" class="df-util-btn" id="df-btn-palette" title="Command Palette (Ctrl/Cmd+K)">⌘K</button>
              <button type="button" class="df-util-btn" id="df-btn-profile">${escapeHtml(userLabel)}</button>
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
            <button type="button" class="df-dock-mixer-btn" id="df-open-audio-modal" title="Open Discs &amp; Full Sound Mixer">
              Mixer &amp; Discs
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
                <option value="__shop__">+ Buy Loop Discs in Shop…</option>
              </select>
              <button type="button" class="df-dock-play ${audioManager.isPlaying ? "is-playing" : ""}" id="df-dock-master-play" aria-label="${audioManager.isPlaying ? "Mute audio" : "Play audio"}">
                ${audioManager.isPlaying ? "⏸" : "▶"}
              </button>
            </div>
          </footer>
        `}

        ${!zenMode && activeDrawer === "tasks" ? renderKanbanDrawerHtml() : ""}
        ${!zenMode && activeDrawer === "settings" ? renderSettingsDrawerHtml(appearance) : ""}
      </div>

      ${analyticsOpen ? renderAnalyticsModalHtml() : ""}
    `;

    syncParticlesAndBackdrop();
    bindShellEvents(ownedDiscs);
  };

  const bindShellEvents = (ownedDiscs) => {
    // Top Nav
    shellEl.querySelector("#df-nav-tasks")?.addEventListener("click", () => {
      activeDrawer = activeDrawer === "tasks" ? null : "tasks";
      renderShell();
    });
    shellEl.querySelector("#df-nav-analytics")?.addEventListener("click", () => {
      analyticsOpen = true;
      renderShell();
    });
    shellEl.querySelector("#df-nav-notes")?.addEventListener("click", () => {
      dialogManager.open("diary");
    });
    shellEl.querySelector("#df-nav-groups")?.addEventListener("click", () => {
      dialogManager.open("community");
    });
    shellEl.querySelector("#df-nav-shop")?.addEventListener("click", () => {
      dialogManager.open("shop");
    });

    shellEl.querySelector("#df-btn-zen")?.addEventListener("click", () => {
      zenMode = true;
      activeDrawer = null;
      savePreferences({ deepFocus: { zenMode: true } });
      renderShell();
    });
    shellEl.querySelector("#df-exit-zen")?.addEventListener("click", () => {
      zenMode = false;
      savePreferences({ deepFocus: { zenMode: false } });
      renderShell();
    });
    shellEl.querySelector("#df-btn-palette")?.addEventListener("click", () => openCommandPalette());
    shellEl.querySelector("#df-btn-profile")?.addEventListener("click", () => dialogManager.open("profile"));
    shellEl.querySelector("#df-btn-settings")?.addEventListener("click", () => {
      activeDrawer = activeDrawer === "settings" ? null : "settings";
      settingsNotice = "";
      renderShell();
    });

    // Timer Card
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

    // Post-session Check-in
    shellEl.querySelectorAll("[data-df-q]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedCheckInQuality = Number(btn.dataset.dfQ);
        renderShell();
      });
    });
    shellEl.querySelector("#df-checkin-save")?.addEventListener("click", () => {
      const note = shellEl.querySelector("#df-checkin-note")?.value.trim() || "";
      const targetId = state.pendingCheckInRecordId;
      const nextRecords = (state.localStudyRecords || []).map((r) =>
        r.id === targetId ? { ...r, focusQuality: selectedCheckInQuality, reflection: note } : r
      );
      persistLocalCollection("localStudyRecords", nextRecords);
      state.pendingCheckInRecordId = null;
      renderShell();
    });
    shellEl.querySelector("#df-checkin-skip")?.addEventListener("click", () => {
      state.pendingCheckInRecordId = null;
      renderShell();
    });

    // Friends Studying Widget
    shellEl.querySelector("#df-friends-collapse")?.addEventListener("click", () => {
      friendsCollapsed = !friendsCollapsed;
      renderShell();
    });
    shellEl.querySelector("#df-friends-manage")?.addEventListener("click", () => dialogManager.open("friends"));
    shellEl.querySelector("#df-friends-find")?.addEventListener("click", () => dialogManager.open("friends"));
    shellEl.querySelector("#df-friends-signin")?.addEventListener("click", () => dialogManager.open("profile"));
    shellEl.querySelectorAll("[data-df-visit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await visitFriendRoom(btn.dataset.dfVisit);
      });
    });

    // Sound Mixer Dock
    shellEl.querySelector("#df-open-audio-modal")?.addEventListener("click", () => dialogManager.open("audio"));
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
      if (val === "__shop__") {
        dialogManager.open("audio");
        renderShell();
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

    // Drawers Close
    shellEl.querySelector("#df-close-drawer")?.addEventListener("click", () => {
      activeDrawer = null;
      renderShell();
    });

    // Kanban Drawer Events
    shellEl.querySelector("#df-task-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = shellEl.querySelector("#df-new-task-title")?.value.trim();
      if (!title) return;
      const subject = shellEl.querySelector("#df-new-task-subject")?.value.trim() || "General";
      const priority = shellEl.querySelector("#df-new-task-priority")?.value || "medium";
      const newTask = {
        id: generateId("task"),
        title,
        subject,
        priority,
        dueDate: "",
        completed: false,
        kanbanStatus: "todo",
        noteColor: "butter"
      };
      persistLocalCollection("localTasks", [newTask, ...(state.localTasks || [])]);
      await syncTaskUpsert(newTask);
      renderShell();
    });

    shellEl.querySelectorAll("[data-df-move]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const [taskId, targetCol] = btn.dataset.dfMove.split("|");
        let updatedTask = null;
        const nextTasks = (state.localTasks || []).map((t) => {
          if (t.id !== taskId) return t;
          updatedTask = {
            ...t,
            kanbanStatus: targetCol,
            completed: targetCol === "done"
          };
          return updatedTask;
        });
        persistLocalCollection("localTasks", nextTasks);
        if (updatedTask) await syncTaskUpsert(updatedTask);
        renderShell();
      });
    });

    shellEl.querySelectorAll("[data-df-focus-task]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const taskId = btn.dataset.dfFocusTask;
        selectedTaskId = taskId;
        const task = (state.localTasks || []).find((t) => t.id === taskId);
        if (task?.subject && task.subject !== "General") {
          selectedSubject = task.subject;
        }
        renderShell();
      });
    });

    shellEl.querySelectorAll("[data-df-del-task]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.dfDelTask;
        if (selectedTaskId === id) selectedTaskId = "";
        persistLocalCollection("localTasks", (state.localTasks || []).filter((t) => t.id !== id));
        await syncTaskDelete(id);
        renderShell();
      });
    });

    // Settings Drawer Events
    shellEl.querySelector("#df-open-themes-shop")?.addEventListener("click", () => dialogManager.open("shop", null, "theme"));
    shellEl.querySelector("#df-open-particles-shop")?.addEventListener("click", () => dialogManager.open("shop", null, "particles"));
    shellEl.querySelector("#df-buy-particles-btn")?.addEventListener("click", () => dialogManager.open("shop", null, "particles"));

    shellEl.querySelector("#df-theme-select")?.addEventListener("change", (e) => {
      const nextTheme = e.target.value;
      const accessible = isThemeAccessibleInMode(nextTheme, {
        ownedItemIds: state.ownedItemIds || [],
        seriousMode: Boolean(state.preferences?.seriousMode)
      });
      if (!accessible) {
        settingsNotice = "Purchase this theme in the Shop to apply its palette and scene.";
        renderShell();
        dialogManager.open("shop", null, "theme");
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
        settingsNotice = "Unlock this atmospheric particle pack in the Shop first.";
        renderShell();
        dialogManager.open("shop", null, "particles");
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

    // Analytics Modal Events
    shellEl.querySelector("#df-close-analytics")?.addEventListener("click", () => {
      analyticsOpen = false;
      renderShell();
    });
    shellEl.querySelector("#df-analytics-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "df-analytics-backdrop") {
        analyticsOpen = false;
        renderShell();
      }
    });
    shellEl.querySelector("#df-an-register")?.addEventListener("click", () => {
      analyticsOpen = false;
      renderShell();
      dialogManager.open("register");
    });
    shellEl.querySelector("#df-an-calendar")?.addEventListener("click", () => {
      analyticsOpen = false;
      renderShell();
      dialogManager.open("calendar");
    });
    shellEl.querySelector("#df-an-csv")?.addEventListener("click", () => {
      const csv = formatStudyRecordsCsv(state.localStudyRecords || []);
      triggerTextDownload(`sprk-study-log-${todayIsoDate()}.csv`, csv, "text/csv;charset=utf-8");
    });
    shellEl.querySelector("#df-an-backup")?.addEventListener("click", () => {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        preferences: state.preferences,
        localTasks: state.localTasks,
        localGoals: state.localGoals,
        localDiary: state.localDiary,
        localStudyRecords: state.localStudyRecords,
        localSavedResources: state.localSavedResources,
        localFlashcards: state.localFlashcards,
        localExams: state.localExams,
        localSubjectBudgets: state.localSubjectBudgets,
        localWorkspaceProfiles: state.localWorkspaceProfiles,
        localAudioPresets: state.localAudioPresets
      };
      triggerTextDownload(`sprk-desk-backup-${todayIsoDate()}.json`, JSON.stringify(payload, null, 2), "application/json");
    });
    shellEl.querySelector("#df-an-restore")?.addEventListener("click", () => {
      analyticsOpen = false;
      renderShell();
      dialogManager.open("cabinet");
    });
  };

  // Global DeepFocus keyboard shortcuts (Space, S, R, F) when not typing
  window.addEventListener("keydown", (event) => {
    if (!isDeepFocusActive()) return;
    if (dialogManager.dialog?.open || document.getElementById("sprk-command-dialog")?.open) return;
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || event.target?.isContentEditable) return;

    const key = event.key.toLowerCase();
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
      if (zenMode) activeDrawer = null;
      savePreferences({ deepFocus: { zenMode } });
      renderShell();
    } else if (key === "escape" && (activeDrawer || analyticsOpen || zenMode)) {
      analyticsOpen = false;
      activeDrawer = null;
      zenMode = false;
      savePreferences({ deepFocus: { zenMode: false } });
      renderShell();
    }
  });

  renderShell();

  bus.on("preferences:changed", () => renderShell());
  bus.on("state:activeSession", () => renderShell());
  bus.on("state:localTasks", () => {
    if (isDeepFocusActive() && activeDrawer === "tasks") renderShell();
  });
  bus.on("state:localStudyRecords", () => {
    if (isDeepFocusActive() && analyticsOpen) renderShell();
  });
  bus.on("auth:changed", () => renderShell());
  bus.on("profile:changed", () => renderShell());
  bus.on("economy:updated", () => renderShell());
  bus.on("studyCircle:changed", () => {
    if (isDeepFocusActive()) {
      const widget = shellEl.querySelector(".df-friends-panel");
      if (widget) {
        const tmp = document.createElement("div");
        tmp.innerHTML = renderFriendsWidgetHtml();
        const fresh = tmp.firstElementChild;
        if (fresh) {
          widget.replaceWith(fresh);
          shellEl.querySelector("#df-friends-collapse")?.addEventListener("click", () => {
            friendsCollapsed = !friendsCollapsed;
            renderShell();
          });
          shellEl.querySelector("#df-friends-manage")?.addEventListener("click", () => dialogManager.open("friends"));
          shellEl.querySelector("#df-friends-find")?.addEventListener("click", () => dialogManager.open("friends"));
          shellEl.querySelector("#df-friends-signin")?.addEventListener("click", () => dialogManager.open("profile"));
          shellEl.querySelectorAll("[data-df-visit]").forEach((btn) => {
            btn.addEventListener("click", async () => {
              await visitFriendRoom(btn.dataset.dfVisit);
            });
          });
        }
      }
    }
  });
  bus.on("spectator:changed", () => renderModeSwitcher());

  window.setInterval(() => {
    if (!isDeepFocusActive()) return;
    if (state.activeSession?.status === "running") {
      updateClockDomOnly();
    }
  }, 1000);
}
