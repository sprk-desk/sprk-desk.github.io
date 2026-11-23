// Custom Keepsake Sprite Dialog -> Upload/Paste Custom Movable Sprite & Configure Display
import { state, savePreferences } from "../state.js";
import { decorationManager } from "../core/decoration-manager.js";
import { dialogManager } from "../core/dialog-manager.js";
import { uploadCustomPropFile } from "../services/database-service.js";
import { sanitizeAvatarUrl } from "../utils/profile-helpers.js";
import { escapeHtml } from "../utils/dom.js";

const SIZE_OPTIONS = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" }
];

const FRAME_OPTIONS = [
  { id: "sprite", label: "Cutout Sprite" },
  { id: "framed", label: "Framed Card" }
];

export const customPropFeature = {
  skin: "customization",
  eyebrow: "CUSTOM MOVABLE KEEPSAKE",
  title: "Custom Keepsake",
  icon: "✨",
  render(container) {
    let statusMessage = "";
    let statusIsError = false;
    let draft = { ...decorationManager.getActiveCustomProp() };

    const applyDraft = (patch, message = "Updated your custom keepsake!") => {
      draft = { ...draft, ...patch };
      savePreferences({ customProp: draft });
      decorationManager.applyCustomProp();
      dialogManager.syncHeader("customProp");
      statusMessage = message;
      statusIsError = false;
    };

    const renderView = () => {
      const safePreview = sanitizeAvatarUrl(draft.imageUrl || "");
      const savedEntry = state.savedLayouts?.[state.preferences.activeLayoutName || "Default Desk"]?.["custom-prop"];
      const placementLabel = savedEntry?.target === "desk"
        ? "Placed on Desk"
        : savedEntry?.target
          ? `Placed on ${savedEntry.target.replace("-", " ")}`
          : "Shelf 4 (Default)";

      container.innerHTML = `
        <div class="sprk-card" style="display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap;">
          <div style="width:76px;height:76px;border-radius:12px;border:2px solid var(--ink);background:var(--wall-light);display:grid;place-items:center;overflow:hidden;flex-shrink:0;padding:6px;">
            ${safePreview
              ? `<img src="${escapeHtml(safePreview)}" alt="${escapeHtml(draft.label)}" style="width:100%;height:100%;object-fit:${draft.frameStyle === "framed" ? "cover" : "contain"};border-radius:6px;" referrerpolicy="no-referrer">`
              : `<svg viewBox="0 0 96 96" style="width:100%;height:100%;" aria-hidden="true">
                  <rect x="14" y="14" width="68" height="68" rx="12" fill="#fffaf0" stroke="var(--ink)" stroke-width="3.2" stroke-dasharray="6 4"/>
                  <path d="M48 30 L52.5 42 L65 43.2 L55.4 51.5 L58.4 64 L48 57.2 L37.6 64 L40.6 51.5 L31 43.2 L43.5 42 Z" fill="#f3c65d" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"/>
                </svg>`}
          </div>
          <div style="min-width:0;flex:1;">
            <strong style="font-size:15px;display:block;margin-bottom:4px;">${escapeHtml(draft.label || "Custom Keepsake")}</strong>
            <div class="sprk-badge-row">
              <span class="sprk-badge-chip">✋ Movable (Desk or Shelf)</span>
              <span class="sprk-badge-chip">${escapeHtml(placementLabel)}</span>
            </div>
          </div>
        </div>

        ${statusMessage ? `<div class="${statusIsError ? "sprk-error" : "sprk-notice"}" role="status" style="margin-bottom:12px;">${escapeHtml(statusMessage)}</div>` : ""}

        <form id="custom-prop-form" style="display:grid;gap:12px;">
          <div class="sprk-grid-2">
            <div>
              <label for="custom-prop-label">Object Name</label>
              <input class="sprk-input" id="custom-prop-label" type="text" maxlength="32" value="${escapeHtml(draft.label || "Custom Keepsake")}" placeholder="My Plushie / Lucky Charm" />
            </div>
            <div>
              <label for="custom-prop-file">Upload Sprite Image (PNG / JPG / WEBP / GIF)</label>
              <input class="sprk-input" id="custom-prop-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="padding:7px;" />
            </div>
          </div>

          <div>
            <label for="custom-prop-url">Or Paste Direct Image URL (https:// or uploaded sprite)</label>
            <input class="sprk-input" id="custom-prop-url" type="text" value="${escapeHtml(draft.imageUrl || "")}" placeholder="https://example.com/my-desk-sprite.png" />
          </div>

          <div class="sprk-grid-2">
            <div>
              <span style="display:block;font-weight:700;font-size:12.5px;margin-bottom:6px;">Sprite Size</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap;" role="group" aria-label="Sprite size">
                ${SIZE_OPTIONS.map((opt) => `
                  <button type="button" class="sprk-btn ${draft.size === opt.id ? "sprk-btn-primary" : ""}" data-prop-size="${opt.id}" style="min-height:34px;padding:5px 12px;">
                    ${escapeHtml(opt.label)}
                  </button>
                `).join("")}
              </div>
            </div>
            <div>
              <span style="display:block;font-weight:700;font-size:12.5px;margin-bottom:6px;">Presentation Style</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap;" role="group" aria-label="Presentation style">
                ${FRAME_OPTIONS.map((opt) => `
                  <button type="button" class="sprk-btn ${draft.frameStyle === opt.id ? "sprk-btn-primary" : ""}" data-prop-frame="${opt.id}" style="min-height:34px;padding:5px 12px;">
                    ${escapeHtml(opt.label)}
                  </button>
                `).join("")}
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding-top:4px;">
            <button type="button" class="sprk-btn" id="custom-prop-clear">↺ Reset Default Star</button>
            <button type="submit" class="sprk-btn sprk-btn-primary" id="custom-prop-save">Apply Keepsake Sprite</button>
          </div>
        </form>
      `;

      container.querySelectorAll("[data-prop-size]").forEach((btn) => {
        btn.addEventListener("click", () => {
          applyDraft({ size: btn.dataset.propSize }, `Size set to ${btn.textContent.trim()}.`);
          renderView();
        });
      });

      container.querySelectorAll("[data-prop-frame]").forEach((btn) => {
        btn.addEventListener("click", () => {
          applyDraft({ frameStyle: btn.dataset.propFrame }, `Style set to ${btn.textContent.trim()}.`);
          renderView();
        });
      });

      container.querySelector("#custom-prop-file")?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        statusMessage = "Loading sprite image...";
        statusIsError = false;
        renderView();
        const res = await uploadCustomPropFile(file);
        if (res.error) {
          statusMessage = res.error.message || "Could not load image file.";
          statusIsError = true;
        } else {
          const cleanLabel = container.querySelector("#custom-prop-label")?.value.trim() || draft.label;
          applyDraft({ imageUrl: res.url, label: cleanLabel }, "Custom sprite uploaded and placed in your room!");
        }
        renderView();
      });

      container.querySelector("#custom-prop-clear")?.addEventListener("click", () => {
        applyDraft(
          { imageUrl: "", label: "Custom Keepsake", size: "md", frameStyle: "sprite" },
          "Restored default keepsake star."
        );
        renderView();
      });

      container.querySelector("#custom-prop-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const labelVal = container.querySelector("#custom-prop-label")?.value.trim().slice(0, 32) || "Custom Keepsake";
        const urlInput = container.querySelector("#custom-prop-url")?.value.trim() || "";
        if (urlInput) {
          const safe = sanitizeAvatarUrl(urlInput);
          if (!safe) {
            statusMessage = "Enter a valid https:// raster image URL (PNG, JPG, WEBP, GIF). SVG data URLs and scripts are blocked.";
            statusIsError = true;
            renderView();
            return;
          }
          applyDraft({ imageUrl: safe, label: labelVal }, "Custom keepsake sprite saved! Drag it anywhere on the desk or shelves.");
        } else {
          applyDraft({ imageUrl: "", label: labelVal }, "Saved keepsake settings.");
        }
        renderView();
      });
    };

    renderView();
  }
};
