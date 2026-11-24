// Visiting Merchant Bird -> Desk Shop, Category Navigation, Mini Thumbnails & Small Preview Dialog
import { state, savePreferences } from "../state.js";
import { purchaseShopItem } from "../services/economy-service.js";
import {
  SHOP_CATEGORIES,
  SHOP_CATALOG,
  normalizeShopCategory,
  filterShopCatalog,
  getShopCategoryCounts,
  groupShopCatalogByCategory,
  getShopPreviewDescriptor
} from "../utils/shop-catalog.js";
import { renderMiniThumbnail, renderPreviewStage } from "../utils/shop-preview.js";
import { themeManager } from "../core/theme-manager.js";
import { skinManager } from "../core/skin-manager.js";
import { audioManager, AUDIO_CHANNELS } from "../core/audio-manager.js";
import { lightingManager } from "../core/lighting-manager.js";
import { decorationManager } from "../core/decoration-manager.js";
import { dialogManager } from "../core/dialog-manager.js";
import { isStrictFocusLockActive } from "../core/settings-manager.js";
import { escapeHtml } from "../utils/dom.js";
import {
  isThemeAccessibleInMode,
  isThemeFreeInMode,
  isSeriousTheme
} from "../utils/room-settings.js";

export function equipShopItem(item) {
  if (!item) return false;
  if (item.category === "theme" && item.themeId) {
    themeManager.apply(item.themeId, { persist: true });
    return true;
  }
  if (item.category === "skin" && item.skinName) {
    skinManager.applySkin(item.targetObject, item.skinName, { persist: true });
    return true;
  }
  if (item.category === "music" && item.audioMix) {
    for (const ch of AUDIO_CHANNELS) {
      audioManager.setChannelLevel(ch.id, item.audioMix[ch.id] || 0);
    }
    if (!audioManager.isPlaying) {
      audioManager.togglePlay(true).catch(() => {});
    }
    savePreferences({ activeMusicId: item.id });
    return true;
  }
  if (item.category === "ambience" && item.ambiencePreset) {
    const preset = item.ambiencePreset;
    savePreferences({
      timeOfDay: preset.timeOfDay || "auto",
      weather: preset.weather || "clear",
      lighting: preset.lighting || {},
      activeAmbienceId: item.id
    });
    lightingManager.apply();
    return true;
  }
  if (item.category === "deco" && item.decoSlot && item.decoStyle) {
    decorationManager.setSlotStyle(item.decoSlot, item.decoStyle, { persist: true });
    return true;
  }
  return false;
}

export function isShopItemEquipped(item) {
  if (!item) return false;
  if (item.category === "theme") {
    return (state.preferences.theme || "comic") === item.themeId;
  }
  if (item.category === "skin") {
    return (state.preferences.skins?.[item.targetObject] || "default") === item.skinName;
  }
  if (item.category === "music") {
    return state.preferences.activeMusicId === item.id;
  }
  if (item.category === "ambience") {
    return state.preferences.activeAmbienceId === item.id;
  }
  if (item.category === "deco" && item.decoSlot && item.decoStyle) {
    return decorationManager.getActiveDecorations()[item.decoSlot] === item.decoStyle;
  }
  return false;
}

