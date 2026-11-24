// Dedicated /account Social Hub — Study Feed, People & Friends, Study Groups, Public Profiles & Privacy Controls
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { supabase } from "../services/supabase.js";
import { signInWithEmail, signUpWithEmail, sendPasswordRecovery, signOut } from "../services/auth-service.js";
import {
  updateProfile,
  uploadAvatarFile,
  uploadBannerFile,
  syncAuthenticatedUserData,
  loadFriendsAndRequests,
  searchStudentProfiles,
  fetchSuggestedStudents,
  fetchUserPublicProfile,
  sendFriendRequest,
  cancelFriendRequest,
  respondFriendRequest,
  unfriendUser,
  visitFriendRoom,
  loadSocialFeed,
  createSocialPost,
  toggleSocialPostLike,
  loadPostComments,
  createPostComment,
  deleteSocialPost,
  loadStudyGroups,
  createStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  loadGroupWorkspace,
  postGroupMessage,
  updateGroupAnnouncement
} from "../services/database-service.js";
import { presenceService } from "../services/presence-service.js";
import { setAppMode } from "../core/settings-manager.js";
import { navigateToPage, parseCurrentPage, PAGE_ROUTES } from "../router.js";
import {
  AVATAR_PRESETS,
  sanitizeAvatarUrl,
  parseFavoriteSubjects,
  validateUsernameInput,
  normalizePrivacySettings
} from "../utils/profile-helpers.js";
import {
  canUserVisitRoom,
  getRelationshipStatus,
  canPerformGroupAction,
  ROOM_VISIBILITY
} from "../utils/privacy-scope.js";
import { summarizeFocusMinutes } from "../utils/timer-math.js";
import { escapeHtml, formatMinutesLabel } from "../utils/dom.js";

function formatShortTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function roomVisibilityLabel(vis) {
  if (vis === ROOM_VISIBILITY.PUBLIC) return "Public Room";
  if (vis === ROOM_VISIBILITY.PRIVATE) return "Private Room";
  return "Friends Only Room";
}

