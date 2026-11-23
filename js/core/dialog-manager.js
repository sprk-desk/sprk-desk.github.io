// Object-Specific Accessible Dialog Engine with Universal Per-Object Skins Tab & Lock Control
import { navigateToFeature } from "../router.js";
import { state } from "../state.js";
import { getDialogObjectMeta, renderObjectSkinVisual } from "../utils/dialog-objects.js";
import { getObjectTypeForFeature, getObjectSkinInventory } from "../utils/object-skins.js";
import { SHOP_CATALOG } from "../utils/shop-catalog.js";
import { renderPreviewStage } from "../utils/shop-preview.js";
import { purchaseShopItem } from "../services/economy-service.js";
import { skinManager } from "./skin-manager.js";
import { escapeHtml } from "../utils/dom.js";

const FEATURE_TAB_LABELS = {
  focus: "⏱ Timer",
  register: "⏳ Register",
  calendar: "📅 Calendar",
  tasks: "📌 Board",
  diary: "📓 Pages",
  audio: "🎵 Sound",
  shop: "🛍️ Shop",
  customization: "🪴 Studio",
  environment: "🌤 Window",
  profile: "🪪 Profile",
  friends: "💬 Friends",
  community: "🌐 Rooms",
  buddy: "🐾 Guide",
  library: "📚 Library",
  cabinet: "🗂 Drawer",
  achievements: "🏆 Passport",
  coffee: "☕ Break",
  customProp: "✨ Keepsake"
};

class DialogManager {
  constructor() {
    this.dialog = null;
    this.bodyEl = null;
    this.modeBarEl = null;
    this.titleEl = null;
    this.eyebrowEl = null;
    this.iconEl = null;
    this.activeFeature = null;
    this.activeParam = null;
    this.activeMode = "feature"; // "feature" | "skins"
    this.lastTrigger = null;
    this.renderers = new Map();
    this.cleanupFn = null;
  }

  init() {
    this.dialog = document.getElementById("sprk-dialog");
    this.bodyEl = document.getElementById("sprk-dialog-body");
    this.modeBarEl = document.getElementById("sprk-dialog-modebar");
    this.titleEl = document.getElementById("sprk-dialog-title");
    this.eyebrowEl = document.getElementById("sprk-dialog-eyebrow");
    this.iconEl = document.getElementById("sprk-dialog-icon");

    const closeBtn = this.dialog?.querySelector(".sprk-dialog-close");
    closeBtn?.addEventListener("click", () => this.close());

    this.dialog?.addEventListener("click", (event) => {
      if (event.target === this.dialog) this.close();
    });

    this.dialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
  }

  register(feature, renderer) {
    this.renderers.set(feature, renderer);
  }

  syncHeader(feature) {
    const themeId = state.preferences?.theme || "comic";
    const skinsMap = state.preferences?.skins || {};
    const customProp = state.spectatingRoom?.customProp || state.preferences?.customProp || null;
    const meta = getDialogObjectMeta(feature, themeId, skinsMap, customProp);
    if (this.eyebrowEl) {
      this.eyebrowEl.textContent = "";
      this.eyebrowEl.hidden = true;
    }
    if (this.titleEl) {
      this.titleEl.textContent = meta.objectName;
    }
    if (this.iconEl) {
      this.iconEl.innerHTML = meta.pictureHtml;
    }
    this.syncModeBar(feature);
  }

