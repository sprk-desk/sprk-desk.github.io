// Wall Clock -> Focus Timer with timestamp recovery, Pomodoro Cycles, Interruption Audit & Post-Session Check-In
import { APP_CONFIG } from "../../config.js";
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { bus } from "../core/event-bus.js";
import { audioManager } from "../core/audio-manager.js";
import { isStrictFocusLockActive } from "../core/settings-manager.js";
import { resolveNextPomodoroStep } from "../utils/study-tools.js";
import {
  createFocusSession,
  computeElapsedActiveSeconds,
  computeRemainingSeconds,
  pauseFocusSession,
  resumeFocusSession,
  completeFocusSession,
  calculateStudyCreditsForSession,
  summarizeFocusMinutes
} from "../utils/timer-math.js";
import { escapeHtml, formatDuration, todayIsoDate, generateId } from "../utils/dom.js";
import { completeServerFocusSession } from "../services/economy-service.js";
import { updateFocusSessionSubject } from "../services/database-service.js";
import { supabase } from "../services/supabase.js";

let finishingSessionId = null;

function updateClockVisualAndWhisper() {
  const clockBtn = document.querySelector(".desk-clock");
  const whisper = document.getElementById("room-active-whisper");
  const sess = state.activeSession;

  if (clockBtn) {
    clockBtn.classList.toggle("is-focus-running", sess?.status === "running");
  }
  if (!whisper) return;

  if (!sess || (sess.status !== "running" && sess.status !== "paused")) {
    whisper.hidden = true;
    whisper.textContent = "";
    return;
  }

  const remaining = computeRemainingSeconds(sess);
  const modeTag =
    sess.mode === "short_break"
      ? "Short Break"
      : sess.mode === "long_break"
        ? "Long Break"
        : (sess.status === "paused" ? "Paused" : "Focus");
  const lockSuffix = isStrictFocusLockActive() ? " · Locked" : "";
  whisper.hidden = false;
  whisper.textContent = `${modeTag} · ${formatDuration(remaining)} · ${sess.subject}${lockSuffix}`;
}

export function initFocusBackgroundLoop() {
  updateClockVisualAndWhisper();

  document.addEventListener("visibilitychange", () => {
    const sess = state.activeSession;
    if (!sess || sess.status !== "running" || sess.mode !== "focus") return;
    if (!isStrictFocusLockActive()) return;

    if (document.hidden) {
      const updated = {
        ...sess,
        interruptions: Number(sess.interruptions || 0) + 1
      };
      persistLocalCollection("activeSession", updated);
      updateClockVisualAndWhisper();
    } else if (!state.preferences?.muteChimes) {
      audioManager.playChime("focus");
    }
  });

  window.setInterval(() => {
    const sess = state.activeSession;
    if (!sess) return;
    updateClockVisualAndWhisper();
    if (sess.status === "running" && computeRemainingSeconds(sess) === 0) {
      finishActiveFocusSession({ autoCompleted: true });
    }
  }, 1000);
}

