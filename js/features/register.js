// Hourglass -> Study Register & Manual Descriptive Study Records (0 SC)
import { state, persistLocalCollection } from "../state.js";
import { escapeHtml, formatDuration, todayIsoDate, generateId } from "../utils/dom.js";

export const registerFeature = {
  skin: "register",
  eyebrow: "HOURGLASS · STUDY REGISTER",
  title: "Study Register & Session Log",
  icon: "⧖",
  render(container, { rerender }) {
    const records = state.localStudyRecords || [];

    container.innerHTML = `
      <form id="manual-record-form" class="sprk-card" style="margin-bottom:16px;">
        <div class="sprk-meta" style="margin-bottom:10px;">
          <strong>Log Descriptive Study Record</strong>
          <span aria-hidden="true">·</span>
          <span>Manual logs never mint Study Credits (0 SC)</span>
        </div>
        <div class="sprk-grid-3">
          <label class="sprk-field">
            <span class="sprk-label">Subject / Topic</span>
            <input id="reg-subject" class="sprk-input" type="text" required maxlength="60" placeholder="Linear Algebra Ch. 3" />
          </label>
          <label class="sprk-field">
            <span class="sprk-label">Duration (minutes)</span>
            <input id="reg-minutes" class="sprk-input tabular-nums" type="number" min="1" max="480" value="30" required />
          </label>
          <label class="sprk-field">
            <span class="sprk-label">Date</span>
            <input id="reg-date" class="sprk-input" type="date" value="${todayIsoDate()}" required />
          </label>
        </div>
        <button type="submit" class="sprk-btn sprk-btn-primary">Add Manual Record</button>
      </form>

      <h2 style="font-size:15px;margin:0 0 10px;">Recorded Sessions (${records.length})</h2>
      ${records.length === 0 ? `
        <div class="sprk-empty">No study sessions recorded yet. Start the wall clock or add a manual note above.</div>
      ` : `
        <div style="display:grid;gap:8px;">
          ${records.slice(0, 30).map((r) => `
            <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
              <div>
                <div style="font-weight:700;font-size:14px;">${escapeHtml(r.subject || "General Study")}</div>
                <div class="sprk-meta">
                  <span>${escapeHtml(r.date || "")}</span>
                  <span aria-hidden="true">·</span>
                  <span>${r.isManual ? "Manual Note (0 SC)" : "Timer Session"}</span>
                </div>
              </div>
              <div style="text-align:right;">
                <div class="tabular-nums" style="font-weight:700;">${formatDuration(r.durationSeconds || 0)}</div>
                <div class="sprk-meta tabular-nums">${r.creditsAwarded ? `+${r.creditsAwarded} SC` : "0 SC"}</div>
              </div>
            </div>
          `).join("")}
        </div>
      `}
    `;

    container.querySelector("#manual-record-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const subject = container.querySelector("#reg-subject").value.trim();
      const mins = Math.min(480, Math.max(1, Number(container.querySelector("#reg-minutes").value) || 30));
      const date = container.querySelector("#reg-date").value || todayIsoDate();
      if (!subject) return;

      const rec = {
        id: generateId("manual"),
        date,
        mode: "focus",
        subject,
        durationSeconds: mins * 60,
        creditsAwarded: 0,
        isManual: true,
        startedAt: new Date().toISOString()
      };
      persistLocalCollection("localStudyRecords", [rec, ...state.localStudyRecords]);
      rerender();
    });
  }
};
