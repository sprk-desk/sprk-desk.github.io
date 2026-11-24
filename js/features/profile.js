// Photo Frame -> Student Profile Card, Room Privacy Controls, Friends & Public Profile Viewer
import { state } from "../state.js";
import { supabase } from "../services/supabase.js";
import { signInWithEmail, signUpWithEmail, sendPasswordRecovery, signOut } from "../services/auth-service.js";
import {
  updateProfile,
  uploadAvatarFile,
  syncAuthenticatedUserData,
  loadFriendsAndRequests,
  searchStudentProfiles,
  fetchUserPublicProfile,
  sendFriendRequest,
  cancelFriendRequest,
  respondFriendRequest,
  unfriendUser,
  visitFriendRoom,
  exitSpectatorRoom
} from "../services/database-service.js";
import { computeStudyStreaks, summarizeFocusMinutes } from "../utils/timer-math.js";
import { formatMinutesLabel, todayIsoDate } from "../utils/dom.js";
import {
  AVATAR_PRESETS,
  sanitizeAvatarUrl,
  parseFavoriteSubjects,
  validateUsernameInput,
  normalizePrivacySettings
} from "../utils/profile-helpers.js";
import { canUserVisitRoom, getRelationshipStatus } from "../utils/privacy-scope.js";
import { navigateToPage, PAGE_ROUTES } from "../router.js";
import { dialogManager } from "../core/dialog-manager.js";
import { escapeHtml } from "../utils/dom.js";

function renderAvatarVisual(avatarPreset, avatarUrl, size = 56) {
  const safeUrl = sanitizeAvatarUrl(avatarUrl || "");
  if (safeUrl) {
    return `<img src="${escapeHtml(safeUrl)}" alt="Profile picture" referrerpolicy="no-referrer"
      style="width:${size}px;height:${size}px;border-radius:12px;border:2px solid var(--ink);object-fit:cover;background:#fffaf0;flex-shrink:0;" />`;
  }
  return `<div class="sprk-dialog-icon" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.48)}px;flex-shrink:0;">${escapeHtml(avatarPreset || "☺")}</div>`;
}