  syncModeBar(feature) {
    if (!this.modeBarEl) return;
    const objectType = getObjectTypeForFeature(feature);
    if (!objectType) {
      this.modeBarEl.innerHTML = "";
      this.modeBarEl.hidden = true;
      return;
    }

    const inv = getObjectSkinInventory({
      objectType,
      ownedItemIds: state.ownedItemIds,
      roomThemeId: state.preferences?.theme || "comic",
      activeSkins: state.preferences?.skins || {},
      lockedSkins: state.preferences?.lockedSkins || {}
    });

    this.modeBarEl.hidden = false;
    const featureLabel = FEATURE_TAB_LABELS[feature] || "Details";
    this.modeBarEl.innerHTML = `
      <div class="sprk-modebar-tabs" role="tablist" aria-label="Dialog mode">
        <button type="button" class="sprk-mode-tab ${this.activeMode === "feature" ? "is-active" : ""}" data-dialog-mode="feature">
          ${escapeHtml(featureLabel)}
        </button>
        <button type="button" class="sprk-mode-tab ${this.activeMode === "skins" ? "is-active" : ""}" data-dialog-mode="skins">
          🎨 Skins <span class="sprk-mode-count tabular-nums">(${inv.owned.length})</span>
        </button>
      </div>
      <button type="button" class="sprk-lock-btn ${inv.isLocked ? "is-locked" : ""}" id="sprk-obj-lock-btn"
        title="${inv.isLocked ? "Locked: applying a room theme keeps this object's skin" : "Unlocked: room themes update this object"}">
        ${inv.isLocked ? "🔒 Skin Locked" : "🔓 Lock Skin"}
      </button>
    `;

    this.modeBarEl.querySelectorAll("[data-dialog-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextMode = btn.dataset.dialogMode;
        if (nextMode !== this.activeMode) {
          this.activeMode = nextMode;
          this.rerender();
        }
      });
    });

    this.modeBarEl.querySelector("#sprk-obj-lock-btn")?.addEventListener("click", () => {
      skinManager.toggleLock(objectType);
      this.syncHeader(feature);
      if (this.activeMode === "skins") {
        this.rerender();
      }
    });
  }

  openObjectSkinPreview(objectType, skinEntry, roomThemeId) {
    const previewDialog = document.getElementById("sprk-preview-dialog");
    const previewEyebrow = document.getElementById("sprk-preview-eyebrow");
    const previewTitle = document.getElementById("sprk-preview-title");
    const previewBody = document.getElementById("sprk-preview-body");
    const previewClose = previewDialog?.querySelector(".sprk-preview-close");
    if (!previewDialog || !previewBody) return;

    const shopItem = skinEntry.shopItemId
      ? SHOP_CATALOG.find((i) => i.id === skinEntry.shopItemId)
      : null;

    const closePreview = () => {
      if (previewDialog.open) previewDialog.close();
    };
    previewClose?.addEventListener("click", closePreview, { once: true });

    previewEyebrow.textContent = skinEntry.kind === "theme-bundle"
      ? `Theme Bundle Skin · ${skinEntry.bundleName || skinEntry.name}`
      : "Object Skin Preview";
    previewTitle.textContent = skinEntry.name;

    const roomStageHtml = skinEntry.kind === "theme-bundle" && shopItem
      ? renderPreviewStage(shopItem, { currentThemeId: roomThemeId })
      : "";

    previewBody.innerHTML = `
      <div class="sprk-preview-stage-wrap">
        <div class="sprk-object-stage" data-preview-mode="object">
          <div class="sprk-object-halo" style="background:${escapeHtml(skinEntry.swatch || "#e76d50")};"></div>
          <div class="sprk-object-figure">
            ${renderObjectSkinVisual(objectType, skinEntry.skinId, roomThemeId)}
          </div>
          <div class="sprk-object-pedestal"></div>
        </div>
        ${roomStageHtml ? `<details style="margin-top:8px;"><summary class="sprk-meta" style="cursor:pointer;">View Full ${escapeHtml(skinEntry.name)} Room Bundle</summary><div style="margin-top:8px;">${roomStageHtml}</div></details>` : ""}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid rgba(52,44,37,0.14);padding-top:12px;">
        <div class="sprk-meta">
          <span>${escapeHtml(skinEntry.rarity || "skin")}</span>
          <span aria-hidden="true">·</span>
          <span class="tabular-nums">${skinEntry.price > 0 ? `${skinEntry.price} SC` : "Starter"}</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="sprk-btn" id="sprk-skin-prev-close" style="min-height:36px;padding:6px 12px;">Close</button>
          ${skinEntry.shopItemId
            ? `<button type="button" class="sprk-btn sprk-btn-primary" id="sprk-skin-prev-buy" ${!state.user ? "disabled" : ""} style="min-height:36px;padding:6px 14px;">Buy (${skinEntry.price} SC)</button>`
            : ""}
        </div>
      </div>
    `;

    previewBody.querySelector("#sprk-skin-prev-close")?.addEventListener("click", closePreview);
    previewBody.querySelector("#sprk-skin-prev-buy")?.addEventListener("click", async () => {
      const res = await purchaseShopItem(skinEntry.shopItemId);
      closePreview();
      if (res.ok) {
        skinManager.applySkin(objectType, skinEntry.skinId, { persist: true });
      }
      this.rerender();
    });

    if (!previewDialog.open) {
      previewDialog.showModal();
    }
  }

  renderObjectSkinsTab(feature, objectType) {
    let statusMessage = "";
    const renderSkins = () => {
      const roomThemeId = state.preferences?.theme || "comic";
      const inv = getObjectSkinInventory({
        objectType,
        ownedItemIds: state.ownedItemIds,
        roomThemeId,
        activeSkins: state.preferences?.skins || {},
        lockedSkins: state.preferences?.lockedSkins || {}
      });
      const isOverridden = Boolean(state.preferences?.skins?.[objectType]);

      this.bodyEl.innerHTML = `
        <div class="sprk-skins-topbar">
          <div class="sprk-badge-row">
            <span class="sprk-badge-chip">${inv.isLocked ? "🔒 Locked on theme change" : "🔄 Follows room theme"}</span>
            ${isOverridden ? `<button type="button" class="sprk-btn" id="sprk-skin-match-room" style="min-height:30px;padding:3px 10px;font-size:12px;">Match Room Theme</button>` : ""}
          </div>
          <span class="sprk-meta tabular-nums">🪙 ${state.user ? `${state.wallet.balance} SC` : "Guest"}</span>
        </div>

        ${statusMessage ? `<div class="sprk-notice" role="status" style="margin-bottom:12px;">${escapeHtml(statusMessage)}</div>` : ""}

        <div class="sprk-skins-group-label">
          <strong>Owned Skins</strong>
          <span class="sprk-meta tabular-nums">${inv.owned.length}</span>
        </div>

        <div class="sprk-skins-grid" id="sprk-owned-skins-grid">
          ${inv.owned.map((skin) => `
            <button type="button" class="sprk-skin-tile ${skin.active ? "is-active" : ""}" data-equip-obj-skin="${escapeHtml(skin.skinId)}">
              <div class="sprk-skin-tile-visual">
                ${renderObjectSkinVisual(objectType, skin.skinId, roomThemeId)}
              </div>
              <div class="sprk-skin-tile-info">
                <strong>${escapeHtml(skin.name)}</strong>
                <span class="sprk-meta">${skin.active ? "Equipped" : (skin.kind === "theme-bundle" ? "Theme Skin" : "Owned")}</span>
              </div>
            </button>
          `).join("")}
        </div>

        <div class="sprk-skins-separator" role="separator">
          <span>Not Bought (${inv.unowned.length})</span>
        </div>

        ${inv.unowned.length === 0 ? `
          <div class="sprk-empty" style="padding:14px;">All skins for this object are owned!</div>
        ` : `
          <div class="sprk-skins-grid" id="sprk-unowned-skins-grid">
            ${inv.unowned.map((skin) => `
              <div class="sprk-skin-tile is-unowned">
                <div class="sprk-skin-tile-visual">
                  ${renderObjectSkinVisual(objectType, skin.skinId, roomThemeId)}
                </div>
                <div class="sprk-skin-tile-info">
                  <strong>${escapeHtml(skin.name)}</strong>
                  <span class="sprk-meta tabular-nums">
                    ${skin.kind === "theme-bundle" ? `Theme Bundle · ${skin.price} SC` : `${skin.price} SC`}
                  </span>
                  <div class="sprk-skin-tile-actions">
                    <button type="button" class="sprk-btn" data-preview-obj-skin="${escapeHtml(skin.skinId)}" style="min-height:28px;padding:3px 8px;font-size:11px;">Preview</button>
                    ${state.user
                      ? `<button type="button" class="sprk-btn sprk-btn-primary" data-buy-obj-skin="${escapeHtml(skin.shopItemId)}" data-buy-skin-id="${escapeHtml(skin.skinId)}" style="min-height:28px;padding:3px 8px;font-size:11px;">Buy</button>`
                      : `<button type="button" class="sprk-btn" data-go-shop="${skin.kind === "theme-bundle" ? "theme" : "skin"}" style="min-height:28px;padding:3px 8px;font-size:11px;">Shop →</button>`}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      `;

      this.bodyEl.querySelector("#sprk-skin-match-room")?.addEventListener("click", () => {
        skinManager.applySkin(objectType, "default", { persist: true });
        this.syncHeader(feature);
        renderSkins();
      });

      this.bodyEl.querySelectorAll("[data-equip-obj-skin]").forEach((btn) => {
        btn.addEventListener("click", () => {
          skinManager.applySkin(objectType, btn.dataset.equipObjSkin, { persist: true });
          this.syncHeader(feature);
          renderSkins();
        });
      });

      this.bodyEl.querySelectorAll("[data-preview-obj-skin]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const skinEntry = inv.unowned.find((s) => s.skinId === btn.dataset.previewObjSkin);
          if (skinEntry) {
            this.openObjectSkinPreview(objectType, skinEntry, roomThemeId);
          }
        });
      });

      this.bodyEl.querySelectorAll("[data-buy-obj-skin]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const res = await purchaseShopItem(btn.dataset.buyObjSkin);
          if (res.ok) {
            skinManager.applySkin(objectType, btn.dataset.buySkinId, { persist: true });
            statusMessage = "Unlocked and equipped!";
          } else {
            statusMessage = res.error || "Purchase failed.";
          }
          this.syncHeader(feature);
          renderSkins();
        });
      });

      this.bodyEl.querySelectorAll("[data-go-shop]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          this.open("shop", e.currentTarget, btn.dataset.goShop);
        });
      });
    };

    renderSkins();
    return null;
  }

  open(feature, triggerEl = null, param = null, { syncHash = true } = {}) {
    if (!this.dialog || !this.renderers.has(feature)) return;
    if (this.dialog.open && this.activeFeature === feature && this.activeParam === param) {
      return;
    }
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }

    this.lastTrigger = triggerEl || document.activeElement;
    this.activeFeature = feature;
    this.activeParam = param;
    this.activeMode = "feature";
    const renderer = this.renderers.get(feature);

    this.dialog.dataset.dialogSkin = renderer.skin || feature;
    this.syncHeader(feature);

    this.bodyEl.innerHTML = "";
    const maybeCleanup = renderer.render(this.bodyEl, {
      param,
      rerender: () => this.rerender(),
      close: () => this.close()
    });
    if (typeof maybeCleanup === "function") {
      this.cleanupFn = maybeCleanup;
    }

    if (!this.dialog.open) {
      this.dialog.showModal();
    }
    if (syncHash) {
      navigateToFeature(feature, param);
    }
  }

  setParam(param = null, { syncHash = true } = {}) {
    this.activeParam = param || null;
    if (syncHash && this.activeFeature) {
      navigateToFeature(this.activeFeature, this.activeParam);
    }
  }

  rerender() {
    if (!this.activeFeature || !this.dialog?.open) return;
    const renderer = this.renderers.get(this.activeFeature);
    if (!renderer) return;
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    this.syncHeader(this.activeFeature);
    this.bodyEl.innerHTML = "";

    const objectType = getObjectTypeForFeature(this.activeFeature);
    if (this.activeMode === "skins" && objectType) {
      this.renderObjectSkinsTab(this.activeFeature, objectType);
      return;
    }

    const maybeCleanup = renderer.render(this.bodyEl, {
      param: this.activeParam,
      rerender: () => this.rerender(),
      close: () => this.close()
    });
    if (typeof maybeCleanup === "function") {
      this.cleanupFn = maybeCleanup;
    }
  }

  close({ syncHash = true } = {}) {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    this.activeFeature = null;
    this.activeParam = null;
    this.activeMode = "feature";
    if (this.dialog?.open) {
      this.dialog.close();
    }
    if (syncHash && window.location.hash && window.location.hash !== "#/") {
      navigateToFeature("room");
    }
    if (this.lastTrigger && typeof this.lastTrigger.focus === "function" && document.contains(this.lastTrigger)) {
      this.lastTrigger.focus();
      this.lastTrigger = null;
    }
  }
}

export const dialogManager = new DialogManager();
