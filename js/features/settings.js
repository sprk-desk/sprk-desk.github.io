// Control Panel -> Serious Mode, Deep Focus, Strict Lock, Workspace Profiles & Focus Dashboard (Shift+F)
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { ROOM_THEMES } from "../core/theme-manager.js";
import { lightingManager } from "../core/lighting-manager.js";
import { dialogManager } from "../core/dialog-manager.js";
import { audioManager } from "../core/audio-manager.js";
import {
  setSeriousMode,
  setSeriousPresetTheme,
  toggleHideGamification,
  toggleMuteChimes,
  toggleStrictFocusLock,
  toggleAutoCycleBreaks,
  setDefaultFocusMinutes,
  applyWorkspaceProfile
} from "../core/settings-manager.js";
import { isThemeAccessibleInMode } from "../utils/room-settings.js";
import { BUILTIN_WORKSPACE_PROFILES, getDueFlashcards } from "../utils/study-tools.js";
import {
  createFocusSession,
  computeRemainingSeconds,
  pauseFocusSession,
  resumeFocusSession
} from "../utils/timer-math.js";
import { finishActiveFocusSession } from "./focus.js";
import { syncTaskUpsert, syncNoteUpsert } from "../services/database-service.js";
import { escapeHtml, formatDuration, generateId } from "../utils/dom.js";

const FOCUS_BLOCK_PRESETS = [25, 50, 90];

