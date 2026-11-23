// Photo Frame -> Student Profile Card (PFP, Bio, Class/Course, Aim, Fav Subs), Friend List & Room Visits, and Supabase Auth
import { state } from "../state.js";
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
import { sanitizeAvatarUrl, parseFavoriteSubjects } from "../utils/profile-helpers.js";
import { dialogManager } from "../core/dialog-manager.js";
import { escapeHtml } from "../utils/dom.js";

const AVATAR_PRESETS = ["☺", "🦊", "🦉", "🐱", "🌿", "☕", "🎓", "🚀"];

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
        favoriteSubjects: state.localProfile?.favoriteSubjects || []
      };
    };

    const renderView = () => {
      const user = state.user;
      const prof = getActiveProfile();
      const favSubs = Array.isArray(prof.favoriteSubjects) ? prof.favoriteSubjects : [];
      const friends = state.friends || [];
      const incomingReqs = state.friendRequests?.incoming || [];

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
          <span class="sprk-badge-chip">${user ? `☁ ${escapeHtml(user.publicId)}` : "💾 Local"}</span>
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
                  <div class="sprk-badge-row" style="margin-top:6px;">
                    ${prof.courseClass ? `<span class="sprk-badge-chip">🎓 ${escapeHtml(prof.courseClass)}</span>` : ""}
                    ${prof.examAim ? `<span class="sprk-badge-chip">🎯 ${escapeHtml(prof.examAim)}</span>` : ""}
                    ${!prof.courseClass && !prof.examAim ? `<span class="sprk-meta">Add your course & exam aim below</span>` : ""}
                  </div>
                  ${prof.bio ? `<p style="margin:8px 0 0;font-size:13px;color:var(--ink);">${escapeHtml(prof.bio)}</p>` : ""}
                </div>
              </div>
              ${!user ? `<button type="button" class="sprk-btn sprk-btn-primary" data-pmain="signin" style="min-height:34px;padding:4px 12px;">🔑 Sign In to Sync</button>` : ""}
            </div>
            ${favSubs.length > 0 ? `
              <div class="sprk-badge-row" style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(52,44,37,0.12);">
                <span class="sprk-meta" style="font-weight:700;">Fav Subjects:</span>
                ${favSubs.map((sub) => `<span class="sprk-badge-chip">📚 ${escapeHtml(sub)}</span>`).join("")}
              </div>
            ` : ""}
          </div>

          <form id="profile-edit-form" class="sprk-card">
            <div class="sprk-grid-2">
              <label class="sprk-field">
                <span class="sprk-label">Display Name</span>
                <input id="prof-display" class="sprk-input" type="text" required maxlength="32" value="${escapeHtml(prof.displayName)}" />
              </label>
              <label class="sprk-field">
                <span class="sprk-label">Username</span>
                <input id="prof-username" class="sprk-input" type="text" pattern="[a-zA-Z0-9_]{3,24}" value="${escapeHtml(prof.username || "")}" placeholder="study_fox" />
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
              <span class="sprk-label">Profile Picture (PFP) & Avatar Icon</span>
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
              <textarea id="prof-bio" class="sprk-textarea" style="min-height:60px;" maxlength="200" placeholder="What are you studying today?">${escapeHtml(prof.bio || "")}</textarea>
            </label>

            <button type="submit" class="sprk-btn sprk-btn-primary">💾 Save Profile</button>
          </form>
        ` : mainTab === "friends" ? `
          <div style="display:grid;gap:12px;">
            ${!user ? `
              <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                <div>
                  <strong>Connect Supabase Account for Live Friends</strong>
                  <div class="sprk-meta">Sign in to add friends, sync friend requests, and visit friends' rooms.</div>
                </div>
                <button type="button" class="sprk-btn sprk-btn-primary" data-pmain="signin">🔑 Sign In</button>
              </div>
            ` : `
              <div class="sprk-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                  <strong>Find & Visit Friends</strong>
                  <button type="button" class="sprk-btn" id="prof-refresh-friends" style="min-height:32px;padding:4px 10px;">↻ Refresh</button>
                </div>
                <form id="prof-friend-search" style="display:flex;gap:8px;flex-wrap:wrap;">
                  <input id="prof-friend-query" class="sprk-input" type="text" placeholder="Search Public ID (SPK-...) or @username" required style="flex:1;min-width:180px;" />
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
                        <div style="display:flex;gap:6px;">
                          <button type="button" class="sprk-btn" data-visit-room="${escapeHtml(p.id)}" style="min-height:32px;padding:4px 10px;">🚪 Visit</button>
                          <button type="button" class="sprk-btn sprk-btn-primary" data-add-friend="${escapeHtml(p.id)}" style="min-height:32px;padding:4px 10px;">+ Add</button>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>

              ${incomingReqs.length > 0 ? `
                <div class="sprk-card">
                  <strong style="display:block;margin-bottom:8px;">Pending Requests (${incomingReqs.length})</strong>
                  <div style="display:grid;gap:8px;">
                    ${incomingReqs.map((req) => `
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                        <div>
                          <strong>${escapeHtml(req.profile?.display_name || "Student")}</strong>
                          <span class="sprk-meta">${escapeHtml(req.profile?.public_id || "")}</span>
                        </div>
                        <div style="display:flex;gap:6px;">
                          <button type="button" class="sprk-btn sprk-btn-primary" data-req-accept="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Accept</button>
                          <button type="button" class="sprk-btn" data-req-decline="${escapeHtml(req.id)}" style="min-height:32px;padding:4px 10px;">Decline</button>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              ` : ""}

              <div class="sprk-card">
                <strong style="display:block;margin-bottom:8px;">My Friends (${friends.length})</strong>
                ${friends.length === 0 ? `
                  <div class="sprk-empty">No friends added yet. Search by Public ID or @username above.</div>
                ` : `
                  <div style="display:grid;gap:8px;">
                    ${friends.map((f) => `
                      <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;">
                        <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                          ${renderAvatarVisual(f.avatarPreset, f.avatarUrl, 44)}
                          <div style="min-width:0;">
                            <strong style="font-size:14px;">${escapeHtml(f.displayName)}</strong>
                            <div class="sprk-meta">
                              <span>${escapeHtml(f.publicId)}</span>
                              ${f.courseClass ? `<span>· 🎓 ${escapeHtml(f.courseClass)}</span>` : ""}
                              ${f.examAim ? `<span>· 🎯 ${escapeHtml(f.examAim)}</span>` : ""}
                            </div>
                          </div>
                        </div>
                        <button type="button" class="sprk-btn sprk-btn-primary" data-visit-room="${escapeHtml(f.id)}" style="min-height:34px;padding:4px 12px;">
                          🚪 Visit Room
                        </button>
                      </div>
                    `).join("")}
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
                  <span>${user.isPremium ? "★ Premium" : "Standard"}</span>
                  <span>·</span>
                  <span>Role: ${escapeHtml(user.role || "user")}</span>
                </div>
              </div>
              <button type="button" class="sprk-btn" id="auth-signout">Sign Out</button>
            </div>
            <div class="sprk-badge-row">
              <span class="sprk-badge-chip">☁ Theme & Skins Synced</span>
              <span class="sprk-badge-chip">📐 Object Positions Synced</span>
              <span class="sprk-badge-chip">🔒 Private Diary Owner-Only</span>
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
        await updateProfile({
          ...curr,
          avatarUrl: url
        });
        statusMsg = "Profile picture updated!";
        renderView();
      });

      container.querySelector("#prof-pfp-clear")?.addEventListener("click", async () => {
        const curr = getActiveProfile();
        await updateProfile({ ...curr, avatarUrl: "" });
        statusMsg = "Profile picture cleared.";
        renderView();
      });

      container.querySelector("#profile-edit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const rawUrl = container.querySelector("#prof-pfp-url")?.value.trim() || "";
        const safeUrl = sanitizeAvatarUrl(rawUrl);
        if (rawUrl && !safeUrl) {
          statusMsg = "Please enter a valid https:// or http:// image URL.";
          renderView();
          return;
        }
        const { error, localOnly } = await updateProfile({
          displayName: container.querySelector("#prof-display").value.trim(),
          username: container.querySelector("#prof-username").value.trim().toLowerCase(),
          avatarPreset: chosenAvatar,
          avatarUrl: safeUrl,
          courseClass: container.querySelector("#prof-course").value.trim(),
          examAim: container.querySelector("#prof-aim").value.trim(),
          favoriteSubjects: parseFavoriteSubjects(container.querySelector("#prof-fav-subs").value),
          bio: container.querySelector("#prof-bio").value.trim()
        });
        statusMsg = error
          ? error.message
          : localOnly
            ? "Profile saved locally! Sign in anytime to sync to Supabase."
            : "Profile saved to cloud!";
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

      container.querySelectorAll("[data-add-friend]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await sendFriendRequest(btn.dataset.addFriend);
          statusMsg = error ? error.message : "Friend request sent!";
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
      });

      container.querySelector("#auth-signout")?.addEventListener("click", async () => {
        await signOut();
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
