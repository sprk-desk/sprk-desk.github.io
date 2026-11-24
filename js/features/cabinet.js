// Cabinet Drawer -> File-Folder Tabs, Mini Visual Inventory Thumbnails, Live Previews, Saved Bookmarks & JSON Backup/Restore
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { SHOP_CATALOG } from "../services/economy-service.js";
import { getShopPreviewDescriptor } from "../utils/shop-catalog.js";
import { equipShopItem, isShopItemEquipped } from "./shop.js";
import { renderMiniThumbnail, renderPreviewStage } from "../utils/shop-preview.js";
import { audioManager, AUDIO_CHANNELS } from "../core/audio-manager.js";
import { isStrictFocusLockActive } from "../core/settings-manager.js";
import { dialogManager } from "../core/dialog-manager.js";
import { escapeHtml, todayIsoDate, downloadFile } from "../utils/dom.js";
import { validateBackupPayload } from "../utils/study-tools.js";
import { syncSavedResourceDelete } from "../services/database-service.js";

export const cabinetFeature = {
  skin: "cabinet",
  eyebrow: "",
  title: "Cabinet Drawer",
  icon: "🗄",
  render(container) {
    let tab = "inventory"; // inventory | saved | backup
    let statusMsg = "";
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
      if (previewDialog?.open) previewDialog.close();
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
      const desc = getShopPreviewDescriptor(item, currentThemeId);
      const equipped = isShopItemEquipped(item);
      const isPlayingSample = previewingAudioItemId === item.id;

      previewEyebrow.textContent = desc?.subtitle || "ITEM PREVIEW";
      previewTitle.textContent = item.name;

      previewBody.innerHTML = `
        ${renderPreviewStage(item, { currentThemeId, isPlayingSample })}
        <p style="margin:0 0 12px;font-size:13px;color:var(--muted);">${escapeHtml(item.description || "")}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid rgba(52,44,37,0.14);padding-top:12px;">
          <div class="sprk-meta">
            <span>${escapeHtml(item.rarity || "Owned")}</span>
            <span aria-hidden="true">·</span>
            <span style="text-transform:capitalize;">${escapeHtml(item.category)}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="sprk-btn" id="sprk-preview-dismiss" style="min-height:36px;padding:6px 12px;">Close</button>
            <button type="button" class="sprk-btn sprk-btn-primary" id="sprk-preview-equip" style="min-height:36px;padding:6px 14px;" ${equipped || locked ? "disabled" : ""}>${equipped ? "Equipped" : "Equip"}</button>
          </div>
        </div>
      `;

      previewBody.querySelector("#sprk-preview-dismiss")?.addEventListener("click", closePreviewDialog);
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
        if (item.category === "theme") dialogManager.syncHeader("cabinet");
        statusMsg = `Equipped "${item.name}".`;
        closePreviewDialog();
        renderView();
      });

      if (!previewDialog.open) previewDialog.showModal();
    };

    const renderView = () => {
      const saved = state.localSavedResources || [];
      const ownedItems = SHOP_CATALOG.filter((item) => state.ownedItemIds.includes(item.id));
      const currentThemeId = state.preferences.theme || "comic";
      const seriousMode = Boolean(state.preferences?.seriousMode);
      const locked = isStrictFocusLockActive();

      container.innerHTML = `
        <nav class="sprk-tabs sprk-tabs-folder" role="tablist" aria-label="Cabinet drawer folders">
          <button type="button" class="sprk-tab ${tab === "inventory" ? "is-active" : ""}" data-cabtab="inventory">${seriousMode ? `Inventory (${ownedItems.length})` : `🗂 Inventory (${ownedItems.length})`}</button>
          <button type="button" class="sprk-tab ${tab === "saved" ? "is-active" : ""}" data-cabtab="saved">${seriousMode ? `Saved (${saved.length})` : `🔖 Saved (${saved.length})`}</button>
          <button type="button" class="sprk-tab ${tab === "backup" ? "is-active" : ""}" data-cabtab="backup">${seriousMode ? "Backup & Restore" : "💾 Backup"}</button>
        </nav>

        ${statusMsg ? `<div class="sprk-notice" role="status" style="margin:10px 0 12px;">${escapeHtml(statusMsg)}</div>` : ""}

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
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="sprk-btn" data-cabinet-preview="${escapeHtml(item.id)}" style="min-height:34px;padding:4px 10px;">Preview</button>
                    <button type="button" class="sprk-btn sprk-btn-primary" data-cabinet-equip="${escapeHtml(item.id)}" ${equipped || locked ? "disabled" : ""} style="min-height:34px;padding:4px 12px;">
                      ${equipped ? "Equipped" : "Equip"}
                    </button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        ` : tab === "saved" ? `
          <div class="sprk-card">
            ${saved.length === 0 ? `
              <div class="sprk-empty">No saved guides yet.</div>
            ` : `
              <div style="display:grid;gap:8px;">
                ${saved.map((r) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <div>
                      <strong style="font-size:13.5px;">${seriousMode ? "" : "📖 "}${escapeHtml(r.title)}</strong>
                      <div class="sprk-meta">${escapeHtml(r.category || "Saved")}</div>
                    </div>
                    <button type="button" class="sprk-btn" data-remove-saved="${escapeHtml(r.id)}" style="min-height:32px;padding:4px 10px;">×</button>
                  </div>
                `).join("")}
              </div>
            `}
          </div>
        ` : `
          <div style="display:grid;gap:12px;">
            <div class="sprk-card">
              <strong style="font-size:14px;display:block;margin-bottom:4px;">Export Local Study Archive</strong>
              <p class="sprk-meta" style="margin:0 0 12px;">
                Downloads tasks, notes, study records, flashcards, exam countdowns, subject budgets, audio presets, and room preferences as portable JSON.
              </p>
              <button type="button" class="sprk-btn sprk-btn-primary" id="cab-export-json">Download Full Backup (.json)</button>
            </div>

            <div class="sprk-card">
              <strong style="font-size:14px;display:block;margin-bottom:4px;">Restore from Backup File</strong>
              <p class="sprk-meta" style="margin:0 0 10px;">
                Select a previously exported SPRK Desk backup JSON file to restore your local workspace data.
              </p>
              <input id="cab-restore-file" class="sprk-input" type="file" accept=".json,application/json" />
            </div>
          </div>
        `}
      `;

      container.querySelectorAll("[data-cabtab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.cabtab;
          statusMsg = "";
          renderView();
        });
      });

      container.querySelector("#cab-export-json")?.addEventListener("click", () => {
        const snapshot = {
          version: 1,
          exportedAt: new Date().toISOString(),
          preferences: state.preferences,
          localTasks: state.localTasks,
          localGoals: state.localGoals,
          localDiary: state.localDiary,
          localStudyRecords: state.localStudyRecords,
          localSavedResources: state.localSavedResources,
          localFlashcards: state.localFlashcards,
          localExams: state.localExams,
          localSubjectBudgets: state.localSubjectBudgets,
          localWorkspaceProfiles: state.localWorkspaceProfiles,
          localAudioPresets: state.localAudioPresets
        };
        downloadFile(`sprk-desk-backup-${todayIsoDate()}.json`, JSON.stringify(snapshot, null, 2), "application/json;charset=utf-8");
        statusMsg = "Full workspace backup downloaded.";
        renderView();
      });

      container.querySelector("#cab-restore-file")?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const validated = validateBackupPayload(parsed);
          if (!validated.ok) {
            statusMsg = validated.error;
            renderView();
            return;
          }
          const { data } = validated;
          if (data.preferences) {
            const { deepFocusMode: _legacyDeepFocus, ...cleanPrefs } = data.preferences;
            savePreferences(cleanPrefs);
          }
          if (Array.isArray(parsed.localWorkspaceProfiles)) {
            persistLocalCollection("localWorkspaceProfiles", parsed.localWorkspaceProfiles);
          }
          for (const key of [
            "localTasks",
            "localGoals",
            "localDiary",
            "localStudyRecords",
            "localSavedResources",
            "localFlashcards",
            "localExams",
            "localSubjectBudgets",
            "localAudioPresets"
          ]) {
            if (data[key] !== undefined) {
              persistLocalCollection(key, data[key]);
            }
          }
          statusMsg = "Backup restored cleanly.";
        } catch {
          statusMsg = "Could not parse JSON backup file.";
        }
        renderView();
      });

      container.querySelectorAll("[data-remove-saved]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.removeSaved;
          persistLocalCollection("localSavedResources", saved.filter((s) => s.id !== id));
          syncSavedResourceDelete(id);
          renderView();
        });
      });

      container.querySelectorAll("[data-cabinet-preview]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = SHOP_CATALOG.find((i) => i.id === btn.dataset.cabinetPreview);
          if (item) openItemPreview(item);
        });
      });

      container.querySelectorAll("[data-cabinet-equip]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (isStrictFocusLockActive()) return;
          const item = SHOP_CATALOG.find((i) => i.id === btn.dataset.cabinetEquip);
          if (item && equipShopItem(item)) {
            if (item.category === "theme") dialogManager.syncHeader("cabinet");
            statusMsg = `Equipped "${item.name}".`;
            renderView();
          }
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