export const shopFeature = {
  skin: "shop",
  eyebrow: "TRAVELING MERCHANT · DESK SHOP",
  title: "The Bird's Curio Shop",
  icon: "🐦",
  render(container, { param, rerender }) {
    let category = normalizeShopCategory(param);
    let statusMessage = "";
    let previewAudioSnapshot = null;
    let previewingAudioItemId = null;

    const previewDialog = document.getElementById("sprk-preview-dialog");
    const previewEyebrow = document.getElementById("sprk-preview-eyebrow");
    const previewTitle = document.getElementById("sprk-preview-title");
    const previewBody = document.getElementById("sprk-preview-body");
    const previewCloseBtn = previewDialog?.querySelector(".sprk-preview-close");

    const stopAudioSample = () => {
      if (!previewAudioSnapshot) return;
      for (const ch of AUDIO_CHANNELS) {
        audioManager.setChannelLevel(ch.id, previewAudioSnapshot.levels[ch.id] || 0);
      }
      if (!previewAudioSnapshot.wasPlaying && audioManager.isPlaying) {
        audioManager.togglePlay(false).catch(() => {});
      }
      previewAudioSnapshot = null;
      previewingAudioItemId = null;
    };

    const closePreviewDialog = () => {
      stopAudioSample();
      if (previewDialog?.open) {
        previewDialog.close();
      }
    };

    const onPreviewBackdropClick = (event) => {
      if (event.target === previewDialog) closePreviewDialog();
    };
    const onPreviewCancel = (event) => {
      event.preventDefault();
      closePreviewDialog();
    };

    previewCloseBtn?.addEventListener("click", closePreviewDialog);
    previewDialog?.addEventListener("click", onPreviewBackdropClick);
    previewDialog?.addEventListener("cancel", onPreviewCancel);

    const openItemPreview = (item) => {
      if (!previewDialog || !previewBody || !item) return;
      const locked = isStrictFocusLockActive();
      const currentThemeId = state.preferences.theme || "comic";
      const seriousMode = Boolean(state.preferences?.seriousMode);
      const desc = getShopPreviewDescriptor(item, currentThemeId);
      const actuallyOwned = state.ownedItemIds.includes(item.id);
      const freeViaSerious = Boolean(
        seriousMode && item.category === "theme" && isSeriousTheme(item.themeId) && !actuallyOwned
      );
      const owned = item.category === "theme"
        ? isThemeAccessibleInMode(item.themeId, { ownedItemIds: state.ownedItemIds, seriousMode })
        : actuallyOwned;
      const equipped = isShopItemEquipped(item);
      const isPlayingSample = previewingAudioItemId === item.id;

      previewEyebrow.textContent = desc?.subtitle || "ITEM PREVIEW";
      previewTitle.textContent = item.name;

      previewBody.innerHTML = `
        ${renderPreviewStage(item, { currentThemeId, isPlayingSample })}
        <p style="margin:0 0 12px;font-size:13px;color:var(--muted);">${escapeHtml(item.description)}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid rgba(52,44,37,0.14);padding-top:12px;">
          <div class="sprk-meta">
            <span>${escapeHtml(item.rarity)}</span>
            <span aria-hidden="true">·</span>
            <span class="tabular-nums">${freeViaSerious ? "Free (Serious Mode)" : (item.price === 0 ? "Starter" : `${item.price} SC`)}</span>
            ${item.premiumOnly ? `<span aria-hidden="true">·</span><span>Premium</span>` : ""}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="sprk-btn" id="sprk-preview-dismiss" style="min-height:36px;padding:6px 12px;">Close</button>
            ${owned
              ? `${equipped && item.category === "deco"
                  ? `<button type="button" class="sprk-btn" id="sprk-preview-remove-deco" ${locked ? "disabled" : ""} style="min-height:36px;padding:6px 12px;">Remove</button>`
                  : `<button type="button" class="sprk-btn sprk-btn-primary" id="sprk-preview-equip" style="min-height:36px;padding:6px 14px;" ${equipped || locked ? "disabled" : ""}>${equipped ? "Equipped" : "Equip"}</button>`}`
              : `<button type="button" class="sprk-btn sprk-btn-primary" id="sprk-preview-buy" ${!state.user || locked ? "disabled" : ""} style="min-height:36px;padding:6px 14px;">Buy (${item.price} SC)</button>`}
          </div>
        </div>
      `;

      previewBody.querySelector("#sprk-preview-dismiss")?.addEventListener("click", closePreviewDialog);
      previewBody.querySelector("#sprk-preview-remove-deco")?.addEventListener("click", () => {
        if (isStrictFocusLockActive()) return;
        decorationManager.setSlotStyle(item.decoSlot, "none", { persist: true });
        statusMessage = `Removed "${item.name}".`;
        closePreviewDialog();
        renderView();
      });

      previewBody.querySelector("#sprk-preview-audio-btn")?.addEventListener("click", async () => {
        if (previewingAudioItemId === item.id) {
          stopAudioSample();
          openItemPreview(item);
          return;
        }
        if (!previewAudioSnapshot) {
          previewAudioSnapshot = {
            wasPlaying: audioManager.isPlaying,
            levels: { ...audioManager.levels }
          };
        }
        for (const ch of AUDIO_CHANNELS) {
          audioManager.setChannelLevel(ch.id, item.audioMix?.[ch.id] || 0);
        }
        previewingAudioItemId = item.id;
        await audioManager.togglePlay(true);
        openItemPreview(item);
      });

      previewBody.querySelector("#sprk-preview-equip")?.addEventListener("click", () => {
        if (isStrictFocusLockActive()) return;
        if (item.category === "music") {
          previewAudioSnapshot = null;
          previewingAudioItemId = null;
        }
        equipShopItem(item);
        statusMessage = `Equipped "${item.name}".`;
        closePreviewDialog();
        renderView();
      });

      previewBody.querySelector("#sprk-preview-buy")?.addEventListener("click", async () => {
        if (isStrictFocusLockActive()) return;
        const res = await purchaseShopItem(item.id);
        statusMessage = res.ok ? `Purchased "${item.name}"!` : (res.error || "Purchase failed.");
        closePreviewDialog();
        rerender();
      });

      if (!previewDialog.open) {
        previewDialog.showModal();
      }
    };

    const navigateToCategory = (nextCat) => {
      const normalized = normalizeShopCategory(nextCat);
      category = normalized;
      const routeParam = normalized === "all" ? null : normalized;
      dialogManager.setParam(routeParam, { syncHash: true });
      renderView();
      container.scrollTop = 0;
    };

    const renderItemCard = (item, currentThemeId, seriousMode, locked) => {
      const actuallyOwned = state.ownedItemIds.includes(item.id);
      const freeViaSerious = Boolean(
        seriousMode && item.category === "theme" && isThemeFreeInMode(item.themeId, seriousMode) && !actuallyOwned && item.price > 0
      );
      const owned = item.category === "theme"
        ? isThemeAccessibleInMode(item.themeId, { ownedItemIds: state.ownedItemIds, seriousMode })
        : actuallyOwned;
      const equipped = isShopItemEquipped(item);
      return `
        <article class="sprk-card sprk-shop-card" data-item-id="${escapeHtml(item.id)}">
          <div class="sprk-shop-card-top">
            ${renderMiniThumbnail(item, currentThemeId)}
            <div class="sprk-shop-card-info">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <strong style="font-size:14px;">${escapeHtml(item.name)}</strong>
                <span style="width:14px;height:14px;border-radius:4px;border:1px solid var(--ink);background:${escapeHtml(item.swatch)};flex-shrink:0;" aria-hidden="true"></span>
              </div>
              <div class="sprk-meta" style="margin:5px 0 2px;">
                <span>${item.category === "theme" ? "Skin Bundle" : escapeHtml(item.rarity)}</span>
                <span aria-hidden="true">·</span>
                <span class="tabular-nums">${freeViaSerious ? "Free (Serious Mode)" : (item.price === 0 ? "Starter" : `${item.price} SC`)}</span>
                ${item.premiumOnly ? `<span aria-hidden="true">·</span><span>${seriousMode ? "Pro" : "★"}</span>` : ""}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="sprk-btn" data-preview="${escapeHtml(item.id)}" aria-label="Preview ${escapeHtml(item.name)}" style="min-height:34px;padding:4px 10px;">Preview</button>
            ${owned
              ? `<button type="button" class="sprk-btn sprk-btn-primary" data-equip="${escapeHtml(item.id)}" aria-label="${equipped ? `${escapeHtml(item.name)} equipped` : `Equip ${escapeHtml(item.name)}`}" ${equipped || locked ? "disabled" : ""} style="min-height:34px;padding:4px 12px;">${equipped ? "Equipped" : "Equip"}</button>
                 ${equipped && item.category === "deco" ? `<button type="button" class="sprk-btn" data-remove-deco="${escapeHtml(item.decoSlot)}" aria-label="Remove ${escapeHtml(item.name)}" ${locked ? "disabled" : ""} style="min-height:34px;padding:4px 10px;">Remove</button>` : ""}`
              : `<button type="button" class="sprk-btn sprk-btn-primary" data-buy="${escapeHtml(item.id)}" aria-label="Buy ${escapeHtml(item.name)} for ${item.price} SC" ${!state.user || locked ? "disabled" : ""} style="min-height:34px;padding:4px 12px;">Buy · ${item.price} SC</button>`}
          </div>
        </article>
      `;
    };

    const renderView = () => {
      const counts = getShopCategoryCounts(SHOP_CATALOG);
      const currentThemeId = state.preferences.theme || "comic";
      const seriousMode = Boolean(state.preferences?.seriousMode);
      const locked = isStrictFocusLockActive();
      const activeMeta = SHOP_CATEGORIES.find((c) => c.id === category) || SHOP_CATEGORIES[0];
      const ledger = state.wallet.ledger || [];

      const catalogMarkup = category === "all"
        ? `
          <div class="sprk-shop-dept-grid" aria-label="Shop departments">
            ${SHOP_CATEGORIES.filter((c) => c.id !== "all").map((dept) => `
              <button type="button" class="sprk-shop-dept-card" data-nav-cat="${dept.id}">
                ${seriousMode ? "" : `<span class="sprk-shop-dept-icon" aria-hidden="true">${dept.icon}</span>`}
                <span class="sprk-shop-dept-title">${escapeHtml(dept.label)}</span>
                <span class="sprk-shop-dept-count">${counts[dept.id] || 0} →</span>
              </button>
            `).join("")}
          </div>

          ${groupShopCatalogByCategory(SHOP_CATALOG).map((group) => `
            <section class="sprk-shop-section" data-section-cat="${group.category.id}" aria-label="${escapeHtml(group.category.label)}">
              <div class="sprk-shop-section-head">
                <h3>${seriousMode ? "" : `<span aria-hidden="true">${group.category.icon}</span> `}${escapeHtml(group.category.label)} (${group.items.length})</h3>
                <button type="button" class="sprk-btn" data-nav-cat="${group.category.id}" style="min-height:32px;padding:4px 10px;">
                  ${escapeHtml(group.category.shortLabel)} →
                </button>
              </div>
              <div class="sprk-grid-2" style="margin-bottom:14px;">
                ${group.items.map((item) => renderItemCard(item, currentThemeId, seriousMode, locked)).join("")}
              </div>
            </section>
          `).join("")}
        `
        : `
          <div class="sprk-shop-section-head" style="margin-top:4px;">
            <h3>${seriousMode ? "" : `<span aria-hidden="true">${activeMeta.icon}</span> `}${escapeHtml(activeMeta.label)} (${counts[category] || 0})</h3>
            <button type="button" class="sprk-btn" data-nav-cat="all" style="min-height:32px;padding:4px 10px;">← All</button>
          </div>
          <div class="sprk-grid-2" style="margin-bottom:16px;">
            ${filterShopCatalog(SHOP_CATALOG, category).map((item) => renderItemCard(item, currentThemeId, seriousMode, locked)).join("")}
          </div>
        `;

      container.innerHTML = `
        <nav class="sprk-shop-roof-tabs" aria-label="Shop categories">
          ${SHOP_CATEGORIES.map((cat) => `
            <button type="button" class="sprk-shop-roof-tab ${category === cat.id ? "is-active" : ""}" data-cat="${cat.id}">
              ${seriousMode ? "" : `<span class="sprk-roof-tab-icon" aria-hidden="true">${cat.icon}</span>`}
              <span class="sprk-roof-tab-label">${escapeHtml(cat.shortLabel === "All" ? (seriousMode ? "All Items" : "All Wares") : cat.shortLabel)}</span>
              <span class="sprk-roof-tab-count tabular-nums">${counts[cat.id] || 0}</span>
            </button>
          `).join("")}
        </nav>

        ${locked ? `<div class="sprk-notice" role="status" style="margin-bottom:12px;">Strict Focus Lock is active while your focus timer runs. Finish or pause your session to equip or buy items.</div>` : ""}

        <div class="sprk-shop-wallet-strip">
          <div class="sprk-badge-row">
            <span class="sprk-badge-chip tabular-nums sprk-gamified">${seriousMode ? "" : "🪙 "}${state.user ? `${state.wallet.balance} SC` : "— SC"}</span>
            ${state.user
              ? `<span class="sprk-meta tabular-nums sprk-gamified">+${state.wallet.earned} / -${state.wallet.spent} SC</span>`
              : `<span class="sprk-meta">${seriousMode ? "Local Mode" : "🔒 Guest"}</span>`}
          </div>
          <div class="sprk-shop-wallet-note tabular-nums sprk-gamified">
            <span>${seriousMode ? "25m = 10 SC" : "⏱ 25m = 10 SC"}</span>
            <span>·</span>
            <span>Cap 120 SC</span>
          </div>
        </div>

        ${statusMessage ? `<div class="sprk-notice" role="status" style="margin-bottom:12px;">${escapeHtml(statusMessage)}</div>` : ""}

        ${catalogMarkup}

        ${ledger.length > 0 ? `
          <div class="sprk-card">
            <h3 style="margin:0 0 8px;font-size:13px;">Ledger</h3>
            ${ledger.slice(0, 6).map((tx) => `
              <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                <span>${escapeHtml(tx.description || tx.tx_type)}</span>
                <span class="tabular-nums">${tx.amount > 0 ? `+${tx.amount}` : tx.amount} SC</span>
              </div>
            `).join("")}
          </div>
        ` : ""}
      `;

      container.querySelectorAll("[data-cat]").forEach((btn) => {
        btn.addEventListener("click", () => navigateToCategory(btn.dataset.cat));
      });

      container.querySelectorAll("[data-nav-cat]").forEach((btn) => {
        btn.addEventListener("click", () => navigateToCategory(btn.dataset.navCat));
      });

      container.querySelectorAll("[data-preview]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = SHOP_CATALOG.find((i) => i.id === btn.dataset.preview);
          if (item) openItemPreview(item);
        });
      });

      container.querySelectorAll("[data-equip]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (isStrictFocusLockActive()) return;
          const item = SHOP_CATALOG.find((i) => i.id === btn.dataset.equip);
          if (item && equipShopItem(item)) {
            if (item.category === "theme") dialogManager.syncHeader("shop");
            statusMessage = `Equipped "${item.name}"`;
            renderView();
          }
        });
      });

      container.querySelectorAll("[data-remove-deco]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (isStrictFocusLockActive()) return;
          decorationManager.setSlotStyle(btn.dataset.removeDeco, "none", { persist: true });
          statusMessage = "Decoration removed from slot.";
          renderView();
        });
      });

      container.querySelectorAll("[data-buy]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (isStrictFocusLockActive()) return;
          const res = await purchaseShopItem(btn.dataset.buy);
          statusMessage = res.ok ? "Added to inventory!" : (res.error || "Purchase failed.");
          rerender();
        });
      });
    };

    renderView();

    return () => {
      closePreviewDialog();
      previewCloseBtn?.removeEventListener("click", closePreviewDialog);
      previewDialog?.removeEventListener("click", onPreviewBackdropClick);
      previewDialog?.removeEventListener("cancel", onPreviewCancel);
    };
  }
};
