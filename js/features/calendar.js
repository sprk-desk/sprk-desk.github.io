// Wall Calendar -> Monthly Calendar, Streaks, and Statistics
import { state } from "../state.js";
import { computeStudyStreaks } from "../utils/timer-math.js";
import { escapeHtml, formatMinutesLabel, todayIsoDate } from "../utils/dom.js";

export const calendarFeature = {
  skin: "calendar",
  eyebrow: "WALL CALENDAR · STREAKS & ANALYTICS",
  title: "Study History & Statistics",
  icon: "▦",
  render(container) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = todayIsoDate(now);
    const records = (state.localStudyRecords || []).filter((r) => (r.mode || "focus") === "focus");

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
      const cls = ["cal-cell", mins > 0 ? "has-study" : "", iso === today ? "is-today" : ""].filter(Boolean).join(" ");
      cells.push(`
        <div class="${cls}" aria-label="${iso}: ${mins} minutes studied">
          <span class="tabular-nums" style="font-weight:700;">${d}</span>
          <span class="tabular-nums" style="color:var(--muted);">${mins > 0 ? formatMinutesLabel(mins) : ""}</span>
        </div>
      `);
    }

    const subjects = Array.from(bySubject.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxSubj = Math.max(1, ...subjects.map((s) => s[1]));

    container.innerHTML = `
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
                <div style="height:8px;border-radius:99px;background:rgba(52,44,37,0.1);overflow:hidden;">
                  <div style="height:100%;width:${Math.round((mins / maxSubj) * 100)}%;background:var(--accent);"></div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
  }
};
