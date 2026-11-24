// Hourglass -> Study Register, CSV/Markdown Export & Session Quality History
import { state, persistLocalCollection } from "../state.js";
import { escapeHtml, formatDuration, todayIsoDate, generateId, downloadFile } from "../utils/dom.js";
import { formatStudyRecordsCsv, formatStudyRecordsMarkdown } from "../utils/study-tools.js";
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
      const seriousMode = Boolean(state.preferences?.seriousMode);

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <nav class="sprk-tabs sprk-tabs-clock" style="margin:0;" role="tablist">
            <button type="button" class="sprk-tab ${tab === "history" ? "is-active" : ""}" data-rtab="history">${seriousMode ? `History (${records.length})` : `⧖ History (${records.length})`}</button>
            <button type="button" class="sprk-tab ${tab === "log" ? "is-active" : ""}" data-rtab="log">+ Log Study</button>
          </nav>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            ${records.length > 0 ? `
              <button type="button" class="sprk-btn" id="reg-export-csv" style="min-height:30px;padding:3px 10px;font-size:12px;">Export .csv</button>
              <button type="button" class="sprk-btn" id="reg-export-md" style="min-height:30px;padding:3px 10px;font-size:12px;">Export .md</button>
            ` : ""}
            <span class="sprk-badge-chip sprk-gamified">${seriousMode ? "Manual = 0 SC" : "⏳ Manual = 0 SC"}</span>
          </div>
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
                  <div style="min-width:0;">
                    <div style="font-weight:700;font-size:14px;">${seriousMode ? "" : (r.isManual ? "✎ " : "◔ ")}${escapeHtml(r.subject || "General Study")}</div>
                    <div class="sprk-meta">
                      <span>${escapeHtml(r.date || "")}</span>
                      <span aria-hidden="true">·</span>
                      <span>${r.isManual ? "Manual" : "Timer"}</span>
                      ${r.focusQuality ? `<span aria-hidden="true">·</span><span>Quality ${r.focusQuality}/5</span>` : ""}
                      ${r.interruptions ? `<span aria-hidden="true">·</span><span>${r.interruptions} switches</span>` : ""}
                    </div>
                    ${r.reflection ? `<div class="sprk-meta" style="margin-top:3px;">“${escapeHtml(r.reflection)}”</div>` : ""}
                  </div>
                  <div style="text-align:right;flex-shrink:0;">
                    <div class="tabular-nums" style="font-weight:700;">${formatDuration(r.durationSeconds || 0)}</div>
                    <div class="sprk-meta tabular-nums sprk-gamified" style="justify-content:flex-end;">${r.creditsAwarded ? `+${r.creditsAwarded} SC` : "0 SC"}</div>
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

      container.querySelector("#reg-export-csv")?.addEventListener("click", () => {
        downloadFile(`sprk-study-log-${todayIsoDate()}.csv`, formatStudyRecordsCsv(records), "text/csv;charset=utf-8");
      });

      container.querySelector("#reg-export-md")?.addEventListener("click", () => {
        downloadFile(`sprk-study-log-${todayIsoDate()}.md`, formatStudyRecordsMarkdown(records), "text/markdown;charset=utf-8");
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
          interruptions: 0,
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
