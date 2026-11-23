// Hourglass -> Study Register & Session History Tabs
import { state, persistLocalCollection } from "../state.js";
import { escapeHtml, formatDuration, todayIsoDate, generateId } from "../utils/dom.js";
import { syncManualStudyRecord } from "../services/database-service.js";

export const registerFeature = {
  skin: "register",
  eyebrow: "",
  title: "Hourglass",
  icon: "⧖",
  render(container) {
    let tab = "history"; // history | log

    const renderView = () => {
      const records = state.localStudyRecords || [];

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <nav class="sprk-tabs sprk-tabs-clock" style="margin:0;" role="tablist">
            <button type="button" class="sprk-tab ${tab === "history" ? "is-active" : ""}" data-rtab="history">⧖ History (${records.length})</button>
            <button type="button" class="sprk-tab ${tab === "log" ? "is-active" : ""}" data-rtab="log">+ Log Study</button>
          </nav>
          <span class="sprk-badge-chip">⏳ Manual = 0 SC</span>
        </div>

        ${tab === "log" ? `
          <form id="manual-record-form" class="sprk-card">
            <div class="sprk-grid-3">
              <label class="sprk-field">
                <span class="sprk-label">Subject</span>
                <input id="reg-subject" class="sprk-input" type="text" required maxlength="60" placeholder="Linear Algebra" />
              </label>
              <label class="sprk-field">
                <span class="sprk-label">Minutes</span>
                <input id="reg-minutes" class="sprk-input tabular-nums" type="number" min="1" max="480" value="30" required />
              </label>
              <label class="sprk-field">
                <span class="sprk-label">Date</span>
                <input id="reg-date" class="sprk-input" type="date" value="${todayIsoDate()}" required />
              </label>
            </div>
            <button type="submit" class="sprk-btn sprk-btn-primary">+ Add Record</button>
          </form>
        ` : `
          ${records.length === 0 ? `
            <div class="sprk-empty">No sessions logged yet.</div>
          ` : `
            <div style="display:grid;gap:8px;">
              ${records.slice(0, 30).map((r) => `
                <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                  <div>
                    <div style="font-weight:700;font-size:14px;">${r.isManual ? "✎" : "◔"} ${escapeHtml(r.subject || "General Study")}</div>
                    <div class="sprk-meta">
                      <span>${escapeHtml(r.date || "")}</span>
                      <span aria-hidden="true">·</span>
                      <span>${r.isManual ? "Manual" : "Timer"}</span>
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div class="tabular-nums" style="font-weight:700;">${formatDuration(r.durationSeconds || 0)}</div>
                    <div class="sprk-meta tabular-nums" style="justify-content:flex-end;">${r.creditsAwarded ? `+${r.creditsAwarded} SC` : "0 SC"}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        `}
      `;

      container.querySelectorAll("[data-rtab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.rtab;
          renderView();
        });
      });

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
        syncManualStudyRecord(rec);
        tab = "history";
        renderView();
      });
    };

    renderView();
  }
};
