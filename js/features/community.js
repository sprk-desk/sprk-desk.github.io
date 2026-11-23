// Desk Computer -> Discover, Study Rooms, Study Groups (Owner/Moderator/Member), & Shared Focus
import { state } from "../state.js";
import { supabase } from "../services/supabase.js";
import { escapeHtml } from "../utils/dom.js";

export const communityFeature = {
  skin: "community",
  eyebrow: "DESK COMPUTER · DISCOVER & GROUPS",
  title: "Study Rooms & Study Groups",
  icon: "🖥",
  render(container) {
    let tab = "discover";
    let statusMsg = "";

    const renderView = () => {
      const signedIn = supabase.configured && Boolean(state.user);

      container.innerHTML = `
        <div class="sprk-tabs">
          <button type="button" class="sprk-tab ${tab === "discover" ? "is-active" : ""}" data-ctab="discover">Discover Rooms</button>
          <button type="button" class="sprk-tab ${tab === "groups" ? "is-active" : ""}" data-ctab="groups">Study Groups</button>
          <button type="button" class="sprk-tab ${tab === "create" ? "is-active" : ""}" data-ctab="create">Create Group</button>
        </div>

        ${!signedIn ? `
          <div class="sprk-notice" style="margin-bottom:14px;">
            <strong>Connect Supabase to join live study rooms and groups.</strong> Public rooms, synchronized group Pomodoro timers, and live Realtime presence use your Supabase backend.
          </div>
        ` : ""}

        ${statusMsg ? `<div class="sprk-notice" style="margin-bottom:12px;">${escapeHtml(statusMsg)}</div>` : ""}

        ${tab === "discover" ? `
          <div class="sprk-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <strong>Live Public Study Rooms</strong>
              <button type="button" class="sprk-btn" id="refresh-rooms" ${!signedIn ? "disabled" : ""} style="min-height:34px;padding:4px 10px;">Refresh</button>
            </div>
            ${state.studyRooms.length === 0 ? `
              <div class="sprk-empty">${signedIn ? "No active study rooms right now. Click Refresh or start one inside a group." : "Public study rooms appear here once connected to Supabase."}</div>
            ` : state.studyRooms.map((r) => `
              <div class="sprk-card" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <strong>${escapeHtml(r.name)}</strong>
                  <div class="sprk-meta">${escapeHtml(r.category)} · Cap ${r.max_capacity}</div>
                </div>
                <button type="button" class="sprk-btn sprk-btn-primary" data-join-room="${escapeHtml(r.id)}">Join Room</button>
              </div>
            `).join("")}
          </div>
        ` : tab === "groups" ? `
          <div class="sprk-card">
            <h2 style="margin:0 0 8px;font-size:14px;">Three-Role Group Architecture</h2>
            <p style="margin:0 0 10px;font-size:13px;color:var(--muted);">
              Every study group enforces strict server-side permissions across <strong>Owner</strong>, <strong>Moderator</strong>, and <strong>Member</strong> roles.
            </p>
            ${state.studyGroups.length === 0
              ? `<div class="sprk-empty">${signedIn ? "No groups joined yet." : "Connect Supabase to discover and join study groups."}</div>`
              : state.studyGroups.map((g) => `<div class="sprk-card">${escapeHtml(g.name)} · ${escapeHtml(g.subject)}</div>`).join("")}
          </div>
        ` : `
          <form id="create-group-form" class="sprk-card">
            <div class="sprk-notice" style="margin-bottom:12px;">
              Creating a private or public study group requires a verified <strong>Premium</strong> entitlement on your account.
            </div>
            <label class="sprk-field">
              <span class="sprk-label">Group Name</span>
              <input id="grp-name" class="sprk-input" type="text" required maxlength="50" placeholder="Morning Calculus Club" />
            </label>
            <label class="sprk-field">
              <span class="sprk-label">Subject</span>
              <input id="grp-subject" class="sprk-input" type="text" required maxlength="40" value="Mathematics" />
            </label>
            <label class="sprk-field">
              <span class="sprk-label">Description</span>
              <textarea id="grp-desc" class="sprk-textarea" style="min-height:70px;" maxlength="240"></textarea>
            </label>
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;">
              <input id="grp-private" type="checkbox" />
              <span>Private invite-only group</span>
            </label>
            <button type="submit" class="sprk-btn sprk-btn-primary" ${!signedIn ? "disabled" : ""}>Create Study Group</button>
          </form>
        `}
      `;

      container.querySelectorAll("[data-ctab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.ctab;
          renderView();
        });
      });

      container.querySelector("#refresh-rooms")?.addEventListener("click", async () => {
        const { data, error } = await supabase.select("study_rooms", "order=created_at.desc&limit=20");
        if (error) statusMsg = error.message;
        else state.studyRooms = data || [];
        renderView();
      });

      container.querySelector("#create-group-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const { error } = await supabase.rpc("create_study_group", {
          p_name: container.querySelector("#grp-name").value.trim(),
          p_description: container.querySelector("#grp-desc").value.trim(),
          p_subject: container.querySelector("#grp-subject").value.trim(),
          p_is_private: container.querySelector("#grp-private").checked
        });
        statusMsg = error ? error.message : "Study group created!";
        renderView();
      });
    };

    renderView();
  }
};
