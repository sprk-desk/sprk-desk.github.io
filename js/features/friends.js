// Desk Phone -> Friends List (Live Study Status), Profile Viewer, Requests & Room Visits
import { state } from "../state.js";
import { supabase } from "../services/supabase.js";
import {
  loadFriendsAndRequests,
  searchStudentProfiles,
  fetchSuggestedStudents,
  fetchUserPublicProfile,
  sendFriendRequest,
  cancelFriendRequest,
  respondFriendRequest,
  unfriendUser,
  visitFriendRoom
} from "../services/database-service.js";
import { presenceService } from "../services/presence-service.js";
import { toggleStudyTogetherVisualMode } from "../core/settings-manager.js";
import { canUserVisitRoom, getRelationshipStatus } from "../utils/privacy-scope.js";
import { sanitizeAvatarUrl } from "../utils/profile-helpers.js";
import { navigateToPage, PAGE_ROUTES } from "../router.js";
import { dialogManager } from "../core/dialog-manager.js";
import { escapeHtml } from "../utils/dom.js";

function renderTinyAvatar(preset, url, size = 38) {
  const safe = sanitizeAvatarUrl(url || "");
  if (safe) {
    return `<img src="${escapeHtml(safe)}" alt="" referrerpolicy="no-referrer" style="width:${size}px;height:${size}px;border-radius:10px;border:1.5px solid var(--ink);object-fit:cover;flex-shrink:0;" />`;
  }
  return `<div class="sprk-dialog-icon" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.48)}px;flex-shrink:0;">${escapeHtml(preset || "☺")}</div>`;
}

