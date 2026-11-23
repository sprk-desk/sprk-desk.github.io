// Coffee Mug -> Cozy Hydration, Sip Cue & Micro-Break Rituals
import { audioManager } from "../core/audio-manager.js";

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
      container.innerHTML = `
        <div class="sprk-grid-2" style="margin-bottom:14px;">
          ${BREWS.map((brew) => `
            <button type="button" class="sprk-card" data-brew-id="${brew.id}"
              style="display:flex;align-items:center;gap:10px;cursor:pointer;text-align:left;${selectedBrew === brew.id ? "border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);" : ""}">
              <span style="font-size:22px;line-height:1;" aria-hidden="true">${brew.icon}</span>
              <strong style="font-size:13.5px;">${brew.label}</strong>
            </button>
          `).join("")}
        </div>

        <div class="sprk-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div class="sprk-badge-row">
            <span class="sprk-badge-chip tabular-nums">${countdown > 0 ? `🌬 Breathe · ${countdown}s` : "💧 20-20-20 Eye Rest"}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="sprk-btn" id="coffee-sip-btn">Take a Sip</button>
            <button type="button" class="sprk-btn sprk-btn-primary" id="coffee-breathe-btn">
              ${countdown > 0 ? "Restart 20s" : "20s Break"}
            </button>
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
    };

    renderView();
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }
};
