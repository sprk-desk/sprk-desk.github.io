// Study Computer -> Feed, Study Groups, Silent Body-Doubling Halls & Rooms
import { state, persistLocalCollection } from "../state.js";
import { audioManager } from "../core/audio-manager.js";
import { supabase } from "../services/supabase.js";
import {
  loadSocialFeed,
  createSocialPost,
  toggleSocialPostLike,
  loadStudyGroups,
  createStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  loadGroupWorkspace,
  postGroupMessage
} from "../services/database-service.js";
import { BODY_DOUBLING_HALLS, computeSyncedRoomPhase } from "../utils/study-tools.js";
import { navigateToPage, PAGE_ROUTES } from "../router.js";
import { escapeHtml, formatDuration } from "../utils/dom.js";

export const communityFeature = {
  skin: "community",
  eyebrow: "",
  title: "Study Computer",
  icon: "🖥",
  render(container, { close }) {
    let tab = "bodydouble"; // bodydouble | feed | groups | discover | create
    let statusMsg = "";
    let lastPhase = null;
    let openGroupId = null;

    const renderView = () => {
      const signedIn = supabase.configured && Boolean(state.user);
      const seriousMode = Boolean(state.preferences?.seriousMode);
      const activeHall = state.bodyDoublingRoom
        ? BODY_DOUBLING_HALLS.find((h) => h.id === state.bodyDoublingRoom.id) || state.bodyDoublingRoom
        : null;
      const syncState = activeHall
        ? computeSyncedRoomPhase({
            cycleStartMs: activeHall.epochMs || 1700000000000,
            focusMinutes: activeHall.focusMinutes,
            breakMinutes: activeHall.breakMinutes,
            nowMs: Date.now()
          })
        : null;

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <nav class="sprk-tabs" style="margin:0;" role="tablist">
            <button type="button" class="sprk-tab ${tab === "bodydouble" ? "is-active" : ""}" data-ctab="bodydouble">${seriousMode ? "Body-Doubling" : "👥 Body-Doubling"}</button>
            <button type="button" class="sprk-tab ${tab === "feed" ? "is-active" : ""}" data-ctab="feed">📣 Feed</button>
            <button type="button" class="sprk-tab ${tab === "groups" ? "is-active" : ""}" data-ctab="groups">${seriousMode ? "Groups" : "📚 Groups"} (${(state.studyGroups || []).length})</button>
            <button type="button" class="sprk-tab ${tab === "discover" ? "is-active" : ""}" data-ctab="discover">${seriousMode ? "Rooms" : "🌐 Rooms"}</button>
            <button type="button" class="sprk-tab ${tab === "create" ? "is-active" : ""}" data-ctab="create">+ Create Group</button>
          </nav>
          <button type="button" class="sprk-btn" id="comm-open-hub" style="min-height:30px;padding:3px 10px;font-size:12px;">Full Social Hub →</button>
        </div>

        ${statusMsg ? `<div class="sprk-notice" style="margin-bottom:12px;">${escapeHtml(statusMsg)}</div>` : ""}

        ${tab === "bodydouble" ? `
          <div style="display:grid;gap:12px;">
            ${activeHall && syncState ? `
              <div class="sprk-card" style="border-color:var(--accent);">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
                  <div>
                    <strong style="font-size:15px;">${escapeHtml(activeHall.name)}</strong>
                    <div class="sprk-meta">Silent Pomodoro Hall · Cycle ${syncState.cycleNumber} · Zero-chat accountability</div>
                  </div>
                  <button type="button" class="sprk-btn" id="bd-leave-btn" style="min-height:32px;padding:4px 12px;">Leave Hall</button>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 12px;border-radius:8px;background:rgba(52,44,37,0.05);margin-bottom:10px;">
                  <div>
                    <div class="sprk-label" id="bd-phase-label">${syncState.phase === "focus" ? "SYNCHRONIZED FOCUS" : "SYNCHRONIZED BREAK"}</div>
                    <div class="tabular-nums" id="bd-countdown" style="font-size:28px;font-weight:700;line-height:1.1;">${formatDuration(syncState.remainingSeconds)}</div>
                  </div>
                  <div style="flex:1;min-width:180px;">
                    <label class="sprk-field" style="margin:0;">
                      <span class="sprk-label">Your Quiet Desk Tag</span>
                      <input id="bd-my-subject" class="sprk-input" type="text" maxlength="44" value="${escapeHtml(state.bodyDoublingRoom?.subject || "Deep Reading")}" />
                    </label>
                  </div>
                </div>

                <div style="display:grid;gap:6px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:5px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <strong>You (${escapeHtml(state.user?.displayName || state.localProfile?.displayName || "Local Student")})</strong>
                    <span class="sprk-meta">${escapeHtml(state.bodyDoublingRoom?.subject || "Deep Reading")} · ${syncState.phase === "focus" ? "Studying" : "Resting"}</span>
                  </div>
                  ${(activeHall.peers || []).map((peer) => `
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                      <span>${escapeHtml(peer.desk)}</span>
                      <span class="sprk-meta">${escapeHtml(peer.subject)} · ${syncState.phase === "focus" ? "Studying" : "Resting"}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : `
              <div class="sprk-notice">
                Join a silent synchronized study hall below. Everyone follows the exact same UTC Pomodoro cycle clock with no distracting chat feed.
              </div>
            `}

            <div class="sprk-grid-3">
              ${BODY_DOUBLING_HALLS.map((hall) => {
                const ph = computeSyncedRoomPhase({
                  cycleStartMs: hall.epochMs,
                  focusMinutes: hall.focusMinutes,
                  breakMinutes: hall.breakMinutes,
                  nowMs: Date.now()
                });
                const isJoined = activeHall?.id === hall.id;
                return `
                  <div class="sprk-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:10px;">
                    <div>
                      <strong style="font-size:13.5px;display:block;">${escapeHtml(hall.name)}</strong>
                      <div class="sprk-meta tabular-nums" style="margin-top:4px;">
                        ${ph.phase === "focus" ? "Focus" : "Break"} · ${formatDuration(ph.remainingSeconds)} left
                      </div>
                    </div>
                    <button type="button" class="sprk-btn ${isJoined ? "sprk-btn-primary" : ""}" data-join-hall="${escapeHtml(hall.id)}" style="min-height:34px;padding:4px 10px;">
                      ${isJoined ? "Active Hall" : "Join Silently"}
                    </button>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        ` : tab === "feed" ? `
          <div style="display:grid;gap:12px;">
            ${!signedIn ? `<div class="sprk-empty">Sign in via Photo Frame or /account to post and read the live study feed.</div>` : `
              <form id="comm-post-form" class="sprk-card" style="display:grid;gap:8px;">
                <textarea id="comm-post-text" class="sprk-textarea" style="min-height:58px;" maxlength="600" required placeholder="Share a study milestone or update..."></textarea>
                <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;">
                  <input id="comm-post-subj" class="sprk-input" type="text" maxlength="40" value="General Study" style="max-width:180px;" />
                  <div style="display:flex;gap:8px;">
                    <button type="button" class="sprk-btn" id="comm-refresh-feed">↻ Refresh</button>
                    <button type="submit" class="sprk-btn sprk-btn-primary">Post</button>
                  </div>
                </div>
              </form>
              ${(state.socialFeed || []).length === 0
                ? `<div class="sprk-empty">No study updates yet. Post the first update above!</div>`
                : (state.socialFeed || []).slice(0, 10).map((post) => `
                  <div class="sprk-card" style="display:grid;gap:6px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                      <strong>${escapeHtml(post.author?.displayName || "Student")}</strong>
                      <span class="sprk-meta">${escapeHtml(post.subject || "Study")}</span>
                    </div>
                    <p style="margin:0;font-size:13px;line-height:1.45;">${escapeHtml(post.content || "")}</p>
                    <div style="display:flex;gap:10px;align-items:center;">
                      <button type="button" class="sprk-btn ${post.likedByMe ? "sprk-btn-primary" : ""}" data-comm-like="${escapeHtml(post.id)}" style="min-height:28px;padding:2px 10px;font-size:12px;">
                        ${post.likedByMe ? "♥" : "♡"} ${post.likes_count || 0}
                      </button>
                      <span class="sprk-meta tabular-nums">💬 ${post.comments_count || 0}</span>
                    </div>
                  </div>
                `).join("")}
            `}
          </div>
        ` : tab === "groups" ? `
          <div style="display:grid;gap:12px;">
            ${!signedIn ? `<div class="sprk-empty">Sign in to browse and join study groups.</div>` : openGroupId && state.activeGroupWorkspace?.group?.id === openGroupId ? (() => {
              const ws = state.activeGroupWorkspace;
              const grp = ws.group;
              return `
                <div class="sprk-card" style="display:grid;gap:10px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="sprk-btn" id="comm-grp-back" style="min-height:30px;padding:3px 10px;">← All Groups</button>
                    <span class="sprk-meta tabular-nums">Code: <strong>${escapeHtml(grp.invite_code || "")}</strong></span>
                  </div>
                  <div>
                    <strong style="font-size:16px;">${escapeHtml(grp.name)}</strong>
                    <div class="sprk-meta">${escapeHtml(grp.subject)} · ${ws.members.length} members</div>
                  </div>
                  ${grp.pinned_announcement ? `<div class="sprk-notice">${escapeHtml(grp.pinned_announcement)}</div>` : ""}
                  ${ws.myRole ? `
                    <div style="max-height:200px;overflow-y:auto;display:grid;gap:6px;">
                      ${ws.messages.length === 0 ? `<div class="sprk-meta">No messages yet.</div>` : ws.messages.map((m) => `
                        <div style="padding:6px 8px;border-radius:8px;background:rgba(52,44,37,0.05);font-size:12.5px;">
                          <strong>${escapeHtml(m.author?.displayName || "Student")}:</strong> ${escapeHtml(m.content || "")}
                        </div>
                      `).join("")}
                    </div>
                    <form id="comm-grp-msg-form" style="display:flex;gap:8px;">
                      <input id="comm-grp-msg" class="sprk-input" type="text" required maxlength="600" placeholder="Send a message to the group..." />
                      <button type="submit" class="sprk-btn sprk-btn-primary">Send</button>
                    </form>
                  ` : `
                    <button type="button" class="sprk-btn sprk-btn-primary" data-comm-join-grp="${escapeHtml(grp.id)}">Join Group to Chat</button>
                  `}
                </div>
              `;
            })() : `
              <form id="comm-join-code-form" class="sprk-card" style="display:flex;gap:8px;flex-wrap:wrap;">
                <input id="comm-join-code" class="sprk-input" type="text" required maxlength="16" placeholder="Join by invite code..." style="flex:1;min-width:160px;" />
                <button type="submit" class="sprk-btn sprk-btn-primary">Join</button>
                <button type="button" class="sprk-btn" id="comm-refresh-grps">↻</button>
              </form>
              ${(state.studyGroups || []).length === 0
                ? `<div class="sprk-empty">No study groups yet. Create one in the next tab!</div>`
                : (state.studyGroups || []).map((g) => {
                  const role = (state.groupMemberships || {})[g.id];
                  return `
                    <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                      <div>
                        <strong>${escapeHtml(g.name)}</strong>
                        <div class="sprk-meta">${escapeHtml(g.subject || "General")} · ${g.member_count || 1} members · ${g.is_private ? "Private" : "Public"}</div>
                      </div>
                      <div style="display:flex;gap:6px;">
                        <button type="button" class="sprk-btn" data-comm-open-grp="${escapeHtml(g.id)}" style="min-height:32px;padding:4px 10px;">Open</button>
                        ${role
                          ? `<button type="button" class="sprk-btn" data-comm-leave-grp="${escapeHtml(g.id)}" style="min-height:32px;padding:4px 10px;">Leave</button>`
                          : `<button type="button" class="sprk-btn sprk-btn-primary" data-comm-join-grp="${escapeHtml(g.id)}" style="min-height:32px;padding:4px 10px;">Join</button>`}
                      </div>
                    </div>
                  `;
                }).join("")}
            `}
          </div>
        ` : tab === "discover" ? `
          <div class="sprk-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <strong>Public Rooms</strong>
              <button type="button" class="sprk-btn" id="refresh-rooms" ${!signedIn ? "disabled" : ""} style="min-height:34px;padding:4px 10px;">↻ Refresh</button>
            </div>
            ${state.studyRooms.length === 0 ? `
              <div class="sprk-empty">${signedIn ? "No active rooms" : "Sign in to join live cloud rooms (or use Body-Doubling offline)"}</div>
            ` : state.studyRooms.map((r) => `
              <div class="sprk-card" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <strong>${escapeHtml(r.name)}</strong>
                  <div class="sprk-meta">${escapeHtml(r.category)} · ${r.max_capacity}</div>
                </div>
                <button type="button" class="sprk-btn sprk-btn-primary" data-join-room="${escapeHtml(r.id)}">Join</button>
              </div>
            `).join("")}
          </div>
        ` : `
          <form id="create-group-form" class="sprk-card">
            <label class="sprk-field">
              <span class="sprk-label">Group Name</span>
              <input id="grp-name" class="sprk-input" type="text" required maxlength="50" placeholder="Morning Calculus Club" />
            </label>
            <label class="sprk-field">
              <span class="sprk-label">Subject</span>
              <input id="grp-subject" class="sprk-input" type="text" required maxlength="40" value="Mathematics" />
            </label>
            <label class="sprk-field">
              <span class="sprk-label">About</span>
              <textarea id="grp-desc" class="sprk-textarea" style="min-height:64px;" maxlength="240"></textarea>
            </label>
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;">
              <input id="grp-private" type="checkbox" />
              <span>Private (Invite code only)</span>
            </label>
            <button type="submit" class="sprk-btn sprk-btn-primary" ${!signedIn ? "disabled" : ""}>Create Group</button>
          </form>
        `}
      `;

      container.querySelector("#comm-open-hub")?.addEventListener("click", () => {
        close?.();
        navigateToPage(PAGE_ROUTES.ACCOUNT);
      });

      container.querySelectorAll("[data-ctab]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          tab = btn.dataset.ctab;
          if (tab === "feed" && signedIn) await loadSocialFeed("all");
          if (tab === "groups" && signedIn) await loadStudyGroups();
          renderView();
        });
      });

      container.querySelectorAll("[data-join-hall]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const hall = BODY_DOUBLING_HALLS.find((h) => h.id === btn.dataset.joinHall);
          if (!hall) return;
          persistLocalCollection("bodyDoublingRoom", {
            id: hall.id,
            name: hall.name,
            focusMinutes: hall.focusMinutes,
            breakMinutes: hall.breakMinutes,
            epochMs: hall.epochMs,
            subject: state.bodyDoublingRoom?.subject || "Deep Reading"
          });
          lastPhase = null;
          renderView();
        });
      });

      container.querySelector("#bd-leave-btn")?.addEventListener("click", () => {
        persistLocalCollection("bodyDoublingRoom", null);
        lastPhase = null;
        renderView();
      });

      container.querySelector("#bd-my-subject")?.addEventListener("change", (e) => {
        if (!state.bodyDoublingRoom) return;
        persistLocalCollection("bodyDoublingRoom", {
          ...state.bodyDoublingRoom,
          subject: e.target.value.trim() || "Deep Reading"
        });
        renderView();
      });

      container.querySelector("#comm-post-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const content = container.querySelector("#comm-post-text")?.value || "";
        const subject = container.querySelector("#comm-post-subj")?.value || "General Study";
        const { error } = await createSocialPost({ content, subject });
        statusMsg = error ? error.message : "Posted to feed!";
        renderView();
      });

      container.querySelector("#comm-refresh-feed")?.addEventListener("click", async () => {
        await loadSocialFeed("all");
        renderView();
      });

      container.querySelectorAll("[data-comm-like]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await toggleSocialPostLike(btn.dataset.commLike);
          renderView();
        });
      });

      container.querySelector("#comm-refresh-grps")?.addEventListener("click", async () => {
        await loadStudyGroups();
        renderView();
      });

      container.querySelector("#comm-join-code-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const code = container.querySelector("#comm-join-code")?.value.trim();
        const { data, error } = await joinStudyGroup({ inviteCode: code });
        statusMsg = error ? error.message : "Joined group!";
        if (data?.id) {
          openGroupId = data.id;
          await loadGroupWorkspace(data.id);
        }
        renderView();
      });

      container.querySelectorAll("[data-comm-open-grp]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          openGroupId = btn.dataset.commOpenGrp;
          await loadGroupWorkspace(openGroupId);
          renderView();
        });
      });

      container.querySelector("#comm-grp-back")?.addEventListener("click", () => {
        openGroupId = null;
        renderView();
      });

      container.querySelectorAll("[data-comm-join-grp]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const gid = btn.dataset.commJoinGrp;
          const { error } = await joinStudyGroup({ groupId: gid });
          statusMsg = error ? error.message : "Joined group!";
          if (!error && openGroupId === gid) await loadGroupWorkspace(gid);
          renderView();
        });
      });

      container.querySelectorAll("[data-comm-leave-grp]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await leaveStudyGroup(btn.dataset.commLeaveGrp);
          statusMsg = error ? error.message : "Left group.";
          renderView();
        });
      });

      container.querySelector("#comm-grp-msg-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const val = container.querySelector("#comm-grp-msg")?.value.trim();
        if (!val || !openGroupId) return;
        const { error } = await postGroupMessage(openGroupId, val);
        if (error) statusMsg = error.message;
        renderView();
      });

      container.querySelector("#refresh-rooms")?.addEventListener("click", async () => {
        const { data, error } = await supabase.select("study_rooms", "order=created_at.desc&limit=20");
        if (error) statusMsg = error.message;
        else state.studyRooms = data || [];
        renderView();
      });

      container.querySelector("#create-group-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const { data, error } = await createStudyGroup({
          name: container.querySelector("#grp-name").value.trim(),
          description: container.querySelector("#grp-desc").value.trim(),
          subject: container.querySelector("#grp-subject").value.trim(),
          isPrivate: container.querySelector("#grp-private").checked
        });
        statusMsg = error ? error.message : "Group created!";
        if (!error && data?.id) {
          tab = "groups";
          openGroupId = data.id;
          await loadGroupWorkspace(data.id);
        }
        renderView();
      });
    };

    renderView();

    const timer = window.setInterval(() => {
      if (tab !== "bodydouble" || !state.bodyDoublingRoom) return;
      const hall = state.bodyDoublingRoom;
      const ph = computeSyncedRoomPhase({
        cycleStartMs: hall.epochMs || 1700000000000,
        focusMinutes: hall.focusMinutes,
        breakMinutes: hall.breakMinutes,
        nowMs: Date.now()
      });
      if (lastPhase && lastPhase !== ph.phase && !state.preferences?.muteChimes) {
        audioManager.playChime("focus");
      }
      lastPhase = ph.phase;
      const cdEl = container.querySelector("#bd-countdown");
      const lblEl = container.querySelector("#bd-phase-label");
      if (cdEl) cdEl.textContent = formatDuration(ph.remainingSeconds);
      if (lblEl) lblEl.textContent = ph.phase === "focus" ? "SYNCHRONIZED FOCUS" : "SYNCHRONIZED BREAK";
    }, 1000);

    return () => window.clearInterval(timer);
  }
};
