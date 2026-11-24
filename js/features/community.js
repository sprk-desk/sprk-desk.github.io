// Study Computer -> Discover Rooms, Study Groups & Silent Body-Doubling Pomodoros
import { state, persistLocalCollection } from "../state.js";
import { audioManager } from "../core/audio-manager.js";
import { supabase } from "../services/supabase.js";
import { BODY_DOUBLING_HALLS, computeSyncedRoomPhase } from "../utils/study-tools.js";
import { escapeHtml, formatDuration } from "../utils/dom.js";

export const communityFeature = {
  skin: "community",
  eyebrow: "",
  title: "Study Computer",
  icon: "🖥",
  render(container) {
    let tab = "bodydouble"; // bodydouble | discover | groups | create
    let statusMsg = "";
    let lastPhase = null;

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
            <button type="button" class="sprk-tab ${tab === "discover" ? "is-active" : ""}" data-ctab="discover">${seriousMode ? "Rooms" : "🌐 Rooms"}</button>
            <button type="button" class="sprk-tab ${tab === "groups" ? "is-active" : ""}" data-ctab="groups">${seriousMode ? "Groups" : "📚 Groups"}</button>
            <button type="button" class="sprk-tab ${tab === "create" ? "is-active" : ""}" data-ctab="create">+ Create</button>
          </nav>
          <span class="sprk-badge-chip">${signedIn ? (seriousMode ? "Online" : "🟢 Online") : (seriousMode ? "Local / Offline" : "🔌 Local")}</span>
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
        ` : tab === "groups" ? `
          <div class="sprk-card">
            <div class="sprk-badge-row" style="margin-bottom:12px;">
              <span class="sprk-badge-chip">${seriousMode ? "Owner" : "👑 Owner"}</span>
              <span class="sprk-badge-chip">${seriousMode ? "Mod" : "🛡 Mod"}</span>
              <span class="sprk-badge-chip">${seriousMode ? "Member" : "🎓 Member"}</span>
            </div>
            ${state.studyGroups.length === 0
              ? `<div class="sprk-empty">${signedIn ? "No groups yet" : "Sign in to join groups"}</div>`
              : state.studyGroups.map((g) => `<div class="sprk-card">${escapeHtml(g.name)} · ${escapeHtml(g.subject)}</div>`).join("")}
          </div>
        ` : `
          <form id="create-group-form" class="sprk-card">
            <div class="sprk-badge-row" style="margin-bottom:12px;">
              <span class="sprk-badge-chip">${seriousMode ? "Pro Feature" : "★ Premium Required"}</span>
            </div>
            <label class="sprk-field">
              <span class="sprk-label">Name</span>
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
              <span>Private</span>
            </label>
            <button type="submit" class="sprk-btn sprk-btn-primary" ${!signedIn ? "disabled" : ""}>Create Group</button>
          </form>
        `}
      `;

      container.querySelectorAll("[data-ctab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.ctab;
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
        statusMsg = error ? error.message : "Group created!";
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
