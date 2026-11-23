// Framed Portrait -> Profile, Supabase Auth, Privacy, and Discreet Admin Gate
import { state, savePreferences } from "../state.js";
import { supabase } from "../services/supabase.js";
import { signInWithEmail, signUpWithEmail, sendPasswordRecovery, signOut } from "../services/auth-service.js";
import { updateProfile, syncAuthenticatedUserData } from "../services/database-service.js";
import { dialogManager } from "../core/dialog-manager.js";
import { escapeHtml } from "../utils/dom.js";

const AVATAR_PRESETS = ["☺", "🦊", "🦉", "🐱", "🌿", "☕"];

export const profileFeature = {
  skin: "profile",
  eyebrow: "FRAMED PORTRAIT · IDENTITY & ACCOUNT",
  title: "Profile & Account",
  icon: "🖼",
  render(container, { rerender }) {
    let authMode = "signin"; // signin | register | recover
    let statusMsg = "";

    const renderView = () => {
      const user = state.user;

      if (!supabase.configured) {
        container.innerHTML = `
          <div class="sprk-card" style="margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
              <div class="sprk-dialog-icon" style="width:48px;height:48px;font-size:24px;">☺</div>
              <div>
                <strong style="font-size:16px;">Local Studio Visitor</strong>
                <div class="sprk-meta">Browser-local workspace · Not signed in</div>
              </div>
            </div>
            <p style="margin:0;font-size:13px;color:var(--muted);">
              Your themes, lighting, room layout, focus logs, tasks, and private diary are saved locally in this browser.
            </p>
          </div>

          <div class="sprk-card" style="margin-bottom:14px;">
            <h2 style="margin:0 0 8px;font-size:14px;">Connect Your Supabase Backend</h2>
            <p style="margin:0 0 8px;font-size:13px;color:var(--muted);">
              To enable email accounts, Study Credit rewards, Desk Shop purchases, friends, and study groups:
            </p>
            <ol style="margin:0;padding-left:18px;font-size:13px;color:var(--ink);display:grid;gap:4px;">
              <li>Run <code>supabase/migrations/001_sprk_desk_schema.sql</code> and <code>supabase/seed.sql</code> in Supabase SQL Editor.</li>
              <li>Paste your Supabase Project URL and Anon Key into <code>config.js</code>.</li>
              <li>Reload the page and sign in from this portrait frame.</li>
            </ol>
          </div>

          <div class="sprk-card">
            <label class="sprk-field" style="margin-bottom:8px;">
              <span class="sprk-label">Local Desk Nameplate</span>
              <input id="local-nameplate" class="sprk-input" type="text" maxlength="24" value="${escapeHtml(state.preferences.localDisplayName || "Student")}" />
            </label>
            <button type="button" class="sprk-btn sprk-btn-primary" id="save-local-nameplate">Update Nameplate</button>
            <p id="profile-status" class="sprk-meta" role="status" style="margin-top:8px;">${escapeHtml(statusMsg)}</p>
          </div>
        `;

        container.querySelector("#save-local-nameplate")?.addEventListener("click", () => {
          const val = container.querySelector("#local-nameplate").value.trim() || "Student";
          savePreferences({ localDisplayName: val });
          const badge = document.querySelector(".portrait-badge");
          if (badge) badge.textContent = val;
          statusMsg = "Local nameplate updated.";
          renderView();
        });
        return;
      }

      if (!user) {
        container.innerHTML = `
          <div class="sprk-notice" style="margin-bottom:14px;">
            <strong>Visitor Mode:</strong> Sign in or register to sync your room, earn verified Study Credits, and connect with friends.
          </div>

          <div class="sprk-tabs">
            <button type="button" class="sprk-tab ${authMode === "signin" ? "is-active" : ""}" data-auth-mode="signin">Sign In</button>
            <button type="button" class="sprk-tab ${authMode === "register" ? "is-active" : ""}" data-auth-mode="register">Create Account</button>
            <button type="button" class="sprk-tab ${authMode === "recover" ? "is-active" : ""}" data-auth-mode="recover">Reset Password</button>
          </div>

          <form id="auth-form" class="sprk-card">
            ${authMode === "register" ? `
              <label class="sprk-field">
                <span class="sprk-label">Display Name</span>
                <input id="auth-display" class="sprk-input" type="text" required maxlength="32" placeholder="Your study name" />
              </label>
            ` : ""}
            <label class="sprk-field">
              <span class="sprk-label">Email</span>
              <input id="auth-email" class="sprk-input" type="email" required autocomplete="email" />
            </label>
            ${authMode !== "recover" ? `
              <label class="sprk-field">
                <span class="sprk-label">Password</span>
                <input id="auth-password" class="sprk-input" type="password" required minlength="6" autocomplete="${authMode === "register" ? "new-password" : "current-password"}" />
              </label>
            ` : ""}
            <button type="submit" class="sprk-btn sprk-btn-primary">
              ${authMode === "signin" ? "Sign In" : authMode === "register" ? "Create Account" : "Send Recovery Email"}
            </button>
            ${statusMsg ? `<p class="sprk-meta" role="status" style="margin-top:10px;">${escapeHtml(statusMsg)}</p>` : ""}
          </form>
        `;

        container.querySelectorAll("[data-auth-mode]").forEach((btn) => {
          btn.addEventListener("click", () => {
            authMode = btn.dataset.authMode;
            statusMsg = "";
            renderView();
          });
        });

        container.querySelector("#auth-form")?.addEventListener("submit", async (e) => {
          e.preventDefault();
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
              rerender();
            }
          } else if (authMode === "register") {
            const { error } = await signUpWithEmail({ email, password, displayName });
            statusMsg = error ? error.message : "Account created! Check your email if verification is required.";
            if (!error && state.user) await syncAuthenticatedUserData();
            rerender();
          } else {
            const { error } = await sendPasswordRecovery(email);
            statusMsg = error ? error.message : "Password recovery link sent if account exists.";
            renderView();
          }
        });
        return;
      }

      // Signed-in profile & settings
      container.innerHTML = `
        <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="sprk-dialog-icon" style="width:50px;height:50px;font-size:24px;">${escapeHtml(user.avatarPreset || "☺")}</div>
            <div>
              <strong style="font-size:16px;">${escapeHtml(user.displayName)}</strong>
              <div class="sprk-meta">
                <span class="tabular-nums">${escapeHtml(user.publicId)}</span>
                <span aria-hidden="true">·</span>
                <span>${user.isPremium ? "Premium Member" : "Standard Plan"}</span>
              </div>
            </div>
          </div>
          <button type="button" class="sprk-btn" id="auth-signout">Sign Out</button>
        </div>

        <form id="profile-edit-form" class="sprk-card" style="margin-bottom:14px;">
          <div class="sprk-grid-2">
            <label class="sprk-field">
              <span class="sprk-label">Display Name</span>
              <input id="prof-display" class="sprk-input" type="text" required maxlength="32" value="${escapeHtml(user.displayName)}" />
            </label>
            <label class="sprk-field">
              <span class="sprk-label">Username</span>
              <input id="prof-username" class="sprk-input" type="text" pattern="[a-z0-9_]{3,24}" value="${escapeHtml(user.username || "")}" placeholder="e.g. study_fox" />
            </label>
          </div>
          <div class="sprk-field">
            <span class="sprk-label">Portrait Avatar</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${AVATAR_PRESETS.map((av) => `
                <button type="button" class="sprk-btn ${user.avatarPreset === av ? "sprk-btn-primary" : ""}" data-avatar="${av}" style="min-width:44px;">${av}</button>
              `).join("")}
            </div>
          </div>
          <label class="sprk-field">
            <span class="sprk-label">Study Bio</span>
            <textarea id="prof-bio" class="sprk-textarea" style="min-height:70px;" maxlength="200">${escapeHtml(user.bio || "")}</textarea>
          </label>
          <button type="submit" class="sprk-btn sprk-btn-primary">Save Profile</button>
          ${statusMsg ? `<p class="sprk-meta" role="status" style="margin-top:8px;">${escapeHtml(statusMsg)}</p>` : ""}
        </form>

        ${user.role === "admin" ? `
          <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>Platform Operations</strong>
              <div class="sprk-meta">Verified administrator role active</div>
            </div>
            <button type="button" class="sprk-btn" id="open-admin-ops">Open Operations</button>
          </div>
        ` : ""}
      `;

      let chosenAvatar = user.avatarPreset || "☺";
      container.querySelectorAll("[data-avatar]").forEach((btn) => {
        btn.addEventListener("click", () => {
          chosenAvatar = btn.dataset.avatar;
          container.querySelectorAll("[data-avatar]").forEach((b) => b.classList.toggle("sprk-btn-primary", b === btn));
        });
      });

      container.querySelector("#profile-edit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const { error } = await updateProfile({
          displayName: container.querySelector("#prof-display").value.trim(),
          username: container.querySelector("#prof-username").value.trim().toLowerCase(),
          avatarPreset: chosenAvatar,
          bio: container.querySelector("#prof-bio").value.trim()
        });
        statusMsg = error ? error.message : "Profile saved to Supabase.";
        renderView();
      });

      container.querySelector("#auth-signout")?.addEventListener("click", async () => {
        await signOut();
        rerender();
      });

      container.querySelector("#open-admin-ops")?.addEventListener("click", () => {
        dialogManager.open("ops", container);
      });
    };

    renderView();
  }
};
