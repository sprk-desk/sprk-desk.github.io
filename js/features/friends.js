// Desk Phone -> Friends List (with Live Study Status), Study Circle Visual Mode Toggle, Requests & Visits
import { state } from "../state.js";
import { supabase } from "../services/supabase.js";
import {
  loadFriendsAndRequests,
  searchStudentProfiles,
  sendFriendRequest,
  respondFriendRequest,
  visitFriendRoom
} from "../services/database-service.js";
import { presenceService } from "../services/presence-service.js";
import { toggleStudyTogetherVisualMode } from "../core/settings-manager.js";
import { dialogManager } from "../core/dialog-manager.js";
import { escapeHtml } from "../utils/dom.js";

export const friendsFeature = {
  skin: "friends",
  eyebrow: "",
  title: "Desk Phone",
  icon: "📱",
  render(container, { close }) {
    let tab = "friends";
    let statusMsg = "";
    let searchResults = null;

    const renderView = () => {
      const visualModeOn = Boolean(state.preferences?.studyTogetherVisualMode);

      if (!supabase.configured || !state.user) {
        container.innerHTML = `
          <div class="sprk-card" style="display:flex;flex-direction:column;gap:12px;align-items:flex-start;">
            <div class="sprk-badge-row">
              <span class="sprk-badge-chip">🔒 Read-Only Visits</span>
              <span class="sprk-badge-chip">👁 Live Study Circle</span>
              <span class="sprk-badge-chip">🛡 Privacy Controls</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="sprk-btn sprk-btn-primary" id="friends-open-profile">🖼 Sign In via Photo Frame</button>
              <button type="button" class="sprk-btn" id="friends-toggle-visual">
                ${visualModeOn ? "Hide In-Room Visual Mode" : "Show In-Room Visual Mode"}
              </button>
            </div>
          </div>
        `;
        container.querySelector("#friends-open-profile")?.addEventListener("click", (e) => {
          dialogManager.open("profile", e.currentTarget);
        });
        container.querySelector("#friends-toggle-visual")?.addEventListener("click", () => {
          toggleStudyTogetherVisualMode();
          renderView();
        });
        return;
      }

      const snapshot = presenceService.getSnapshot(Date.now());
      const entries = snapshot.entries;
      const incoming = state.friendRequests?.incoming || [];

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <div class="sprk-tabs" style="margin:0;">
            <button type="button" class="sprk-tab ${tab === "friends" ? "is-active" : ""}" data-ptab="friends">👥 Friends (${entries.length})</button>
            <button type="button" class="sprk-tab ${tab === "find" ? "is-active" : ""}" data-ptab="find">🔍 Find</button>
            <button type="button" class="sprk-tab ${tab === "alerts" ? "is-active" : ""}" data-ptab="alerts">🔔 (${state.notifications.length + incoming.length})</button>
          </div>
          <button type="button" class="sprk-btn ${visualModeOn ? "sprk-btn-primary" : ""}" id="friends-toggle-visual" style="min-height:34px;padding:4px 11px;font-size:12px;">
            ${visualModeOn ? "👁 Visual Mode: On" : "👁 Visual Mode: Off"}
          </button>
        </div>

        ${statusMsg ? `<div class="sprk-notice" style="margin-bottom:10px;">${escapeHtml(statusMsg)}</div>` : ""}

        ${tab === "friends" ? `
          <div class="sprk-card" style="margin-bottom:12px;">
            <form id="visit-room-form" style="display:flex;gap:8px;flex-wrap:wrap;">
              <input id="visit-public-id" class="sprk-input" type="text" placeholder="Friend Public ID (SPK-...) or UUID" required style="flex:1;min-width:180px;" />
              <button type="submit" class="sprk-btn sprk-btn-primary">🚪 Visit Room</button>
            </form>
          </div>
          ${entries.length === 0 ? `<div class="sprk-empty">No friends yet. Open Find to add classmates.</div>` : `
            <div style="display:grid;gap:8px;">
              ${entries.map((f) => {
                const liveText = f.status === "studying"
                  ? `Studying ${f.subject}${f.elapsedLabel ? ` · ${f.elapsedLabel}` : ""}`
                  : f.status === "online"
                    ? "Online"
                    : "Offline";
                return `
                  <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <div style="min-width:0;">
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span class="sprk-study-dot is-${f.status}" aria-hidden="true"></span>
                        <strong>${escapeHtml(f.avatarPreset || "☺")} ${escapeHtml(f.displayName)}</strong>
                        <span class="sprk-badge-chip" style="padding:2px 7px;font-size:11px;">${escapeHtml(liveText)}</span>
                      </div>
                      <div class="sprk-meta" style="margin-top:4px;">
                        <span>${escapeHtml(f.publicId)}</span>
                        ${f.courseClass ? `<span>· ${escapeHtml(f.courseClass)}</span>` : ""}
                      </div>
                    </div>
                    <button type="button" class="sprk-btn sprk-btn-primary" data-visit-friend="${escapeHtml(f.id)}" style="min-height:34px;padding:4px 12px;">🚪 Visit</button>
                  </div>
                `;
              }).join("")}
            </div>
          `}
        ` : tab === "find" ? `
          <form id="friend-search-form" class="sprk-card">
            <label class="sprk-field">
              <span class="sprk-label">Public ID or @username</span>
              <input id="friend-query" class="sprk-input" type="text" required maxlength="32" placeholder="SPK-48291A or study_fox" />
            </label>
            <button type="submit" class="sprk-btn sprk-btn-primary">Search</button>
            <div id="friend-results" style="margin-top:12px;display:grid;gap:8px;">
              ${searchResults === null ? "" : searchResults.length === 0 ? `<div class="sprk-meta">No students found.</div>` : searchResults.map((p) => `
                <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                  <div>
                    <strong>${escapeHtml(p.display_name || "Student")}</strong>
                    <div class="sprk-meta">${escapeHtml(p.public_id || "")}${p.course_class ? ` · ${escapeHtml(p.course_class)}` : ""}</div>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button type="button" class="sprk-btn" data-visit-friend="${escapeHtml(p.id)}" style="min-height:32px;padding:4px 10px;">Visit</button>
                    <button type="button" class="sprk-btn sprk-btn-primary" data-send-req="${escapeHtml(p.id)}" style="min-height:32px;padding:4px 10px;">+ Add</button>
                  </div>
                </div>
              `).join("")}
            </div>
          </form>
        ` : `
          <div style="display:grid;gap:8px;">
            ${incoming.map((req) => `
              <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <div>
                  <strong style="font-size:13px;">Friend Request · ${escapeHtml(req.profile?.display_name || "Student")}</strong>
                  <div class="sprk-meta">${escapeHtml(req.profile?.public_id || "")}</div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="sprk-btn sprk-btn-primary" data-req-accept="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Accept</button>
                  <button type="button" class="sprk-btn" data-req-decline="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Decline</button>
                </div>
              </div>
            `).join("")}
            ${state.notifications.length === 0 && incoming.length === 0 ? `<div class="sprk-empty">All caught up</div>` : state.notifications.map((n) => `
              <div class="sprk-card">
                <strong style="font-size:13px;">${escapeHtml(n.title)}</strong>
                <p style="margin:4px 0 0;font-size:12px;color:var(--muted);">${escapeHtml(n.body)}</p>
              </div>
            `).join("")}
          </div>
        `}
      `;

      container.querySelector("#friends-toggle-visual")?.addEventListener("click", () => {
        toggleStudyTogetherVisualMode();
        renderView();
      });

      container.querySelectorAll("[data-ptab]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          tab = btn.dataset.ptab;
          if (tab === "friends") await loadFriendsAndRequests();
          renderView();
        });
      });

      container.querySelector("#visit-room-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const uid = container.querySelector("#visit-public-id").value.trim();
        const { error } = await visitFriendRoom(uid);
        if (error) {
          statusMsg = error.message;
          renderView();
          return;
        }
        close();
      });

      container.querySelectorAll("[data-visit-friend]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await visitFriendRoom(btn.dataset.visitFriend);
          if (error) {
            statusMsg = error.message;
            renderView();
            return;
          }
          close();
        });
      });

      container.querySelector("#friend-search-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const q = container.querySelector("#friend-query").value.trim();
        const { data, error } = await searchStudentProfiles(q);
        if (error) statusMsg = error.message;
        else searchResults = data || [];
        renderView();
      });

      container.querySelectorAll("[data-send-req]").forEach((b) => {
        b.addEventListener("click", async () => {
          const { error } = await sendFriendRequest(b.dataset.sendReq);
          statusMsg = error ? error.message : "Request sent!";
          renderView();
        });
      });

      container.querySelectorAll("[data-req-accept]").forEach((b) => {
        b.addEventListener("click", async () => {
          const { error } = await respondFriendRequest(b.dataset.reqAccept, true);
          statusMsg = error ? error.message : "Friend added!";
          renderView();
        });
      });

      container.querySelectorAll("[data-req-decline]").forEach((b) => {
        b.addEventListener("click", async () => {
          const { error } = await respondFriendRequest(b.dataset.reqDecline, false);
          statusMsg = error ? error.message : "Declined.";
          renderView();
        });
      });
    };

    renderView();
  }
};
