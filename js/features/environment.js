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
      const seriousMode = Boolean(prefs.seriousMode);
      const lighting = prefs.lighting || {};
      const lampOn = lighting.lampOn !== false;

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <nav class="sprk-tabs sprk-tabs-window" style="margin:0;" role="tablist">
            <button type="button" class="sprk-tab ${tab === "sky" ? "is-active" : ""}" data-etab="sky">${seriousMode ? "Sky & Weather" : "🌤 Sky & Weather"}</button>
            <button type="button" class="sprk-tab ${tab === "lighting" ? "is-active" : ""}" data-etab="lighting">${seriousMode ? "Lighting" : "💡 Lighting"}</button>
          </nav>
          <button type="button" class="sprk-btn" id="open-shop-ambience" style="min-height:36px;padding:6px 12px;">Ambience Catalog →</button>
        </div>

        ${tab === "sky" ? `
          <div class="sprk-card" style="margin-bottom:14px;">
            <div class="sprk-label" style="margin-bottom:8px;">Time of Day</div>
            <div class="sprk-sky-grid">
              ${TIME_PHASES.map((p) => {
                const vis = SKY_ICONS[p.id] || SKY_ICONS.auto;
                return `
                  <button type="button" class="sprk-env-tile ${prefs.timeOfDay === p.id ? "is-active" : ""}" data-time-phase="${p.id}">
                    <span class="sprk-env-swatch" style="background:${seriousMode ? (p.id === "night" ? "#1e1e1e" : "#eaeae6") : vis.bg};${seriousMode && p.id === "night" ? "color:#fff;" : ""}" aria-hidden="true">${seriousMode ? p.label.slice(0, 2).toUpperCase() : vis.icon}</span>
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
                const cleanLabel = w.label.replace("Sky", "").replace("Spring ", "").replace("Gentle ", "").replace("Soft ", "").replace("Evening ", "").trim();
                return `
                  <button type="button" class="sprk-env-tile ${prefs.weather === w.id ? "is-active" : ""}" data-weather="${w.id}">
                    <span class="sprk-env-swatch" style="background:${seriousMode ? "#eaeae6" : vis.bg};" aria-hidden="true">${seriousMode ? cleanLabel.slice(0, 2).toUpperCase() : vis.icon}</span>
                    <span>${escapeHtml(cleanLabel)}</span>
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
                  ${seriousMode ? (lampOn ? "Desk Lamp: On" : "Desk Lamp: Off") : (lampOn ? "💡 Desk Lamp: On" : "🕯 Desk Lamp: Off")}
                </button>
                <button type="button" class="sprk-btn ${lighting.windowBeamOn !== false ? "sprk-btn-primary" : ""}" id="env-beam-toggle" aria-pressed="${lighting.windowBeamOn !== false}">
                  ${seriousMode ? (lighting.windowBeamOn !== false ? "Window Beam: On" : "Window Beam: Off") : (lighting.windowBeamOn !== false ? "☀ Window Light Ray: On" : "🌫 Window Light Ray: Off")}
                </button>
              </div>
              <span class="sprk-badge-chip">${escapeHtml(prefs.timeOfDay)} · ${escapeHtml(prefs.weather)}</span>
            </div>
            <div class="sprk-grid-2" style="margin-bottom:12px;">
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
              <label class="sprk-field" style="margin:0;">
                <span class="sprk-label">Lamp Temp (<span class="tabular-nums" id="val-lampKelvin">${lighting.lampKelvin ?? 3200}K</span>)</span>
                <input type="range" min="2400" max="6000" step="100" value="${lighting.lampKelvin ?? 3200}" id="env-lamp-kelvin" />
              </label>
            </div>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;padding-top:8px;border-top:1px solid rgba(52,44,37,0.12);">
              <input type="checkbox" id="env-auto-dusk" ${prefs.autoDuskLamp ? "checked" : ""} />
              <span>Auto-Dusk Lamp (automatically illuminates the desk lamp at sunset and night)</span>
            </label>
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

      container.querySelector("#env-lamp-kelvin")?.addEventListener("input", (e) => {
        const kelvin = Number(e.target.value);
        savePreferences({ lighting: { lampKelvin: kelvin } });
        lightingManager.apply();
        const span = container.querySelector("#val-lampKelvin");
        if (span) span.textContent = `${kelvin}K`;
      });

      container.querySelector("#env-auto-dusk")?.addEventListener("change", (e) => {
        savePreferences({ autoDuskLamp: e.target.checked });
        lightingManager.apply();
      });

      container.querySelector("#open-shop-ambience")?.addEventListener("click", (e) => {
        dialogManager.open("shop", e.currentTarget, "ambience");
      });
    };

    renderView();
  }
};
