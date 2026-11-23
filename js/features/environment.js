// Window -> Day/Night Cycle, Weather, and Layered Room Lighting Controls
import { state, savePreferences } from "../state.js";
import { TIME_PHASES, WEATHER_MODES, lightingManager } from "../core/lighting-manager.js";
import { escapeHtml } from "../utils/dom.js";

export const environmentFeature = {
  skin: "environment",
  eyebrow: "GARDEN WINDOW · ATMOSPHERE & LIGHTING",
  title: "Environment, Weather & Lighting",
  icon: "☀",
  render(container) {
    const renderView = () => {
      const prefs = state.preferences;
      const lighting = prefs.lighting || {};

      container.innerHTML = `
        <div class="sprk-card" style="margin-bottom:14px;">
          <h2 style="margin:0 0 8px;font-size:14px;">Time of Day</h2>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${TIME_PHASES.map((p) => `
              <button type="button" class="sprk-btn ${prefs.timeOfDay === p.id ? "sprk-btn-primary" : ""}"
                data-time-phase="${p.id}" style="min-height:36px;padding:6px 12px;">
                ${escapeHtml(p.label)}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="sprk-card" style="margin-bottom:14px;">
          <h2 style="margin:0 0 8px;font-size:14px;">Outdoor Weather</h2>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${WEATHER_MODES.map((w) => `
              <button type="button" class="sprk-btn ${prefs.weather === w.id ? "sprk-btn-primary" : ""}"
                data-weather="${w.id}" style="min-height:36px;padding:6px 12px;">
                ${escapeHtml(w.label)}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="sprk-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <h2 style="margin:0;font-size:14px;">Layered Lighting</h2>
            <button type="button" class="sprk-btn ${lighting.lampOn !== false ? "sprk-btn-primary" : ""}" id="env-lamp-toggle" style="min-height:34px;padding:4px 12px;">
              Desk Lamp: ${lighting.lampOn !== false ? "On" : "Off"}
            </button>
          </div>
          <div class="sprk-grid-2">
            ${[
              ["roomBrightness", "Room Brightness", 50, 120, lighting.roomBrightness ?? 100],
              ["windowBrightness", "Window Light", 40, 130, lighting.windowBrightness ?? 100],
              ["ambientDarkness", "Ambient Darkness", 0, 70, lighting.ambientDarkness ?? 12],
              ["lampIntensity", "Lamp Intensity", 0, 100, lighting.lampIntensity ?? 70],
              ["warmth", "Color Warmth", 0, 100, lighting.warmth ?? 35]
            ].map(([key, label, min, max, val]) => `
              <label class="sprk-field" style="margin:0;">
                <span class="sprk-label">${label} (<span class="tabular-nums" id="val-${key}">${val}%</span>)</span>
                <input type="range" min="${min}" max="${max}" value="${val}" data-light-slider="${key}" />
              </label>
            `).join("")}
          </div>
        </div>
      `;

      container.querySelectorAll("[data-time-phase]").forEach((btn) => {
        btn.addEventListener("click", () => {
          savePreferences({ timeOfDay: btn.dataset.timePhase });
          lightingManager.apply();
          renderView();
        });
      });

      container.querySelectorAll("[data-weather]").forEach((btn) => {
        btn.addEventListener("click", () => {
          savePreferences({ weather: btn.dataset.weather });
          lightingManager.apply();
          renderView();
        });
      });

      container.querySelector("#env-lamp-toggle")?.addEventListener("click", () => {
        savePreferences({ lighting: { lampOn: lighting.lampOn === false } });
        lightingManager.apply();
        renderView();
      });

      container.querySelectorAll("[data-light-slider]").forEach((slider) => {
        slider.addEventListener("input", () => {
          const key = slider.dataset.lightSlider;
          const val = Number(slider.value);
          savePreferences({ lighting: { [key]: val } });
          lightingManager.apply();
          const span = container.querySelector(`#val-${key}`);
          if (span) span.textContent = `${val}%`;
        });
      });
    };

    renderView();
  }
};