export const settingsFeature = {
  skin: "settings",
  eyebrow: "",
  title: "Control Panel",
  icon: "🎛",
  render(container, { param, rerender }) {
    let tab = param === "focus" ? "focus" : "modes";
    let statusMessage = "";

    const renderView = () => {
      const prefs = state.preferences || {};
      const seriousMode = Boolean(prefs.seriousMode);
      const hideGamification = Boolean(prefs.hideGamification);
      const muteChimes = Boolean(prefs.muteChimes);
      const strictFocusLock = Boolean(prefs.strictFocusLock);
      const autoCycleBreaks = prefs.autoCycleBreaks !== false;
      const currentTheme = prefs.theme || "comic";
      const defaultFocusMins = Number(prefs.defaultFocusMinutes || 25);

      const editorialAccessible = isThemeAccessibleInMode("editorial", {
        ownedItemIds: state.ownedItemIds,
        seriousMode
      });
      const noirAccessible = isThemeAccessibleInMode("noir", {
        ownedItemIds: state.ownedItemIds,
        seriousMode
      });

      const sess = state.activeSession;
      const timerSeconds = sess ? computeRemainingSeconds(sess) : defaultFocusMins * 60;
      const openTasks = (state.localTasks || []).filter((t) => !t.completed).slice(0, 6);
      const dueCardsCount = getDueFlashcards(state.localFlashcards || [], Date.now()).length;
      const allProfiles = [...BUILTIN_WORKSPACE_PROFILES, ...(state.localWorkspaceProfiles || [])];

      const modesTabLabel = seriousMode ? "Modes & Profiles" : "🎛 Modes & Profiles";
      const focusTabLabel = seriousMode ? "Focus View (Shift+F)" : "⏱ Focus View (Shift+F)";

      container.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px;">
          <nav class="sprk-tabs" style="margin:0;" role="tablist" aria-label="Settings sections">
            <button type="button" class="sprk-tab ${tab === "modes" ? "is-active" : ""}" data-stab="modes">${escapeHtml(modesTabLabel)}</button>
            <button type="button" class="sprk-tab ${tab === "focus" ? "is-active" : ""}" data-stab="focus">${escapeHtml(focusTabLabel)}</button>
          </nav>
          <span class="sprk-badge-chip">${seriousMode ? "Serious Mode: Active" : "Regular Mode"}</span>
        </div>

        ${statusMessage ? `<div class="sprk-notice" role="status" style="margin-bottom:12px;">${escapeHtml(statusMessage)}</div>` : ""}

        ${tab === "modes" ? `
          <div style="display:grid;gap:12px;">
            <section class="sprk-card" aria-labelledby="set-serious-heading">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:220px;">
                  <strong id="set-serious-heading" style="font-size:15px;display:block;">Serious Mode</strong>
                  <p style="margin:4px 0 0;font-size:12.5px;color:var(--muted);">
                    Neutralizes playful colors, handwriting fonts, emojis, decorative clutter, and bouncy animations. Unlocks both monochrome themes free while enabled; they remain paid (30 / 35 SC) in Regular Mode.
                  </p>
                </div>
                <button type="button"
                  id="toggle-serious-mode"
                  role="switch"
                  aria-checked="${seriousMode}"
                  class="sprk-btn ${seriousMode ? "sprk-btn-primary" : ""}"
                  style="min-width:118px;">
                  ${seriousMode ? "On · Monochrome" : "Turn On"}
                </button>
              </div>

              <div class="sprk-grid-2" style="margin-top:12px;">
                <button type="button"
                  class="sprk-card ${currentTheme === "editorial" ? "is-selected-serious-theme" : ""}"
                  data-serious-preset="editorial"
                  style="display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;cursor:pointer;${currentTheme === "editorial" ? "border-color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink);" : ""}">
                  <div>
                    <strong style="font-size:13px;display:block;">Swiss Editorial (Light)</strong>
                    <span class="sprk-meta">
                      ${seriousMode
                        ? (currentTheme === "editorial" ? "Active · Free in Serious Mode" : "Free in Serious Mode")
                        : (editorialAccessible ? "Owned" : "Regular Mode: 30 SC")}
                    </span>
                  </div>
                  <span style="display:inline-flex;gap:3px;">
                    <span style="width:14px;height:14px;border:1px solid var(--ink);background:#f4f4f1;"></span>
                    <span style="width:14px;height:14px;border:1px solid var(--ink);background:#111111;"></span>
                  </span>
                </button>

                <button type="button"
                  class="sprk-card ${currentTheme === "noir" ? "is-selected-serious-theme" : ""}"
                  data-serious-preset="noir"
                  style="display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;cursor:pointer;${currentTheme === "noir" ? "border-color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink);" : ""}">
                  <div>
                    <strong style="font-size:13px;display:block;">Obsidian Minimal (Dark)</strong>
                    <span class="sprk-meta">
                      ${seriousMode
                        ? (currentTheme === "noir" ? "Active · Free in Serious Mode" : "Free in Serious Mode")
                        : (noirAccessible ? "Owned" : "Regular Mode: 35 SC")}
                    </span>
                  </div>
                  <span style="display:inline-flex;gap:3px;">
                    <span style="width:14px;height:14px;border:1px solid var(--ink);background:#141414;"></span>
                    <span style="width:14px;height:14px;border:1px solid var(--ink);background:#f2f2ef;"></span>
                  </span>
                </button>
              </div>
            </section>

            <section class="sprk-card" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div style="flex:1;min-width:220px;">
                <strong style="font-size:14px;display:block;">Strict Focus Lock</strong>
                <p style="margin:4px 0 0;font-size:12.5px;color:var(--muted);">
                  Locks Shop/Studio browsing while a focus timer runs and audits tab-switch interruptions on your session log.
                </p>
              </div>
              <button type="button"
                id="toggle-strict-lock"
                role="switch"
                aria-checked="${strictFocusLock}"
                class="sprk-btn ${strictFocusLock ? "sprk-btn-primary" : ""}"
                style="min-width:136px;">
                ${strictFocusLock ? "Strict Lock: Active" : "Enable Strict Lock"}
              </button>
            </section>

            <section class="sprk-card" style="display:grid;gap:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <div>
                  <strong style="font-size:14px;display:block;">One-Click Workspace Profiles</strong>
                  <span class="sprk-meta">Switch theme, modes, lamp temp, focus block & noise floor together (also via Ctrl/Cmd+K).</span>
                </div>
                <button type="button" class="sprk-btn" id="save-workspace-profile-btn" style="min-height:32px;padding:4px 10px;">+ Save Current Setup</button>
              </div>

              <div class="sprk-grid-3">
                ${allProfiles.map((prof) => `
                  <div class="sprk-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:8px;">
                    <div>
                      <strong style="font-size:13px;display:block;">${escapeHtml(prof.name)}</strong>
                      <div class="sprk-meta" style="margin-top:3px;">${escapeHtml(prof.description || `${prof.settings?.defaultFocusMinutes || 25}m · ${prof.settings?.theme || "comic"}`)}</div>
                    </div>
                    <button type="button" class="sprk-btn sprk-btn-primary" data-apply-profile="${escapeHtml(prof.id)}" style="min-height:32px;padding:4px 10px;">Apply</button>
                  </div>
                `).join("")}
              </div>
            </section>

            <section class="sprk-card" style="display:grid;gap:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <div>
                  <strong style="font-size:14px;display:block;">Default Focus Block</strong>
                  <span class="sprk-meta">Applied automatically when opening the Focus Timer.</span>
                </div>
                <div style="display:flex;gap:6px;">
                  ${FOCUS_BLOCK_PRESETS.map((mins) => `
                    <button type="button"
                      class="sprk-btn ${defaultFocusMins === mins ? "sprk-btn-primary" : ""}"
                      data-focus-mins="${mins}"
                      style="min-height:34px;padding:4px 12px;">
                      <span class="tabular-nums">${mins}m</span>
                    </button>
                  `).join("")}
                </div>
              </div>

              <div class="sprk-grid-2" style="padding-top:8px;border-top:1px solid rgba(52,44,37,0.12);">
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="set-auto-cycle" ${autoCycleBreaks ? "checked" : ""} />
                  <span>Auto-prompt Pomodoro breaks after work blocks</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="set-hide-gamification" ${hideGamification ? "checked" : ""} />
                  <span>Hide Study Credits & reward flares</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="set-mute-chimes" ${muteChimes ? "checked" : ""} />
                  <span>Mute session completion chimes</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="set-reduced-motion" ${prefs.reducedMotion ? "checked" : ""} />
                  <span>Reduced Motion</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="set-low-perf" ${prefs.lowPerformance ? "checked" : ""} />
                  <span>Eco Window Particles</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="set-lock-layout" ${prefs.layoutLocked ? "checked" : ""} />
                  <span>Lock room object placement</span>
                </label>
              </div>
            </section>
          </div>
        ` : `
          <div style="display:grid;gap:12px;">
            <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <div class="sprk-label">${sess ? escapeHtml(sess.subject || "Active Session") : `Focus Block (${defaultFocusMins}m)`}</div>
                <div id="settings-focus-readout" class="tabular-nums" style="font-size:32px;font-weight:700;line-height:1.1;margin-top:2px;">
                  ${formatDuration(timerSeconds)}
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${!sess ? `
                  <button type="button" class="sprk-btn sprk-btn-primary" id="settings-focus-start">Start ${defaultFocusMins}m</button>
                ` : `
                  ${sess.status === "running"
                    ? `<button type="button" class="sprk-btn" id="settings-focus-pause">Pause</button>`
                    : `<button type="button" class="sprk-btn sprk-btn-primary" id="settings-focus-resume">Resume</button>`}
                  <button type="button" class="sprk-btn sprk-btn-primary" id="settings-focus-finish">Finish</button>
                `}
              </div>
            </div>

            <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <strong style="font-size:14px;display:block;">Spaced Repetition Queue</strong>
                <span class="sprk-meta tabular-nums">${dueCardsCount} flashcard(s) due for review</span>
              </div>
              <button type="button" class="sprk-btn sprk-btn-primary" id="settings-open-flashcards" style="min-height:34px;padding:4px 12px;">
                Review Flashcards (${dueCardsCount})
              </button>
            </div>

            <div class="sprk-grid-2">
              <section class="sprk-card" style="display:flex;flex-direction:column;gap:8px;">
                <strong style="font-size:14px;">Open Tasks (${openTasks.length})</strong>
                <form id="settings-quick-task-form" style="display:flex;gap:6px;">
                  <input id="settings-quick-task-input" class="sprk-input" type="text" maxlength="90" placeholder="Add a study task..." />
                  <button type="submit" class="sprk-btn" style="min-height:36px;padding:4px 10px;">Add</button>
                </form>
                <div style="display:grid;gap:6px;">
                  ${openTasks.length === 0 ? `<div class="sprk-empty" style="padding:10px;">No open tasks.</div>` : openTasks.map((t) => `
                    <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:13px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                      <input type="checkbox" data-quick-toggle-task="${escapeHtml(t.id)}" style="margin-top:3px;" />
                      <span>${escapeHtml(t.title)}</span>
                    </label>
                  `).join("")}
                </div>
              </section>

              <section class="sprk-card" style="display:flex;flex-direction:column;gap:8px;">
                <strong style="font-size:14px;">Quick Scratchpad</strong>
                <form id="settings-quick-note-form" style="display:grid;gap:8px;">
                  <input id="settings-note-title" class="sprk-input" type="text" maxlength="60" placeholder="Note heading..." />
                  <textarea id="settings-note-body" class="sprk-textarea" rows="3" placeholder="Capture brief equations, definitions, or next steps..."></textarea>
                  <button type="submit" class="sprk-btn sprk-btn-primary" style="min-height:36px;">Save to Study Notes</button>
                </form>
              </section>
            </div>
          </div>
        `}
      `;

      container.querySelectorAll("[data-stab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.stab;
          dialogManager.setParam(tab === "focus" ? "focus" : null, { syncHash: true });
          renderView();
        });
      });

      container.querySelector("#toggle-serious-mode")?.addEventListener("click", () => {
        const next = !Boolean(state.preferences?.seriousMode);
        const res = setSeriousMode(next);
        const themeMeta = ROOM_THEMES.find((t) => t.id === res.themeId);
        statusMessage = next
          ? `Serious Mode enabled (${themeMeta?.name || res.themeId} applied free).`
          : `Returned to Regular Mode (${themeMeta?.name || res.themeId}).`;
        dialogManager.syncHeader("settings");
        renderView();
      });

      container.querySelectorAll("[data-serious-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.dataset.seriousPreset;
          const isSerious = Boolean(state.preferences?.seriousMode);
          const accessible = isThemeAccessibleInMode(target, {
            ownedItemIds: state.ownedItemIds,
            seriousMode: isSerious
          });
          if (!accessible) {
            statusMessage = "Locked in Regular Mode. Turn on Serious Mode for free access, or purchase in Catalog.";
            renderView();
            return;
          }
          setSeriousPresetTheme(target);
          statusMessage = `Applied ${target === "noir" ? "Obsidian Minimal" : "Swiss Editorial"}.`;
          dialogManager.syncHeader("settings");
          renderView();
        });
      });

      container.querySelector("#toggle-strict-lock")?.addEventListener("click", () => {
        const next = !Boolean(state.preferences?.strictFocusLock);
        toggleStrictFocusLock(next);
        statusMessage = next
          ? "Strict Focus Lock armed: Shop & Studio lock during active focus countdowns."
          : "Strict Focus Lock disabled.";
        renderView();
      });

      container.querySelectorAll("[data-apply-profile]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const prof = allProfiles.find((p) => p.id === btn.dataset.applyProfile);
          if (prof && applyWorkspaceProfile(prof)) {
            statusMessage = `Applied workspace profile: ${prof.name}.`;
            dialogManager.syncHeader("settings");
            renderView();
          }
        });
      });

      container.querySelector("#save-workspace-profile-btn")?.addEventListener("click", () => {
        const currentCustom = state.localWorkspaceProfiles || [];
        const p = state.preferences || {};
        const customProf = {
          id: generateId("prof"),
          name: `Custom Setup ${currentCustom.length + 1}`,
          description: `${p.defaultFocusMinutes || 25}m · ${p.theme || "comic"}${p.seriousMode ? " · Serious" : ""}`,
          settings: {
            seriousMode: Boolean(p.seriousMode),
            theme: p.theme || "comic",
            hideGamification: Boolean(p.hideGamification),
            strictFocusLock: Boolean(p.strictFocusLock),
            defaultFocusMinutes: Number(p.defaultFocusMinutes || 25),
            autoCycleBreaks: p.autoCycleBreaks !== false,
            timeOfDay: p.timeOfDay || "auto",
            weather: p.weather || "clear",
            lampKelvin: Number(p.lighting?.lampKelvin || 3200),
            lowPassHz: Number(audioManager.lowPassHz || p.lowPassHz || 18000),
            audioMix: { ...audioManager.levels }
          }
        };
        persistLocalCollection("localWorkspaceProfiles", [customProf, ...currentCustom]);
        statusMessage = `Saved "${customProf.name}" workspace profile.`;
        renderView();
      });

      container.querySelectorAll("[data-focus-mins]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const mins = setDefaultFocusMinutes(btn.dataset.focusMins);
          statusMessage = `Default focus block set to ${mins} minutes.`;
          renderView();
        });
      });

      container.querySelector("#set-auto-cycle")?.addEventListener("change", (e) => {
        toggleAutoCycleBreaks(e.target.checked);
      });

      container.querySelector("#set-hide-gamification")?.addEventListener("change", (e) => {
        toggleHideGamification(e.target.checked);
      });

      container.querySelector("#set-mute-chimes")?.addEventListener("change", (e) => {
        toggleMuteChimes(e.target.checked);
      });

      container.querySelector("#set-reduced-motion")?.addEventListener("change", (e) => {
        savePreferences({ reducedMotion: e.target.checked });
        lightingManager.apply();
      });

      container.querySelector("#set-low-perf")?.addEventListener("change", (e) => {
        savePreferences({ lowPerformance: e.target.checked });
        lightingManager.apply();
      });

      container.querySelector("#set-lock-layout")?.addEventListener("change", (e) => {
        savePreferences({ layoutLocked: e.target.checked });
      });

      container.querySelector("#settings-open-flashcards")?.addEventListener("click", (e) => {
        dialogManager.open("library", e.currentTarget, "flashcards");
      });

      container.querySelector("#settings-focus-start")?.addEventListener("click", () => {
        const newSess = createFocusSession({
          id: generateId("focus"),
          mode: "focus",
          targetSeconds: defaultFocusMins * 60,
          scope: "personal",
          subject: "Deep Focus"
        });
        newSess.interruptions = 0;
        persistLocalCollection("activeSession", newSess);
        statusMessage = `Started ${defaultFocusMins}m focus session.`;
        renderView();
      });

      container.querySelector("#settings-focus-pause")?.addEventListener("click", () => {
        if (!state.activeSession) return;
        persistLocalCollection("activeSession", pauseFocusSession(state.activeSession, Date.now(), "manual"));
        renderView();
      });

      container.querySelector("#settings-focus-resume")?.addEventListener("click", () => {
        if (!state.activeSession) return;
        persistLocalCollection("activeSession", resumeFocusSession(state.activeSession, Date.now()));
        renderView();
      });

      container.querySelector("#settings-focus-finish")?.addEventListener("click", async () => {
        const rec = await finishActiveFocusSession({ autoCompleted: false });
        statusMessage = rec
          ? `Logged ${formatDuration(rec.durationSeconds)} (${rec.subject}).`
          : "Session closed.";
        renderView();
      });

      container.querySelector("#settings-quick-task-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = container.querySelector("#settings-quick-task-input");
        const title = input?.value.trim();
        if (!title) return;
        const newTask = {
          id: generateId("task"),
          title,
          subject: "Focus",
          priority: "medium",
          dueDate: "",
          noteColor: "butter",
          kanbanStatus: "todo",
          completed: false
        };
        persistLocalCollection("localTasks", [newTask, ...(state.localTasks || [])]);
        syncTaskUpsert(newTask);
        renderView();
      });

      container.querySelectorAll("[data-quick-toggle-task]").forEach((cb) => {
        cb.addEventListener("change", () => {
          const id = cb.dataset.quickToggleTask;
          const nextTasks = (state.localTasks || []).map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: cb.checked,
                  kanbanStatus: cb.checked ? "done" : (t.kanbanStatus === "progress" ? "progress" : "todo")
                }
              : t
          );
          persistLocalCollection("localTasks", nextTasks);
          const updated = nextTasks.find((t) => t.id === id);
          if (updated) syncTaskUpsert(updated);
          renderView();
        });
      });

      container.querySelector("#settings-quick-note-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = container.querySelector("#settings-note-title")?.value.trim() || "Quick Note";
        const content = container.querySelector("#settings-note-body")?.value.trim();
        if (!content) return;
        const entry = {
          id: generateId("note"),
          folder: "notes",
          isDiary: false,
          title,
          content,
          updatedAt: new Date().toISOString()
        };
        persistLocalCollection("localDiary", [entry, ...(state.localDiary || [])]);
        syncNoteUpsert(entry);
        statusMessage = `Saved note "${title}".`;
        renderView();
      });
    };

    renderView();
    const interval = window.setInterval(() => {
      if (tab !== "focus" || !state.activeSession || state.activeSession.status !== "running") return;
      const readout = container.querySelector("#settings-focus-readout");
      if (readout) readout.textContent = formatDuration(computeRemainingSeconds(state.activeSession));
    }, 1000);

    return () => clearInterval(interval);
  }
};
