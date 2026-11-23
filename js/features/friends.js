// Desk Phone -> Friends, Presence, Direct Messages, Notifications & Read-Only Room Visits
import { state } from "../state.js";
import { supabase } from "../services/supabase.js";
import { fetchSpectatorRoom } from "../services/database-service.js";
import { themeManager } from "../core/theme-manager.js";
import { escapeHtml } from "../utils/dom.js";

export const friendsFeature = {
  skin: "friends",
  eyebrow: "DESK PHONE · FRIENDS & MESSAGES",
  title: "Friends & Notifications",
  icon: "📱",
  render(container, { close }) {
    let tab = "friends";
    let statusMsg = "";

    const renderView = () => {
      if (!supabase.configured || !state.user) {
        container.innerHTML = `
          <div class="sprk-notice" style="margin-bottom:14px;">
            <strong>Sign in required for social features.</strong> Connect Supabase and sign in via your framed portrait to search friends, send study messages, and visit rooms read-only.
          </div>
          <div class="sprk-card">
            <h2 style="margin:0 0 6px;font-size:14px;">Privacy & Safety Guarantees</h2>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--muted);display:grid;gap:4px;">
              <li>Room visits are strictly read-only — visitors cannot move objects or read your diary.</li>
              <li>Online status & active study subject sharing are controlled by your privacy settings.</li>
              <li>Blocked users cannot view your profile, send requests, or message you.</li>
            </ul>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="sprk-tabs">
          <button type="button" class="sprk-tab ${tab === "friends" ? "is-active" : ""}" data-ptab="friends">Friends</button>
          <button type="button" class="sprk-tab ${tab === "find" ? "is-active" : ""}" data-ptab="find">Add / Search</button>
          <button type="button" class="sprk-tab ${tab === "alerts" ? "is-active" : ""}" data-ptab="alerts">Alerts (${state.notifications.length})</button>
        </div>

        ${statusMsg ? `<div class="sprk-notice" style="margin-bottom:10px;">${escapeHtml(statusMsg)}</div>` : ""}

        ${tab === "friends" ? `
          <div class="sprk-card" style="margin-bottom:12px;">
            <form id="visit-room-form" style="display:flex;gap:8px;">
              <input id="visit-public-id" class="sprk-input" type="text" placeholder="Enter friend's User UUID to visit..." required />
              <button type="submit" class="sprk-btn sprk-btn-primary">Visit Room</button>
            </form>
          </div>
          ${state.friends.length === 0 ? `<div class="sprk-empty">No friends added yet. Use Add / Search to connect with study partners.</div>` : ""}
        ` : tab === "find" ? `
          <form id="friend-search-form" class="sprk-card">
            <label class="sprk-field">
              <span class="sprk-label">Search by Public ID (e.g. SPK-48291A)</span>
              <input id="friend-query" class="sprk-input" type="text" required maxlength="32" />
            </label>
            <button type="submit" class="sprk-btn sprk-btn-primary">Search</button>
            <div id="friend-results" style="margin-top:12px;"></div>
          </form>
        ` : `
          <div style="display:grid;gap:8px;">
            ${state.notifications.length === 0 ? `<div class="sprk-empty">You are all caught up.</div>` : state.notifications.map((n) => `
              <div class="sprk-card">
                <strong style="font-size:13px;">${escapeHtml(n.title)}</strong>
                <p style="margin:4px 0 0;font-size:12px;color:var(--muted);">${escapeHtml(n.body)}</p>
              </div>
            `).join("")}
          </div>
        `}
      `;

      container.querySelectorAll("[data-ptab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.ptab;
          renderView();
        });
      });

      container.querySelector("#visit-room-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const uid = container.querySelector("#visit-public-id").value.trim();
        const { data, error } = await fetchSpectatorRoom(uid);
        if (error) {
          statusMsg = error.message;
          renderView();
          return;
        }
        state.spectatingRoom = data;
        themeManager.apply(data.theme, { persist: false });
        const whisper = document.getElementById("room-active-whisper");
        if (whisper) {
          whisper.hidden = false;
          whisper.textContent = `Visiting ${data.profile.displayName}'s Room (Read-Only · Click to return)`;
        }
        close();
      });

      container.querySelector("#friend-search-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const q = container.querySelector("#friend-query").value.trim().toUpperCase();
        const { data, error } = await supabase.select("profiles", `public_id=eq.${encodeURIComponent(q)}&limit=5`);
        const resultsEl = container.querySelector("#friend-results");
        if (error || !data?.length) {
          resultsEl.innerHTML = `<div class="sprk-meta">No student found with ID ${escapeHtml(q)}.</div>`;
          return;
        }
        resultsEl.innerHTML = data.map((p) => `
          <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${escapeHtml(p.display_name)}</strong>
              <div class="sprk-meta">${escapeHtml(p.public_id)}</div>
            </div>
            <button type="button" class="sprk-btn sprk-btn-primary" data-send-req="${escapeHtml(p.id)}">Add Friend</button>
          </div>
        `).join("");

        resultsEl.querySelectorAll("[data-send-req]").forEach((b) => {
          b.addEventListener("click", async () => {
            const { error: reqErr } = await supabase.insert("friend_requests", {
              sender_id: state.user.id,
              receiver_id: b.dataset.sendReq
            });
            statusMsg = reqErr ? reqErr.message : "Friend request sent!";
            renderView();
          });
        });
      });
    };

    renderView();
  }
};
