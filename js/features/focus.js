// Wall Clock -> Focus Timer with timestamp recovery & idle detection
import { APP_CONFIG } from "../../config.js";
import { state, persistLocalCollection } from "../state.js";
import { bus } from "../core/event-bus.js";
import { audioManager } from "../core/audio-manager.js";
import {
  createFocusSession,
  computeElapsedActiveSeconds,
  computeRemainingSeconds,
  pauseFocusSession,
  resumeFocusSession,
  completeFocusSession,
  calculateStudyCreditsForSession
} from "../utils/timer-math.js";
import { escapeHtml, formatDuration, todayIsoDate, generateId } from "../utils/dom.js";
import { completeServerFocusSession } from "../services/economy-service.js";
import { supabase } from "../services/supabase.js";

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
  const label = sess.status === "paused" ? "Paused" : "Focus";
  whisper.hidden = false;
  whisper.textContent = `${label} · ${formatDuration(remaining)} · ${sess.subject}`;
}

export function initFocusBackgroundLoop() {
  updateClockVisualAndWhisper();
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
  if (!sess) return null;
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
    startedAt: new Date(completed.startedAtMs).toISOString()
  };

  persistLocalCollection("localStudyRecords", [record, ...state.localStudyRecords]);
  persistLocalCollection("activeSession", null);
  updateClockVisualAndWhisper();
  if (autoCompleted) audioManager.playChime("complete");
  bus.emit("focus:completed", record);
  return record;
}

export const focusFeature = {
  skin: "focus",
  eyebrow: "WALL CLOCK · POMODORO & DEEP FOCUS",
  title: "Focus Timer",
  icon: "◔",
  render(container, { rerender }) {
    let selectedMinutes = APP_CONFIG.defaults.focus.focusMinutes;
    let selectedMode = "focus";

    const renderView = () => {
      const sess = state.activeSession;
      const remaining = sess ? computeRemainingSeconds(sess) : selectedMinutes * 60;
      const total = sess ? sess.targetSeconds : selectedMinutes * 60;
      const pct = total > 0 ? Math.min(100, Math.max(0, ((total - remaining) / total) * 100)) : 0;
      const dashOffset = (282.7 * (1 - pct / 100)).toFixed(1);

      const today = todayIsoDate();
      const todayMinutes = Math.round(
        state.localStudyRecords
          .filter((r) => r.date === today && r.mode === "focus")
          .reduce((sum, r) => sum + (r.durationSeconds || 0), 0) / 60
      );

      container.innerHTML = `
        <div class="sprk-tabs" role="tablist" aria-label="Timer preset">
          <button type="button" class="sprk-tab ${!sess && selectedMode === "focus" && selectedMinutes === 25 ? "is-active" : ""}" data-preset="focus:25">Focus · 25m</button>
          <button type="button" class="sprk-tab ${!sess && selectedMode === "focus" && selectedMinutes === 50 ? "is-active" : ""}" data-preset="focus:50">Deep · 50m</button>
          <button type="button" class="sprk-tab ${!sess && selectedMode === "short_break" ? "is-active" : ""}" data-preset="short_break:5">Short Break · 5m</button>
          <button type="button" class="sprk-tab ${!sess && selectedMode === "long_break" ? "is-active" : ""}" data-preset="long_break:15">Long Break · 15m</button>
        </div>

        <div class="sprk-card" style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:22px 16px;margin-bottom:14px;">
          <div style="position:relative;width:154px;height:154px;display:grid;place-items:center;">
            <svg viewBox="0 0 100 100" width="154" height="154" aria-hidden="true">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(52,44,37,0.12)" stroke-width="6" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent)" stroke-width="6"
                stroke-linecap="round" stroke-dasharray="282.7" stroke-dashoffset="${dashOffset}"
                transform="rotate(-90 50 50)" />
            </svg>
            <div style="position:absolute;text-align:center;">
              <div class="tabular-nums" id="focus-readout" style="font-size:30px;font-weight:700;line-height:1;">${formatDuration(remaining)}</div>
              <div class="sprk-meta" style="justify-content:center;margin-top:4px;">
                <span>${escapeHtml(sess ? (sess.status === "paused" ? "Paused" : "Running") : "Ready")}</span>
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
                <span class="sprk-label">Custom Minutes</span>
                <input id="focus-custom-mins" class="sprk-input tabular-nums" type="number" min="1" max="180" value="${selectedMinutes}" />
              </label>
              <label class="sprk-field" style="margin:0;">
                <span class="sprk-label">Session Mode</span>
                <select id="focus-scope" class="sprk-select">
                  <option value="personal">Solo Desk</option>
                  <option value="friends">With Friends</option>
                  <option value="group">Study Group</option>
                </select>
              </label>
            </div>
            <button type="button" class="sprk-btn sprk-btn-primary" id="focus-start-btn" style="min-width:190px;">Start Focus Session</button>
          ` : `
            <div class="sprk-meta">
              <span>${escapeHtml(sess.subject)}</span>
              <span aria-hidden="true">·</span>
              <span>${escapeHtml(sess.scope)}</span>
              <span aria-hidden="true">·</span>
              <span class="tabular-nums">${formatDuration(computeElapsedActiveSeconds(sess))} elapsed</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
              ${sess.status === "running"
                ? `<button type="button" class="sprk-btn" id="focus-pause-btn">Pause</button>`
                : `<button type="button" class="sprk-btn sprk-btn-primary" id="focus-resume-btn">Resume</button>`}
              <button type="button" class="sprk-btn sprk-btn-primary" id="focus-finish-btn">Finish & Log</button>
              <button type="button" class="sprk-btn" id="focus-reset-btn">Discard</button>
            </div>
          `}
        </div>

        <div class="sprk-notice">
          <strong>Today's Focus:</strong> <span class="tabular-nums">${todayMinutes} min</span> logged
          <span aria-hidden="true"> · </span>
          ${state.user
            ? "Verified sessions >= 5m earn server-validated Study Credits."
            : "Local browser mode: sessions save locally. Sign in with Supabase to mint verified Study Credits."}
        </div>
        <p id="focus-feedback" class="sprk-meta" role="status" aria-live="polite" style="margin-top:8px;"></p>
      `;

      container.querySelectorAll("[data-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (state.activeSession) return;
          const [mode, mins] = btn.dataset.preset.split(":");
          selectedMode = mode;
          selectedMinutes = Number(mins);
          renderView();
        });
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

        if (supabase.configured && state.user?.id) {
          const { data } = await supabase.insert("focus_sessions", {
            user_id: state.user.id,
            mode: newSess.mode,
            scope: newSess.scope,
            subject: newSess.subject,
            target_seconds: newSess.targetSeconds,
            status: "running"
          });
          if (data?.[0]?.id) newSess.serverSessionId = data[0].id;
        }

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
        rerender();
        const fb = container.querySelector("#focus-feedback");
        if (fb && rec) {
          fb.textContent = `Logged ${formatDuration(rec.durationSeconds)} of ${rec.subject}${rec.creditsAwarded ? ` (+${rec.creditsAwarded} SC)` : ""}.`;
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
      if (!state.activeSession || state.activeSession.status !== "running") return;
      const readout = container.querySelector("#focus-readout");
      if (readout) readout.textContent = formatDuration(computeRemainingSeconds(state.activeSession));
    }, 1000);

    return () => clearInterval(interval);
  }
};
