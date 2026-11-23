// Desk Plant -> Room Themes (10), Object Skins, Layouts, and Accessibility Controls
import { state, savePreferences } from "../state.js";
import { ROOM_THEMES, themeManager } from "../core/theme-manager.js";
import { skinManager } from "../core/skin-manager.js";
import { layoutManager } from "../core/layout-manager.js";
import { lightingManager } from "../core/lighting-manager.js";
import { escapeHtml } from "../utils/dom.js";

export const customizationFeature = {
  skin: "customization",
  eyebrow: "DESK PLANT · ROOM STUDIO",
  title: "Room Themes & Customization",
  icon: "🌿",
  render(container) {
    let tab = "themes";

    const renderView = () => {
      const currentTheme = state.preferences.theme || "comic";
      const skinGroups = skinManager.listAvailableSkins();

      container.innerHTML = `
        <div class="sprk-tabs">
          <button type="button" class="sprk-tab ${tab === "themes" ? "is-active" : ""}" data-tab="themes">Themes (${ROOM_THEMES.length})</button>
          <button type="button" class="sprk-tab ${tab === "skins" ? "is-active" : ""}" data-tab="skins">Object Skins</button>
          <button type="button" class="sprk-tab ${tab === "layout" ? "is-active" : ""}" data-tab="layout">Layout & Comfort</button>
        </div>

        ${tab === "themes" ? `
          <div class="sprk-grid-2">
            ${ROOM_THEMES.map((t) => `
              <button type="button" class="sprk-card" data-theme-id="${t.id}"
                style="text-align:left;cursor:pointer;${currentTheme === t.id ? "border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);" : ""}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <strong style="font-size:14px;">${escapeHtml(t.name)}</strong>
                  <span style="display:flex;gap:3px;">
                    ${t.swatch.map((hex) => `<span style="width:12px;height:12px;border-radius:3px;border:1px solid rgba(0,0,0,0.2);background:${hex};"></span>`).join("")}
                  </span>
                </div>
                <div style="font-size:12px;color:var(--muted);">${escapeHtml(t.description)}${t.customSprites ? " · Custom sprites" : ""}</div>
              </button>
            `).join("")}
          </div>
        ` : tab === "skins" ? `
          <div style="display:grid;gap:10px;">
            ${skinGroups.map((group) => `
              <div class="sprk-card" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;">
                <strong style="font-size:14px;">${escapeHtml(group.label)}</strong>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${group.skins.map((s) => `
                    <button type="button" class="sprk-btn ${group.current === s ? "sprk-btn-primary" : ""}"
                      data-apply-skin="${escapeHtml(group.type)}:${escapeHtml(s)}"
                      style="min-height:34px;padding:4px 10px;text-transform:capitalize;">
                      ${escapeHtml(s)}
                    </button>
                  `).join("")}
                </div>
              </div>
            `).join("")}
            <button type="button" class="sprk-btn" id="reset-all-skins">Reset All Skins to Default</button>
          </div>
        ` : `
          <div style="display:grid;gap:12px;">
            <div class="sprk-card">
              <strong style="font-size:14px;display:block;margin-bottom:6px;">Furniture & Object Placement</strong>
              <p style="margin:0 0 12px;font-size:13px;color:var(--muted);">Drag shelf and desk objects directly in your room to rearrange your space.</p>
              <div style="display:flex;flex-wrap:wrap;gap:10px;">
                <button type="button" class="sprk-btn ${state.preferences.layoutLocked ? "sprk-btn-primary" : ""}" id="toggle-lock-layout">
                  ${state.preferences.layoutLocked ? "Unlock Placement" : "Lock Placement"}
                </button>
                <button type="button" class="sprk-btn" id="reset-room-layout">Reset Default Layout</button>
              </div>
            </div>

            <div class="sprk-card">
              <strong style="font-size:14px;display:block;margin-bottom:8px;">Comfort & Motion</strong>
              <label style="display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer;">
                <input type="checkbox" id="pref-reduced-motion" ${state.preferences.reducedMotion ? "checked" : ""} />
                <span>Reduced motion (pauses continuous weather & sway animations)</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                <input type="checkbox" id="pref-low-perf" ${state.preferences.lowPerformance ? "checked" : ""} />
                <span>Low-performance mode (reduces weather particle density)</span>
              </label>
            </div>
          </div>
        `}
      `;

      container.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.tab;
          renderView();
        });
      });

      container.querySelectorAll("[data-theme-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          themeManager.apply(btn.dataset.themeId);
          renderView();
        });
      });

      container.querySelectorAll("[data-apply-skin]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [type, skinName] = btn.dataset.applySkin.split(":");
          skinManager.applySkin(type, skinName);
          renderView();
        });
      });

      container.querySelector("#reset-all-skins")?.addEventListener("click", () => {
        skinManager.resetAll();
        renderView();
      });

      container.querySelector("#toggle-lock-layout")?.addEventListener("click", () => {
        savePreferences({ layoutLocked: !state.preferences.layoutLocked });
        renderView();
      });

      container.querySelector("#reset-room-layout")?.addEventListener("click", () => {
        layoutManager.resetLayout();
      });

      container.querySelector("#pref-reduced-motion")?.addEventListener("change", (e) => {
        savePreferences({ reducedMotion: e.target.checked });
        lightingManager.apply();
      });

      container.querySelector("#pref-low-perf")?.addEventListener("change", (e) => {
        savePreferences({ lowPerformance: e.target.checked });
        lightingManager.apply();
      });
    };

    renderView();
  }
};
