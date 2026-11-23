// Cabinet Drawer -> File-Folder Tabs with Mini Visual Inventory Thumbnails & Saved Bookmarks
import { state, persistLocalCollection } from "../state.js";
import { SHOP_CATALOG } from "../services/economy-service.js";
import { equipShopItem, isShopItemEquipped } from "./shop.js";
import { renderMiniThumbnail } from "../utils/shop-preview.js";
import { dialogManager } from "../core/dialog-manager.js";
import { escapeHtml } from "../utils/dom.js";
import { syncSavedResourceDelete } from "../services/database-service.js";

export const cabinetFeature = {
  skin: "cabinet",
  eyebrow: "",
  title: "Cabinet Drawer",
  icon: "🗄",
  render(container) {
    let tab = "inventory"; // inventory | saved

    const renderView = () => {
      const saved = state.localSavedResources || [];
      const ownedItems = SHOP_CATALOG.filter((item) => state.ownedItemIds.includes(item.id));
      const currentThemeId = state.preferences.theme || "comic";

      container.innerHTML = `
        <nav class="sprk-tabs sprk-tabs-folder" role="tablist" aria-label="Cabinet drawer folders">
          <button type="button" class="sprk-tab ${tab === "inventory" ? "is-active" : ""}" data-cabtab="inventory">🗂 Inventory (${ownedItems.length})</button>
          <button type="button" class="sprk-tab ${tab === "saved" ? "is-active" : ""}" data-cabtab="saved">🔖 Saved (${saved.length})</button>
        </nav>

        ${tab === "inventory" ? `
          <div class="sprk-grid-2">
            ${ownedItems.map((item) => {
              const equipped = isShopItemEquipped(item);
              return `
                <div class="sprk-card sprk-shop-card">
                  <div class="sprk-shop-card-top">
                    ${renderMiniThumbnail(item, currentThemeId)}
                    <div class="sprk-shop-card-info">
                      <strong style="font-size:13.5px;display:block;">${escapeHtml(item.name)}</strong>
                      <div class="sprk-meta" style="margin-top:3px;text-transform:capitalize;">${escapeHtml(item.category)}</div>
                    </div>
                  </div>
                  <button type="button" class="sprk-btn sprk-btn-primary" data-cabinet-equip="${escapeHtml(item.id)}" ${equipped ? "disabled" : ""} style="min-height:34px;padding:4px 12px;">
                    ${equipped ? "Equipped" : "Equip"}
                  </button>
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="sprk-card">
            ${saved.length === 0 ? `
              <div class="sprk-empty">No saved guides yet.</div>
            ` : `
              <div style="display:grid;gap:8px;">
                ${saved.map((r) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <div>
                      <strong style="font-size:13.5px;">📖 ${escapeHtml(r.title)}</strong>
                      <div class="sprk-meta">${escapeHtml(r.category || "Saved")}</div>
                    </div>
                    <button type="button" class="sprk-btn" data-remove-saved="${escapeHtml(r.id)}" style="min-height:32px;padding:4px 10px;">×</button>
                  </div>
                `).join("")}
              </div>
            `}
          </div>
        `}
      `;

      container.querySelectorAll("[data-cabtab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.cabtab;
          renderView();
        });
      });

      container.querySelectorAll("[data-remove-saved]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.removeSaved;
          persistLocalCollection("localSavedResources", saved.filter((s) => s.id !== id));
          syncSavedResourceDelete(id);
          renderView();
        });
      });

      container.querySelectorAll("[data-cabinet-equip]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = SHOP_CATALOG.find((i) => i.id === btn.dataset.cabinetEquip);
          if (item && equipShopItem(item)) {
            if (item.category === "theme") dialogManager.syncHeader("cabinet");
            renderView();
          }
        });
      });
    };

    renderView();
  }
};
