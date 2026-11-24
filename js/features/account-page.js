// Dedicated /account Page — Sign In, Register, Student Profile, Friends & Friend Account Viewer + Room Visit
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { supabase } from "../services/supabase.js";
import { signInWithEmail, signUpWithEmail, sendPasswordRecovery, signOut } from "../services/auth-service.js";
import {
  updateProfile,
  uploadAvatarFile,
  syncAuthenticatedUserData,
  loadFriendsAndRequests,
  searchStudentProfiles,
  sendFriendRequest,
  respondFriendRequest,
  visitFriendRoom
} from "../services/database-service.js";
import { presenceService } from "../services/presence-service.js";
import { setAppMode } from "../core/settings-manager.js";
import { navigateToPage, parseCurrentPage, PAGE_ROUTES } from "../router.js";
import { sanitizeAvatarUrl, parseFavoriteSubjects, validateUsernameInput } from "../utils/profile-helpers.js";
import { escapeHtml, formatMinutesLabel } from "../utils/dom.js";

const AVATAR_PRESETS = ["☺", "🦊", "🦉", "🐱", "🌿", "☕", "🎓", "🚀"];

export function initAccountPage() {
  const shellEl = document.getElementById("sprk-account-shell");
  if (!shellEl) return;

  let activeTab = "profile"; // profile | friends | auth
  let authMode = "signin"; // signin | register | recover
  let statusMsg = "";
  let searchResults = null;
  let inspectedFriend = null;

  const isAccountActive = () => parseCurrentPage().page === PAGE_ROUTES.ACCOUNT;

  const getActiveProfile = () => {
    if (state.user) return state.user;
    return {
      publicId: "LOCAL",
      displayName: state.localProfile?.displayName || state.preferences?.localDisplayName || "Local Student",
      username: state.localProfile?.username || "",
      avatarPreset: state.localProfile?.avatarPreset || "☺",
      avatarUrl: state.localProfile?.avatarUrl || "",
      bio: state.localProfile?.bio || "",
      courseClass: state.localProfile?.courseClass || "",
      examAim: state.localProfile?.examAim || "",
      favoriteSubjects: state.localProfile?.favoriteSubjects || []
    };
  };

  const renderAvatar = (preset, url, size = 68) => {
    const safeUrl = sanitizeAvatarUrl(url || "");
    return `
      <div class="acc-avatar-box" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px;">
        ${safeUrl
          ? `<img src="${escapeHtml(safeUrl)}" alt="Student avatar" referrerpolicy="no-referrer" />`
          : `<span>${escapeHtml(preset || "☺")}</span>`}
      </div>
    `;
  };

  const goVisitFriend = async (identifier) => {
    const { error } = await visitFriendRoom(identifier);
    if (error) {
      statusMsg = error.message || "Could not open friend's study room.";
      render();
      return;
    }
    setAppMode("cozy", { syncUrl: false });
    navigateToPage(PAGE_ROUTES.COZY);
  };

  const render = () => {
    const active = isAccountActive();
    shellEl.hidden = !active;
    if (!active) return;

    const user = state.user;
    const prof = getActiveProfile();
    const favSubs = Array.isArray(prof.favoriteSubjects) ? prof.favoriteSubjects : [];
    const incomingReqs = state.friendRequests?.incoming || [];
    const presenceSnap = presenceService.getSnapshot(Date.now());
    const friendEntries = presenceSnap.entries || [];
    const preferredMode = state.preferences?.appMode === "deepfocus" ? "deepfocus" : "cozy";

    const totalFocusMins = Math.round(
      (state.localStudyRecords || [])
        .filter((r) => (r.mode || "focus") === "focus")
        .reduce((s, r) => s + Number(r.durationSeconds || 0), 0) / 60
    );

    const activeInspect = inspectedFriend || friendEntries[0] || null;

    shellEl.innerHTML = `
      <header class="acc-topbar">
        <button type="button" class="acc-brand" data-acc-nav="home">
          <span>SPRK Desk</span>
        </button>

        <nav class="acc-nav" aria-label="Site navigation">
          <button type="button" class="acc-nav-btn" data-acc-nav="home">Home</button>
          <button type="button" class="acc-nav-btn" data-acc-nav="cozy">Cozy Study</button>
          <button type="button" class="acc-nav-btn" data-acc-nav="deepfocus">Deep Focus</button>
          <button type="button" class="acc-nav-btn is-active" data-acc-nav="account">Account</button>
        </nav>

        <button type="button" class="acc-btn-primary" id="acc-return-study">
          ${preferredMode === "deepfocus" ? "Back to Deep Focus →" : "Back to Cozy Study →"}
        </button>
      </header>

      <main class="acc-main">
        <div class="acc-header-row">
          <div>
            <h1 class="acc-h1">${user ? escapeHtml(prof.displayName) : "Student Account &amp; Friends"}</h1>
            <p class="acc-sub">
              ${user
                ? `Cloud synced · ${escapeHtml(user.publicId)} · ${escapeHtml(user.email || "")}`
                : "Edit your local student card or sign in to sync profiles, friends, and room visits."}
            </p>
          </div>

          <div class="acc-tabs" role="tablist" aria-label="Account sections">
            <button type="button" class="acc-tab ${activeTab === "profile" ? "is-active" : ""}" data-acc-tab="profile">Profile</button>
            <button type="button" class="acc-tab ${activeTab === "friends" ? "is-active" : ""}" data-acc-tab="friends">
              Friends (${friendEntries.length})${incomingReqs.length ? ` · +${incomingReqs.length}` : ""}
            </button>
            <button type="button" class="acc-tab ${activeTab === "auth" ? "is-active" : ""}" data-acc-tab="auth">
              ${user ? "Account &amp; Sync" : "Sign In / Register"}
            </button>
          </div>
        </div>

        ${statusMsg ? `<div class="acc-notice" role="status">${escapeHtml(statusMsg)}</div>` : ""}

        ${activeTab === "profile" ? `
          <div class="acc-grid-2">
            <section class="acc-card" aria-label="Student card preview">
              <div class="acc-profile-hero">
                ${renderAvatar(prof.avatarPreset, prof.avatarUrl, 72)}
                <div style="min-width:0;flex:1;">
                  <h2 style="font-size:19px;">${escapeHtml(prof.displayName)}</h2>
                  <div class="acc-meta-line" style="margin-top:4px;">
                    ${prof.username ? `<span>@${escapeHtml(prof.username)}</span><span>·</span>` : ""}
                    <span class="tabular-nums">${escapeHtml(prof.publicId || "LOCAL")}</span>
                  </div>
                  ${prof.courseClass || prof.examAim ? `
                    <div class="acc-meta-line" style="margin-top:6px;">
                      ${prof.courseClass ? `<span>${escapeHtml(prof.courseClass)}</span>` : ""}
                      ${prof.courseClass && prof.examAim ? `<span>·</span>` : ""}
                      ${prof.examAim ? `<span>Aim: ${escapeHtml(prof.examAim)}</span>` : ""}
                    </div>
                  ` : ""}
                </div>
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
              <h2>Edit Student Profile</h2>
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
                <span class="acc-label">Profile Picture (Upload or URL) &amp; Avatar Icon</span>
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

              <label class="acc-field">
                <span class="acc-label">Bio</span>
                <textarea id="acc-prof-bio" class="acc-textarea" maxlength="200" placeholder="What are you working toward this semester?">${escapeHtml(prof.bio || "")}</textarea>
              </label>

              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button type="submit" class="acc-btn-primary" id="acc-prof-save">Save Profile</button>
                ${!user ? `<button type="button" class="acc-btn" data-acc-tab="auth">Sign In to Sync Cloud</button>` : ""}
              </div>
            </form>
          </div>
        ` : activeTab === "friends" ? `
          <div class="acc-grid-2">
            <section class="acc-card" aria-label="Friend account inspector">
              <h3>Friend Account Details</h3>
              ${!activeInspect ? `
                <p style="margin:0;font-size:13.5px;color:#62564a;">
                  Select a friend or search for a student to view their public profile and visit their study room.
                </p>
                <form id="acc-direct-visit-form" style="display:grid;gap:8px;">
                  <label class="acc-field">
                    <span class="acc-label">Visit Directly by Public ID</span>
                    <input id="acc-direct-visit-id" class="acc-input" type="text" placeholder="SPK-..." required />
                  </label>
                  <button type="submit" class="acc-btn-primary" ${!user ? "disabled" : ""}>Visit Study Room</button>
                </form>
              ` : `
                <div class="acc-profile-hero">
                  ${renderAvatar(activeInspect.avatarPreset, activeInspect.avatarUrl, 64)}
                  <div style="min-width:0;flex:1;">
                    <h2 style="font-size:18px;">${escapeHtml(activeInspect.displayName)}</h2>
                    <div class="acc-meta-line" style="margin-top:3px;">
                      ${activeInspect.username ? `<span>@${escapeHtml(activeInspect.username)}</span><span>·</span>` : ""}
                      <span class="tabular-nums">${escapeHtml(activeInspect.publicId || "")}</span>
                    </div>
                    <div class="acc-meta-line" style="margin-top:5px;">
                      <span class="acc-status-dot is-${escapeHtml(activeInspect.status || "offline")}" style="align-self:center;"></span>
                      <span>
                        ${activeInspect.status === "studying"
                          ? `Studying ${escapeHtml(activeInspect.subject || "Focus")}${activeInspect.elapsedLabel ? ` · ${escapeHtml(activeInspect.elapsedLabel)}` : ""}`
                          : activeInspect.status === "online"
                            ? "Online"
                            : "Offline"}
                      </span>
                    </div>
                  </div>
                </div>

                ${activeInspect.courseClass || activeInspect.examAim ? `
                  <div class="acc-meta-line">
                    ${activeInspect.courseClass ? `<span>Course: <strong>${escapeHtml(activeInspect.courseClass)}</strong></span>` : ""}
                    ${activeInspect.examAim ? `<span>· Aim: <strong>${escapeHtml(activeInspect.examAim)}</strong></span>` : ""}
                  </div>
                ` : ""}

                ${activeInspect.bio ? `<p style="margin:0;font-size:13.5px;line-height:1.5;color:#4a3f35;">${escapeHtml(activeInspect.bio)}</p>` : ""}

                ${Array.isArray(activeInspect.favoriteSubjects) && activeInspect.favoriteSubjects.length > 0 ? `
                  <div class="acc-meta-line">
                    <strong>Subjects:</strong>
                    <span>${escapeHtml(activeInspect.favoriteSubjects.join(" · "))}</span>
                  </div>
                ` : ""}

                <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:6px;">
                  <button type="button" class="acc-btn-primary" data-acc-visit="${escapeHtml(activeInspect.id)}">
                    Visit Study Room →
                  </button>
                  ${activeInspect.isSearchResult ? `
                    <button type="button" class="acc-btn" data-acc-add-friend="${escapeHtml(activeInspect.id)}">+ Add Friend</button>
                  ` : ""}
                </div>
              `}
            </section>

            <section style="display:grid;gap:16px;">
              ${!user ? `
                <div class="acc-card">
                  <h3>Sign In Required for Friends &amp; Visits</h3>
                  <p style="margin:0;font-size:13.5px;color:#5c5045;">
                    Connect your student account to search classmates by Public ID or @username, inspect their profiles, and visit their Cozy Study rooms.
                  </p>
                  <div>
                    <button type="button" class="acc-btn-primary" data-acc-tab="auth">Sign In or Register</button>
                  </div>
                </div>
              ` : `
                <div class="acc-card">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                    <h3>Find Students</h3>
                    <button type="button" class="acc-btn" id="acc-refresh-friends">↻ Refresh</button>
                  </div>
                  <form id="acc-friend-search-form" style="display:flex;gap:8px;flex-wrap:wrap;">
                    <input id="acc-friend-query" class="acc-input" type="text" required placeholder="Public ID (SPK-...) or @username" style="flex:1;min-width:180px;" />
                    <button type="submit" class="acc-btn-primary">Search</button>
                  </form>
                  ${searchResults !== null ? `
                    <div class="acc-friend-list">
                      ${searchResults.length === 0 ? `<div class="acc-sub">No matching students found.</div>` : searchResults.map((p) => `
                        <div class="acc-friend-row ${activeInspect?.id === p.id ? "is-selected" : ""}">
                          <div class="acc-friend-left">
                            ${renderAvatar(p.avatar_preset, p.avatar_url, 40)}
                            <div style="min-width:0;">
                              <strong>${escapeHtml(p.display_name || "Student")}</strong>
                              <div class="acc-meta-line">${escapeHtml(p.public_id || "")}${p.course_class ? ` · ${escapeHtml(p.course_class)}` : ""}</div>
                            </div>
                          </div>
                          <div class="acc-friend-actions">
                            <button type="button" class="acc-btn" data-acc-inspect-search="${escapeHtml(p.id)}">View</button>
                            <button type="button" class="acc-btn" data-acc-add-friend="${escapeHtml(p.id)}">+ Add</button>
                            <button type="button" class="acc-btn-primary" data-acc-visit="${escapeHtml(p.id)}">Visit</button>
                          </div>
                        </div>
                      `).join("")}
                    </div>
                  ` : ""}
                </div>

                ${incomingReqs.length > 0 ? `
                  <div class="acc-card">
                    <h3>Incoming Friend Requests (${incomingReqs.length})</h3>
                    <div class="acc-friend-list">
                      ${incomingReqs.map((req) => `
                        <div class="acc-friend-row">
                          <div class="acc-friend-left">
                            ${renderAvatar(req.profile?.avatar_preset, req.profile?.avatar_url, 40)}
                            <div>
                              <strong>${escapeHtml(req.profile?.display_name || "Student")}</strong>
                              <div class="acc-meta-line">${escapeHtml(req.profile?.public_id || "")}</div>
                            </div>
                          </div>
                          <div class="acc-friend-actions">
                            <button type="button" class="acc-btn-primary" data-acc-req-accept="${escapeHtml(req.id)}">Accept</button>
                            <button type="button" class="acc-btn" data-acc-req-decline="${escapeHtml(req.id)}">Decline</button>
                          </div>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                ` : ""}

                <div class="acc-card">
                  <h3>My Friends (${friendEntries.length})</h3>
                  ${friendEntries.length === 0 ? `
                    <p style="margin:0;font-size:13.5px;color:#62564a;">No friends added yet. Search by Public ID or @username above.</p>
                  ` : `
                    <div class="acc-friend-list">
                      ${friendEntries.map((f) => `
                        <div class="acc-friend-row ${activeInspect?.id === f.id ? "is-selected" : ""}">
                          <div class="acc-friend-left">
                            ${renderAvatar(f.avatarPreset, f.avatarUrl, 44)}
                            <div style="min-width:0;">
                              <div style="display:flex;align-items:center;gap:6px;">
                                <span class="acc-status-dot is-${escapeHtml(f.status)}"></span>
                                <strong>${escapeHtml(f.displayName)}</strong>
                              </div>
                              <div class="acc-meta-line">
                                <span>${escapeHtml(f.publicId)}</span>
                                ${f.courseClass ? `<span>· ${escapeHtml(f.courseClass)}</span>` : ""}
                                <span>· ${f.status === "studying" ? `Studying ${escapeHtml(f.subject || "Focus")}` : f.status === "online" ? "Online" : "Offline"}</span>
                              </div>
                            </div>
                          </div>
                          <div class="acc-friend-actions">
                            <button type="button" class="acc-btn" data-acc-inspect-friend="${escapeHtml(f.id)}">View Account</button>
                            <button type="button" class="acc-btn-primary" data-acc-visit="${escapeHtml(f.id)}">Visit Room</button>
                          </div>
                        </div>
                      `).join("")}
                    </div>
                  `}
                </div>
              `}
            </section>
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
              Your Cozy Study room and Deep Focus studio both share this account, database, tasks, notes, study register, credits, and friend network.
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

    // Navigation
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
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.accTab;
        statusMsg = "";
        render();
      });
    });

    shellEl.querySelectorAll("[data-acc-auth]").forEach((btn) => {
      btn.addEventListener("click", () => {
        authMode = btn.dataset.accAuth;
        statusMsg = "";
        render();
      });
    });

    let chosenAvatar = prof.avatarPreset || "☺";
    shellEl.querySelectorAll("[data-acc-avatar]").forEach((btn) => {
      btn.addEventListener("click", () => {
        chosenAvatar = btn.dataset.accAvatar;
        shellEl.querySelectorAll("[data-acc-avatar]").forEach((b) => b.classList.toggle("is-active", b === btn));
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
        statusMsg = "Please enter a valid https:// or http:// image URL.";
        render();
        return;
      }
      const { error, localOnly } = await updateProfile({
        displayName,
        username: usernameCheck.value,
        avatarPreset: chosenAvatar,
        avatarUrl: safeUrl,
        courseClass: shellEl.querySelector("#acc-prof-course")?.value.trim() || "",
        examAim: shellEl.querySelector("#acc-prof-aim")?.value.trim() || "",
        favoriteSubjects: parseFavoriteSubjects(shellEl.querySelector("#acc-prof-subs")?.value || ""),
        bio: shellEl.querySelector("#acc-prof-bio")?.value.trim() || ""
      });
      statusMsg = error
        ? error.message
        : localOnly
          ? "Profile saved locally. Sign in anytime to sync with cloud."
          : "Profile saved to cloud.";
      render();
    });

    // Friends & Visits
    shellEl.querySelector("#acc-refresh-friends")?.addEventListener("click", async () => {
      await loadFriendsAndRequests();
      render();
    });

    shellEl.querySelector("#acc-direct-visit-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = shellEl.querySelector("#acc-direct-visit-id")?.value.trim();
      if (id) await goVisitFriend(id);
    });

    shellEl.querySelector("#acc-friend-search-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = shellEl.querySelector("#acc-friend-query")?.value.trim();
      const { data, error } = await searchStudentProfiles(q);
      if (error) statusMsg = error.message;
      else searchResults = data || [];
      render();
    });

    shellEl.querySelectorAll("[data-acc-inspect-friend]").forEach((btn) => {
      btn.addEventListener("click", () => {
        inspectedFriend = friendEntries.find((f) => f.id === btn.dataset.accInspectFriend) || null;
        render();
      });
    });

    shellEl.querySelectorAll("[data-acc-inspect-search]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = (searchResults || []).find((x) => x.id === btn.dataset.accInspectSearch);
        if (p) {
          inspectedFriend = {
            id: p.id,
            publicId: p.public_id || "SPK-USER",
            username: p.username || "",
            displayName: p.display_name || "Student",
            avatarPreset: p.avatar_preset || "☺",
            avatarUrl: p.avatar_url || "",
            bio: p.bio || "",
            courseClass: p.course_class || "",
            examAim: p.exam_aim || "",
            favoriteSubjects: Array.isArray(p.favorite_subjects) ? p.favorite_subjects : [],
            status: "offline",
            isSearchResult: true
          };
          render();
        }
      });
    });

    shellEl.querySelectorAll("[data-acc-visit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await goVisitFriend(btn.dataset.accVisit);
      });
    });

    shellEl.querySelectorAll("[data-acc-add-friend]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await sendFriendRequest(btn.dataset.accAddFriend);
        statusMsg = error ? error.message : "Friend request sent.";
        render();
      });
    });

    shellEl.querySelectorAll("[data-acc-req-accept]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await respondFriendRequest(btn.dataset.accReqAccept, true);
        statusMsg = error ? error.message : "Friend request accepted.";
        render();
      });
    });

    shellEl.querySelectorAll("[data-acc-req-decline]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const { error } = await respondFriendRequest(btn.dataset.accReqDecline, false);
        statusMsg = error ? error.message : "Friend request declined.";
        render();
      });
    });

    // Auth Form
    shellEl.querySelector("#acc-auth-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = shellEl.querySelector("#acc-auth-submit");
      if (btn) btn.disabled = true;
      const email = shellEl.querySelector("#acc-auth-email")?.value.trim() || "";
      const password = shellEl.querySelector("#acc-auth-password")?.value || "";
      const displayName = shellEl.querySelector("#acc-auth-display")?.value.trim() || "Student";

      if (authMode === "signin") {
        const { error } = await signInWithEmail({ email, password });
        if (error) {
          statusMsg = error.message;
        } else {
          await syncAuthenticatedUserData();
          activeTab = "profile";
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
          activeTab = "profile";
          statusMsg = "Account created and signed in.";
        }
        render();
      } else {
        const { error } = await sendPasswordRecovery(email);
        statusMsg = error ? error.message : "Password reset email sent.";
        render();
      }
    });

    shellEl.querySelector("#acc-signout")?.addEventListener("click", async () => {
      await signOut();
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
  bus.on("studyCircle:changed", () => {
    if (isAccountActive() && activeTab === "friends") render();
  });
}