export async function finishActiveFocusSession({ autoCompleted = false } = {}) {
  const sess = state.activeSession;
  if (!sess || finishingSessionId === sess.id) return null;
  finishingSessionId = sess.id;
  try {
    const completed = completeFocusSession(sess);
    const verifiedSeconds = Math.max(0, Math.round((completed.accumulatedActiveMs || 0) / 1000));
    const today = todayIsoDate();

  const earnedToday = state.localStudyRecords
    .filter((r) => r.date === today)
    .reduce((acc, r) => acc + (r.creditsAwarded || 0), 0);

  let creditsAwarded = 0;
  if (supabase.configured && state.user?.id && completed.serverSessionId) {
    const res = await completeServerFocusSession(completed.serverSessionId);
    if (res.ok && typeof res.data?.credits_awarded === "number") {
      creditsAwarded = res.data.credits_awarded;
    }
  } else if (state.user?.id) {
    creditsAwarded = calculateStudyCreditsForSession({
      mode: completed.mode,
      verifiedSeconds,
      alreadyEarnedToday: earnedToday
    });
    if (supabase.configured) {
      supabase.upsert("focus_sessions", {
        id: completed.id,
        user_id: state.user.id,
        mode: completed.mode,
        scope: completed.scope,
        subject: completed.subject,
        target_seconds: completed.targetSeconds,
        verified_seconds: verifiedSeconds,
        credits_awarded: 0,
        is_manual: false,
        status: "completed",
        started_at: new Date(completed.startedAtMs).toISOString(),
        completed_at: new Date().toISOString()
      }, "id");
    }
  }

  const record = {
    id: completed.id,
    date: today,
    mode: completed.mode,
    scope: completed.scope,
    subject: completed.subject,
    durationSeconds: verifiedSeconds,
    creditsAwarded,
    isManual: false,
    interruptions: Number(sess.interruptions || 0),
    focusQuality: null,
    reflection: "",
    startedAt: new Date(completed.startedAtMs).toISOString()
  };

  persistLocalCollection("localStudyRecords", [record, ...state.localStudyRecords]);
  persistLocalCollection("activeSession", null);

  if (completed.mode === "focus") {
    state.pendingCheckInRecordId = record.id;
  }

  const currentCycles = Number(state.preferences?.pomodoroCyclesCompleted || 0);
  const nextStep = resolveNextPomodoroStep({
    completedMode: completed.mode || "focus",
    completedFocusCycles: currentCycles,
    defaultFocusMinutes: Number(state.preferences?.defaultFocusMinutes || 25),
    shortBreakMinutes: APP_CONFIG.defaults.focus.shortBreakMinutes,
    longBreakMinutes: APP_CONFIG.defaults.focus.longBreakMinutes,
    longBreakEvery: APP_CONFIG.defaults.focus.longBreakEvery
  });

  if (completed.mode === "focus") {
    savePreferences({ pomodoroCyclesCompleted: nextStep.nextCycleCount });
  }

  if (state.preferences?.autoCycleBreaks !== false) {
    state.pendingNextPomodoroStep = {
      ...nextStep,
      subject: completed.subject || "General Study"
    };
  } else {
    state.pendingNextPomodoroStep = null;
  }

    updateClockVisualAndWhisper();
    if (autoCompleted) audioManager.playChime("complete");
    bus.emit("focus:completed", record);
    return record;
  } finally {
    finishingSessionId = null;
  }
}

