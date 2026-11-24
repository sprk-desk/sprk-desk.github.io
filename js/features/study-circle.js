// In-Room Visual Mode: Live Study Circle (Friends Currently Studying With User)
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { dialogManager } from "../core/dialog-manager.js";
import { toggleStudyTogetherVisualMode } from "../core/settings-manager.js";
import { presenceService } from "../services/presence-service.js";
import { visitFriendRoom } from "../services/database-service.js";
import { parseCurrentPage, PAGE_ROUTES } from "../router.js";
import { sanitizeAvatarUrl } from "../utils/profile-helpers.js";
import { escapeHtml } from "../utils/dom.js";

function renderPeerAvatar(entry) {
  const safeUrl = sanitizeAvatarUrl(entry.avatarUrl || "");
  if (safeUrl) {
    return `<img src="${escapeHtml(safeUrl)}" alt="" class="sprk-study-peer-img" referrerpolicy="no-referrer" />`;
  }
  return `<span class="sprk-study-peer-avatar" aria-hidden="true">${escapeHtml(entry.avatarPreset || "☺")}</span>`;
}

export function initStudyCircle() {
  const root = document.getElementById("sprk-study-circle-root");
  if (!root) return;

  const render = () => {
    const isExpanded = Boolean(state.preferences?.studyTogetherVisualMode);
    const seriousMode = Boolean(state.preferences?.seriousMode);
    const isSpectating = Boolean(state.spectatingRoom);

    if (isSpectating) {
      root.hidden = true;
      root.innerHTML = "";
      return;
    }
    root.hidden = false;

    const { entries, summary, signedIn } = presenceService.getSnapshot(Date.now());
    const selfSess = state.activeSession;
    const selfStudying = Boolean(selfSess && selfSess.status === "running");

    const toggleCountLabel = signedIn
      ? summary.studyingCount > 0
        ? `${summary.studyingCount} studying`
        : summary.onlineCount > 0
          ? `${summary.onlineCount} online`
          : `${summary.totalFriends} friends`
      : "Circle";

    root.innerHTML = `
      ${isExpanded ? `
        <section class="sprk-study-circle-stage" aria-label="Live friends studying circle">
          <header class="sprk-study-circle-head">
            <div>
              <strong>${seriousMode ? "Live Study Circle" : "👥 Live Study Circle"}</strong>
              <div class="sprk-meta">
                <span>You: ${selfStudying ? `Studying ${escapeHtml(selfSess.subject || "Focus")}` : "Idle"}</span>
                ${signedIn && summary.studyingCount > 0 ? `<span>· ${summary.studyingCount} studying now</span>` : ""}
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <button type="button" class="sprk-btn" id="sc-open-friends" style="min-height:28px;padding:3px 9px;font-size:11.5px;">
                ${seriousMode ? "Manage" : "📱 Friends"}
              </button>
              <button type="button" class="sprk-btn" id="sc-close-stage" aria-label="Minimize Study Circle" style="min-height:28px;padding:3px 9px;font-size:12px;">×</button>
            </div>
          </header>

          ${!signedIn ? `
            <div class="sprk-study-circle-empty">
              <p>Sign in via Photo Frame to see which friends are studying live with you.</p>
              <button type="button" class="sprk-btn sprk-btn-primary" id="sc-open-signin" style="min-height:32px;padding:4px 12px;font-size:12px;">Sign In</button>
            </div>
          ` : entries.length === 0 ? `
            <div class="sprk-study-circle-empty">
              <p>No friends added yet. Add classmates on the Desk Phone to see them study beside you.</p>
              <button type="button" class="sprk-btn sprk-btn-primary" id="sc-find-friends" style="min-height:32px;padding:4px 12px;font-size:12px;">Find Friends</button>
            </div>
          ` : `
            <div class="sprk-study-peer-grid">
              ${entries.map((entry) => {
                const statusText = entry.status === "studying"
                  ? (entry.isStudyingWithUser ? "Studying with you" : "Studying")
                  : entry.status === "online"
                    ? "Online"
                    : "Offline";
                return `
                  <article class="sprk-study-peer-card is-${entry.status}">
                    <div class="sprk-study-peer-top">
                      ${renderPeerAvatar(entry)}
                      <div style="min-width:0;flex:1;">
                        <div style="display:flex;align-items:center;gap:5px;">
                          <span class="sprk-study-dot is-${entry.status}" aria-hidden="true"></span>
                          <strong class="sprk-study-peer-name">${escapeHtml(entry.displayName)}</strong>
                        </div>
                        <div class="sprk-study-peer-status">
                          <span>${escapeHtml(statusText)}</span>
                          ${entry.elapsedLabel ? `<span class="tabular-nums">· ${escapeHtml(entry.elapsedLabel)}</span>` : ""}
                        </div>
                      </div>
                      ${entry.roomVisibility === "private"
                        ? `<button type="button" class="sprk-btn" disabled title="Room is set to Private" style="min-height:26px;padding:2px 8px;font-size:11px;opacity:0.55;cursor:not-allowed;">Private</button>`
                        : `<button type="button" class="sprk-btn" data-sc-visit="${escapeHtml(entry.id)}" style="min-height:26px;padding:2px 8px;font-size:11px;">Visit</button>`}
                    </div>
                    ${entry.status === "studying" ? `
                      <div class="sprk-study-peer-subject">${escapeHtml(entry.subject)}</div>
                      ${entry.progressPct > 0 ? `
                        <div class="sprk-progress-track" style="height:5px;margin-top:4px;">
                          <div class="sprk-progress-fill" style="width:${entry.progressPct}%;"></div>
                        </div>
                      ` : ""}
                    ` : ""}
                  </article>
                `;
              }).join("")}
            </div>
          `}
        </section>
      ` : ""}

      <button type="button"
        id="sprk-study-circle-toggle"
        class="sprk-study-circle-toggle ${isExpanded ? "is-open" : ""} ${summary.studyingCount > 0 ? "has-active" : ""}"
        aria-expanded="${isExpanded}"
        aria-label="Toggle Live Study Circle visual mode">
        <span class="sprk-study-dot ${summary.studyingCount > 0 ? "is-studying" : summary.onlineCount > 0 ? "is-online" : "is-offline"}" aria-hidden="true"></span>
        <span>${seriousMode ? "Study Circle" : "👥 Study Circle"}</span>
        <span class="sprk-study-toggle-count tabular-nums">${escapeHtml(toggleCountLabel)}</span>
      </button>
    `;

    root.querySelector("#sprk-study-circle-toggle")?.addEventListener("click", () => {
      toggleStudyTogetherVisualMode();
    });

    root.querySelector("#sc-close-stage")?.addEventListener("click", () => {
      toggleStudyTogetherVisualMode(false);
    });

    root.querySelector("#sc-open-friends")?.addEventListener("click", () => {
      dialogManager.open("friends", document.querySelector(".desk-phone"));
    });

    root.querySelector("#sc-find-friends")?.addEventListener("click", () => {
      dialogManager.open("friends", document.querySelector(".desk-phone"));
    });

    root.querySelector("#sc-open-signin")?.addEventListener("click", () => {
      dialogManager.open("profile", document.querySelector(".photo-frame"));
    });

    root.querySelectorAll("[data-sc-visit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await visitFriendRoom(btn.dataset.scVisit);
      });
    });
  };

  render();
  bus.on("studyCircle:changed", render);
  bus.on("auth:changed", render);
  bus.on("friends:changed", render);
  bus.on("state:activeSession", render);
  bus.on("preferences:changed", render);
  bus.on("spectator:changed", render);

  window.setInterval(() => {
    if (parseCurrentPage().page === PAGE_ROUTES.COZY && state.preferences?.studyTogetherVisualMode) {
      render();
    }
  }, 15_000);
}
