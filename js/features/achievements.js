// Trophy -> Verified Achievements & Study Passport
import { state } from "../state.js";
import { computeStudyStreaks } from "../utils/timer-math.js";
import { escapeHtml, formatMinutesLabel, todayIsoDate } from "../utils/dom.js";

const ACHIEVEMENT_DEFS = [
  { id: "first_focus", title: "First Spark", description: "Complete your first verified focus session (>= 5m).", rewardSc: 10 },
  { id: "morning_bird", title: "Morning Bird", description: "Complete a focus session before 9:00 AM.", rewardSc: 15 },
  { id: "night_owl", title: "Night Owl", description: "Complete a focus session after 9:00 PM.", rewardSc: 15 },
  { id: "streak_7", title: "Seven-Day Rhythm", description: "Maintain a verified 7-day study streak.", rewardSc: 30 },
  { id: "focus_master", title: "Focus Craftsman", description: "Accumulate 10 hours of verified focus time.", rewardSc: 40 }
];

export const achievementsFeature = {
  skin: "achievements",
  eyebrow: "SHELF TROPHY · STUDY PASSPORT",
  title: "Achievements & Study Passport",
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

    container.innerHTML = `
      <div class="sprk-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <div class="sprk-label">Study Passport</div>
            <strong style="font-size:18px;">${escapeHtml(state.user?.displayName || state.preferences.localDisplayName || "Local Student")}</strong>
          </div>
          <div class="sprk-meta tabular-nums">
            <span>${formatMinutesLabel(totalMins)} verified</span>
            <span aria-hidden="true">·</span>
            <span>${streaks.longestStreak}d best streak</span>
            <span aria-hidden="true">·</span>
            <span>${computedUnlock.size} / ${ACHIEVEMENT_DEFS.length} badges</span>
          </div>
        </div>
      </div>

      <div class="sprk-grid-2">
        ${ACHIEVEMENT_DEFS.map((a) => {
          const unlocked = computedUnlock.has(a.id);
          return `
            <div class="sprk-card" style="${unlocked ? "border-color:var(--accent);" : "opacity:0.78;"}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong style="font-size:14px;">${escapeHtml(a.title)}</strong>
                <span class="sprk-meta tabular-nums">${unlocked ? "Unlocked" : `+${a.rewardSc} SC`}</span>
              </div>
              <p style="margin:0;font-size:12px;color:var(--muted);">${escapeHtml(a.description)}</p>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
};