export function initAccountPage() {
  const shellEl = document.getElementById("sprk-account-shell");
  if (!shellEl) return;

  let activeTab = "feed"; // feed | people | groups | profile | auth
  let feedScope = "all"; // all | friends | mine
  let authMode = "signin"; // signin | register | recover
  let statusMsg = "";
  let searchResults = null;
  let inspectedProfile = null; // null | { profile, relationship, roomAccess, friendsCount, posts }
  let openCommentsPostId = null;
  let commentsByPost = {};
  let activeGroupId = null;
  let showCreateGroup = false;

  const isAccountActive = () => parseCurrentPage().page === PAGE_ROUTES.ACCOUNT;

  const getActiveProfile = () => {
    if (state.user) return state.user;
    return {
      publicId: "LOCAL",
      displayName: state.localProfile?.displayName || state.preferences?.localDisplayName || "Local Student",
      username: state.localProfile?.username || "",
      avatarPreset: state.localProfile?.avatarPreset || "☺",
      avatarUrl: state.localProfile?.avatarUrl || "",
      bannerUrl: state.localProfile?.bannerUrl || "",
      bio: state.localProfile?.bio || "",
      courseClass: state.localProfile?.courseClass || "",
      examAim: state.localProfile?.examAim || "",
      favoriteSubjects: state.localProfile?.favoriteSubjects || [],
      privacy: normalizePrivacySettings(state.localProfile?.privacy)
    };
  };

  const renderAvatar = (preset, url, size = 56) => {
    const safeUrl = sanitizeAvatarUrl(url || "");
    return `
      <div class="acc-avatar-box" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px;">
        ${safeUrl
          ? `<img src="${escapeHtml(safeUrl)}" alt="Student avatar" referrerpolicy="no-referrer" />`
          : `<span>${escapeHtml(preset || "☺")}</span>`}
      </div>
    `;
  };

  const openPublicProfile = async (identifier) => {
    if (!identifier) return;
    if (state.user && identifier === state.user.id) {
      inspectedProfile = null;
      activeTab = "profile";
      statusMsg = "";
      render();
      return;
    }
    statusMsg = "";
    const { data, error } = await fetchUserPublicProfile(identifier);
    if (error || !data) {
      statusMsg = error?.message || "Could not load student profile.";
      render();
      return;
    }
    inspectedProfile = data;
    activeTab = "profile";
    render();
  };

  const goVisitFriend = async (identifier) => {
    const { error } = await visitFriendRoom(identifier);
    if (error) {
      statusMsg = error.message || "Could not open student's study room.";
      render();
      return;
    }
    setAppMode("cozy", { syncUrl: false });
    navigateToPage(PAGE_ROUTES.COZY);
  };

  const renderPostCard = (post) => {
    const author = post.author || {};
    const isMine = state.user?.id && author.id === state.user.id;
    const isOpen = openCommentsPostId === post.id;
    const comments = commentsByPost[post.id] || [];
    const typeLabel = post.post_type && post.post_type !== "update" ? post.post_type : "";

    return `
      <article class="acc-post-card" data-post-id="${escapeHtml(post.id)}">
        <div class="acc-post-head">
          <div class="acc-post-author">
            <button type="button" class="acc-btn-link" data-open-profile="${escapeHtml(author.id || "")}" style="display:flex;align-items:center;gap:10px;">
              ${renderAvatar(author.avatarPreset, author.avatarUrl, 40)}
              <span style="display:grid;gap:2px;">
                <strong style="font-size:14px;">${escapeHtml(author.displayName || "Student")}</strong>
                <span class="acc-meta-line">
                  ${author.username ? `<span>@${escapeHtml(author.username)}</span><span>·</span>` : ""}
                  <span>${escapeHtml(post.subject || "General Study")}</span>
                  ${typeLabel ? `<span>·</span><span>${escapeHtml(typeLabel)}</span>` : ""}
                  <span>·</span>
                  <span>${escapeHtml(formatShortTime(post.created_at))}</span>
                  ${post.visibility === "friends" ? `<span>· Friends only</span>` : ""}
                </span>
              </span>
            </button>
          </div>
          ${isMine ? `<button type="button" class="acc-btn" data-del-post="${escapeHtml(post.id)}" style="min-height:28px;padding:0 10px;font-size:12px;">Delete</button>` : ""}
        </div>

        <p class="acc-post-body">${escapeHtml(post.content || "")}</p>

        <div class="acc-post-actions">
          <button type="button" class="acc-post-action-btn ${post.likedByMe ? "is-liked" : ""}" data-like-post="${escapeHtml(post.id)}">
            <span>${post.likedByMe ? "♥" : "♡"}</span>
            <span class="tabular-nums">${post.likes_count || 0}</span>
          </button>
          <button type="button" class="acc-post-action-btn" data-toggle-comments="${escapeHtml(post.id)}">
            <span>💬</span>
            <span class="tabular-nums">${post.comments_count || 0}</span>
          </button>
          <button type="button" class="acc-post-action-btn" data-open-profile="${escapeHtml(author.id || "")}">
            View Profile
          </button>
        </div>

        ${isOpen ? `
          <div class="acc-comments-box">
            ${comments.length === 0 ? `<div class="acc-sub" style="margin:0;font-size:12.5px;">No comments yet.</div>` : comments.map((c) => `
              <div class="acc-comment-row">
                <div class="acc-meta-line">
                  <button type="button" class="acc-btn-link" data-open-profile="${escapeHtml(c.author?.id || "")}" style="font-size:12.5px;font-weight:700;">
                    ${escapeHtml(c.author?.displayName || "Student")}
                  </button>
                  <span>·</span>
                  <span>${escapeHtml(formatShortTime(c.created_at))}</span>
                </div>
                <span>${escapeHtml(c.content || "")}</span>
              </div>
            `).join("")}
            <form class="acc-comment-form" data-comment-form="${escapeHtml(post.id)}" style="display:flex;gap:8px;margin-top:4px;">
              <input class="acc-input" type="text" required maxlength="400" placeholder="Write a supportive reply..." style="min-height:34px;" />
              <button type="submit" class="acc-btn-primary" style="min-height:34px;">Reply</button>
            </form>
          </div>
        ` : ""}
      </article>
    `;
  };

  const renderRelationshipActions = (targetId, privacy = {}) => {
    if (!state.user?.id || !targetId) return "";
    const rel = getRelationshipStatus({
      viewerId: state.user.id,
      targetId,
      friends: state.friends,
      incoming: state.friendRequests?.incoming,
      outgoing: state.friendRequests?.outgoing
    });
    const isFriend = rel.status === "friends";
    const roomAccess = canUserVisitRoom({
      targetUserId: targetId,
      viewerUserId: state.user.id,
      privacy,
      isFriend
    });

    const relBtn =
      rel.status === "self"
        ? ""
        : rel.status === "friends"
          ? `<button type="button" class="acc-btn" data-acc-unfriend="${escapeHtml(targetId)}">Friends · Unfriend</button>`
          : rel.status === "outgoing"
            ? `<button type="button" class="acc-btn" data-acc-cancel-req="${escapeHtml(rel.requestId)}">Request Sent · Cancel</button>`
            : rel.status === "incoming"
              ? `<button type="button" class="acc-btn-primary" data-acc-req-accept="${escapeHtml(rel.requestId)}">Accept Friend</button>
                 <button type="button" class="acc-btn" data-acc-req-decline="${escapeHtml(rel.requestId)}">Decline</button>`
              : `<button type="button" class="acc-btn-primary" data-acc-add-friend="${escapeHtml(targetId)}">+ Add Friend</button>`;

    const visitBtn = roomAccess.allowed
      ? `<button type="button" class="acc-btn" data-acc-visit="${escapeHtml(targetId)}">Visit Study Room →</button>`
      : "";

    return `${relBtn}${visitBtn}`;
  };

  const render = () => {
    const active = isAccountActive();
    shellEl.hidden = !active;
    if (!active) return;

    const user = state.user;
    const prof = getActiveProfile();
    const favSubs = Array.isArray(prof.favoriteSubjects) ? prof.favoriteSubjects : [];
    const incomingReqs = state.friendRequests?.incoming || [];
    const outgoingReqs = state.friendRequests?.outgoing || [];
    const presenceSnap = presenceService.getSnapshot(Date.now());
    const friendEntries = presenceSnap.entries || [];
    const preferredMode = state.preferences?.appMode === "deepfocus" ? "deepfocus" : "cozy";
    const totalFocusMins = summarizeFocusMinutes(state.localStudyRecords).totalMinutes;
    const myPrivacy = normalizePrivacySettings(prof.privacy);

    // Filter feed if needed when using client scope
    const visibleFeed = (state.socialFeed || []).filter((p) => {
      if (feedScope === "mine") return user?.id && p.author_id === user.id;
      if (feedScope === "friends") {
        const friendSet = new Set((state.friends || []).map((f) => f.id));
        return user?.id && (p.author_id === user.id || friendSet.has(p.author_id));
      }
      return true;
    });

    shellEl.innerHTML = `
      <header class="acc-topbar">
        <button type="button" class="acc-brand" data-acc-nav="home">
          <span>SPRK Desk</span>
        </button>

        <nav class="acc-nav" aria-label="Site navigation">
          <button type="button" class="acc-nav-btn" data-acc-nav="home">Home</button>
          <button type="button" class="acc-nav-btn" data-acc-nav="cozy">Cozy Study</button>
          <button type="button" class="acc-nav-btn" data-acc-nav="deepfocus">Deep Focus</button>
          <button type="button" class="acc-nav-btn is-active" data-acc-nav="account">Social &amp; Account</button>
        </nav>

        <button type="button" class="acc-btn-primary" id="acc-return-study">
          ${preferredMode === "deepfocus" ? "Back to Deep Focus →" : "Back to Cozy Study →"}
        </button>
      </header>

      <main class="acc-main">
        <div class="acc-header-row">
          <div>
            <h1 class="acc-h1">
              ${inspectedProfile && activeTab === "profile"
                ? escapeHtml(inspectedProfile.profile.displayName)
                : user
                  ? escapeHtml(prof.displayName)
                  : "SPRK Study Network"}
            </h1>
            <p class="acc-sub">
              ${inspectedProfile && activeTab === "profile"
                ? `${inspectedProfile.profile.username ? `@${escapeHtml(inspectedProfile.profile.username)} · ` : ""}${escapeHtml(inspectedProfile.profile.publicId)} · ${escapeHtml(roomVisibilityLabel(inspectedProfile.roomAccess.visibility))}`
                : user
                  ? `Connected · ${escapeHtml(user.publicId)} · ${escapeHtml(roomVisibilityLabel(myPrivacy.roomVisibility))}`
                  : "Sign in to share study updates, connect with friends, join groups, and explore profiles."}
            </p>
          </div>

          <div class="acc-tabs" role="tablist" aria-label="Social and account sections">
            <button type="button" class="acc-tab ${activeTab === "feed" ? "is-active" : ""}" data-acc-tab="feed">Feed</button>
            <button type="button" class="acc-tab ${activeTab === "people" ? "is-active" : ""}" data-acc-tab="people">
              People (${friendEntries.length})${incomingReqs.length ? ` · +${incomingReqs.length}` : ""}
            </button>
            <button type="button" class="acc-tab ${activeTab === "groups" ? "is-active" : ""}" data-acc-tab="groups">
              Groups (${(state.studyGroups || []).length})
            </button>
            <button type="button" class="acc-tab ${activeTab === "profile" && !inspectedProfile ? "is-active" : ""}" data-acc-tab="profile">
              My Profile
            </button>
            <button type="button" class="acc-tab ${activeTab === "auth" ? "is-active" : ""}" data-acc-tab="auth">
              ${user ? "Account" : "Sign In"}
            </button>
          </div>
        </div>

        ${statusMsg ? `<div class="acc-notice" role="status">${escapeHtml(statusMsg)}</div>` : ""}

        ${activeTab === "feed" ? `
          ${!user ? `
            <div class="acc-card" style="max-width:640px;">
              <h2>Join the SPRK Study Community</h2>
              <p class="acc-sub" style="margin:0;">
                Sign in to post study updates, follow classmates, view student profiles, send friend requests, and join study groups. Your study room always stays private or friends-only unless you choose Public.
              </p>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button type="button" class="acc-btn-primary" data-acc-tab="auth">Sign In / Create Account</button>
                <button type="button" class="acc-btn" data-acc-tab="profile">Edit Local Card</button>
              </div>
            </div>
          ` : `
            <div class="acc-grid-feed">
              <section style="display:grid;gap:16px;">
                <form id="acc-post-form" class="acc-card">
                  <div style="display:flex;align-items:center;gap:10px;">
                    ${renderAvatar(prof.avatarPreset, prof.avatarUrl, 42)}
                    <div style="flex:1;">
                      <strong>${escapeHtml(prof.displayName)}</strong>
                      <div class="acc-meta-line">Share a study milestone, question, or progress note</div>
                    </div>
                  </div>
                  <textarea id="acc-post-content" class="acc-textarea" maxlength="800" required placeholder="What are you studying or conquering today?"></textarea>
                  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
                    <div style="display:flex;gap:8px;flex-wrap:wrap;flex:1;">
                      <input id="acc-post-subject" class="acc-input" type="text" maxlength="48" value="General Study" placeholder="Subject" style="max-width:170px;" />
                      <select id="acc-post-type" class="acc-select" style="max-width:140px;">
                        <option value="update">Update</option>
                        <option value="milestone">Milestone</option>
                        <option value="question">Question</option>
                        <option value="resource">Resource</option>
                        <option value="reflection">Reflection</option>
                      </select>
                      <select id="acc-post-visibility" class="acc-select" style="max-width:140px;">
                        <option value="public">Public</option>
                        <option value="friends">Friends Only</option>
                      </select>
                    </div>
                    <button type="submit" class="acc-btn-primary">Post Update</button>
                  </div>
                </form>

                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                  <div class="acc-tabs">
                    <button type="button" class="acc-tab ${feedScope === "all" ? "is-active" : ""}" data-feed-scope="all">All Students</button>
                    <button type="button" class="acc-tab ${feedScope === "friends" ? "is-active" : ""}" data-feed-scope="friends">Friends</button>
                    <button type="button" class="acc-tab ${feedScope === "mine" ? "is-active" : ""}" data-feed-scope="mine">My Posts</button>
                  </div>
                  <button type="button" class="acc-btn" id="acc-refresh-feed">↻ Refresh</button>
                </div>

                <div class="acc-feed-list">
                  ${visibleFeed.length === 0
                    ? `<div class="acc-card"><p class="acc-sub" style="margin:0;">No posts in this feed yet. Share your first study update above!</p></div>`
                    : visibleFeed.map((post) => renderPostCard(post)).join("")}
                </div>
              </section>

              <aside style="display:grid;gap:16px;">
                <div class="acc-card">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <h3>My Study Snapshot</h3>
                    <button type="button" class="acc-btn" data-acc-tab="profile" style="min-height:30px;padding:0 10px;font-size:12px;">Edit</button>
                  </div>
                  <div class="acc-profile-hero">
                    ${renderAvatar(prof.avatarPreset, prof.avatarUrl, 52)}
                    <div style="min-width:0;">
                      <strong>${escapeHtml(prof.displayName)}</strong>
                      <div class="acc-meta-line">
                        ${prof.username ? `<span>@${escapeHtml(prof.username)}</span>` : `<span class="tabular-nums">${escapeHtml(prof.publicId)}</span>`}
                      </div>
                      <div class="acc-meta-line" style="margin-top:4px;">
                        <span>${escapeHtml(roomVisibilityLabel(myPrivacy.roomVisibility))}</span>
                      </div>
                    </div>
                  </div>
                  <div class="acc-stat-strip">
                    <div class="acc-stat-item">
                      <span class="acc-stat-label">Focus</span>
                      <span class="acc-stat-val tabular-nums">${formatMinutesLabel(totalFocusMins)}</span>
                    </div>
                    <div class="acc-stat-item">
                      <span class="acc-stat-label">Friends</span>
                      <span class="acc-stat-val tabular-nums">${friendEntries.length}</span>
                    </div>
                    <div class="acc-stat-item">
                      <span class="acc-stat-label">Groups</span>
                      <span class="acc-stat-val tabular-nums">${Object.keys(state.groupMemberships || {}).length}</span>
                    </div>
                  </div>
                </div>

                <div class="acc-card">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <h3>Discover Students</h3>
                    <button type="button" class="acc-btn" data-acc-tab="people" style="min-height:30px;padding:0 10px;font-size:12px;">All</button>
                  </div>
                  ${(state.suggestedStudents || []).length === 0
                    ? `<p class="acc-sub" style="margin:0;">Search classmates in the People tab.</p>`
                    : `<div class="acc-friend-list">
                        ${(state.suggestedStudents || []).slice(0, 5).map((p) => {
                          const rel = getRelationshipStatus({
                            viewerId: user.id,
                            targetId: p.id,
                            friends: state.friends,
                            incoming: incomingReqs,
                            outgoing: outgoingReqs
                          });
                          return `
                            <div class="acc-friend-row" style="padding:10px 12px;">
                              <button type="button" class="acc-btn-link acc-friend-left" data-open-profile="${escapeHtml(p.id)}">
                                ${renderAvatar(p.avatar_preset, p.avatar_url, 36)}
                                <span style="min-width:0;display:grid;">
                                  <strong style="font-size:13px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.display_name || "Student")}</strong>
                                  <span class="acc-meta-line">${escapeHtml(p.course_class || p.public_id || "")}</span>
                                </span>
                              </button>
                              ${rel.status === "none"
                                ? `<button type="button" class="acc-btn" data-acc-add-friend="${escapeHtml(p.id)}" style="min-height:30px;padding:0 10px;font-size:12px;">+ Add</button>`
                                : rel.status === "outgoing"
                                  ? `<span class="acc-sub" style="margin:0;font-size:11.5px;">Sent</span>`
                                  : `<span class="acc-sub" style="margin:0;font-size:11.5px;">${rel.status === "friends" ? "Friend" : "Pending"}</span>`}
                            </div>
                          `;
                        }).join("")}
                      </div>`}
                </div>
              </aside>
            </div>
          `}
        ` : activeTab === "people" ? `
          ${!user ? `
            <div class="acc-card" style="max-width:600px;">
              <h2>Sign In to Connect with Friends</h2>
              <p class="acc-sub" style="margin:0;">Search students by name, @username, course, or Public ID, inspect their profiles, and visit rooms shared with you.</p>
              <div><button type="button" class="acc-btn-primary" data-acc-tab="auth">Sign In / Register</button></div>
            </div>
          ` : `
            <div style="display:grid;gap:20px;">
              <div class="acc-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                  <h2>Find Students &amp; Study Buddies</h2>
                  <button type="button" class="acc-btn" id="acc-refresh-friends">↻ Refresh</button>
                </div>
                <form id="acc-friend-search-form" style="display:flex;gap:8px;flex-wrap:wrap;">
                  <input id="acc-friend-query" class="acc-input" type="text" required placeholder="Search by name, @username, course, or Public ID (SPRK-...)" style="flex:1;min-width:220px;" />
                  <button type="submit" class="acc-btn-primary">Search</button>
                </form>

                ${searchResults !== null ? `
                  <div class="acc-friend-list">
                    ${searchResults.length === 0 ? `<div class="acc-sub">No matching students found.</div>` : searchResults.map((p) => `
                      <div class="acc-friend-row">
                        <button type="button" class="acc-btn-link acc-friend-left" data-open-profile="${escapeHtml(p.id)}">
                          ${renderAvatar(p.avatar_preset, p.avatar_url, 44)}
                          <span style="min-width:0;display:grid;">
                            <strong>${escapeHtml(p.display_name || "Student")}</strong>
                            <span class="acc-meta-line">
                              ${p.username ? `<span>@${escapeHtml(p.username)}</span><span>·</span>` : ""}
                              <span class="tabular-nums">${escapeHtml(p.public_id || "")}</span>
                              ${p.course_class ? `<span>· ${escapeHtml(p.course_class)}</span>` : ""}
                            </span>
                          </span>
                        </button>
                        <div class="acc-friend-actions">
                          <button type="button" class="acc-btn" data-open-profile="${escapeHtml(p.id)}">View Profile</button>
                          ${renderRelationshipActions(p.id, p.privacy)}
                        </div>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>

              ${incomingReqs.length > 0 || outgoingReqs.length > 0 ? `
                <div class="acc-grid-2" style="grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));">
                  <div class="acc-card">
                    <h3>Incoming Friend Requests (${incomingReqs.length})</h3>
                    ${incomingReqs.length === 0 ? `<div class="acc-sub">No incoming requests.</div>` : `
                      <div class="acc-friend-list">
                        ${incomingReqs.map((req) => `
                          <div class="acc-friend-row">
                            <button type="button" class="acc-btn-link acc-friend-left" data-open-profile="${escapeHtml(req.senderId)}">
                              ${renderAvatar(req.profile?.avatar_preset, req.profile?.avatar_url, 40)}
                              <span>
                                <strong>${escapeHtml(req.profile?.display_name || "Student")}</strong>
                                <span class="acc-meta-line">${escapeHtml(req.profile?.public_id || "")}</span>
                              </span>
                            </button>
                            <div class="acc-friend-actions">
                              <button type="button" class="acc-btn-primary" data-acc-req-accept="${escapeHtml(req.id)}">Accept</button>
                              <button type="button" class="acc-btn" data-acc-req-decline="${escapeHtml(req.id)}">Decline</button>
                            </div>
                          </div>
                        `).join("")}
                      </div>
                    `}
                  </div>

                  <div class="acc-card">
                    <h3>Sent Requests (${outgoingReqs.length})</h3>
                    ${outgoingReqs.length === 0 ? `<div class="acc-sub">No outgoing requests pending.</div>` : `
                      <div class="acc-friend-list">
                        ${outgoingReqs.map((req) => `
                          <div class="acc-friend-row">
                            <button type="button" class="acc-btn-link acc-friend-left" data-open-profile="${escapeHtml(req.receiverId)}">
                              ${renderAvatar(req.profile?.avatar_preset, req.profile?.avatar_url, 40)}
                              <span>
                                <strong>${escapeHtml(req.profile?.display_name || "Student")}</strong>
                                <span class="acc-meta-line">${escapeHtml(req.profile?.public_id || "")}</span>
                              </span>
                            </button>
                            <button type="button" class="acc-btn" data-acc-cancel-req="${escapeHtml(req.id)}">Cancel</button>
                          </div>
                        `).join("")}
                      </div>
                    `}
                  </div>
                </div>
              ` : ""}

              <div class="acc-card">
                <h3>My Friends (${friendEntries.length})</h3>
                ${friendEntries.length === 0 ? `
                  <p class="acc-sub" style="margin:0;">No friends added yet. Search classmates above or browse Suggested Students below.</p>
                ` : `
                  <div class="acc-friend-list">
                    ${friendEntries.map((f) => {
                      const access = canUserVisitRoom({
                        targetUserId: f.id,
                        viewerUserId: user.id,
                        privacy: f.privacy,
                        isFriend: true
                      });
                      return `
                        <div class="acc-friend-row">
                          <button type="button" class="acc-btn-link acc-friend-left" data-open-profile="${escapeHtml(f.id)}">
                            ${renderAvatar(f.avatarPreset, f.avatarUrl, 44)}
                            <span style="min-width:0;display:grid;">
                              <span style="display:flex;align-items:center;gap:6px;">
                                <span class="acc-status-dot is-${escapeHtml(f.status)}"></span>
                                <strong>${escapeHtml(f.displayName)}</strong>
                              </span>
                              <span class="acc-meta-line">
                                <span class="tabular-nums">${escapeHtml(f.publicId)}</span>
                                ${f.courseClass ? `<span>· ${escapeHtml(f.courseClass)}</span>` : ""}
                                <span>· ${f.status === "studying" ? `Studying ${escapeHtml(f.subject || "Focus")}` : f.status === "online" ? "Online" : "Offline"}</span>
                              </span>
                            </span>
                          </button>
                          <div class="acc-friend-actions">
                            <button type="button" class="acc-btn" data-open-profile="${escapeHtml(f.id)}">View Profile</button>
                            ${access.allowed
                              ? `<button type="button" class="acc-btn-primary" data-acc-visit="${escapeHtml(f.id)}">Visit Room</button>`
                              : `<span class="acc-sub" style="margin:0;font-size:12px;">Room Private</span>`}
                          </div>
                        </div>
                      `;
                    }).join("")}
                  </div>
                `}
              </div>

              ${(state.suggestedStudents || []).length > 0 ? `
                <div class="acc-card">
                  <h3>Suggested Students</h3>
                  <div class="acc-friend-list">
                    ${(state.suggestedStudents || []).map((p) => `
                      <div class="acc-friend-row">
                        <button type="button" class="acc-btn-link acc-friend-left" data-open-profile="${escapeHtml(p.id)}">
                          ${renderAvatar(p.avatar_preset, p.avatar_url, 42)}
                          <span style="min-width:0;display:grid;">
                            <strong>${escapeHtml(p.display_name || "Student")}</strong>
                            <span class="acc-meta-line">
                              ${p.username ? `<span>@${escapeHtml(p.username)}</span><span>·</span>` : ""}
                              <span>${escapeHtml(p.course_class || p.public_id || "")}</span>
                              ${p.exam_aim ? `<span>· Aim: ${escapeHtml(p.exam_aim)}</span>` : ""}
                            </span>
                          </span>
                        </button>
                        <div class="acc-friend-actions">
                          <button type="button" class="acc-btn" data-open-profile="${escapeHtml(p.id)}">View Profile</button>
                          ${renderRelationshipActions(p.id, p.privacy)}
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              ` : ""}
            </div>
          `}
        ` : activeTab === "groups" ? `
          ${!user ? `
            <div class="acc-card" style="max-width:600px;">
              <h2>Sign In to Join Study Groups</h2>
              <p class="acc-sub" style="margin:0;">Create subject circles, discuss notes, pin announcements, and invite friends with invite codes.</p>
              <div><button type="button" class="acc-btn-primary" data-acc-tab="auth">Sign In / Register</button></div>
            </div>
          ` : activeGroupId && state.activeGroupWorkspace?.group?.id === activeGroupId ? (() => {
            const ws = state.activeGroupWorkspace;
            const grp = ws.group;
            const isMember = Boolean(ws.myRole);
            const canPin = canPerformGroupAction(ws.myRole, "pin_announcement");
            return `
              <div style="display:grid;gap:18px;">
                <div class="acc-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                    <div>
                      <button type="button" class="acc-btn" id="acc-grp-back" style="margin-bottom:10px;min-height:32px;">← All Groups</button>
                      <h2 style="font-size:20px;">${escapeHtml(grp.name)}</h2>
                      <div class="acc-meta-line" style="margin-top:4px;">
                        <span>${escapeHtml(grp.subject || "General")}</span>
                        <span>·</span>
                        <span class="tabular-nums">${ws.members.length || grp.member_count || 1} members</span>
                        <span>·</span>
                        <span>${grp.is_private ? "Private Group" : "Public Group"}</span>
                        ${grp.invite_code ? `<span>·</span><span>Invite Code: <strong class="tabular-nums">${escapeHtml(grp.invite_code)}</strong></span>` : ""}
                      </div>
                      ${grp.description ? `<p style="margin:8px 0 0;font-size:13.5px;color:#4a3f35;">${escapeHtml(grp.description)}</p>` : ""}
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                      ${isMember
                        ? `<button type="button" class="acc-btn" id="acc-grp-leave" data-grp-id="${escapeHtml(grp.id)}">${ws.myRole === "owner" && ws.members.length <= 1 ? "Delete Group" : "Leave Group"}</button>`
                        : `<button type="button" class="acc-btn-primary" data-grp-join="${escapeHtml(grp.id)}">Join Group</button>`}
                    </div>
                  </div>

                  ${grp.pinned_announcement ? `
                    <div class="acc-notice" style="margin-top:4px;">
                      <strong>Pinned Announcement:</strong> ${escapeHtml(grp.pinned_announcement)}
                    </div>
                  ` : ""}

                  ${canPin ? `
                    <form id="acc-grp-pin-form" style="display:flex;gap:8px;flex-wrap:wrap;">
                      <input id="acc-grp-pin-input" class="acc-input" type="text" maxlength="260" value="${escapeHtml(grp.pinned_announcement || "")}" placeholder="Set a pinned group announcement..." style="flex:1;min-width:200px;" />
                      <button type="submit" class="acc-btn">Update Pin</button>
                    </form>
                  ` : ""}
                </div>

                <div class="acc-grid-feed">
                  <section class="acc-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <h3>Group Discussion</h3>
                      <button type="button" class="acc-btn" id="acc-grp-refresh" style="min-height:30px;padding:0 10px;font-size:12px;">↻ Refresh</button>
                    </div>
                    ${!isMember ? `
                      <div class="acc-room-lock-box">
                        <strong>Members-Only Discussion</strong>
                        <span>Join this study group to read and send messages in the group feed.</span>
                      </div>
                    ` : `
                      <div class="acc-chat-log">
                        ${ws.messages.length === 0 ? `<div class="acc-sub">No messages yet. Say hello to your study group!</div>` : ws.messages.map((m) => `
                          <div class="acc-chat-msg ${m.message_type === "announcement" ? "is-announcement" : ""}">
                            <div class="acc-meta-line">
                              <button type="button" class="acc-btn-link" data-open-profile="${escapeHtml(m.author?.id || "")}" style="font-weight:700;font-size:12.5px;">
                                ${escapeHtml(m.author?.displayName || "Student")}
                              </button>
                              <span>·</span>
                              <span>${escapeHtml(formatShortTime(m.created_at))}</span>
                            </div>
                            <span style="font-size:13.5px;">${escapeHtml(m.content || "")}</span>
                          </div>
                        `).join("")}
                      </div>
                      <form id="acc-grp-msg-form" style="display:flex;gap:8px;">
                        <input id="acc-grp-msg-input" class="acc-input" type="text" maxlength="600" required placeholder="Share notes, a focus countdown, or encouragement..." />
                        <button type="submit" class="acc-btn-primary">Send</button>
                      </form>
                    `}
                  </section>

                  <aside class="acc-card">
                    <h3>Members (${ws.members.length})</h3>
                    <div class="acc-friend-list">
                      ${ws.members.map((m) => `
                        <div class="acc-friend-row" style="padding:10px 12px;">
                          <button type="button" class="acc-btn-link acc-friend-left" data-open-profile="${escapeHtml(m.userId)}">
                            ${renderAvatar(m.profile.avatarPreset, m.profile.avatarUrl, 36)}
                            <span style="min-width:0;display:grid;">
                              <strong style="font-size:13px;">${escapeHtml(m.profile.displayName)}</strong>
                              <span class="acc-meta-line">${escapeHtml(m.role)} · ${escapeHtml(m.profile.publicId || "")}</span>
                            </span>
                          </button>
                          <button type="button" class="acc-btn" data-open-profile="${escapeHtml(m.userId)}" style="min-height:28px;padding:0 10px;font-size:12px;">Profile</button>
                        </div>
                      `).join("")}
                    </div>
                  </aside>
                </div>
              </div>
            `;
          })() : `
            <div style="display:grid;gap:20px;">
              <div class="acc-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                  <div>
                    <h2>Study Groups</h2>
                    <div class="acc-sub" style="margin-top:2px;">Collaborate with subject cohorts or join a private circle with an invite code.</div>
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="acc-btn" id="acc-grp-list-refresh">↻ Refresh</button>
                    <button type="button" class="acc-btn-primary" id="acc-toggle-create-grp">${showCreateGroup ? "Close Form" : "+ Create Group"}</button>
                  </div>
                </div>

                <form id="acc-join-code-form" style="display:flex;gap:8px;flex-wrap:wrap;">
                  <input id="acc-join-code-input" class="acc-input" type="text" maxlength="16" required placeholder="Enter Group Invite Code (e.g. A1B2C3D4)" style="max-width:280px;" />
                  <button type="submit" class="acc-btn">Join by Code</button>
                </form>

                ${showCreateGroup ? `
                  <form id="acc-create-grp-form" style="display:grid;gap:12px;padding-top:12px;border-top:1px solid rgba(36,30,25,0.1);">
                    <div class="acc-form-grid">
                      <label class="acc-field">
                        <span class="acc-label">Group Name</span>
                        <input id="acc-grp-name" class="acc-input" type="text" required maxlength="60" placeholder="Morning Calculus Club" />
                      </label>
                      <label class="acc-field">
                        <span class="acc-label">Subject</span>
                        <input id="acc-grp-subject" class="acc-input" type="text" required maxlength="48" value="Mathematics" />
                      </label>
                    </div>
                    <label class="acc-field">
                      <span class="acc-label">Description</span>
                      <textarea id="acc-grp-desc" class="acc-textarea" maxlength="260" placeholder="Daily 50/10 Pomodoro blocks and weekly problem reviews"></textarea>
                    </label>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;cursor:pointer;">
                        <input id="acc-grp-private" type="checkbox" />
                        <span>Private group (joinable via invite code only)</span>
                      </label>
                      <button type="submit" class="acc-btn-primary">Create Study Group</button>
                    </div>
                  </form>
                ` : ""}
              </div>

              <div class="acc-friend-list">
                ${(state.studyGroups || []).length === 0 ? `
                  <div class="acc-card"><p class="acc-sub" style="margin:0;">No study groups created yet. Click "+ Create Group" above to start one!</p></div>
                ` : (state.studyGroups || []).map((g) => {
                  const role = (state.groupMemberships || {})[g.id];
                  return `
                    <div class="acc-card" style="padding:16px 18px;">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                        <div style="min-width:0;flex:1;">
                          <strong style="font-size:16px;">${escapeHtml(g.name)}</strong>
                          <div class="acc-meta-line" style="margin-top:4px;">
                            <span>${escapeHtml(g.subject || "General")}</span>
                            <span>·</span>
                            <span class="tabular-nums">${g.member_count || 1} members</span>
                            <span>·</span>
                            <span>${g.is_private ? "Private" : "Public"}</span>
                            ${role ? `<span>·</span><strong>Joined (${escapeHtml(role)})</strong>` : ""}
                          </div>
                          ${g.description ? `<p style="margin:6px 0 0;font-size:13.5px;color:#52463b;">${escapeHtml(g.description)}</p>` : ""}
                        </div>
                        <div class="acc-friend-actions">
                          <button type="button" class="acc-btn" data-grp-open="${escapeHtml(g.id)}">Open Group</button>
                          ${role
                            ? `<button type="button" class="acc-btn" data-grp-leave="${escapeHtml(g.id)}">Leave</button>`
                            : `<button type="button" class="acc-btn-primary" data-grp-join="${escapeHtml(g.id)}">Join</button>`}
                        </div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `}
        ` : activeTab === "profile" && inspectedProfile ? (() => {
          const tp = inspectedProfile.profile;
          const rel = inspectedProfile.relationship;
          const roomAccess = inspectedProfile.roomAccess;
          const tSubs = Array.isArray(tp.favoriteSubjects) ? tp.favoriteSubjects : [];
          return `
            <div style="display:grid;gap:20px;">
              <div>
                <button type="button" class="acc-btn" id="acc-back-from-profile" style="min-height:32px;">← Back to My Social Hub</button>
              </div>

              <div class="acc-grid-2">
                <section class="acc-card" aria-label="Public student profile">
                  <div class="acc-cover-banner" ${tp.bannerUrl ? `style="background-image:url('${escapeHtml(tp.bannerUrl)}')"` : ""}></div>
                  <div class="acc-profile-header-overlap">
                    ${renderAvatar(tp.avatarPreset, tp.avatarUrl, 76)}
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                      ${renderRelationshipActions(tp.id, tp.privacy)}
                    </div>
                  </div>

                  <div>
                    <h2 style="font-size:20px;">${escapeHtml(tp.displayName)}</h2>
                    <div class="acc-meta-line" style="margin-top:4px;">
                      ${tp.username ? `<span>@${escapeHtml(tp.username)}</span><span>·</span>` : ""}
                      <span class="tabular-nums">${escapeHtml(tp.publicId)}</span>
                      ${tp.courseClass ? `<span>· ${escapeHtml(tp.courseClass)}</span>` : ""}
                    </div>
                    ${tp.examAim ? `<div class="acc-meta-line" style="margin-top:4px;"><span>Target Aim: <strong>${escapeHtml(tp.examAim)}</strong></span></div>` : ""}
                  </div>

                  ${tp.bio ? `<p style="margin:0;font-size:13.5px;line-height:1.55;color:#3d332a;">${escapeHtml(tp.bio)}</p>` : ""}

                  ${tSubs.length > 0 ? `
                    <div class="acc-meta-line">
                      <strong style="color:#241e19;">Subjects:</strong>
                      <span>${escapeHtml(tSubs.join(" · "))}</span>
                    </div>
                  ` : ""}

                  <div class="acc-stat-strip">
                    <div class="acc-stat-item">
                      <span class="acc-stat-label">Friends</span>
                      <span class="acc-stat-val tabular-nums">${inspectedProfile.friendsCount || 0}</span>
                    </div>
                    <div class="acc-stat-item">
                      <span class="acc-stat-label">Posts</span>
                      <span class="acc-stat-val tabular-nums">${(inspectedProfile.posts || []).length}</span>
                    </div>
                    <div class="acc-stat-item">
                      <span class="acc-stat-label">Room Access</span>
                      <span class="acc-stat-val" style="font-size:13px;">${escapeHtml(roomVisibilityLabel(roomAccess.visibility))}</span>
                    </div>
                  </div>

                  ${!roomAccess.allowed ? `
                    <div class="acc-room-lock-box">
                      <strong>Study Room Restricted</strong>
                      <span>${escapeHtml(roomAccess.reason)}</span>
                      ${rel.status === "none" && roomAccess.visibility === "friends" ? `
                        <button type="button" class="acc-btn-primary" data-acc-add-friend="${escapeHtml(tp.id)}" style="justify-self:start;margin-top:4px;">
                          + Send Friend Request
                        </button>
                      ` : ""}
                    </div>
                  ` : ""}
                </section>

                <section style="display:grid;gap:14px;">
                  <div class="acc-card">
                    <h3>Study Updates from ${escapeHtml(tp.displayName)}</h3>
                    ${(inspectedProfile.posts || []).length === 0
                      ? `<p class="acc-sub" style="margin:0;">No visible posts yet.</p>`
                      : `<div class="acc-feed-list">${inspectedProfile.posts.map((p) => renderPostCard(p)).join("")}</div>`}
                  </div>
                </section>
              </div>
            </div>
          `;
        })() : activeTab === "profile" ? `
          <div class="acc-grid-2">
            <section class="acc-card" aria-label="Student card preview">
              <div class="acc-cover-banner" ${prof.bannerUrl ? `style="background-image:url('${escapeHtml(prof.bannerUrl)}')"` : ""}></div>
              <div class="acc-profile-header-overlap">
                ${renderAvatar(prof.avatarPreset, prof.avatarUrl, 76)}
              </div>
              <div>
                <h2 style="font-size:20px;">${escapeHtml(prof.displayName)}</h2>
                <div class="acc-meta-line" style="margin-top:4px;">
                  ${prof.username ? `<span>@${escapeHtml(prof.username)}</span><span>·</span>` : ""}
                  <span class="tabular-nums">${escapeHtml(prof.publicId || "LOCAL")}</span>
                  <span>·</span>
                  <span>${escapeHtml(roomVisibilityLabel(myPrivacy.roomVisibility))}</span>
                </div>
                ${prof.courseClass || prof.examAim ? `
                  <div class="acc-meta-line" style="margin-top:6px;">
                    ${prof.courseClass ? `<span>${escapeHtml(prof.courseClass)}</span>` : ""}
                    ${prof.courseClass && prof.examAim ? `<span>·</span>` : ""}
                    ${prof.examAim ? `<span>Aim: ${escapeHtml(prof.examAim)}</span>` : ""}
                  </div>
                ` : ""}
              </div>

              ${prof.bio ? `<p style="margin:0;font-size:13.5px;line-height:1.55;color:#4a3f35;">${escapeHtml(prof.bio)}</p>` : `<p style="margin:0;font-size:13px;color:#73665a;">Add your bio, course, exam aim, and favorite subjects on the right.</p>`}

              ${favSubs.length > 0 ? `
                <div class="acc-meta-line">
                  <strong style="color:#241e19;">Subjects:</strong>
                  <span>${escapeHtml(favSubs.join(" · "))}</span>
                </div>
              ` : ""}

              <div class="acc-stat-strip">
                <div class="acc-stat-item">
                  <span class="acc-stat-label">Focus Time</span>
                  <span class="acc-stat-val tabular-nums">${formatMinutesLabel(totalFocusMins)}</span>
                </div>
                <div class="acc-stat-item">
                  <span class="acc-stat-label">Credits</span>
                  <span class="acc-stat-val tabular-nums">${user ? `${state.wallet?.balance || 0} SC` : "Local"}</span>
                </div>
                <div class="acc-stat-item">
                  <span class="acc-stat-label">Friends</span>
                  <span class="acc-stat-val tabular-nums">${friendEntries.length}</span>
                </div>
              </div>
            </section>

            <form id="acc-profile-form" class="acc-card" novalidate>
              <h2>Edit Profile &amp; Room Privacy</h2>
              <div class="acc-form-grid">
                <label class="acc-field">
                  <span class="acc-label">Display Name</span>
                  <input id="acc-prof-display" class="acc-input" type="text" required maxlength="32" value="${escapeHtml(prof.displayName)}" />
                </label>
                <label class="acc-field">
                  <span class="acc-label">Username</span>
                  <input id="acc-prof-username" class="acc-input" type="text" maxlength="24" value="${escapeHtml(prof.username || "")}" placeholder="study_fox" />
                </label>
                <label class="acc-field">
                  <span class="acc-label">Class / Semester / Course</span>
                  <input id="acc-prof-course" class="acc-input" type="text" maxlength="64" value="${escapeHtml(prof.courseClass || "")}" placeholder="B.Tech CSE · Sem 5" />
                </label>
                <label class="acc-field">
                  <span class="acc-label">Target Exam / Aim</span>
                  <input id="acc-prof-aim" class="acc-input" type="text" maxlength="80" value="${escapeHtml(prof.examAim || "")}" placeholder="GATE 2026, Finals" />
                </label>
              </div>

              <label class="acc-field">
                <span class="acc-label">Favorite Subjects (comma-separated)</span>
                <input id="acc-prof-subs" class="acc-input" type="text" maxlength="160" value="${escapeHtml(favSubs.join(", "))}" placeholder="Algorithms, Calculus, Physics" />
              </label>

              <div class="acc-field">
                <span class="acc-label">Profile Picture &amp; Avatar Icon</span>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                  <label class="acc-btn" style="cursor:pointer;">
                    Upload Photo
                    <input id="acc-pfp-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
                  </label>
                  <input id="acc-pfp-url" class="acc-input" type="text" value="${escapeHtml(prof.avatarUrl || "")}" placeholder="https://..." style="flex:1;min-width:180px;" />
                  ${prof.avatarUrl ? `<button type="button" class="acc-btn" id="acc-pfp-clear">Clear</button>` : ""}
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
                  ${AVATAR_PRESETS.map((av) => `
                    <button type="button" class="acc-btn ${prof.avatarPreset === av ? "is-active" : ""}" data-acc-avatar="${escapeHtml(av)}" style="min-width:40px;padding:0 8px;">${escapeHtml(av)}</button>
                  `).join("")}
                </div>
              </div>

              <div class="acc-field">
                <span class="acc-label">Cover Banner</span>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                  <label class="acc-btn" style="cursor:pointer;">
                    Upload Banner
                    <input id="acc-banner-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
                  </label>
                  <input id="acc-banner-url" class="acc-input" type="text" value="${escapeHtml(prof.bannerUrl || "")}" placeholder="https://..." style="flex:1;min-width:180px;" />
                  ${prof.bannerUrl ? `<button type="button" class="acc-btn" id="acc-banner-clear">Clear</button>` : ""}
                </div>
              </div>

              <label class="acc-field">
                <span class="acc-label">Bio</span>
                <textarea id="acc-prof-bio" class="acc-textarea" maxlength="200" placeholder="What are you working toward this semester?">${escapeHtml(prof.bio || "")}</textarea>
              </label>

              <div class="acc-field" style="padding-top:8px;border-top:1px solid rgba(36,30,25,0.1);">
                <span class="acc-label">Who Can View My Study Room? (Profiles always remain viewable)</span>
                <div class="acc-privacy-segment" role="radiogroup" aria-label="Room visibility">
                  <button type="button" class="acc-privacy-opt ${myPrivacy.roomVisibility === "public" ? "is-active" : ""}" data-room-vis="public">
                    <strong>Public</strong>
                    <span>Any signed-in student can visit</span>
                  </button>
                  <button type="button" class="acc-privacy-opt ${myPrivacy.roomVisibility === "friends" ? "is-active" : ""}" data-room-vis="friends">
                    <strong>Friends Only</strong>
                    <span>Only accepted friends can visit</span>
                  </button>
                  <button type="button" class="acc-privacy-opt ${myPrivacy.roomVisibility === "private" ? "is-active" : ""}" data-room-vis="private">
                    <strong>Private</strong>
                    <span>Nobody else can visit your room</span>
                  </button>
                </div>
                <input type="hidden" id="acc-room-vis-val" value="${escapeHtml(myPrivacy.roomVisibility)}" />
              </div>

              <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:13px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="acc-priv-online" type="checkbox" ${myPrivacy.showOnlineStatus ? "checked" : ""} />
                  <span>Show online status to friends</span>
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="acc-priv-activity" type="checkbox" ${myPrivacy.showStudyActivity ? "checked" : ""} />
                  <span>Share current study subject with friends</span>
                </label>
              </div>

              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button type="submit" class="acc-btn-primary" id="acc-prof-save">Save Profile &amp; Privacy</button>
                ${!user ? `<button type="button" class="acc-btn" data-acc-tab="auth">Sign In to Sync Cloud</button>` : ""}
              </div>
            </form>
          </div>
        ` : user ? `
          <div class="acc-card" style="max-width:640px;">
            <h2>Cloud Account Status</h2>
            <div class="acc-meta-line">
              <span>Signed in as <strong>${escapeHtml(user.email || user.displayName)}</strong></span>
              <span>·</span>
              <span class="tabular-nums">${escapeHtml(user.publicId)}</span>
              <span>·</span>
              <span>${user.isPremium ? "Premium" : "Standard"}</span>
            </div>
            <p style="margin:0;font-size:13.5px;color:#5c5045;">
              Your Cozy Study room, Deep Focus studio, social feed, friend requests, and study groups all sync cleanly across sessions.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button type="button" class="acc-btn" id="acc-signout">Sign Out</button>
              <button type="button" class="acc-btn-primary" data-acc-nav="cozy">Open Cozy Study</button>
              <button type="button" class="acc-btn" data-acc-nav="deepfocus">Open Deep Focus</button>
            </div>
          </div>
        ` : `
          <div class="acc-card" style="max-width:520px;">
            <div class="acc-tabs" style="justify-self:start;">
              <button type="button" class="acc-tab ${authMode === "signin" ? "is-active" : ""}" data-acc-auth="signin">Sign In</button>
              <button type="button" class="acc-tab ${authMode === "register" ? "is-active" : ""}" data-acc-auth="register">Register</button>
              <button type="button" class="acc-tab ${authMode === "recover" ? "is-active" : ""}" data-acc-auth="recover">Reset Password</button>
            </div>

            <form id="acc-auth-form" style="display:grid;gap:12px;">
              ${authMode === "register" ? `
                <label class="acc-field">
                  <span class="acc-label">Display Name</span>
                  <input id="acc-auth-display" class="acc-input" type="text" required maxlength="32" placeholder="Study name" />
                </label>
              ` : ""}
              <label class="acc-field">
                <span class="acc-label">Email</span>
                <input id="acc-auth-email" class="acc-input" type="email" required autocomplete="email" placeholder="student@example.com" />
              </label>
              ${authMode !== "recover" ? `
                <label class="acc-field">
                  <span class="acc-label">Password</span>
                  <input id="acc-auth-password" class="acc-input" type="password" required minlength="6" autocomplete="${authMode === "register" ? "new-password" : "current-password"}" />
                </label>
              ` : ""}
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button type="submit" class="acc-btn-primary" id="acc-auth-submit">
                  ${authMode === "signin" ? "Sign In" : authMode === "register" ? "Create Account" : "Send Reset Link"}
                </button>
                <button type="button" class="acc-btn" data-acc-tab="profile">Edit Local Card</button>
              </div>
            </form>
          </div>
        `}
      </main>
    `;

    // Top Navigation
    shellEl.querySelectorAll("[data-acc-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.accNav;
        if (target === "cozy") {
          setAppMode("cozy", { syncUrl: false });
          navigateToPage(PAGE_ROUTES.COZY);
        } else if (target === "deepfocus") {
          setAppMode("deepfocus", { syncUrl: false });
          navigateToPage(PAGE_ROUTES.DEEPFOCUS);
        } else if (target === "home") {
          navigateToPage(PAGE_ROUTES.HOME);
        } else {
          navigateToPage(PAGE_ROUTES.ACCOUNT);
        }
      });
    });

    shellEl.querySelector("#acc-return-study")?.addEventListener("click", () => {
      const target = preferredMode === "deepfocus" ? PAGE_ROUTES.DEEPFOCUS : PAGE_ROUTES.COZY;
      setAppMode(preferredMode, { syncUrl: false });
      navigateToPage(target);
    });

    shellEl.querySelectorAll("[data-acc-tab]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        activeTab = btn.dataset.accTab;
        if (activeTab === "profile") inspectedProfile = null;
        if (activeTab === "feed" && user) await loadSocialFeed(feedScope);
        if (activeTab === "people" && user) await Promise.all([loadFriendsAndRequests(), fetchSuggestedStudents(12)]);
        if (activeTab === "groups" && user) await loadStudyGroups();
        statusMsg = "";
        render();
      });
    });

    // Open public profile from anywhere (feed authors, friends, suggested, group members)
    shellEl.querySelectorAll("[data-open-profile]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.openProfile;
        if (id) openPublicProfile(id);
      });
    });

    shellEl.querySelector("#acc-back-from-profile")?.addEventListener("click", () => {
      inspectedProfile = null;
      activeTab = "people";
      render();
    });

    // Feed Events
    shellEl.querySelectorAll("[data-feed-scope]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        feedScope = btn.dataset.feedScope;
        await loadSocialFeed(feedScope);
        render();
      });
    });

    shellEl.querySelector("#acc-refresh-feed")?.addEventListener("click", async () => {
      await loadSocialFeed(feedScope);
      render();
    });

    shellEl.querySelector("#acc-post-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const content = shellEl.querySelector("#acc-post-content")?.value || "";
      const subject = shellEl.querySelector("#acc-post-subject")?.value || "General Study";
      const postType = shellEl.querySelector("#acc-post-type")?.value || "update";
      const visibility = shellEl.querySelector("#acc-post-visibility")?.value || "public";
      const { error } = await createSocialPost({ content, subject, postType, visibility });
      statusMsg = error ? error.message : "Posted to study feed.";
      render();
    });

    shellEl.querySelectorAll("[data-like-post]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const postId = btn.dataset.likePost;
        await toggleSocialPostLike(postId);
        if (inspectedProfile) {
          await openPublicProfile(inspectedProfile.profile.id);
        } else {
          render();
        }
      });
    });

    shellEl.querySelectorAll("[data-del-post]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await deleteSocialPost(btn.dataset.delPost);
        statusMsg = error ? error.message : "Post deleted.";
        render();
      });
    });

    shellEl.querySelectorAll("[data-toggle-comments]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const postId = btn.dataset.toggleComments;
        if (openCommentsPostId === postId) {
          openCommentsPostId = null;
          render();
          return;
        }
        openCommentsPostId = postId;
        const { data } = await loadPostComments(postId);
        commentsByPost[postId] = data || [];
        render();
      });
    });

    shellEl.querySelectorAll("[data-comment-form]").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const postId = form.dataset.commentForm;
        const input = form.querySelector("input");
        const val = input?.value.trim() || "";
        if (!val) return;
        const { error } = await createPostComment(postId, val);
        if (error) {
          statusMsg = error.message;
        } else {
          const { data } = await loadPostComments(postId);
          commentsByPost[postId] = data || [];
        }
        render();
      });
    });

    // Profile & Privacy Editing
    let chosenAvatar = prof.avatarPreset || "☺";
    shellEl.querySelectorAll("[data-acc-avatar]").forEach((btn) => {
      btn.addEventListener("click", () => {
        chosenAvatar = btn.dataset.accAvatar;
        shellEl.querySelectorAll("[data-acc-avatar]").forEach((b) => b.classList.toggle("is-active", b === btn));
      });
    });

    shellEl.querySelectorAll("[data-room-vis]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.roomVis;
        const hidden = shellEl.querySelector("#acc-room-vis-val");
        if (hidden) hidden.value = val;
        shellEl.querySelectorAll("[data-room-vis]").forEach((b) => b.classList.toggle("is-active", b === btn));
      });
    });

    shellEl.querySelector("#acc-pfp-file")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      statusMsg = "Uploading photo...";
      render();
      const { url, error } = await uploadAvatarFile(file);
      if (error) {
        statusMsg = error.message;
        render();
        return;
      }
      const { error: saveErr } = await updateProfile({ ...getActiveProfile(), avatarUrl: url });
      statusMsg = saveErr ? saveErr.message : "Profile picture updated.";
      render();
    });

    shellEl.querySelector("#acc-pfp-clear")?.addEventListener("click", async () => {
      const { error } = await updateProfile({ ...getActiveProfile(), avatarUrl: "" });
      statusMsg = error ? error.message : "Profile picture cleared.";
      render();
    });

    shellEl.querySelector("#acc-banner-file")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      statusMsg = "Uploading banner...";
      render();
      const { url, error } = await uploadBannerFile(file);
      if (error) {
        statusMsg = error.message;
        render();
        return;
      }
      const { error: saveErr } = await updateProfile({ ...getActiveProfile(), bannerUrl: url });
      statusMsg = saveErr ? saveErr.message : "Cover banner updated.";
      render();
    });

    shellEl.querySelector("#acc-banner-clear")?.addEventListener("click", async () => {
      const { error } = await updateProfile({ ...getActiveProfile(), bannerUrl: "" });
      statusMsg = error ? error.message : "Cover banner cleared.";
      render();
    });

    shellEl.querySelector("#acc-profile-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const displayName = shellEl.querySelector("#acc-prof-display")?.value.trim();
      if (!displayName) {
        statusMsg = "Display Name cannot be empty.";
        render();
        return;
      }
      const usernameCheck = validateUsernameInput(shellEl.querySelector("#acc-prof-username")?.value || "");
      if (!usernameCheck.valid) {
        statusMsg = usernameCheck.error;
        render();
        return;
      }
      const rawUrl = shellEl.querySelector("#acc-pfp-url")?.value.trim() || "";
      const safeUrl = sanitizeAvatarUrl(rawUrl);
      if (rawUrl && !safeUrl) {
        statusMsg = "Please enter a valid https:// or http:// image URL for your profile photo.";
        render();
        return;
      }
      const rawBanner = shellEl.querySelector("#acc-banner-url")?.value.trim() || "";
      const safeBanner = sanitizeAvatarUrl(rawBanner);
      if (rawBanner && !safeBanner) {
        statusMsg = "Please enter a valid https:// or http:// image URL for your banner.";
        render();
        return;
      }
      const roomVis = shellEl.querySelector("#acc-room-vis-val")?.value || "friends";
      const privacy = normalizePrivacySettings({
        roomVisibility: roomVis,
        allowRoomVisits: roomVis !== "private",
        showOnlineStatus: Boolean(shellEl.querySelector("#acc-priv-online")?.checked),
        showStudyActivity: Boolean(shellEl.querySelector("#acc-priv-activity")?.checked)
      });

      const { error, localOnly } = await updateProfile({
        displayName,
        username: usernameCheck.value,
        avatarPreset: chosenAvatar,
        avatarUrl: safeUrl,
        bannerUrl: safeBanner,
        courseClass: shellEl.querySelector("#acc-prof-course")?.value.trim() || "",
        examAim: shellEl.querySelector("#acc-prof-aim")?.value.trim() || "",
        favoriteSubjects: parseFavoriteSubjects(shellEl.querySelector("#acc-prof-subs")?.value || ""),
        bio: shellEl.querySelector("#acc-prof-bio")?.value.trim() || "",
        privacy
      });
      statusMsg = error
        ? error.message
        : localOnly
          ? "Profile and room privacy saved locally."
          : "Profile and room privacy saved to cloud.";
      render();
    });

    // Friends & Relationships
    shellEl.querySelector("#acc-refresh-friends")?.addEventListener("click", async () => {
      await Promise.all([loadFriendsAndRequests(), fetchSuggestedStudents(12)]);
      render();
    });

    shellEl.querySelector("#acc-friend-search-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = shellEl.querySelector("#acc-friend-query")?.value.trim();
      const { data, error } = await searchStudentProfiles(q);
      if (error) statusMsg = error.message;
      else searchResults = data || [];
      render();
    });

    shellEl.querySelectorAll("[data-acc-visit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await goVisitFriend(btn.dataset.accVisit);
      });
    });

    shellEl.querySelectorAll("[data-acc-add-friend]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetId = btn.dataset.accAddFriend;
        const { error } = await sendFriendRequest(targetId);
        statusMsg = error ? error.message : "Friend request sent.";
        if (inspectedProfile && inspectedProfile.profile.id === targetId) {
          await openPublicProfile(targetId);
        } else {
          render();
        }
      });
    });

    shellEl.querySelectorAll("[data-acc-cancel-req]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await cancelFriendRequest(btn.dataset.accCancelReq);
        statusMsg = error ? error.message : "Friend request cancelled.";
        if (inspectedProfile) await openPublicProfile(inspectedProfile.profile.id);
        else render();
      });
    });

    shellEl.querySelectorAll("[data-acc-req-accept]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await respondFriendRequest(btn.dataset.accReqAccept, true);
        statusMsg = error ? error.message : "Friend request accepted.";
        if (inspectedProfile) await openPublicProfile(inspectedProfile.profile.id);
        else render();
      });
    });

    shellEl.querySelectorAll("[data-acc-req-decline]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await respondFriendRequest(btn.dataset.accReqDecline, false);
        statusMsg = error ? error.message : "Friend request declined.";
        if (inspectedProfile) await openPublicProfile(inspectedProfile.profile.id);
        else render();
      });
    });

    shellEl.querySelectorAll("[data-acc-unfriend]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetId = btn.dataset.accUnfriend;
        const { error } = await unfriendUser(targetId);
        statusMsg = error ? error.message : "Removed from friends.";
        if (inspectedProfile && inspectedProfile.profile.id === targetId) {
          await openPublicProfile(targetId);
        } else {
          render();
        }
      });
    });

    // Study Groups Events
    shellEl.querySelector("#acc-toggle-create-grp")?.addEventListener("click", () => {
      showCreateGroup = !showCreateGroup;
      render();
    });

    shellEl.querySelector("#acc-grp-list-refresh")?.addEventListener("click", async () => {
      await loadStudyGroups();
      render();
    });

    shellEl.querySelector("#acc-create-grp-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { data, error } = await createStudyGroup({
        name: shellEl.querySelector("#acc-grp-name")?.value.trim(),
        subject: shellEl.querySelector("#acc-grp-subject")?.value.trim(),
        description: shellEl.querySelector("#acc-grp-desc")?.value.trim(),
        isPrivate: Boolean(shellEl.querySelector("#acc-grp-private")?.checked)
      });
      if (error) {
        statusMsg = error.message;
        render();
        return;
      }
      showCreateGroup = false;
      statusMsg = "Study group created!";
      if (data?.id) {
        activeGroupId = data.id;
        await loadGroupWorkspace(data.id);
      }
      render();
    });

    shellEl.querySelector("#acc-join-code-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = shellEl.querySelector("#acc-join-code-input")?.value.trim() || "";
      const { data, error } = await joinStudyGroup({ inviteCode: code });
      if (error) {
        statusMsg = error.message;
        render();
        return;
      }
      statusMsg = "Joined study group!";
      if (data?.id) {
        activeGroupId = data.id;
        await loadGroupWorkspace(data.id);
      }
      render();
    });

    shellEl.querySelectorAll("[data-grp-open]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        activeGroupId = btn.dataset.grpOpen;
        const { error } = await loadGroupWorkspace(activeGroupId);
        if (error) statusMsg = error.message;
        render();
      });
    });

    shellEl.querySelectorAll("[data-grp-join]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const gid = btn.dataset.grpJoin;
        const { error } = await joinStudyGroup({ groupId: gid });
        statusMsg = error ? error.message : "Joined group!";
        if (!error && activeGroupId === gid) await loadGroupWorkspace(gid);
        render();
      });
    });

    shellEl.querySelectorAll("[data-grp-leave], #acc-grp-leave").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const gid = btn.dataset.grpLeave || btn.dataset.grpId;
        const { error } = await leaveStudyGroup(gid);
        statusMsg = error ? error.message : "Left group.";
        if (!error && activeGroupId === gid) activeGroupId = null;
        render();
      });
    });

    shellEl.querySelector("#acc-grp-back")?.addEventListener("click", () => {
      activeGroupId = null;
      render();
    });

    shellEl.querySelector("#acc-grp-refresh")?.addEventListener("click", async () => {
      if (activeGroupId) await loadGroupWorkspace(activeGroupId);
      render();
    });

    shellEl.querySelector("#acc-grp-msg-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = shellEl.querySelector("#acc-grp-msg-input")?.value.trim();
      if (!val || !activeGroupId) return;
      const { error } = await postGroupMessage(activeGroupId, val, "chat");
      if (error) statusMsg = error.message;
      render();
    });

    shellEl.querySelector("#acc-grp-pin-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = shellEl.querySelector("#acc-grp-pin-input")?.value.trim() || "";
      if (!activeGroupId) return;
      const { error } = await updateGroupAnnouncement(activeGroupId, val);
      statusMsg = error ? error.message : "Pinned announcement updated.";
      render();
    });

    // Auth Form
    shellEl.querySelectorAll("[data-acc-auth]").forEach((btn) => {
      btn.addEventListener("click", () => {
        authMode = btn.dataset.accAuth;
        statusMsg = "";
        render();
      });
    });

    shellEl.querySelector("#acc-auth-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = shellEl.querySelector("#acc-auth-submit");
      if (btn) btn.disabled = true;
      const email = shellEl.querySelector("#acc-auth-email")?.value.trim() || "";
      const password = shellEl.querySelector("#acc-auth-password")?.value || "";
      const displayName = shellEl.querySelector("#acc-auth-display")?.value.trim() || "Student";

      try {
        if (authMode === "signin") {
          const { error } = await signInWithEmail({ email, password });
          if (error) {
            statusMsg = error.message;
          } else {
            await syncAuthenticatedUserData();
            activeTab = "feed";
            statusMsg = "Signed in.";
          }
          render();
        } else if (authMode === "register") {
          const { error, requiresEmailConfirmation } = await signUpWithEmail({ email, password, displayName });
          if (error) {
            statusMsg = error.message;
          } else if (requiresEmailConfirmation) {
            statusMsg = "Account created. Check your email to confirm before signing in.";
            authMode = "signin";
          } else {
            await syncAuthenticatedUserData();
            activeTab = "feed";
            statusMsg = "Account created and signed in.";
          }
          render();
        } else {
          const { error } = await sendPasswordRecovery(email);
          statusMsg = error ? error.message : "Password reset email sent.";
          render();
        }
      } catch (err) {
        statusMsg = err?.message || "Authentication request failed.";
        render();
      }
    });

    shellEl.querySelector("#acc-signout")?.addEventListener("click", async () => {
      await signOut();
      inspectedProfile = null;
      activeGroupId = null;
      activeTab = "auth";
      statusMsg = "Signed out.";
      render();
    });
  };

  render();
  bus.on("page:changed", render);
  bus.on("auth:changed", render);
  bus.on("profile:changed", render);
  bus.on("friends:changed", render);
  bus.on("socialFeed:changed", () => {
    if (isAccountActive() && activeTab === "feed") render();
  });
  bus.on("groups:changed", () => {
    if (isAccountActive() && activeTab === "groups") render();
  });
  bus.on("studyCircle:changed", () => {
    if (isAccountActive() && activeTab === "people") render();
  });
}