export const profileFeature = {
  skin: "profile",
  eyebrow: "",
  title: "Photo Frame",
  icon: "🖼",
  render(container, { close, rerender }) {
    let mainTab = "profile"; // profile | friends | signin | account
    let authMode = "signin"; // signin | register | recover
    let statusMsg = "";
    let searchResults = null;
    let inspectedProfile = null;

    const getActiveProfile = () => {
      if (state.user) return state.user;
      return {
        publicId: "LOCAL",
        displayName: state.localProfile?.displayName || state.preferences.localDisplayName || "Local Student",
        username: state.localProfile?.username || "",
        avatarPreset: state.localProfile?.avatarPreset || "☺",
        avatarUrl: state.localProfile?.avatarUrl || "",
        bio: state.localProfile?.bio || "",
        courseClass: state.localProfile?.courseClass || "",
        examAim: state.localProfile?.examAim || "",
        favoriteSubjects: state.localProfile?.favoriteSubjects || [],
        privacy: normalizePrivacySettings(state.localProfile?.privacy)
      };
    };

    const inspectStudent = async (targetId) => {
      const { data, error } = await fetchUserPublicProfile(targetId);
      if (error || !data) {
        statusMsg = error?.message || "Could not load student profile.";
      } else {
        inspectedProfile = data;
      }
      renderView();
    };

    const renderRelControls = (targetId, privacy = {}) => {
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
              : `<button type="button" class="sprk-btn sprk-btn-primary" data-add-friend="${escapeHtml(targetId)}" style="min-height:32px;padding:4px 10px;">+ Add</button>`;

      const visitBtn = access.allowed
        ? `<button type="button" class="sprk-btn" data-visit-room="${escapeHtml(targetId)}" style="min-height:32px;padding:4px 10px;">🚪 Visit</button>`
        : "";
      return `${relBtn}${visitBtn}`;
    };

    const renderView = () => {
      if (state.spectatingRoom) {
        const sp = state.spectatingRoom;
        const owner = sp.profile || {};
        const favSubs = Array.isArray(owner.favoriteSubjects) ? owner.favoriteSubjects : [];
        const focusRecs = (sp.studyRecords || []).filter((r) => (r.mode || "focus") === "focus");
        const totalMins = summarizeFocusMinutes(focusRecs).totalMinutes;
        const streaks = computeStudyStreaks(focusRecs, todayIsoDate());
        const safeBanner = sanitizeAvatarUrl(owner.bannerUrl || "");
        const relControls = owner.id && state.user?.id && owner.id !== state.user.id
          ? renderRelControls(owner.id, { roomVisibility: owner.roomVisibility })
          : "";

        container.innerHTML = `
          ${statusMsg ? `<div class="sprk-notice" role="status" style="margin-bottom:12px;">${escapeHtml(statusMsg)}</div>` : ""}
          <div class="sprk-card" style="overflow:hidden;padding:0;">
            ${safeBanner
              ? `<div style="height:108px;background:url('${escapeHtml(safeBanner)}') center/cover no-repeat;border-bottom:1.5px solid rgba(52,44,37,0.16);"></div>`
              : `<div style="height:68px;background:linear-gradient(125deg, var(--wall-shadow, #e5d6bd), var(--wall, #f4e9d6));border-bottom:1.5px solid rgba(52,44,37,0.14);"></div>`}
            <div style="padding:16px 18px;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <div style="display:flex;align-items:flex-start;gap:12px;min-width:0;flex:1;">
                  ${renderAvatarVisual(owner.avatar, owner.avatarUrl, 64)}
                  <div style="min-width:0;flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <strong style="font-size:18px;">${escapeHtml(owner.displayName || "Student")}</strong>
                      ${owner.username ? `<span class="sprk-meta">@${escapeHtml(owner.username)}</span>` : ""}
                      <span class="sprk-meta tabular-nums">${escapeHtml(owner.publicId || "")}</span>
                    </div>
                    <div class="sprk-meta" style="margin-top:4px;">
                      ${owner.courseClass ? `<span>${escapeHtml(owner.courseClass)}</span>` : ""}
                      ${owner.courseClass && owner.examAim ? `<span>·</span>` : ""}
                      ${owner.examAim ? `<span>Aim: ${escapeHtml(owner.examAim)}</span>` : ""}
                      <span>·</span>
                      <span>Room: ${owner.roomVisibility === "public" ? "Public" : owner.roomVisibility === "private" ? "Private" : "Friends Only"}</span>
                    </div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  ${relControls}
                  <button type="button" class="sprk-btn" id="spec-exit-room" style="min-height:32px;padding:4px 12px;">Return to My Room</button>
                </div>
              </div>

              ${owner.bio ? `<p style="margin:12px 0 0;font-size:13.5px;line-height:1.5;color:var(--ink);">${escapeHtml(owner.bio)}</p>` : ""}

              <div class="sprk-grid-3" style="margin-top:14px;">
                <div class="sprk-card" style="padding:10px 12px;">
                  <div class="sprk-label">Focus Logged</div>
                  <div class="tabular-nums" style="font-size:18px;font-weight:700;margin-top:2px;">${formatMinutesLabel(totalMins)}</div>
                </div>
                <div class="sprk-card" style="padding:10px 12px;">
                  <div class="sprk-label">Current / Best Streak</div>
                  <div class="tabular-nums" style="font-size:18px;font-weight:700;margin-top:2px;">${streaks.currentStreak}d / ${streaks.longestStreak}d</div>
                </div>
                <div class="sprk-card" style="padding:10px 12px;">
                  <div class="sprk-label">Study Friends</div>
                  <div class="tabular-nums" style="font-size:18px;font-weight:700;margin-top:2px;">${sp.friendsCount || 0}</div>
                </div>
              </div>

              ${favSubs.length > 0 ? `
                <div class="sprk-meta" style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(52,44,37,0.12);">
                  <strong>Favorite Subjects:</strong> ${escapeHtml(favSubs.join(" · "))}
                </div>
              ` : ""}
            </div>
          </div>
        `;

        container.querySelector("#spec-exit-room")?.addEventListener("click", () => {
          close();
          exitSpectatorRoom();
        });
        container.querySelectorAll("[data-add-friend]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const { error } = await sendFriendRequest(btn.dataset.addFriend);
            statusMsg = error ? error.message : "Friend request sent!";
            renderView();
          });
        });
        container.querySelectorAll("[data-cancel-req]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const { error } = await cancelFriendRequest(btn.dataset.cancelReq);
            statusMsg = error ? error.message : "Request cancelled.";
            renderView();
          });
        });
        container.querySelectorAll("[data-req-accept]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const { error } = await respondFriendRequest(btn.dataset.reqAccept, true);
            statusMsg = error ? error.message : "Friend request accepted!";
            renderView();
          });
        });
        container.querySelectorAll("[data-unfriend]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const { error } = await unfriendUser(btn.dataset.unfriend);
            statusMsg = error ? error.message : "Friend removed.";
            renderView();
          });
        });
        return;
      }

      const user = state.user;
      const prof = getActiveProfile();
      const privacy = normalizePrivacySettings(prof.privacy);
      const favSubs = Array.isArray(prof.favoriteSubjects) ? prof.favoriteSubjects : [];
      const friends = state.friends || [];
      const incomingReqs = state.friendRequests?.incoming || [];
      const outgoingReqs = state.friendRequests?.outgoing || [];

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <nav class="sprk-tabs" style="margin:0;" role="tablist" aria-label="Profile sections">
            <button type="button" class="sprk-tab ${mainTab === "profile" ? "is-active" : ""}" data-pmain="profile">👤 Profile</button>
            <button type="button" class="sprk-tab ${mainTab === "friends" ? "is-active" : ""}" data-pmain="friends">
              👥 Friends (${friends.length})${incomingReqs.length ? ` · +${incomingReqs.length}` : ""}
            </button>
            ${!user ? `
              <button type="button" class="sprk-tab ${mainTab === "signin" ? "is-active" : ""}" data-pmain="signin">🔑 Sign In</button>
            ` : `
              <button type="button" class="sprk-tab ${mainTab === "account" ? "is-active" : ""}" data-pmain="account">⚙ Account</button>
            `}
          </nav>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="sprk-btn" id="prof-open-social-hub" style="min-height:30px;padding:3px 10px;font-size:12px;">Open Social Hub →</button>
            <span class="sprk-meta tabular-nums">${user ? escapeHtml(user.publicId) : "Local"}</span>
          </div>
        </div>

        ${statusMsg ? `<div class="sprk-notice" role="status" style="margin-bottom:12px;">${escapeHtml(statusMsg)}</div>` : ""}

        ${mainTab === "profile" ? `
          <div class="sprk-card" style="margin-bottom:14px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div style="display:flex;align-items:flex-start;gap:12px;min-width:0;flex:1;">
                ${renderAvatarVisual(prof.avatarPreset, prof.avatarUrl, 60)}
                <div style="min-width:0;flex:1;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <strong style="font-size:17px;">${escapeHtml(prof.displayName)}</strong>
                    ${prof.username ? `<span class="sprk-meta">@${escapeHtml(prof.username)}</span>` : ""}
                  </div>
                  <div class="sprk-meta" style="margin-top:4px;">
                    ${prof.courseClass ? `<span>${escapeHtml(prof.courseClass)}</span>` : ""}
                    ${prof.courseClass && prof.examAim ? `<span>·</span>` : ""}
                    ${prof.examAim ? `<span>Aim: ${escapeHtml(prof.examAim)}</span>` : ""}
                    <span>·</span>
                    <span>Room: ${privacy.roomVisibility === "public" ? "Public" : privacy.roomVisibility === "private" ? "Private" : "Friends Only"}</span>
                  </div>
                  ${prof.bio ? `<p style="margin:8px 0 0;font-size:13px;color:var(--ink);">${escapeHtml(prof.bio)}</p>` : ""}
                </div>
              </div>
              ${!user ? `<button type="button" class="sprk-btn sprk-btn-primary" data-pmain="signin" style="min-height:34px;padding:4px 12px;">🔑 Sign In to Sync</button>` : ""}
            </div>
            ${favSubs.length > 0 ? `
              <div class="sprk-meta" style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(52,44,37,0.12);">
                <strong>Subjects:</strong> ${escapeHtml(favSubs.join(" · "))}
              </div>
            ` : ""}
          </div>

          <form id="profile-edit-form" class="sprk-card" novalidate>
            <div class="sprk-grid-2">
              <label class="sprk-field">
                <span class="sprk-label">Display Name</span>
                <input id="prof-display" class="sprk-input" type="text" required maxlength="32" value="${escapeHtml(prof.displayName)}" />
              </label>
              <label class="sprk-field">
                <span class="sprk-label">Username</span>
                <input id="prof-username" class="sprk-input" type="text" maxlength="24" value="${escapeHtml(prof.username || "")}" placeholder="study_fox" />
              </label>
            </div>

            <div class="sprk-grid-2">
              <label class="sprk-field">
                <span class="sprk-label">Class / Semester / Course</span>
                <input id="prof-course" class="sprk-input" type="text" maxlength="64" value="${escapeHtml(prof.courseClass || "")}" placeholder="B.Tech CSE · Sem 5" />
              </label>
              <label class="sprk-field">
                <span class="sprk-label">Aim (Target Exams)</span>
                <input id="prof-aim" class="sprk-input" type="text" maxlength="80" value="${escapeHtml(prof.examAim || "")}" placeholder="GATE 2026, Finals" />
              </label>
            </div>

            <label class="sprk-field">
              <span class="sprk-label">Favorite Subjects (comma-separated)</span>
              <input id="prof-fav-subs" class="sprk-input" type="text" maxlength="160" value="${escapeHtml(favSubs.join(", "))}" placeholder="Algorithms, Calculus, Physics" />
            </label>

            <div class="sprk-field">
              <span class="sprk-label">Profile Picture (PFP) &amp; Avatar Icon</span>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
                <label class="sprk-btn" style="min-height:34px;padding:4px 12px;cursor:pointer;">
                  📷 Upload PFP
                  <input id="prof-pfp-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
                </label>
                <input id="prof-pfp-url" class="sprk-input" type="text" value="${escapeHtml(prof.avatarUrl || "")}" placeholder="Or paste https:// image URL..." style="flex:1;min-width:180px;" />
                ${prof.avatarUrl ? `<button type="button" class="sprk-btn" id="prof-pfp-clear" style="min-height:34px;padding:4px 10px;">Clear</button>` : ""}
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${AVATAR_PRESETS.map((av) => `
                  <button type="button" class="sprk-btn ${prof.avatarPreset === av ? "sprk-btn-primary" : ""}" data-avatar="${av}" style="min-width:40px;min-height:34px;padding:4px 8px;">${av}</button>
                `).join("")}
              </div>
            </div>

            <label class="sprk-field">
              <span class="sprk-label">Bio</span>
              <textarea id="prof-bio" class="sprk-textarea" style="min-height:58px;" maxlength="200" placeholder="What are you studying today?">${escapeHtml(prof.bio || "")}</textarea>
            </label>

            <div class="sprk-grid-2" style="padding-top:8px;border-top:1px solid rgba(52,44,37,0.12);">
              <label class="sprk-field">
                <span class="sprk-label">Who can view my study room?</span>
                <select id="prof-room-vis" class="sprk-select">
                  <option value="public" ${privacy.roomVisibility === "public" ? "selected" : ""}>Public (Anyone signed in)</option>
                  <option value="friends" ${privacy.roomVisibility === "friends" ? "selected" : ""}>Friends Only</option>
                  <option value="private" ${privacy.roomVisibility === "private" ? "selected" : ""}>Private (Only me)</option>
                </select>
              </label>
              <div style="display:grid;gap:6px;align-content:end;font-size:12.5px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="prof-priv-online" type="checkbox" ${privacy.showOnlineStatus ? "checked" : ""} />
                  <span>Show online status</span>
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="prof-priv-activity" type="checkbox" ${privacy.showStudyActivity ? "checked" : ""} />
                  <span>Show current study subject</span>
                </label>
              </div>
            </div>

            <button type="submit" id="prof-save-btn" class="sprk-btn sprk-btn-primary">💾 Save Profile &amp; Privacy</button>
          </form>
        ` : mainTab === "friends" ? `
          <div style="display:grid;gap:12px;">
            ${!user ? `
              <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                <div>
                  <strong>Connect Supabase Account for Live Friends</strong>
                  <div class="sprk-meta">Sign in to view profiles, add friends, and visit permitted rooms.</div>
                </div>
                <button type="button" class="sprk-btn sprk-btn-primary" data-pmain="signin">🔑 Sign In</button>
              </div>
            ` : `
              ${inspectedProfile ? (() => {
                const tp = inspectedProfile.profile;
                const ra = inspectedProfile.roomAccess;
                return `
                  <div class="sprk-card" style="border-color:var(--accent);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        ${renderAvatarVisual(tp.avatarPreset, tp.avatarUrl, 48)}
                        <div>
                          <strong style="font-size:15px;">${escapeHtml(tp.displayName)}</strong>
                          <div class="sprk-meta">
                            ${tp.username ? `@${escapeHtml(tp.username)} · ` : ""}${escapeHtml(tp.publicId)}
                            ${tp.courseClass ? ` · ${escapeHtml(tp.courseClass)}` : ""}
                          </div>
                        </div>
                      </div>
                      <button type="button" class="sprk-btn" id="prof-close-inspect" style="min-height:30px;padding:3px 10px;">Close</button>
                    </div>
                    ${tp.bio ? `<p style="margin:0 0 8px;font-size:13px;">${escapeHtml(tp.bio)}</p>` : ""}
                    <div class="sprk-meta" style="margin-bottom:8px;">
                      ${tp.examAim ? `<span>Aim: ${escapeHtml(tp.examAim)} · </span>` : ""}
                      <span class="tabular-nums">${inspectedProfile.friendsCount || 0} friends</span>
                      <span>·</span>
                      <span>Room: ${ra.visibility === "public" ? "Public" : ra.visibility === "private" ? "Private" : "Friends Only"}</span>
                    </div>
                    ${!ra.allowed ? `<div class="sprk-meta" style="margin-bottom:8px;color:#7a3b28;">🔒 ${escapeHtml(ra.reason)}</div>` : ""}
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                      ${renderRelControls(tp.id, tp.privacy)}
                    </div>
                  </div>
                `;
              })() : ""}

              <div class="sprk-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                  <strong>Find Students</strong>
                  <button type="button" class="sprk-btn" id="prof-refresh-friends" style="min-height:32px;padding:4px 10px;">↻ Refresh</button>
                </div>
                <form id="prof-friend-search" style="display:flex;gap:8px;flex-wrap:wrap;">
                  <input id="prof-friend-query" class="sprk-input" type="text" placeholder="Search name, @username, course, or SPRK-ID" required style="flex:1;min-width:180px;" />
                  <button type="submit" class="sprk-btn sprk-btn-primary">Search</button>
                </form>
                ${searchResults ? `
                  <div style="display:grid;gap:8px;margin-top:10px;">
                    ${searchResults.length === 0 ? `<div class="sprk-meta">No matching students found.</div>` : searchResults.map((p) => `
                      <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;">
                        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                          ${renderAvatarVisual(p.avatar_preset, p.avatar_url, 38)}
                          <div style="min-width:0;">
                            <strong style="font-size:13.5px;">${escapeHtml(p.display_name || "Student")}</strong>
                            <div class="sprk-meta">${escapeHtml(p.public_id || "")}${p.course_class ? ` · ${escapeHtml(p.course_class)}` : ""}</div>
                          </div>
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button type="button" class="sprk-btn" data-inspect-profile="${escapeHtml(p.id)}" style="min-height:32px;padding:4px 10px;">Profile</button>
                          ${renderRelControls(p.id, p.privacy)}
                        </div>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>

              ${incomingReqs.length > 0 ? `
                <div class="sprk-card">
                  <strong style="display:block;margin-bottom:8px;">Incoming Requests (${incomingReqs.length})</strong>
                  <div style="display:grid;gap:8px;">
                    ${incomingReqs.map((req) => `
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                        <div>
                          <strong>${escapeHtml(req.profile?.display_name || "Student")}</strong>
                          <span class="sprk-meta">${escapeHtml(req.profile?.public_id || "")}</span>
                        </div>
                        <div style="display:flex;gap:6px;">
                          <button type="button" class="sprk-btn" data-inspect-profile="${escapeHtml(req.senderId)}" style="min-height:32px;padding:4px 10px;">Profile</button>
                          <button type="button" class="sprk-btn sprk-btn-primary" data-req-accept="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Accept</button>
                          <button type="button" class="sprk-btn" data-req-decline="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Decline</button>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              ` : ""}

              ${outgoingReqs.length > 0 ? `
                <div class="sprk-card">
                  <strong style="display:block;margin-bottom:8px;">Sent Requests (${outgoingReqs.length})</strong>
                  <div style="display:grid;gap:8px;">
                    ${outgoingReqs.map((req) => `
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                        <div>
                          <strong>${escapeHtml(req.profile?.display_name || "Student")}</strong>
                          <span class="sprk-meta">${escapeHtml(req.profile?.public_id || "")}</span>
                        </div>
                        <button type="button" class="sprk-btn" data-cancel-req="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Cancel</button>
                      </div>
                    `).join("")}
                  </div>
                </div>
              ` : ""}

              <div class="sprk-card">
                <strong style="display:block;margin-bottom:8px;">My Friends (${friends.length})</strong>
                ${friends.length === 0 ? `
                  <div class="sprk-empty">No friends added yet. Search by name, @username, or Public ID above.</div>
                ` : `
                  <div style="display:grid;gap:8px;">
                    ${friends.map((f) => {
                      const access = canUserVisitRoom({
                        targetUserId: f.id,
                        viewerUserId: user.id,
                        privacy: f.privacy,
                        isFriend: true
                      });
                      return `
                        <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;">
                          <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                            ${renderAvatarVisual(f.avatarPreset, f.avatarUrl, 44)}
                            <div style="min-width:0;">
                              <strong style="font-size:14px;">${escapeHtml(f.displayName)}</strong>
                              <div class="sprk-meta">
                                <span>${escapeHtml(f.publicId)}</span>
                                ${f.courseClass ? `<span>· ${escapeHtml(f.courseClass)}</span>` : ""}
                              </div>
                            </div>
                          </div>
                          <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button type="button" class="sprk-btn" data-inspect-profile="${escapeHtml(f.id)}" style="min-height:32px;padding:4px 10px;">Profile</button>
                            ${access.allowed
                              ? `<button type="button" class="sprk-btn sprk-btn-primary" data-visit-room="${escapeHtml(f.id)}" style="min-height:32px;padding:4px 12px;">🚪 Visit</button>`
                              : `<span class="sprk-meta" style="align-self:center;">Room Private</span>`}
                          </div>
                        </div>
                      `;
                    }).join("")}
                  </div>
                `}
              </div>
            `}
          </div>
        ` : mainTab === "account" && user ? `
          <div class="sprk-card" style="display:grid;gap:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <strong>Signed in as ${escapeHtml(user.email || user.displayName)}</strong>
                <div class="sprk-meta">
                  <span class="tabular-nums">${escapeHtml(user.publicId)}</span>
                  <span>·</span>
                  <span>${user.isPremium ? "Premium" : "Standard"}</span>
                  <span>·</span>
                  <span>Role: ${escapeHtml(user.role || "user")}</span>
                </div>
              </div>
              <button type="button" class="sprk-btn" id="auth-signout">Sign Out</button>
            </div>
            <div class="sprk-meta">
              Theme, skins, object positions, feed, friends, and groups synced · Private diary owner-only
            </div>
            ${user.role === "admin" ? `
              <div>
                <button type="button" class="sprk-btn" id="open-admin-ops">⚙ Open Operations</button>
              </div>
            ` : ""}
          </div>
        ` : `
          <div class="sprk-tabs">
            <button type="button" class="sprk-tab ${authMode === "signin" ? "is-active" : ""}" data-auth-mode="signin">Sign In</button>
            <button type="button" class="sprk-tab ${authMode === "register" ? "is-active" : ""}" data-auth-mode="register">Register</button>
            <button type="button" class="sprk-tab ${authMode === "recover" ? "is-active" : ""}" data-auth-mode="recover">Reset Password</button>
          </div>

          <form id="auth-form" class="sprk-card">
            ${authMode === "register" ? `
              <label class="sprk-field">
                <span class="sprk-label">Display Name</span>
                <input id="auth-display" class="sprk-input" type="text" required maxlength="32" placeholder="Study name" />
              </label>
            ` : ""}
            <label class="sprk-field">
              <span class="sprk-label">Email</span>
              <input id="auth-email" class="sprk-input" type="email" required autocomplete="email" placeholder="student@example.com" />
            </label>
            ${authMode !== "recover" ? `
              <label class="sprk-field">
                <span class="sprk-label">Password</span>
                <input id="auth-password" class="sprk-input" type="password" required minlength="6" autocomplete="${authMode === "register" ? "new-password" : "current-password"}" />
              </label>
            ` : ""}
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <button type="submit" class="sprk-btn sprk-btn-primary" id="auth-submit-btn">
                ${authMode === "signin" ? "Sign In" : authMode === "register" ? "Create Account" : "Send Reset Link"}
              </button>
              <button type="button" class="sprk-btn" data-pmain="profile">Edit Local Card</button>
            </div>
          </form>
        `}
      `;

      container.querySelector("#prof-open-social-hub")?.addEventListener("click", () => {
        close();
        navigateToPage(PAGE_ROUTES.ACCOUNT);
      });

      container.querySelectorAll("[data-pmain]").forEach((btn) => {
        btn.addEventListener("click", () => {
          mainTab = btn.dataset.pmain;
          statusMsg = "";
          renderView();
        });
      });

      container.querySelectorAll("[data-auth-mode]").forEach((btn) => {
        btn.addEventListener("click", () => {
          authMode = btn.dataset.authMode;
          statusMsg = "";
          renderView();
        });
      });

      let chosenAvatar = prof.avatarPreset || "☺";
      container.querySelectorAll("[data-avatar]").forEach((btn) => {
        btn.addEventListener("click", () => {
          chosenAvatar = btn.dataset.avatar;
          container.querySelectorAll("[data-avatar]").forEach((b) => b.classList.toggle("sprk-btn-primary", b === btn));
        });
      });

      container.querySelector("#prof-pfp-file")?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        statusMsg = "Uploading PFP...";
        renderView();
        const { url, error } = await uploadAvatarFile(file);
        if (error) {
          statusMsg = error.message;
          renderView();
          return;
        }
        const curr = getActiveProfile();
        const { error: saveErr } = await updateProfile({ ...curr, avatarUrl: url });
        statusMsg = saveErr ? saveErr.message : "Profile picture updated!";
        renderView();
      });

      container.querySelector("#prof-pfp-clear")?.addEventListener("click", async () => {
        const curr = getActiveProfile();
        const { error: clearErr } = await updateProfile({ ...curr, avatarUrl: "" });
        statusMsg = clearErr ? clearErr.message : "Profile picture cleared.";
        renderView();
      });

      container.querySelector("#profile-edit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const displayName = container.querySelector("#prof-display").value.trim();
        if (!displayName) {
          statusMsg = "Display Name cannot be empty.";
          renderView();
          return;
        }
        const usernameCheck = validateUsernameInput(container.querySelector("#prof-username").value);
        if (!usernameCheck.valid) {
          statusMsg = usernameCheck.error;
          renderView();
          return;
        }
        const rawUrl = container.querySelector("#prof-pfp-url")?.value.trim() || "";
        const safeUrl = sanitizeAvatarUrl(rawUrl);
        if (rawUrl && !safeUrl) {
          statusMsg = "Please enter a valid https:// or http:// image URL.";
          renderView();
          return;
        }
        const roomVisibility = container.querySelector("#prof-room-vis")?.value || "friends";
        const nextPrivacy = normalizePrivacySettings({
          roomVisibility,
          allowRoomVisits: roomVisibility !== "private",
          showOnlineStatus: Boolean(container.querySelector("#prof-priv-online")?.checked),
          showStudyActivity: Boolean(container.querySelector("#prof-priv-activity")?.checked)
        });

        const saveBtn = container.querySelector("#prof-save-btn");
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
        }
        const { error, localOnly } = await updateProfile({
          displayName,
          username: usernameCheck.value,
          avatarPreset: chosenAvatar,
          avatarUrl: safeUrl,
          courseClass: container.querySelector("#prof-course").value.trim(),
          examAim: container.querySelector("#prof-aim").value.trim(),
          favoriteSubjects: parseFavoriteSubjects(container.querySelector("#prof-fav-subs").value),
          bio: container.querySelector("#prof-bio").value.trim(),
          privacy: nextPrivacy
        });
        statusMsg = error
          ? error.message
          : localOnly
            ? "Profile & room privacy saved locally!"
            : "Profile & room privacy saved to cloud!";
        renderView();
      });

      container.querySelector("#prof-refresh-friends")?.addEventListener("click", async () => {
        await loadFriendsAndRequests();
        renderView();
      });

      container.querySelector("#prof-friend-search")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const q = container.querySelector("#prof-friend-query").value.trim();
        const { data, error } = await searchStudentProfiles(q);
        if (error) statusMsg = error.message;
        else searchResults = data || [];
        renderView();
      });

      container.querySelectorAll("[data-inspect-profile]").forEach((btn) => {
        btn.addEventListener("click", () => inspectStudent(btn.dataset.inspectProfile));
      });

      container.querySelector("#prof-close-inspect")?.addEventListener("click", () => {
        inspectedProfile = null;
        renderView();
      });

      container.querySelectorAll("[data-add-friend]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const targetId = btn.dataset.addFriend;
          const { error } = await sendFriendRequest(targetId);
          statusMsg = error ? error.message : "Friend request sent!";
          if (inspectedProfile?.profile.id === targetId) await inspectStudent(targetId);
          else renderView();
        });
      });

      container.querySelectorAll("[data-cancel-req]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await cancelFriendRequest(btn.dataset.cancelReq);
          statusMsg = error ? error.message : "Request cancelled.";
          if (inspectedProfile) await inspectStudent(inspectedProfile.profile.id);
          else renderView();
        });
      });

      container.querySelectorAll("[data-unfriend]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const targetId = btn.dataset.unfriend;
          const { error } = await unfriendUser(targetId);
          statusMsg = error ? error.message : "Friend removed.";
          if (inspectedProfile?.profile.id === targetId) await inspectStudent(targetId);
          else renderView();
        });
      });

      container.querySelectorAll("[data-req-accept]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await respondFriendRequest(btn.dataset.reqAccept, true);
          statusMsg = error ? error.message : "Friend request accepted!";
          if (inspectedProfile) await inspectStudent(inspectedProfile.profile.id);
          else renderView();
        });
      });

      container.querySelectorAll("[data-req-decline]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await respondFriendRequest(btn.dataset.reqDecline, false);
          statusMsg = error ? error.message : "Request declined.";
          renderView();
        });
      });

      container.querySelectorAll("[data-visit-room]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await visitFriendRoom(btn.dataset.visitRoom);
          if (error) {
            statusMsg = error.message;
            renderView();
            return;
          }
          close();
        });
      });

      container.querySelector("#auth-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = container.querySelector("#auth-submit-btn");
        if (submitBtn) submitBtn.disabled = true;

        const email = container.querySelector("#auth-email").value.trim();
        const password = container.querySelector("#auth-password")?.value || "";
        const displayName = container.querySelector("#auth-display")?.value.trim() || "Student";

        try {
          if (authMode === "signin") {
            const { error } = await signInWithEmail({ email, password });
            if (error) {
              statusMsg = error.message;
              renderView();
            } else {
              await syncAuthenticatedUserData();
              mainTab = "profile";
              rerender();
            }
          } else if (authMode === "register") {
            const { error, requiresEmailConfirmation } = await signUpWithEmail({ email, password, displayName });
            if (error) {
              statusMsg = error.message;
              renderView();
            } else if (requiresEmailConfirmation) {
              statusMsg = "Account created! Check your email to confirm before signing in.";
              authMode = "signin";
              renderView();
            } else {
              await syncAuthenticatedUserData();
              mainTab = "profile";
              rerender();
            }
          } else {
            const { error } = await sendPasswordRecovery(email);
            statusMsg = error ? error.message : "Password reset email sent.";
            renderView();
          }
        } catch (err) {
          statusMsg = err?.message || "Authentication request failed.";
          renderView();
        }
      });

      container.querySelector("#auth-signout")?.addEventListener("click", async () => {
        await signOut();
        inspectedProfile = null;
        mainTab = "signin";
        rerender();
      });

      container.querySelector("#open-admin-ops")?.addEventListener("click", () => {
        dialogManager.open("ops", container);
      });
    };

    renderView();
  }
};
