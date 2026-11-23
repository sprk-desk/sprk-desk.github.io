// Visiting Merchant Bird -> Desk Shop, Study Credit Wallet & Immutable Ledger
import { state } from "../state.js";
import { SHOP_CATALOG, purchaseShopItem } from "../services/economy-service.js";
import { themeManager } from "../core/theme-manager.js";
import { skinManager } from "../core/skin-manager.js";
import { escapeHtml } from "../utils/dom.js";

export const shopFeature = {
  skin: "shop",
  eyebrow: "TRAVELING MERCHANT · DESK SHOP",
  title: "The Bird's Curio Shop",
  icon: "🐦",
  render(container, { rerender }) {
    let category = "all";
    let statusMessage = "";

    const renderView = () => {
      const items = SHOP_CATALOG.filter((item) => category === "all" || item.category === category);
      const ledger = state.wallet.ledger || [];

      container.innerHTML = `
        <div class="sprk-card" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;">
          <div>
            <div class="sprk-label">Your Wallet</div>
            <div class="tabular-nums" style="font-size:24px;font-weight:700;">
              ${state.user ? `${state.wallet.balance} SC` : "— SC"}
            </div>
            <div class="sprk-meta">
              ${state.user
                ? `Earned ${state.wallet.earned} SC · Spent ${state.wallet.spent} SC`
                : "Sign in with Supabase to earn and spend server-verified Study Credits."}
            </div>
          </div>
          <div style="text-align:right;font-size:12px;color:var(--muted);">
            <div>25m verified focus = 10 SC</div>
            <div>Daily cap: 120 SC</div>
          </div>
        </div>

        <div class="sprk-tabs">
          <button type="button" class="sprk-tab ${category === "all" ? "is-active" : ""}" data-cat="all">All Wares</button>
          <button type="button" class="sprk-tab ${category === "theme" ? "is-active" : ""}" data-cat="theme">Room Themes</button>
          <button type="button" class="sprk-tab ${category === "skin" ? "is-active" : ""}" data-cat="skin">Object Skins</button>
        </div>

        ${statusMessage ? `<div class="sprk-notice" role="status" style="margin-bottom:12px;">${escapeHtml(statusMessage)}</div>` : ""}

        <div class="sprk-grid-2" style="margin-bottom:16px;">
          ${items.map((item) => {
            const owned = state.ownedItemIds.includes(item.id);
            return `
              <div class="sprk-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:10px;">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <strong style="font-size:14px;">${escapeHtml(item.name)}</strong>
                    <span style="width:16px;height:16px;border-radius:4px;border:1px solid var(--ink);background:${escapeHtml(item.swatch)};flex-shrink:0;"></span>
                  </div>
                  <div class="sprk-meta" style="margin:4px 0 6px;">
                    <span>${escapeHtml(item.rarity)}</span>
                    <span aria-hidden="true">·</span>
                    <span class="tabular-nums">${item.price === 0 ? "Starter" : `${item.price} SC`}</span>
                    ${item.premiumOnly ? `<span aria-hidden="true">·</span><span>Premium</span>` : ""}
                  </div>
                  <p style="margin:0;font-size:12px;color:var(--muted);">${escapeHtml(item.description)}</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button type="button" class="sprk-btn" data-preview="${escapeHtml(item.id)}" style="min-height:34px;padding:4px 10px;">Preview</button>
                  ${owned
                    ? `<button type="button" class="sprk-btn sprk-btn-primary" data-equip="${escapeHtml(item.id)}" style="min-height:34px;padding:4px 12px;">Equip</button>`
                    : `<button type="button" class="sprk-btn sprk-btn-primary" data-buy="${escapeHtml(item.id)}" ${!state.user ? "disabled" : ""} style="min-height:34px;padding:4px 12px;">Buy (${item.price} SC)</button>`}
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="sprk-card">
          <h3 style="margin:0 0 8px;font-size:14px;">Recent Ledger Entries</h3>
          ${ledger.length === 0
            ? `<div class="sprk-meta">No server transactions yet.</div>`
            : ledger.slice(0, 8).map((tx) => `
              <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                <span>${escapeHtml(tx.description || tx.tx_type)}</span>
                <span class="tabular-nums">${tx.amount > 0 ? `+${tx.amount}` : tx.amount} SC</span>
              </div>
            `).join("")}
        </div>
      `;

      container.querySelectorAll("[data-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
          category = btn.dataset.cat;
          renderView();
        });
      });

      const applyVisual = (item, persist) => {
        if (item.themeId) themeManager.apply(item.themeId, { persist });
        if (item.skinName) skinManager.applySkin(item.targetObject, item.skinName, { persist });
      };

      container.querySelectorAll("[data-preview]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = SHOP_CATALOG.find((i) => i.id === btn.dataset.preview);
          if (item) {
            applyVisual(item, false);
            statusMessage = `Previewing "${item.name}" in your room.`;
            renderView();
          }
        });
      });

      container.querySelectorAll("[data-equip]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = SHOP_CATALOG.find((i) => i.id === btn.dataset.equip);
          if (item) {
            applyVisual(item, true);
            statusMessage = `Equipped "${item.name}".`;
            renderView();
          }
        });
      });

      container.querySelectorAll("[data-buy]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const res = await purchaseShopItem(btn.dataset.buy);
          statusMessage = res.ok ? "Purchased and added to your inventory!" : (res.error || "Purchase failed.");
          rerender();
        });
      });
    };

    renderView();
  }
};
