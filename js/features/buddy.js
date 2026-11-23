// Study Buddy -> Room Guide & Quick Navigation Shortcuts
import { dialogManager } from "../core/dialog-manager.js";
import { state } from "../state.js";

const GUIDE_SPOTS = [
  { feature: "focus", icon: "⏰", label: "Focus Clock" },
  { feature: "tasks", icon: "📌", label: "Pinboard" },
  { feature: "diary", icon: "📓", label: "Notebook" },
  { feature: "audio", icon: "🎧", label: "Headphones" },
  { feature: "shop", icon: "🐦", label: "Bird Shop" },
  { feature: "customization", icon: "🪴", label: "Themes" },
  { feature: "environment", icon: "🪟", label: "Window" },
  { feature: "library", icon: "📚", label: "Bookshelf" },
  { feature: "cabinet", icon: "🗄️", label: "Drawer" },
  { feature: "community", icon: "💻", label: "Study Rooms" },
  { feature: "friends", icon: "📱", label: "Phone" },
  { feature: "achievements", icon: "🏆", label: "Trophy" }
];

export const buddyFeature = {
  skin: "buddy",
  eyebrow: "",
  title: "Study Buddy",
  icon: "🐾",
  render(container) {
    const activeTasks = (state.localTasks || []).filter((t) => !t.completed).length;
    const focusRunning = Boolean(state.activeSession);

    container.innerHTML = `
      <div class="sprk-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
        <div class="sprk-badge-row">
          <span class="sprk-badge-chip">${focusRunning ? "🔥 Focus Active" : "✨ Ready to Study"}</span>
          <span class="sprk-badge-chip">📌 ${activeTasks} Open</span>
        </div>
        <button type="button" class="sprk-btn sprk-btn-primary" id="buddy-jump-rooms" style="min-height:34px;padding:4px 12px;">
          Discover Rooms →
        </button>
      </div>

      <div class="sprk-grid-3">
        ${GUIDE_SPOTS.map((spot) => `
          <button type="button" class="sprk-card" data-buddy-open="${spot.feature}"
            style="display:flex;align-items:center;gap:10px;cursor:pointer;text-align:left;padding:11px 12px;">
            <span style="font-size:20px;line-height:1;" aria-hidden="true">${spot.icon}</span>
            <strong style="font-size:13px;">${spot.label}</strong>
          </button>
        `).join("")}
      </div>
    `;

    container.querySelector("#buddy-jump-rooms")?.addEventListener("click", (e) => {
      dialogManager.open("community", e.currentTarget);
    });

    container.querySelectorAll("[data-buddy-open]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        dialogManager.open(btn.dataset.buddyOpen, e.currentTarget);
      });
    });
  }
};
