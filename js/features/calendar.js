// Wall Calendar -> Monthly Calendar, Weekly Subject Budgets & Exam Countdowns
import { state, persistLocalCollection } from "../state.js";
import { computeStudyStreaks } from "../utils/timer-math.js";
import { computeSubjectBudgetsProgress, computeExamCountdown } from "../utils/study-tools.js";
import { escapeHtml, formatMinutesLabel, todayIsoDate, generateId } from "../utils/dom.js";

export const calendarFeature = {
  skin: "calendar",
  eyebrow: "WALL CALENDAR · STREAKS & ANALYTICS",
  title: "Study History & Statistics",
  icon: "▦",
  render(container) {
    let tab = "overview"; // overview | budgets | exams

    const renderView = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const today = todayIsoDate(now);
      const records = (state.localStudyRecords || []).filter((r) => (r.mode || "focus") === "focus");
      const exams = state.localExams || [];
      const budgets = state.localSubjectBudgets || [];

      const streaks = computeStudyStreaks(records, today);
      const totalMinutes = Math.round(records.reduce((s, r) => s + (r.durationSeconds || 0), 0) / 60);

      const weekAgo = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
      const weeklyMinutes = Math.round(
        records.filter((r) => r.date >= weekAgo).reduce((s, r) => s + (r.durationSeconds || 0), 0) / 60
      );

      const byDay = new Map();
      const bySubject = new Map();
      for (const r of records) {
        byDay.set(r.date, (byDay.get(r.date) || 0) + Math.round((r.durationSeconds || 0) / 60));
        const subj = r.subject || "General Study";
        bySubject.set(subj, (bySubject.get(subj) || 0) + Math.round((r.durationSeconds || 0) / 60));
      }

      const examDates = new Set(exams.map((ex) => ex.date));
      const firstWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });

      const cells = [];
      for (let i = 0; i < firstWeekday; i += 1) {
        cells.push(`<div class="cal-cell" style="opacity:0.35;background:transparent;" aria-hidden="true"></div>`);
      }
      for (let d = 1; d <= daysInMonth; d += 1) {
        const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const mins = byDay.get(iso) || 0;
        const hasExam = examDates.has(iso);
        const cls = ["cal-cell", mins > 0 ? "has-study" : "", iso === today ? "is-today" : ""].filter(Boolean).join(" ");
        cells.push(`
          <div class="${cls}" aria-label="${iso}: ${mins} minutes studied${hasExam ? ", Exam scheduled" : ""}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="tabular-nums" style="font-weight:700;">${d}</span>
              ${hasExam ? `<span style="font-size:10px;font-weight:700;color:var(--accent);">EXAM</span>` : ""}
            </div>
            <span class="tabular-nums" style="color:var(--muted);">${mins > 0 ? formatMinutesLabel(mins) : ""}</span>
          </div>
        `);
      }

      const subjects = Array.from(bySubject.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const maxSubj = Math.max(1, ...subjects.map((s) => s[1]));
      const budgetProgress = computeSubjectBudgetsProgress(budgets, records, now);

      container.innerHTML = `
        <nav class="sprk-tabs" role="tablist" aria-label="Calendar sections">
          <button type="button" class="sprk-tab ${tab === "overview" ? "is-active" : ""}" data-caltab="overview">Monthly Overview</button>
          <button type="button" class="sprk-tab ${tab === "budgets" ? "is-active" : ""}" data-caltab="budgets">Subject Budgets (${budgets.length})</button>
          <button type="button" class="sprk-tab ${tab === "exams" ? "is-active" : ""}" data-caltab="exams">Exam Countdowns (${exams.length})</button>
        </nav>

        ${tab === "overview" ? `
          <div class="sprk-grid-3" style="margin-bottom:16px;">
            <div class="sprk-card">
              <div class="sprk-label">Total Focus Time</div>
              <div class="tabular-nums" style="font-size:22px;font-weight:700;margin-top:4px;">${formatMinutesLabel(totalMinutes)}</div>
            </div>
            <div class="sprk-card">
              <div class="sprk-label">Last 7 Days</div>
              <div class="tabular-nums" style="font-size:22px;font-weight:700;margin-top:4px;">${formatMinutesLabel(weeklyMinutes)}</div>
            </div>
            <div class="sprk-card">
              <div class="sprk-label">Current / Best Streak</div>
              <div class="tabular-nums" style="font-size:22px;font-weight:700;margin-top:4px;">${streaks.currentStreak}d / ${streaks.longestStreak}d</div>
            </div>
          </div>

          <div class="sprk-card" style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <h2 class="sprk-hand" style="margin:0;font-size:24px;">${escapeHtml(monthName)}</h2>
              <span class="sprk-meta tabular-nums">${streaks.activeDaysCount} active study days</span>
            </div>
            <div class="calendar-grid-ui" style="margin-bottom:6px;text-align:center;font-size:11px;font-weight:700;color:var(--muted);">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="calendar-grid-ui">${cells.join("")}</div>
          </div>

          <div class="sprk-card">
            <h3 style="margin:0 0 10px;font-size:14px;">Subjects</h3>
            ${subjects.length === 0 ? `<div class="sprk-meta">No focus logs yet</div>` : `
              <div style="display:grid;gap:8px;">
                ${subjects.map(([name, mins]) => `
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">
                      <span>${escapeHtml(name)}</span>
                      <span class="tabular-nums">${formatMinutesLabel(mins)}</span>
                    </div>
                    <div class="sprk-progress-track">
                      <div class="sprk-progress-fill" style="width:${Math.round((mins / maxSubj) * 100)}%;"></div>
                    </div>
                  </div>
                `).join("")}
              </div>
            `}
          </div>
        ` : tab === "budgets" ? `
          <form id="budget-add-form" class="sprk-card" style="margin-bottom:14px;">
            <strong style="font-size:13.5px;display:block;margin-bottom:8px;">Set Weekly Subject Hour Target</strong>
            <div class="sprk-grid-2">
              <label class="sprk-field">
                <span class="sprk-label">Subject</span>
                <input id="budget-subject" class="sprk-input" type="text" maxlength="40" placeholder="Linear Algebra" required />
              </label>
              <label class="sprk-field">
                <span class="sprk-label">Weekly Goal (Hours)</span>
                <input id="budget-hours" class="sprk-input tabular-nums" type="number" min="0.5" max="60" step="0.5" value="5" required />
              </label>
            </div>
            <button type="submit" class="sprk-btn sprk-btn-primary" style="min-height:36px;">+ Add Subject Budget</button>
          </form>

          <div style="display:grid;gap:8px;">
            ${budgetProgress.length === 0 ? `<div class="sprk-empty">No weekly subject budgets yet.</div>` : budgetProgress.map((b) => `
              <div class="sprk-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
                  <div>
                    <strong style="font-size:14px;">${escapeHtml(b.subject)}</strong>
                    <div class="sprk-meta tabular-nums">${formatMinutesLabel(b.studiedMinutes)} studied of ${b.targetHoursPerWeek}h goal (${b.pct}%)</div>
                  </div>
                  <button type="button" class="sprk-btn" data-del-budget="${escapeHtml(b.id)}" aria-label="Delete budget" style="min-height:30px;padding:2px 9px;">×</button>
                </div>
                <div class="sprk-progress-track">
                  <div class="sprk-progress-fill" style="width:${b.pct}%;"></div>
                </div>
              </div>
            `).join("")}
          </div>
        ` : `
          <form id="exam-add-form" class="sprk-card" style="margin-bottom:14px;">
            <strong style="font-size:13.5px;display:block;margin-bottom:8px;">+ Add Exam or Deadline Countdown</strong>
            <div class="sprk-grid-3">
              <label class="sprk-field">
                <span class="sprk-label">Exam / Assignment</span>
                <input id="exam-title" class="sprk-input" type="text" maxlength="60" placeholder="Organic Chem Midterm" required />
              </label>
              <label class="sprk-field">
                <span class="sprk-label">Target Date</span>
                <input id="exam-date" class="sprk-input" type="date" value="${today}" required />
              </label>
              <label class="sprk-field">
                <span class="sprk-label">Target Prep (Hours)</span>
                <input id="exam-hours" class="sprk-input tabular-nums" type="number" min="1" max="200" value="12" required />
              </label>
            </div>
            <button type="submit" class="sprk-btn sprk-btn-primary" style="min-height:36px;">Add Countdown</button>
          </form>

          <div style="display:grid;gap:8px;">
            ${exams.length === 0 ? `<div class="sprk-empty">No upcoming exams tracked yet.</div>` : exams.map((ex) => {
              const cd = computeExamCountdown(ex, today);
              return `
                <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                  <div>
                    <strong style="font-size:14.5px;">${escapeHtml(ex.title)}</strong>
                    <div class="sprk-meta tabular-nums">
                      <span>${escapeHtml(ex.date)}</span>
                      <span>·</span>
                      <span>${cd.isPast ? "Completed / Past" : `${cd.daysRemaining} day(s) remaining`}</span>
                      ${cd.suggestedDailyMinutes > 0 ? `<span>· Suggested ${cd.suggestedDailyMinutes}m/day</span>` : ""}
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span class="sprk-badge-chip tabular-nums">${cd.isPast ? "Past" : `D-${cd.daysRemaining}`}</span>
                    <button type="button" class="sprk-btn" data-del-exam="${escapeHtml(ex.id)}" aria-label="Delete exam" style="min-height:30px;padding:2px 9px;">×</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `}
      `;

      container.querySelectorAll("[data-caltab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.caltab;
          renderView();
        });
      });

      container.querySelector("#budget-add-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const subject = container.querySelector("#budget-subject")?.value.trim();
        const targetHoursPerWeek = Number(container.querySelector("#budget-hours")?.value || 5);
        if (!subject) return;
        const next = [
          { id: generateId("budget"), subject, targetHoursPerWeek },
          ...budgets.filter((b) => b.subject.toLowerCase() !== subject.toLowerCase())
        ];
        persistLocalCollection("localSubjectBudgets", next);
        renderView();
      });

      container.querySelectorAll("[data-del-budget]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.delBudget;
          persistLocalCollection("localSubjectBudgets", budgets.filter((b) => b.id !== id));
          renderView();
        });
      });

      container.querySelector("#exam-add-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = container.querySelector("#exam-title")?.value.trim();
        const date = container.querySelector("#exam-date")?.value;
        const targetPrepHours = Number(container.querySelector("#exam-hours")?.value || 10);
        if (!title || !date) return;
        const next = [{ id: generateId("exam"), title, date, targetPrepHours }, ...exams]
          .sort((a, b) => a.date.localeCompare(b.date));
        persistLocalCollection("localExams", next);
        renderView();
      });

      container.querySelectorAll("[data-del-exam]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.delExam;
          persistLocalCollection("localExams", exams.filter((ex) => ex.id !== id));
          renderView();
        });
      });
    };

    renderView();
  }
};
