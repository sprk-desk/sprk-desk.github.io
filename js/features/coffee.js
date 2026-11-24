// Coffee Mug -> Cozy Hydration, Sip Cue & Pomodoro Break Starter
import { audioManager } from "../core/audio-manager.js";
import { dialogManager } from "../core/dialog-manager.js";
import { state, persistLocalCollection } from "../state.js";
import { createFocusSession } from "../utils/timer-math.js";
import { generateId } from "../utils/dom.js";

const BREWS = [
  { id: "matcha", icon: "🍵", label: "Warm Matcha" },
  { id: "espresso", icon: "☕", label: "Oat Latte" },
  { id: "chamomile", icon: "🌼", label: "Chamomile" },
  { id: "cocoa", icon: "🍫", label: "Spiced Cocoa" }
];

export const coffeeFeature = {
  skin: "coffee",
  eyebrow: "",
  title: "Coffee Mug",
  icon: "☕",
  render(container) {
    let selectedBrew = BREWS[1].id;
    let countdown = 0;
    let intervalId = null;

    const renderView = () => {
      const seriousMode = Boolean(state.preferences?.seriousMode);
      const cycles = Number(state.preferences?.pomodoroCyclesCompleted || 0);
      const activeBreak = state.activeSession && state.activeSession.mode !== "focus";

      container.innerHTML = `
        <div class="sprk-grid-2" style="margin-bottom:14px;">
          ${BREWS.map((brew) => `
            <button type="button" class="sprk-card" data-brew-id="${brew.id}"
              style="display:flex;align-items:center;gap:10px;cursor:pointer;text-align:left;${selectedBrew === brew.id ? "border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);" : ""}">
              ${seriousMode ? "" : `<span style="font-size:22px;line-height:1;" aria-hidden="true">${brew.icon}</span>`}
              <strong style="font-size:13.5px;">${brew.label}</strong>
            </button>
          `).join("")}
        </div>

        <div class="sprk-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
          <div class="sprk-badge-row">
            <span class="sprk-badge-chip tabular-nums">${countdown > 0 ? `${seriousMode ? "Eye Rest" : "🌬 Breathe"} · ${countdown}s` : (seriousMode ? "20-20-20 Eye Rest" : "💧 20-20-20 Eye Rest")}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="sprk-btn" id="coffee-sip-btn">Take a Sip</button>
            <button type="button" class="sprk-btn sprk-btn-primary" id="coffee-breathe-btn">
              ${countdown > 0 ? "Restart 20s" : "20s Break"}
            </button>
          </div>
        </div>

        <div class="sprk-card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div>
            <strong style="font-size:13.5px;display:block;">Pomodoro Recovery</strong>
            <span class="sprk-meta tabular-nums">${cycles} focus cycle(s) logged${activeBreak ? " · Break running" : ""}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="sprk-btn" id="coffee-break-5" ${state.activeSession ? "disabled" : ""} style="min-height:34px;padding:4px 12px;">5m Short Break</button>
            <button type="button" class="sprk-btn" id="coffee-break-15" ${state.activeSession ? "disabled" : ""} style="min-height:34px;padding:4px 12px;">15m Long Break</button>
          </div>
        </div>
      `;

      container.querySelectorAll("[data-brew-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedBrew = btn.dataset.brewId;
          audioManager.playChime("sip");
          renderView();
        });
      });

      container.querySelector("#coffee-sip-btn")?.addEventListener("click", () => {
        audioManager.playChime("sip");
      });

      container.querySelector("#coffee-breathe-btn")?.addEventListener("click", () => {
        if (intervalId) window.clearInterval(intervalId);
        countdown = 20;
        renderView();
        intervalId = window.setInterval(() => {
          countdown -= 1;
          if (countdown <= 0) {
            countdown = 0;
            window.clearInterval(intervalId);
            intervalId = null;
            audioManager.playChime("focus");
          }
          renderView();
        }, 1000);
      });

      const startBreak = (mins, mode) => {
        if (state.activeSession) return;
        const newSess = createFocusSession({
          id: generateId("break"),
          mode,
          targetSeconds: mins * 60,
          scope: "personal",
          subject: mode === "long_break" ? "Long Break" : "Short Break"
        });
        persistLocalCollection("activeSession", newSess);
        dialogManager.open("focus", document.querySelector(".desk-clock"));
      };

      container.querySelector("#coffee-break-5")?.addEventListener("click", () => startBreak(5, "short_break"));
      container.querySelector("#coffee-break-15")?.addEventListener("click", () => startBreak(15, "long_break"));
    };

    renderView();
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }
};