export const focusFeature = {
  skin: "focus",
  eyebrow: "",
  title: "Wall Clock",
  icon: "◔",
  render(container) {
    let tab = "timer"; // timer | stats
    let selectedMinutes = Number(state.preferences?.defaultFocusMinutes || APP_CONFIG.defaults.focus.focusMinutes);
    let selectedMode = "focus";
    let selectedQuality = 4;

    const renderView = () => {
      const sess = state.activeSession;
      const prefs = state.preferences || {};
      const seriousMode = Boolean(prefs.seriousMode);
      const cycles = Number(prefs.pomodoroCyclesCompleted || 0);
      const remaining = sess ? computeRemainingSeconds(sess) : selectedMinutes * 60;
      const total = sess ? sess.targetSeconds : selectedMinutes * 60;
      const pct = total > 0 ? Math.min(100, Math.max(0, ((total - remaining) / total) * 100)) : 0;
      const dashOffset = (282.7 * (1 - pct / 100)).toFixed(1);

      const today = todayIsoDate();
      const todayRecords = state.localStudyRecords.filter((r) => r.date === today && r.mode === "focus");
      const todayMinutes = summarizeFocusMinutes(state.localStudyRecords, today).totalMinutes;
      const todayCredits = todayRecords.reduce((sum, r) => sum + (r.creditsAwarded || 0), 0);

      const pendingRecord = state.pendingCheckInRecordId
        ? state.localStudyRecords.find((r) => r.id === state.pendingCheckInRecordId)
        : null;
      const nextStep = !sess ? state.pendingNextPomodoroStep : null;

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <nav class="sprk-tabs sprk-tabs-clock" style="margin:0;" role="tablist">
            <button type="button" class="sprk-tab ${tab === "timer" ? "is-active" : ""}" data-ftab="timer">${seriousMode ? "Timer" : "◔ Timer"}</button>
            <button type="button" class="sprk-tab ${tab === "stats" ? "is-active" : ""}" data-ftab="stats">${seriousMode ? "Today" : "📊 Today"}</button>
          </nav>
          <div class="sprk-badge-row">
            <span class="sprk-badge-chip tabular-nums">Cycles: ${cycles}</span>
            <span class="sprk-badge-chip tabular-nums">${seriousMode ? `${todayMinutes}m` : `⏱ ${todayMinutes}m`}</span>
            <span class="sprk-badge-chip sprk-gamified">${state.user ? (seriousMode ? `+${todayCredits} SC` : `🪙 +${todayCredits} SC`) : (seriousMode ? "Local" : "💾 Local")}</span>
          </div>
        </div>

        ${tab === "timer" ? `
          ${pendingRecord ? `
            <div class="sprk-card" style="margin-bottom:12px;border-color:var(--accent);" id="focus-checkin-card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <strong style="font-size:13.5px;">Post-Session Check-In</strong>
                <span class="sprk-meta tabular-nums">${formatDuration(pendingRecord.durationSeconds || 0)}${pendingRecord.interruptions ? ` · ${pendingRecord.interruptions} switches` : ""}</span>
              </div>
              <label class="sprk-field" style="margin-bottom:8px;">
                <span class="sprk-label">Session Name</span>
                <input id="checkin-session-name" class="sprk-input" type="text" maxlength="48" value="${escapeHtml(pendingRecord.subject || "General Study")}" placeholder="e.g. General Study" />
              </label>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                <span class="sprk-label" style="margin-right:4px;">Focus Quality:</span>
                ${[1, 2, 3, 4, 5].map((q) => `
                  <button type="button" class="sprk-btn ${selectedQuality === q ? "sprk-btn-primary" : ""}" data-checkin-q="${q}" style="min-height:30px;padding:3px 10px;">
                    ${q}
                  </button>
                `).join("")}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <input id="checkin-reflection" class="sprk-input" type="text" maxlength="140" placeholder="One takeaway or blocker resolved..." style="flex:1;min-width:180px;" />
                <button type="button" class="sprk-btn sprk-btn-primary" id="checkin-save-btn" style="min-height:36px;">Save</button>
                <button type="button" class="sprk-btn" id="checkin-skip-btn" style="min-height:36px;">Dismiss</button>
              </div>
            </div>
          ` : ""}

          ${nextStep ? `
            <div class="sprk-notice" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
              <div>
                <strong>Auto-Cycle Ready:</strong> ${escapeHtml(nextStep.label)}
              </div>
              <div style="display:flex;gap:6px;">
                <button type="button" class="sprk-btn sprk-btn-primary" id="focus-start-next-cycle" style="min-height:32px;padding:4px 12px;">Start ${escapeHtml(nextStep.label)}</button>
                <button type="button" class="sprk-btn" id="focus-dismiss-next-cycle" style="min-height:32px;padding:4px 10px;">Dismiss</button>
              </div>
            </div>
          ` : ""}

          <div class="sprk-tabs sprk-tabs-clock" role="tablist" aria-label="Timer preset">
            <button type="button" class="sprk-tab ${!sess && selectedMode === "focus" && selectedMinutes === 25 ? "is-active" : ""}" data-preset="focus:25">Focus · 25m</button>
            <button type="button" class="sprk-tab ${!sess && selectedMode === "focus" && selectedMinutes === 50 ? "is-active" : ""}" data-preset="focus:50">Deep · 50m</button>
            <button type="button" class="sprk-tab ${!sess && selectedMode === "short_break" ? "is-active" : ""}" data-preset="short_break:5">Break · 5m</button>
            <button type="button" class="sprk-tab ${!sess && selectedMode === "long_break" ? "is-active" : ""}" data-preset="long_break:15">Rest · 15m</button>
          </div>

          <div class="sprk-card" style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px 16px;">
            <div style="position:relative;width:154px;height:154px;display:grid;place-items:center;">
              <svg viewBox="0 0 100 100" width="154" height="154" aria-hidden="true">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(52,44,37,0.12)" stroke-width="6" />
                <circle id="focus-ring-progress" cx="50" cy="50" r="45" fill="none" stroke="var(--accent)" stroke-width="6"
                  stroke-linecap="round" stroke-dasharray="282.7" stroke-dashoffset="${dashOffset}"
                  transform="rotate(-90 50 50)" />
              </svg>
              <div style="position:absolute;text-align:center;">
                <div class="tabular-nums" id="focus-readout" style="font-size:30px;font-weight:700;line-height:1;">${formatDuration(remaining)}</div>
                <div class="sprk-meta" style="justify-content:center;margin-top:4px;">
                  <span id="focus-state-label">${escapeHtml(sess ? (sess.status === "paused" ? "Paused" : (sess.mode === "focus" ? "Focus" : "Break")) : "Ready")}</span>
                </div>
              </div>
            </div>

            ${!sess ? `
              <div class="sprk-grid-3" style="width:100%;">
                <label class="sprk-field" style="margin:0;">
                  <span class="sprk-label">Subject</span>
                  <input id="focus-subject" class="sprk-input" type="text" maxlength="40" value="General Study" />
                </label>
                <label class="sprk-field" style="margin:0;">
                  <span class="sprk-label">Minutes</span>
                  <input id="focus-custom-mins" class="sprk-input tabular-nums" type="number" min="1" max="180" value="${selectedMinutes}" />
                </label>
                <label class="sprk-field" style="margin:0;">
                  <span class="sprk-label">Mode</span>
                  <select id="focus-scope" class="sprk-select">
                    <option value="personal">Solo</option>
                    <option value="friends">Friends</option>
                    <option value="group">Group</option>
                  </select>
                </label>
              </div>
              <button type="button" class="sprk-btn sprk-btn-primary" id="focus-start-btn" style="min-width:190px;">${seriousMode ? "Start Focus" : "▶ Start Focus"}</button>
            ` : `
              <div class="sprk-badge-row">
                <span class="sprk-badge-chip">${escapeHtml(sess.subject)}</span>
                <span class="sprk-badge-chip">${escapeHtml(sess.scope)}</span>
                <span class="sprk-badge-chip tabular-nums" id="focus-elapsed-chip">${formatDuration(computeElapsedActiveSeconds(sess))}</span>
                ${prefs.strictFocusLock && sess.mode === "focus" ? `<span class="sprk-badge-chip tabular-nums">Strict Lock · ${sess.interruptions || 0} switches</span>` : ""}
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                ${sess.status === "running"
                  ? `<button type="button" class="sprk-btn" id="focus-pause-btn">${seriousMode ? "Pause" : "⏸ Pause"}</button>`
                  : `<button type="button" class="sprk-btn sprk-btn-primary" id="focus-resume-btn">${seriousMode ? "Resume" : "▶ Resume"}</button>`}
                <button type="button" class="sprk-btn sprk-btn-primary" id="focus-finish-btn">${seriousMode ? "Finish" : "✓ Finish"}</button>
                <button type="button" class="sprk-btn" id="focus-reset-btn">${seriousMode ? "Discard" : "✕ Discard"}</button>
              </div>
            `}
          </div>
        ` : `
          <div class="sprk-grid-3" style="margin-bottom:12px;">
            <div class="sprk-card">
              <div class="sprk-label">Today</div>
              <div class="tabular-nums" style="font-size:22px;font-weight:700;margin-top:4px;">${todayMinutes}m</div>
            </div>
            <div class="sprk-card">
              <div class="sprk-label">Sessions</div>
              <div class="tabular-nums" style="font-size:22px;font-weight:700;margin-top:4px;">${todayRecords.length}</div>
            </div>
            <div class="sprk-card">
              <div class="sprk-label">Pomodoro Cycles</div>
              <div class="tabular-nums" style="font-size:22px;font-weight:700;margin-top:4px;">${cycles}</div>
            </div>
          </div>
          <div style="display:grid;gap:8px;">
            ${todayRecords.length === 0 ? `<div class="sprk-empty">No sessions today yet.</div>` : todayRecords.slice(0, 8).map((r) => `
              <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <div>
                  <strong>${escapeHtml(r.subject || "General Study")}</strong>
                  <div class="sprk-meta">
                    ${r.focusQuality ? `<span>Quality ${r.focusQuality}/5</span>` : ""}
                    ${r.interruptions ? `<span>· ${r.interruptions} switches</span>` : ""}
                  </div>
                </div>
                <span class="tabular-nums sprk-badge-chip">${formatDuration(r.durationSeconds || 0)}</span>
              </div>
            `).join("")}
          </div>
        `}

        <p id="focus-feedback" class="sprk-meta" role="status" aria-live="polite" style="margin-top:8px;"></p>
      `;

      container.querySelectorAll("[data-ftab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.ftab;
          renderView();
        });
      });

      container.querySelectorAll("[data-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (state.activeSession) return;
          const [mode, mins] = btn.dataset.preset.split(":");
          selectedMode = mode;
          selectedMinutes = Number(mins);
          renderView();
        });
      });

      container.querySelectorAll("[data-checkin-q]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedQuality = Number(btn.dataset.checkinQ);
          renderView();
        });
      });

      container.querySelector("#checkin-save-btn")?.addEventListener("click", async () => {
        const sessionName = container.querySelector("#checkin-session-name")?.value.trim() || "General Study";
        const note = container.querySelector("#checkin-reflection")?.value.trim() || "";
        const targetId = state.pendingCheckInRecordId;
        const nextRecords = state.localStudyRecords.map((r) =>
          r.id === targetId ? { ...r, subject: sessionName, focusQuality: selectedQuality, reflection: note } : r
        );
        persistLocalCollection("localStudyRecords", nextRecords);
        await updateFocusSessionSubject(targetId, sessionName);
        state.pendingCheckInRecordId = null;
        renderView();
      });

      container.querySelector("#checkin-skip-btn")?.addEventListener("click", () => {
        state.pendingCheckInRecordId = null;
        renderView();
      });

      container.querySelector("#focus-start-next-cycle")?.addEventListener("click", () => {
        if (!state.pendingNextPomodoroStep) return;
        const step = state.pendingNextPomodoroStep;
        const newSess = createFocusSession({
          id: generateId("focus"),
          mode: step.nextMode,
          targetSeconds: step.nextMinutes * 60,
          scope: "personal",
          subject: step.nextMode === "focus" ? (step.subject || "General Study") : step.label
        });
        state.pendingNextPomodoroStep = null;
        persistLocalCollection("activeSession", newSess);
        updateClockVisualAndWhisper();
        renderView();
      });

      container.querySelector("#focus-dismiss-next-cycle")?.addEventListener("click", () => {
        state.pendingNextPomodoroStep = null;
        renderView();
      });

      container.querySelector("#focus-custom-mins")?.addEventListener("change", (e) => {
        const val = Math.min(180, Math.max(1, Number(e.target.value) || 25));
        selectedMinutes = val;
        e.target.value = String(val);
        const readout = container.querySelector("#focus-readout");
        if (readout && !state.activeSession) readout.textContent = formatDuration(val * 60);
      });

      container.querySelector("#focus-start-btn")?.addEventListener("click", async () => {
        const subject = container.querySelector("#focus-subject")?.value.trim() || "General Study";
        const mins = Math.min(180, Math.max(1, Number(container.querySelector("#focus-custom-mins")?.value) || selectedMinutes));
        const scope = container.querySelector("#focus-scope")?.value || "personal";
        const newSess = createFocusSession({
          id: generateId("focus"),
          mode: selectedMode,
          targetSeconds: mins * 60,
          scope,
          subject
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
        updateClockVisualAndWhisper();
        renderView();
      });

      container.querySelector("#focus-pause-btn")?.addEventListener("click", () => {
        persistLocalCollection("activeSession", pauseFocusSession(state.activeSession, Date.now(), "manual"));
        updateClockVisualAndWhisper();
        renderView();
      });

      container.querySelector("#focus-resume-btn")?.addEventListener("click", () => {
        persistLocalCollection("activeSession", resumeFocusSession(state.activeSession, Date.now()));
        updateClockVisualAndWhisper();
        renderView();
      });

      container.querySelector("#focus-finish-btn")?.addEventListener("click", async () => {
        const rec = await finishActiveFocusSession({ autoCompleted: false });
        renderView();
        const fb = container.querySelector("#focus-feedback");
        if (fb && rec) {
          fb.textContent = `Logged ${formatDuration(rec.durationSeconds)} · ${rec.subject}${rec.creditsAwarded ? ` (+${rec.creditsAwarded} SC)` : ""}`;
        }
      });

      container.querySelector("#focus-reset-btn")?.addEventListener("click", () => {
        persistLocalCollection("activeSession", null);
        updateClockVisualAndWhisper();
        renderView();
      });
    };

    renderView();
    const interval = window.setInterval(() => {
      const sess = state.activeSession;
      if (!sess || sess.status !== "running") return;
      const remaining = computeRemainingSeconds(sess);
      const total = Math.max(1, Number(sess.targetSeconds || 1500));
      const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
      const dashOffset = (282.7 * (1 - pct / 100)).toFixed(1);

      const readout = container.querySelector("#focus-readout");
      const ringEl = container.querySelector("#focus-ring-progress");
      const elapsedEl = container.querySelector("#focus-elapsed-chip");
      const stateEl = container.querySelector("#focus-state-label");
      if (readout) readout.textContent = formatDuration(remaining);
      if (ringEl) ringEl.setAttribute("stroke-dashoffset", dashOffset);
      if (elapsedEl) elapsedEl.textContent = formatDuration(computeElapsedActiveSeconds(sess));
      if (stateEl) stateEl.textContent = sess.mode === "focus" ? "Focus" : "Break";
    }, 1000);

    return () => clearInterval(interval);
  }
};
