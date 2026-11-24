// Shelf Trophy -> Visual Medals & Study Passport
import { state } from "../state.js";
import { ACHIEVEMENT_DEFS, computeUnlockedAchievementIds } from "../utils/study-tools.js";
import { escapeHtml, formatMinutesLabel, todayIsoDate } from "../utils/dom.js";

const ACHIEVEMENT_ICONS = {
  first_focus: "✨",
  morning_bird: "🌅",
  night_owl: "🦉",
  streak_7: "🔥",
  focus_master: "🏆"
};

export const achievementsFeature = {
  skin: "achievements",
  eyebrow: "",
  title: "Shelf Trophy",
  icon: "🏆",
  render(container) {
    const sp = state.spectatingRoom;
    const recordsSource = sp ? (sp.studyRecords || []) : state.localStudyRecords;
    const unlockedSource = sp ? (sp.unlockedAchievementIds || []) : state.unlockedAchievementIds;
    const ownerName = sp
      ? (sp.profile?.displayName || "Student")
      : (state.user?.displayName || state.preferences.localDisplayName || "Local Student");

    const {
      unlocked: computedUnlock,
      verifiedMins: totalMins,
      streaks
    } = computeUnlockedAchievementIds(recordsSource, unlockedSource, todayIsoDate());

    const pct = Math.round((computedUnlock.size / ACHIEVEMENT_DEFS.length) * 100);
    const seriousMode = Boolean(state.preferences?.seriousMode);

    container.innerHTML = `
      <div class="sprk-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
          <div>
            <strong style="font-size:17px;">${escapeHtml(ownerName)}</strong>
            ${sp ? `<div class="sprk-meta">Room owner's milestones &amp; study passport</div>` : ""}
          </div>
          <div class="sprk-badge-row">
            <span class="sprk-badge-chip tabular-nums">${seriousMode ? formatMinutesLabel(totalMins) : `⏱ ${formatMinutesLabel(totalMins)}`}</span>
            <span class="sprk-badge-chip tabular-nums sprk-gamified">${seriousMode ? `${streaks.longestStreak}d streak` : `🔥 ${streaks.longestStreak}d`}</span>
            <span class="sprk-badge-chip tabular-nums sprk-gamified">${seriousMode ? `${computedUnlock.size}/${ACHIEVEMENT_DEFS.length}` : `🏆 ${computedUnlock.size}/${ACHIEVEMENT_DEFS.length}`}</span>
          </div>
        </div>
        <div style="height:8px;border-radius:99px;background:rgba(52,44,37,0.12);overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:var(--accent);"></div>
        </div>
      </div>

      <div class="sprk-grid-2">
        ${ACHIEVEMENT_DEFS.map((a) => {
          const unlocked = computedUnlock.has(a.id);
          const icon = ACHIEVEMENT_ICONS[a.id] || "🏅";
          return `
            <div class="sprk-card" style="display:flex;align-items:center;gap:12px;${unlocked ? "border-color:var(--accent);" : "opacity:0.74;"}">
              <div class="sprk-env-swatch" style="background:${unlocked ? "#fff3c4" : "#eee8dc"};flex-shrink:0;" aria-hidden="true">
                ${seriousMode ? (unlocked ? "✓" : "—") : (unlocked ? icon : "🔒")}
              </div>
              <div style="min-width:0;flex:1;">
                <strong style="font-size:13.5px;display:block;">${escapeHtml(a.title)}</strong>
                <div class="sprk-meta tabular-nums" style="margin-top:3px;">
                  <span>${escapeHtml(a.rule)}</span>
                  <span aria-hidden="true">·</span>
                  <span>${unlocked ? "✓ Unlocked" : "Locked"}</span>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
};
