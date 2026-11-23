// Shelf Trophy -> Visual Medals & Study Passport
import { state } from "../state.js";
import { computeStudyStreaks } from "../utils/timer-math.js";
import { escapeHtml, formatMinutesLabel, todayIsoDate } from "../utils/dom.js";

const ACHIEVEMENT_DEFS = [
  { id: "first_focus", title: "First Spark", rule: "5m+ focus", icon: "✨", rewardSc: 10 },
  { id: "morning_bird", title: "Morning Bird", rule: "Before 9 AM", icon: "🌅", rewardSc: 15 },
  { id: "night_owl", title: "Night Owl", rule: "After 9 PM", icon: "🦉", rewardSc: 15 },
  { id: "streak_7", title: "7-Day Rhythm", rule: "7d streak", icon: "🔥", rewardSc: 30 },
  { id: "focus_master", title: "Focus Craftsman", rule: "10h total", icon: "🏆", rewardSc: 40 }
];

export const achievementsFeature = {
  skin: "achievements",
  eyebrow: "",
  title: "Shelf Trophy",
  icon: "🏆",
  render(container) {
    const verifiedRecords = (state.localStudyRecords || []).filter((r) => !r.isManual && (r.mode || "focus") === "focus");
    const totalMins = Math.round(verifiedRecords.reduce((a, b) => a + (b.durationSeconds || 0), 0) / 60);
    const streaks = computeStudyStreaks(verifiedRecords, todayIsoDate());

    const computedUnlock = new Set(state.unlockedAchievementIds || []);
    if (verifiedRecords.some((r) => (r.durationSeconds || 0) >= 300)) computedUnlock.add("first_focus");
    if (streaks.longestStreak >= 7) computedUnlock.add("streak_7");
    if (totalMins >= 600) computedUnlock.add("focus_master");
    for (const r of verifiedRecords) {
      const hour = new Date(r.startedAt || Date.now()).getHours();
      if (hour < 9) computedUnlock.add("morning_bird");
      if (hour >= 21) computedUnlock.add("night_owl");
    }

    const pct = Math.round((computedUnlock.size / ACHIEVEMENT_DEFS.length) * 100);

    container.innerHTML = `
      <div class="sprk-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
          <strong style="font-size:17px;">${escapeHtml(state.user?.displayName || state.preferences.localDisplayName || "Local Student")}</strong>
          <div class="sprk-badge-row">
            <span class="sprk-badge-chip tabular-nums">⏱ ${formatMinutesLabel(totalMins)}</span>
            <span class="sprk-badge-chip tabular-nums">🔥 ${streaks.longestStreak}d</span>
            <span class="sprk-badge-chip tabular-nums">🏆 ${computedUnlock.size}/${ACHIEVEMENT_DEFS.length}</span>
          </div>
        </div>
        <div style="height:8px;border-radius:99px;background:rgba(52,44,37,0.12);overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:var(--accent);"></div>
        </div>
      </div>

      <div class="sprk-grid-2">
        ${ACHIEVEMENT_DEFS.map((a) => {
          const unlocked = computedUnlock.has(a.id);
          return `
            <div class="sprk-card" style="display:flex;align-items:center;gap:12px;${unlocked ? "border-color:var(--accent);" : "opacity:0.74;"}">
              <div class="sprk-env-swatch" style="background:${unlocked ? "#fff3c4" : "#eee8dc"};flex-shrink:0;" aria-hidden="true">
                ${unlocked ? a.icon : "🔒"}
              </div>
              <div style="min-width:0;flex:1;">
                <strong style="font-size:13.5px;display:block;">${escapeHtml(a.title)}</strong>
                <div class="sprk-meta tabular-nums" style="margin-top:3px;">
                  <span>${escapeHtml(a.rule)}</span>
                  <span aria-hidden="true">·</span>
                  <span>${unlocked ? "✓ Unlocked" : `+${a.rewardSc} SC`}</span>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
};
