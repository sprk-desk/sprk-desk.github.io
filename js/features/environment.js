// Garden Window -> Visual Sky Phases, Weather Tiles & Layered Lighting Tabs
import { state, savePreferences } from "../state.js";
import { TIME_PHASES, WEATHER_MODES, lightingManager } from "../core/lighting-manager.js";
import { dialogManager } from "../core/dialog-manager.js";
import { escapeHtml } from "../utils/dom.js";

const SKY_ICONS = {
  auto: { icon: "🕰", bg: "linear-gradient(135deg, #89c8d8, #f8e7b8)" },
  morning: { icon: "🌅", bg: "linear-gradient(180deg, #89c8d8, #f8e7b8)" },
  afternoon: { icon: "☀", bg: "linear-gradient(180deg, #79bfd1, #efe6b9)" },
  sunset: { icon: "🌇", bg: "linear-gradient(180deg, #4f4a7d, #f5b874)" },
  night: { icon: "🌙", bg: "linear-gradient(180deg, #0e1d38, #2b4d6f)" }
};

const WEATHER_ICONS = {
  clear: { icon: "🌤", bg: "#e8f6fa" },
  breeze: { icon: "🍃", bg: "#e4f2e2" },
  rain: { icon: "🌧", bg: "#d9e8f2" },
  snow: { icon: "❄", bg: "#eef5fa" },
  fireflies: { icon: "✨", bg: "#27304a" }
};

export const environmentFeature = {
  skin: "environment",
  eyebrow: "",
  title: "Garden Window",
  icon: "☀",
  render(container) {
    let tab = "sky"; // sky | lighting

    const renderView = () => {
      const prefs = state.preferences;
      const lighting = prefs.lighting || {};
      const lampOn = lighting.lampOn !== false;

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <nav class="sprk-tabs sprk-tabs-window" style="margin:0;" role="tablist">
            <button type="button" class="sprk-tab ${tab === "sky" ? "is-active" : ""}" data-etab="sky">🌤 Sky & Weather</button>
            <button type="button" class="sprk-tab ${tab === "lighting" ? "is-active" : ""}" data-etab="lighting">💡 Lighting</button>
          </nav>
          <button type="button" class="sprk-btn" id="open-shop-ambience" style="min-height:36px;padding:6px 12px;">Ambience Shop →</button>
        </div>

        ${tab === "sky" ? `
          <div class="sprk-card" style="margin-bottom:14px;">
            <div class="sprk-label" style="margin-bottom:8px;">Time of Day</div>
            <div class="sprk-sky-grid">
              ${TIME_PHASES.map((p) => {
                const vis = SKY_ICONS[p.id] || SKY_ICONS.auto;
                return `
                  <button type="button" class="sprk-env-tile ${prefs.timeOfDay === p.id ? "is-active" : ""}" data-time-phase="${p.id}">
                    <span class="sprk-env-swatch" style="background:${vis.bg};" aria-hidden="true">${vis.icon}</span>
                    <span>${escapeHtml(p.id === "auto" ? "Auto" : p.label)}</span>
                  </button>
                `;
              }).join("")}
            </div>
          </div>

          <div class="sprk-card">
            <div class="sprk-label" style="margin-bottom:8px;">Weather</div>
            <div class="sprk-weather-grid">
              ${WEATHER_MODES.map((w) => {
                const vis = WEATHER_ICONS[w.id] || WEATHER_ICONS.clear;
                return `
                  <button type="button" class="sprk-env-tile ${prefs.weather === w.id ? "is-active" : ""}" data-weather="${w.id}">
                    <span class="sprk-env-swatch" style="background:${vis.bg};" aria-hidden="true">${vis.icon}</span>
                    <span>${escapeHtml(w.label.replace("Sky", "").replace("Spring ", "").replace("Gentle ", "").replace("Soft ", "").replace("Evening ", "").trim())}</span>
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        ` : `
          <div class="sprk-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="sprk-btn ${lampOn ? "sprk-btn-primary" : ""}" id="env-lamp-toggle">
                  ${lampOn ? "💡 Desk Lamp: On" : "🕯 Desk Lamp: Off"}
                </button>
                <button type="button" class="sprk-btn ${lighting.windowBeamOn !== false ? "sprk-btn-primary" : ""}" id="env-beam-toggle" aria-pressed="${lighting.windowBeamOn !== false}">
                  ${lighting.windowBeamOn !== false ? "☀ Window Light Ray: On" : "🌫 Window Light Ray: Off"}
                </button>
              </div>
              <span class="sprk-badge-chip">${escapeHtml(prefs.timeOfDay)} · ${escapeHtml(prefs.weather)}</span>
            </div>
            <div class="sprk-grid-2">
              ${[
                ["roomBrightness", "Room Light", 50, 120, lighting.roomBrightness ?? 100],
                ["windowBrightness", "Window Light", 40, 130, lighting.windowBrightness ?? 100],
                ["ambientDarkness", "Night Shade", 0, 70, lighting.ambientDarkness ?? 12],
                ["lampIntensity", "Lamp Glow", 0, 100, lighting.lampIntensity ?? 70],
                ["warmth", "Warmth", 0, 100, lighting.warmth ?? 35]
              ].map(([key, label, min, max, val]) => `
                <label class="sprk-field" style="margin:0;">
                  <span class="sprk-label">${label} (<span class="tabular-nums" id="val-${key}">${val}%</span>)</span>
                  <input type="range" min="${min}" max="${max}" value="${val}" data-light-slider="${key}" />
                </label>
              `).join("")}
            </div>
          </div>
        `}
      `;

      container.querySelectorAll("[data-etab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.etab;
          renderView();
        });
      });

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

      container.querySelector("#env-beam-toggle")?.addEventListener("click", () => {
        savePreferences({ lighting: { windowBeamOn: lighting.windowBeamOn === false } });
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

      container.querySelector("#open-shop-ambience")?.addEventListener("click", (e) => {
        dialogManager.open("shop", e.currentTarget, "ambience");
      });
    };

    renderView();
  }
};