export const friendsFeature = {
  skin: "friends",
  eyebrow: "",
  title: "Desk Phone",
  icon: "📱",
  render(container, { close }) {
    let tab = "friends";
    let statusMsg = "";
    let searchResults = null;
    let inspectedProfile = null;

    const inspectStudent = async (id) => {
      const { data, error } = await fetchUserPublicProfile(id);
      if (error || !data) statusMsg = error?.message || "Could not load student profile.";
      else inspectedProfile = data;
      renderView();
    };

    const renderRelButtons = (targetId, privacy = {}) => {
      if (!state.user?.id || !targetId) return "";
      const rel = getRelationshipStatus({
        viewerId: state.user.id,
        targetId,
        friends: state.friends,
        incoming: state.friendRequests?.incoming,
        outgoing: state.friendRequests?.outgoing
      });
      const access = canUserVisitRoom({
        targetUserId: targetId,
        viewerUserId: state.user.id,
        privacy,
        isFriend: rel.status === "friends"
      });
      const relBtn =
        rel.status === "friends"
          ? `<button type="button" class="sprk-btn" data-unfriend="${escapeHtml(targetId)}" style="min-height:32px;padding:4px 10px;">Unfriend</button>`
          : rel.status === "outgoing"
            ? `<button type="button" class="sprk-btn" data-cancel-req="${escapeHtml(rel.requestId)}" style="min-height:32px;padding:4px 10px;">Cancel Req</button>`
            : rel.status === "incoming"
              ? `<button type="button" class="sprk-btn sprk-btn-primary" data-req-accept="${escapeHtml(rel.requestId)}" style="min-height:32px;padding:4px 10px;">Accept</button>`
              : `<button type="button" class="sprk-btn sprk-btn-primary" data-send-req="${escapeHtml(targetId)}" style="min-height:32px;padding:4px 10px;">+ Add</button>`;
      const visitBtn = access.allowed
        ? `<button type="button" class="sprk-btn" data-visit-friend="${escapeHtml(targetId)}" style="min-height:32px;padding:4px 10px;">🚪 Visit</button>`
        : "";
      return `${relBtn}${visitBtn}`;
    };

    const renderView = () => {
      const visualModeOn = Boolean(state.preferences?.studyTogetherVisualMode);

      if (!supabase.configured || !state.user) {
        container.innerHTML = `
          <div class="sprk-card" style="display:flex;flex-direction:column;gap:12px;align-items:flex-start;">
            <div class="sprk-meta">Read-Only Room Visits · Live Study Circle · Profile Discovery &amp; Privacy Controls</div>
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
      const outgoing = state.friendRequests?.outgoing || [];

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <div class="sprk-tabs" style="margin:0;">
            <button type="button" class="sprk-tab ${tab === "friends" ? "is-active" : ""}" data-ptab="friends">👥 Friends (${entries.length})</button>
            <button type="button" class="sprk-tab ${tab === "find" ? "is-active" : ""}" data-ptab="find">🔍 Find</button>
            <button type="button" class="sprk-tab ${tab === "alerts" ? "is-active" : ""}" data-ptab="alerts">🔔 (${state.notifications.length + incoming.length})</button>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="sprk-btn" id="friends-open-social" style="min-height:32px;padding:4px 10px;font-size:12px;">Social Hub →</button>
            <button type="button" class="sprk-btn ${visualModeOn ? "sprk-btn-primary" : ""}" id="friends-toggle-visual" style="min-height:32px;padding:4px 10px;font-size:12px;">
              ${visualModeOn ? "👁 Visual: On" : "👁 Visual: Off"}
            </button>
          </div>
        </div>

        ${statusMsg ? `<div class="sprk-notice" style="margin-bottom:10px;">${escapeHtml(statusMsg)}</div>` : ""}

        ${inspectedProfile ? (() => {
          const tp = inspectedProfile.profile;
          const ra = inspectedProfile.roomAccess;
          return `
            <div class="sprk-card" style="margin-bottom:12px;border-color:var(--accent);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  ${renderTinyAvatar(tp.avatarPreset, tp.avatarUrl, 44)}
                  <div>
                    <strong>${escapeHtml(tp.displayName)}</strong>
                    <div class="sprk-meta">
                      ${tp.username ? `@${escapeHtml(tp.username)} · ` : ""}${escapeHtml(tp.publicId)}
                      ${tp.courseClass ? ` · ${escapeHtml(tp.courseClass)}` : ""}
                    </div>
                  </div>
                </div>
                <button type="button" class="sprk-btn" id="friends-close-inspect" style="min-height:28px;padding:2px 8px;">Close</button>
              </div>
              ${tp.bio ? `<p style="margin:0 0 6px;font-size:12.5px;">${escapeHtml(tp.bio)}</p>` : ""}
              <div class="sprk-meta" style="margin-bottom:8px;">
                ${tp.examAim ? `<span>Aim: ${escapeHtml(tp.examAim)} · </span>` : ""}
                <span class="tabular-nums">${inspectedProfile.friendsCount || 0} friends</span>
                <span>· Room: ${ra.visibility === "public" ? "Public" : ra.visibility === "private" ? "Private" : "Friends Only"}</span>
              </div>
              ${!ra.allowed ? `<div class="sprk-meta" style="margin-bottom:8px;color:#7a3b28;">🔒 ${escapeHtml(ra.reason)}</div>` : ""}
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${renderRelButtons(tp.id, tp.privacy)}
              </div>
            </div>
          `;
        })() : ""}

        ${tab === "friends" ? `
          <div class="sprk-card" style="margin-bottom:12px;">
            <form id="visit-room-form" style="display:flex;gap:8px;flex-wrap:wrap;">
              <input id="visit-public-id" class="sprk-input" type="text" placeholder="Student Public ID (SPK-...) or @username" required style="flex:1;min-width:180px;" />
              <button type="submit" class="sprk-btn">View Profile</button>
              <button type="button" id="visit-room-direct" class="sprk-btn sprk-btn-primary">🚪 Visit Room</button>
            </form>
          </div>
          ${entries.length === 0 ? `<div class="sprk-empty">No friends yet. Open Find to connect with classmates.</div>` : `
            <div style="display:grid;gap:8px;">
              ${entries.map((f) => {
                const liveText = f.status === "studying"
                  ? `Studying ${f.subject}${f.elapsedLabel ? ` · ${f.elapsedLabel}` : ""}`
                  : f.status === "online"
                    ? "Online"
                    : "Offline";
                const access = canUserVisitRoom({
                  targetUserId: f.id,
                  viewerUserId: state.user.id,
                  privacy: f.privacy,
                  isFriend: true
                });
                return `
                  <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                      ${renderTinyAvatar(f.avatarPreset, f.avatarUrl, 38)}
                      <div style="min-width:0;">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                          <span class="sprk-study-dot is-${f.status}" aria-hidden="true"></span>
                          <strong>${escapeHtml(f.displayName)}</strong>
                          <span class="sprk-meta">${escapeHtml(liveText)}</span>
                        </div>
                        <div class="sprk-meta" style="margin-top:2px;">
                          <span class="tabular-nums">${escapeHtml(f.publicId)}</span>
                          ${f.courseClass ? `<span>· ${escapeHtml(f.courseClass)}</span>` : ""}
                        </div>
                      </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button type="button" class="sprk-btn" data-inspect-user="${escapeHtml(f.id)}" style="min-height:32px;padding:4px 10px;">Profile</button>
                      ${access.allowed
                        ? `<button type="button" class="sprk-btn sprk-btn-primary" data-visit-friend="${escapeHtml(f.id)}" style="min-height:32px;padding:4px 12px;">🚪 Visit</button>`
                        : `<span class="sprk-meta" style="align-self:center;">Private</span>`}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          `}
        ` : tab === "find" ? `
          <div style="display:grid;gap:12px;">
            <form id="friend-search-form" class="sprk-card">
              <label class="sprk-field">
                <span class="sprk-label">Search Students (Name, @username, Course, or Public ID)</span>
                <input id="friend-query" class="sprk-input" type="text" required maxlength="32" placeholder="Aarav, study_fox, or SPK-..." />
              </label>
              <button type="submit" class="sprk-btn sprk-btn-primary">Search</button>
              <div id="friend-results" style="margin-top:12px;display:grid;gap:8px;">
                ${searchResults === null ? "" : searchResults.length === 0 ? `<div class="sprk-meta">No students found.</div>` : searchResults.map((p) => `
                  <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                      ${renderTinyAvatar(p.avatar_preset, p.avatar_url, 36)}
                      <div style="min-width:0;">
                        <strong>${escapeHtml(p.display_name || "Student")}</strong>
                        <div class="sprk-meta">${escapeHtml(p.public_id || "")}${p.course_class ? ` · ${escapeHtml(p.course_class)}` : ""}</div>
                      </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button type="button" class="sprk-btn" data-inspect-user="${escapeHtml(p.id)}" style="min-height:32px;padding:4px 10px;">Profile</button>
                      ${renderRelButtons(p.id, p.privacy)}
                    </div>
                  </div>
                `).join("")}
              </div>
            </form>
            ${(state.suggestedStudents || []).length > 0 ? `
              <div class="sprk-card">
                <strong style="display:block;margin-bottom:8px;">Suggested Students</strong>
                <div style="display:grid;gap:8px;">
                  ${(state.suggestedStudents || []).slice(0, 6).map((p) => `
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                      <div style="min-width:0;">
                        <strong>${escapeHtml(p.display_name || "Student")}</strong>
                        <div class="sprk-meta">${escapeHtml(p.course_class || p.public_id || "")}</div>
                      </div>
                      <div style="display:flex;gap:6px;">
                        <button type="button" class="sprk-btn" data-inspect-user="${escapeHtml(p.id)}" style="min-height:30px;padding:3px 10px;">Profile</button>
                        ${renderRelButtons(p.id, p.privacy)}
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
        ` : `
          <div style="display:grid;gap:8px;">
            ${incoming.map((req) => `
              <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <div>
                  <strong style="font-size:13px;">Friend Request · ${escapeHtml(req.profile?.display_name || "Student")}</strong>
                  <div class="sprk-meta">${escapeHtml(req.profile?.public_id || "")}</div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="sprk-btn" data-inspect-user="${escapeHtml(req.senderId)}" style="min-height:32px;padding:4px 10px;">Profile</button>
                  <button type="button" class="sprk-btn sprk-btn-primary" data-req-accept="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Accept</button>
                  <button type="button" class="sprk-btn" data-req-decline="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Decline</button>
                </div>
              </div>
            `).join("")}
            ${outgoing.map((req) => `
              <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <div>
                  <strong style="font-size:13px;">Sent Request · ${escapeHtml(req.profile?.display_name || "Student")}</strong>
                  <div class="sprk-meta">${escapeHtml(req.profile?.public_id || "")}</div>
                </div>
                <button type="button" class="sprk-btn" data-cancel-req="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Cancel</button>
              </div>
            `).join("")}
            ${state.notifications.length === 0 && incoming.length === 0 && outgoing.length === 0 ? `<div class="sprk-empty">All caught up</div>` : state.notifications.map((n) => `
              <div class="sprk-card">
                <strong style="font-size:13px;">${escapeHtml(n.title)}</strong>
                <p style="margin:4px 0 0;font-size:12px;color:var(--muted);">${escapeHtml(n.body)}</p>
              </div>
            `).join("")}
          </div>
        `}
      `;

      container.querySelector("#friends-open-social")?.addEventListener("click", () => {
        close();
        navigateToPage(PAGE_ROUTES.ACCOUNT);
      });

      container.querySelector("#friends-toggle-visual")?.addEventListener("click", () => {
        toggleStudyTogetherVisualMode();
        renderView();
      });

      container.querySelectorAll("[data-ptab]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          tab = btn.dataset.ptab;
          if (tab === "friends") await loadFriendsAndRequests();
          if (tab === "find") await fetchSuggestedStudents(8);
          renderView();
        });
      });

      container.querySelector("#friends-close-inspect")?.addEventListener("click", () => {
        inspectedProfile = null;
        renderView();
      });

      container.querySelector("#visit-room-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const uid = container.querySelector("#visit-public-id").value.trim();
        if (uid) await inspectStudent(uid);
      });

      container.querySelector("#visit-room-direct")?.addEventListener("click", async () => {
        const uid = container.querySelector("#visit-public-id").value.trim();
        if (!uid) return;
        const { error } = await visitFriendRoom(uid);
        if (error) {
          statusMsg = error.message;
          renderView();
          return;
        }
        close();
      });

      container.querySelectorAll("[data-inspect-user]").forEach((btn) => {
        btn.addEventListener("click", () => inspectStudent(btn.dataset.inspectUser));
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
          const targetId = b.dataset.sendReq;
          const { error } = await sendFriendRequest(targetId);
          statusMsg = error ? error.message : "Request sent!";
          if (inspectedProfile?.profile.id === targetId) await inspectStudent(targetId);
          else renderView();
        });
      });

      container.querySelectorAll("[data-cancel-req]").forEach((b) => {
        b.addEventListener("click", async () => {
          const { error } = await cancelFriendRequest(b.dataset.cancelReq);
          statusMsg = error ? error.message : "Request cancelled.";
          if (inspectedProfile) await inspectStudent(inspectedProfile.profile.id);
          else renderView();
        });
      });

      container.querySelectorAll("[data-unfriend]").forEach((b) => {
        b.addEventListener("click", async () => {
          const targetId = b.dataset.unfriend;
          const { error } = await unfriendUser(targetId);
          statusMsg = error ? error.message : "Friend removed.";
          if (inspectedProfile?.profile.id === targetId) await inspectStudent(targetId);
          else renderView();
        });
      });

      container.querySelectorAll("[data-req-accept]").forEach((b) => {
        b.addEventListener("click", async () => {
          const { error } = await respondFriendRequest(b.dataset.reqAccept, true);
          statusMsg = error ? error.message : "Friend added!";
          if (inspectedProfile) await inspectStudent(inspectedProfile.profile.id);
          else renderView();
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
