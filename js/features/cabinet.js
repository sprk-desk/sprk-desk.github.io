// Cabinet Drawer -> Saved Personal Resources & Unlocked Customization Inventory
import { state, persistLocalCollection } from "../state.js";
import { SHOP_CATALOG } from "../services/economy-service.js";
import { themeManager } from "../core/theme-manager.js";
import { skinManager } from "../core/skin-manager.js";
import { escapeHtml } from "../utils/dom.js";

export const cabinetFeature = {
  skin: "cabinet",
  eyebrow: "CABINET DRAWER · SAVED RESOURCES & INVENTORY",
  title: "Personal Cabinet & Inventory",
  icon: "🗄",
  render(container, { rerender }) {
    const saved = state.localSavedResources || [];
    const ownedItems = SHOP_CATALOG.filter((item) => state.ownedItemIds.includes(item.id));

    container.innerHTML = `
      <div class="sprk-card" style="margin-bottom:14px;">
        <h2 style="margin:0 0 8px;font-size:14px;">Saved Personal Resources (${saved.length})</h2>
        ${saved.length === 0 ? `
          <div class="sprk-meta">Bookmark study guides from the Bookshelf to store them inside your drawer.</div>
        ` : `
          <div style="display:grid;gap:8px;">
            ${saved.map((r) => `
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                <div>
                  <strong style="font-size:13px;">${escapeHtml(r.title)}</strong>
                  <div class="sprk-meta">${escapeHtml(r.category || "Saved")}</div>
                </div>
                <button type="button" class="sprk-btn" data-remove-saved="${escapeHtml(r.id)}" style="min-height:32px;padding:4px 10px;">Remove</button>
              </div>
            `).join("")}
          </div>
        `}
      </div>

      <div class="sprk-card">
        <h2 style="margin:0 0 8px;font-size:14px;">Owned Room Themes & Skins (${ownedItems.length})</h2>
        <div class="sprk-grid-2">
          ${ownedItems.map((item) => `
            <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <div>
                <strong style="font-size:13px;">${escapeHtml(item.name)}</strong>
                <div class="sprk-meta">${escapeHtml(item.category)}</div>
              </div>
              <button type="button" class="sprk-btn sprk-btn-primary" data-cabinet-equip="${escapeHtml(item.id)}" style="min-height:32px;padding:4px 10px;">Equip</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    container.querySelectorAll("[data-remove-saved]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.removeSaved;
        persistLocalCollection("localSavedResources", saved.filter((s) => s.id !== id));
        rerender();
      });
    });

    container.querySelectorAll("[data-cabinet-equip]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = SHOP_CATALOG.find((i) => i.id === btn.dataset.cabinetEquip);
        if (!item) return;
        if (item.themeId) themeManager.apply(item.themeId);
        if (item.skinName) skinManager.applySkin(item.targetObject, item.skinName);
      });
    });
  }
};
