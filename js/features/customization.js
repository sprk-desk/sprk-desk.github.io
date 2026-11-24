// Desk Plant -> Room Themes, Object Skins, and Space Layout Controls
import { state, savePreferences } from "../state.js";
import { ROOM_THEMES, themeManager } from "../core/theme-manager.js";
import { skinManager } from "../core/skin-manager.js";
import { layoutManager } from "../core/layout-manager.js";
import { lightingManager } from "../core/lighting-manager.js";
import { decorationManager } from "../core/decoration-manager.js";
import { dialogManager } from "../core/dialog-manager.js";
import { isStrictFocusLockActive } from "../core/settings-manager.js";
import { SHOP_CATALOG } from "../utils/shop-catalog.js";
import { renderMiniThumbnail } from "../utils/shop-preview.js";
import { DECORATION_SLOTS, DECORATION_STYLES, isDecorationOwned, renderDecorationSvg } from "../utils/decorations.js";
import { purchaseShopItem } from "../services/economy-service.js";
import { escapeHtml } from "../utils/dom.js";
import { isSeriousTheme, isThemeAccessibleInMode } from "../utils/room-settings.js";

export const customizationFeature = {
  skin: "customization",
  eyebrow: "",
  title: "Desk Plant",
  icon: "🌿",
  render(container) {
    let tab = "themes";
    let statusMessage = "";

    const renderView = () => {
      const currentTheme = state.preferences.theme || "comic";
      const seriousMode = Boolean(state.preferences?.seriousMode);
      const locked = isStrictFocusLockActive();
      const skinGroups = skinManager.listAvailableSkins();
      const activeDecor = decorationManager.getActiveDecorations();

      container.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px;">
          <nav class="sprk-tabs sprk-tabs-plant" style="margin-bottom:0;" role="tablist">
            <button type="button" class="sprk-tab ${tab === "themes" ? "is-active" : ""}" data-tab="themes">${seriousMode ? `Themes (${ROOM_THEMES.length})` : `🎨 Themes (${ROOM_THEMES.length})`}</button>
            <button type="button" class="sprk-tab ${tab === "skins" ? "is-active" : ""}" data-tab="skins">${seriousMode ? "Skins" : "🪴 Skins"}</button>
            <button type="button" class="sprk-tab ${tab === "decor" ? "is-active" : ""}" data-tab="decor">${seriousMode ? "Decor" : "🎀 Decor"}</button>
            <button type="button" class="sprk-tab ${tab === "layout" ? "is-active" : ""}" data-tab="layout">${seriousMode ? "Layout" : "📐 Space"}</button>
          </nav>
          <button type="button" class="sprk-btn" id="open-shop-custom" style="min-height:36px;padding:6px 12px;">
            ${tab === "skins" ? "Skins Catalog →" : tab === "decor" ? "Decor Catalog →" : "Themes Catalog →"}
          </button>
        </div>

        ${locked ? `<div class="sprk-notice" role="status" style="margin-bottom:12px;">Strict Focus Lock is active while your focus timer runs. Finish or pause your session to customize themes or skins.</div>` : ""}

        ${statusMessage ? `<div class="sprk-notice" role="status" style="margin-bottom:12px;">${escapeHtml(statusMessage)}</div>` : ""}

        ${tab === "themes" ? `
          <div class="sprk-grid-2">
            ${ROOM_THEMES.map((t) => {
              const shopItem = SHOP_CATALOG.find((i) => i.category === "theme" && i.themeId === t.id);
              const thumb = shopItem ? renderMiniThumbnail(shopItem, currentTheme) : "";
              const isSeriousPreset = isSeriousTheme(t.id);
              const unlockedForUse = !isSeriousPreset || isThemeAccessibleInMode(t.id, {
                ownedItemIds: state.ownedItemIds,
                seriousMode
              });
              const badgeText = isSeriousPreset
                ? (seriousMode
                    ? "Free in Serious Mode"
                    : (unlockedForUse ? "Owned" : `${shopItem?.price || 30} SC (Regular Mode)`))
                : (t.customSprites ? (seriousMode ? "Sprite Pack" : "★ Skin Bundle") : "");
              return `
                <button type="button" class="sprk-card" data-theme-id="${t.id}" ${locked ? "disabled" : ""}
                  style="display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer;${currentTheme === t.id ? "border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);" : ""}${!unlockedForUse ? "opacity:0.78;" : ""}">
                  ${thumb}
                  <div style="min-width:0;flex:1;">
                    <strong style="font-size:13.5px;display:block;margin-bottom:6px;">${escapeHtml(t.name)}</strong>
                    <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                      ${t.swatch.map((hex) => `<span style="width:14px;height:14px;border-radius:4px;border:1px solid rgba(0,0,0,0.22);background:${hex};"></span>`).join("")}
                      ${badgeText ? `<span class="sprk-meta" style="margin-left:4px;">${escapeHtml(badgeText)}</span>` : ""}
                    </div>
                  </div>
                </button>
              `;
            }).join("")}
          </div>
        ` : tab === "skins" ? `
          <div style="display:grid;gap:10px;">
            ${skinGroups.map((group) => `
              <div class="sprk-card" style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                  <strong style="font-size:14px;">${escapeHtml(group.label)}</strong>
                  <button type="button" class="sprk-lock-btn ${group.isLocked ? "is-locked" : ""}" data-lock-skin="${escapeHtml(group.type)}" ${locked ? "disabled" : ""}>
                    ${seriousMode ? (group.isLocked ? "Locked" : "Lock") : (group.isLocked ? "🔒 Locked" : "🔓 Lock")}
                  </button>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${group.ownedSkins.map((s) => `
                    <button type="button" class="sprk-btn ${s.active ? "sprk-btn-primary" : ""}"
                      data-apply-skin="${escapeHtml(group.type)}|${escapeHtml(s.skinId)}"
                      ${locked ? "disabled" : ""}
                      style="min-height:32px;padding:4px 10px;font-size:12px;">
                      ${escapeHtml(s.name)}
                    </button>
                  `).join("")}
                </div>
              </div>
            `).join("")}
            <button type="button" class="sprk-btn" id="reset-all-skins" ${locked ? "disabled" : ""}>↺ Reset All Skins & Locks</button>
          </div>
        ` : tab === "decor" ? `
          <div style="display:grid;gap:10px;">
            ${DECORATION_SLOTS.map((slot) => {
              const currentStyleId = activeDecor[slot.id] || slot.defaultStyle;
              const styles = Object.values(DECORATION_STYLES[slot.id] || {});
              const previewSvg = currentStyleId !== "none" ? renderDecorationSvg(slot.id, currentStyleId) : "";
              return `
                <div class="sprk-card" data-deco-slot-card="${escapeHtml(slot.id)}" style="display:flex;flex-direction:column;gap:8px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div style="width:40px;height:40px;border-radius:8px;border:1.5px solid var(--ink);background:var(--wall-light);display:grid;place-items:center;padding:4px;flex-shrink:0;">
                        ${previewSvg || `<span style="font-size:14px;opacity:0.5;">—</span>`}
                      </div>
                      <div>
                        <strong style="font-size:14px;display:block;">${escapeHtml(slot.label)}</strong>
                        <span class="sprk-meta">Fixed · ${escapeHtml(slot.locationLabel)}</span>
                      </div>
                    </div>
                    <button type="button" class="sprk-btn ${currentStyleId === "none" ? "sprk-btn-primary" : ""}"
                      data-set-deco="${escapeHtml(slot.id)}|none"
                      aria-label="Remove ${escapeHtml(slot.label)}"
                      ${locked ? "disabled" : ""}
                      style="min-height:32px;padding:4px 10px;font-size:12px;">
                      ${currentStyleId === "none" ? "Removed" : "Remove"}
                    </button>
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${styles.map((style) => {
                      const owned = isDecorationOwned(slot.id, style.id, state.ownedItemIds);
                      const isActive = currentStyleId === style.id;
                      const shopItem = style.shopItemId ? SHOP_CATALOG.find((i) => i.id === style.shopItemId) : null;
                      if (owned) {
                        return `
                          <button type="button" class="sprk-btn ${isActive ? "sprk-btn-primary" : ""}"
                            data-set-deco="${escapeHtml(slot.id)}|${escapeHtml(style.id)}"
                            ${locked ? "disabled" : ""}
                            style="min-height:32px;padding:4px 10px;font-size:12px;display:inline-flex;align-items:center;gap:6px;">
                            <span style="width:10px;height:10px;border-radius:3px;border:1px solid var(--ink);background:${escapeHtml(style.swatch)};" aria-hidden="true"></span>
                            ${escapeHtml(style.name)}
                          </button>
                        `;
                      }
                      if (state.user && shopItem) {
                        return `
                          <button type="button" class="sprk-btn"
                            data-buy-deco="${escapeHtml(shopItem.id)}|${escapeHtml(slot.id)}|${escapeHtml(style.id)}"
                            ${locked ? "disabled" : ""}
                            style="min-height:32px;padding:4px 10px;font-size:12px;opacity:0.85;">
                            ${escapeHtml(style.name)} (${shopItem.price} SC)
                          </button>
                        `;
                      }
                      return `
                        <button type="button" class="sprk-btn" data-shop-deco="deco"
                          style="min-height:32px;padding:4px 10px;font-size:12px;opacity:0.78;">
                          ${escapeHtml(style.name)} · Shop
                        </button>
                      `;
                    }).join("")}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="sprk-grid-2">
            <div class="sprk-card" style="display:flex;flex-direction:column;gap:10px;">
              <strong style="font-size:14px;">Object Placement</strong>
              <button type="button" class="sprk-btn ${state.preferences.layoutLocked ? "sprk-btn-primary" : ""}" id="toggle-lock-layout">
                ${state.preferences.layoutLocked ? "Locked" : "Drag Enabled"}
              </button>
              <button type="button" class="sprk-btn" id="reset-room-layout">↺ Reset Positions</button>
            </div>

            <div class="sprk-card" style="display:flex;flex-direction:column;gap:10px;">
              <strong style="font-size:14px;">Comfort</strong>
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                <input type="checkbox" id="pref-reduced-motion" ${state.preferences.reducedMotion ? "checked" : ""} />
                <span>Reduced Motion</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                <input type="checkbox" id="pref-low-perf" ${state.preferences.lowPerformance ? "checked" : ""} />
                <span>Eco Particles</span>
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
          if (isStrictFocusLockActive()) return;
          const themeId = btn.dataset.themeId;
          const isSeriousMode = Boolean(state.preferences?.seriousMode);
          if (isSeriousTheme(themeId) && !isThemeAccessibleInMode(themeId, {
            ownedItemIds: state.ownedItemIds,
            seriousMode: isSeriousMode
          })) {
            const item = SHOP_CATALOG.find((i) => i.category === "theme" && i.themeId === themeId);
            statusMessage = `${item?.name || themeId} costs ${item?.price || 30} SC in Regular Mode. Turn on Serious Mode in Control Panel for free access, or buy in Shop.`;
            renderView();
            return;
          }
          statusMessage = "";
          themeManager.apply(themeId);
          dialogManager.syncHeader("customization");
          renderView();
        });
      });

      container.querySelectorAll("[data-apply-skin]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (isStrictFocusLockActive()) return;
          const [type, skinId] = btn.dataset.applySkin.split("|");
          skinManager.applySkin(type, skinId);
          dialogManager.syncHeader("customization");
          renderView();
        });
      });

      container.querySelectorAll("[data-lock-skin]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (isStrictFocusLockActive()) return;
          skinManager.toggleLock(btn.dataset.lockSkin);
          dialogManager.syncHeader("customization");
          renderView();
        });
      });

      container.querySelector("#reset-all-skins")?.addEventListener("click", () => {
        if (isStrictFocusLockActive()) return;
        skinManager.resetAll();
        dialogManager.syncHeader("customization");
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

      container.querySelectorAll("[data-set-deco]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [slotId, styleId] = btn.dataset.setDeco.split("|");
          decorationManager.setSlotStyle(slotId, styleId, { persist: true });
          statusMessage = styleId === "none" ? "Removed decoration from fixed slot." : "Updated fixed room decoration.";
          renderView();
        });
      });

      container.querySelectorAll("[data-buy-deco]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const [shopId, slotId, styleId] = btn.dataset.buyDeco.split("|");
          const res = await purchaseShopItem(shopId);
          if (res.ok) {
            decorationManager.setSlotStyle(slotId, styleId, { persist: true });
            statusMessage = "Purchased and placed fixed decoration!";
          } else {
            statusMessage = res.error || "Purchase failed.";
          }
          renderView();
        });
      });

      container.querySelectorAll("[data-shop-deco]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          dialogManager.open("shop", e.currentTarget, "deco");
        });
      });

      container.querySelector("#open-shop-custom")?.addEventListener("click", (e) => {
        const dest = tab === "skins" ? "skin" : tab === "decor" ? "deco" : "theme";
        dialogManager.open("shop", e.currentTarget, dest);
      });

      container.querySelector("#pref-low-perf")?.addEventListener("change", (e) => {
        savePreferences({ lowPerformance: e.target.checked });
        lightingManager.apply();
      });
    };

    renderView();
  }
};
