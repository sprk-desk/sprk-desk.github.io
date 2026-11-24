// DeepFocus Studio Modals — Purpose-Built Glassmorphic Dialogs (Zero Cozy Skin Chrome, 100% Feature Parity)
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { audioManager, AUDIO_CHANNELS } from "../core/audio-manager.js";
import { isStrictFocusLockActive, setAppMode } from "../core/settings-manager.js";
import { navigateToPage, PAGE_ROUTES } from "../router.js";
import { supabase } from "../services/supabase.js";
import { presenceService } from "../services/presence-service.js";
import { purchaseShopItem } from "../services/economy-service.js";
import {
  syncTaskUpsert,
  syncTaskDelete,
  syncNoteUpsert,
  syncNoteDelete,
  syncManualStudyRecord,
  syncSavedResourceUpsert,
  syncSavedResourceDelete,
  loadFriendsAndRequests,
  searchStudentProfiles,
  fetchUserPublicProfile,
  sendFriendRequest,
  cancelFriendRequest,
  respondFriendRequest,
  unfriendUser,
  visitFriendRoom,
  loadStudyGroups,
  createStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  loadGroupWorkspace,
  postGroupMessage
} from "../services/database-service.js";
import { canUserVisitRoom, getRelationshipStatus } from "../utils/privacy-scope.js";
import { equipShopItem, isShopItemEquipped } from "./shop.js";
import { SHOP_CATALOG } from "../utils/shop-catalog.js";
import { computeVisualizerBars } from "../utils/dialog-objects.js";
import { partitionMusicDiscs } from "../utils/audio-loops.js";
import {
  groupTasksForKanban,
  moveTaskToKanbanColumn,
  computeDeepFocusAnalytics
} from "../utils/deepfocus-config.js";
import { computeStudyStreaks, createFocusSession, summarizeFocusMinutes } from "../utils/timer-math.js";
import {
  BUILTIN_DISCS,
  STARTER_GUIDES,
  BODY_DOUBLING_HALLS,
  ACHIEVEMENT_DEFS,
  computeUnlockedAchievementIds,
  computeSubjectBudgetsProgress,
  computeExamCountdown,
  renderSafeMarkdownHtml,
  formatStudyRecordsCsv,
  formatStudyRecordsMarkdown,
  computeSyncedRoomPhase,
  createFlashcard,
  reviewFlashcard,
  getDueFlashcards,
  validateBackupPayload
} from "../utils/study-tools.js";
import { isThemeAccessibleInMode, isThemeFreeInMode } from "../utils/room-settings.js";
import { sanitizeAvatarUrl } from "../utils/profile-helpers.js";
import { downloadFile, escapeHtml, formatDuration, formatMinutesLabel, todayIsoDate, generateId } from "../utils/dom.js";

export function createDeepFocusModalController({
  shellEl,
  onSelectFocusTask,
  getSelectedTaskId,
  onWorkspaceMutated
}) {
  let activeModal = null; // null | "music" | "plan" | "knowledge" | "insights" | "community" | "catalog" | "break"
  let subTab = "";
  let statusMsg = "";

  // Ephemeral UI state across modal renders
  let previewSnapshot = null;
  let previewingDiscId = null;
  let visTick = 0;
  let visInterval = null;
  let hallInterval = null;
  let breakInterval = null;
  let eyeRestCountdown = 0;

  // Knowledge state
  let diaryFolder = "diary"; // diary | notes
  let diaryQuery = "";
  let diaryEditingId = null;
  let diaryWriteOpen = false;
  let diaryPreviewMd = false;
  let draftTitle = "";
  let draftContent = "";
  let libQuery = "";
  let showCardBack = false;

  // Community state
  let friendSearchResults = null;
  let inspectedFriend = null;
  let lastHallPhase = null;
  let openGroupId = null;

  // Catalog state
  let catalogCat = "all"; // all | particles | music | theme | ambience

  const clearTimers = () => {
    if (visInterval) {
      window.clearInterval(visInterval);
      visInterval = null;
    }
    if (hallInterval) {
      window.clearInterval(hallInterval);
      hallInterval = null;
    }
    if (breakInterval) {
      window.clearInterval(breakInterval);
      breakInterval = null;
    }
  };

  const restoreAudioPreview = () => {
    if (!previewSnapshot) return;
    for (const ch of AUDIO_CHANNELS) {
      audioManager.setChannelLevel(ch.id, previewSnapshot.levels[ch.id] || 0);
    }
    if (!previewSnapshot.wasPlaying && audioManager.isPlaying) {
      audioManager.togglePlay(false).catch(() => {});
    }
    previewSnapshot = null;
    previewingDiscId = null;
  };

  const close = () => {
    clearTimers();
    restoreAudioPreview();
    activeModal = null;
    statusMsg = "";
    onWorkspaceMutated?.();
  };

  const open = (modalName, preferredTab = "") => {
    clearTimers();
    restoreAudioPreview();
    activeModal = modalName;
    statusMsg = "";
    const defaults = {
      music: "discs",
      plan: "kanban",
      knowledge: "notes",
      insights: "analytics",
      community: "halls",
      catalog: "all",
      break: "rest"
    };
    subTab = preferredTab || defaults[modalName] || "";
    if (modalName === "knowledge" && preferredTab === "diary") {
      subTab = "notes";
      diaryFolder = "diary";
    }
    onWorkspaceMutated?.();
  };

  const getActiveModal = () => activeModal;

  const renderMusicModalBody = () => {
    const { ownedDiscs, purchasableDiscs } = partitionMusicDiscs({
      builtinDiscs: BUILTIN_DISCS,
      catalogItems: SHOP_CATALOG,
      ownedItemIds: state.ownedItemIds || []
    });
    const activeDiscId = state.preferences?.activeMusicId || "disc_rainy";
    const activeDisc = ownedDiscs.find((d) => d.id === activeDiscId) || ownedDiscs[0];
    const previewDisc = previewingDiscId
      ? purchasableDiscs.find((d) => d.id === previewingDiscId) || null
      : null;
    const turntableSwatch = previewDisc ? previewDisc.swatch : activeDisc.swatch;
    const turntableTitle = previewDisc ? `Preview: ${previewDisc.name}` : activeDisc.name;
    const initialBars = computeVisualizerBars({
      isPlaying: audioManager.isPlaying,
      levels: audioManager.levels,
      analyserBins: audioManager.getAnalyserBins(),
      barCount: 18,
      tick: visTick
    });
    const presets = state.localAudioPresets || {};
    const lowPassHz = Math.min(20000, Math.max(400, Number(audioManager.lowPassHz || state.preferences?.lowPassHz || 18000)));
    const lowPassLabel = lowPassHz >= 1000 ? `${(lowPassHz / 1000).toFixed(1)} kHz` : `${lowPassHz} Hz`;
    const signedIn = Boolean(state.user?.id);

    return `
      <div class="df-turntable ${audioManager.isPlaying ? "is-playing" : ""}">
        <div class="df-platter" aria-hidden="true">
          <div class="df-vinyl">
            <span class="df-vinyl-core" style="background:${escapeHtml(turntableSwatch)};"></span>
          </div>
        </div>
        <div class="df-turntable-main">
          <div class="df-turntable-top">
            <button type="button" class="df-btn-accent" id="dfm-audio-toggle">
              ${audioManager.isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <strong class="df-turntable-title">${escapeHtml(turntableTitle)}</strong>
            <label class="df-vol-wrap">
              <span class="df-muted">Vol</span>
              <input id="dfm-master-vol" type="range" min="0" max="100" value="${Math.round(audioManager.masterVolume * 100)}" aria-label="Master volume" />
            </label>
          </div>
          <div class="df-vis-bars" id="dfm-vis-bars" aria-label="Audio frequency visualiser">
            ${initialBars.map((val) => `
              <span class="df-vis-bar" style="height:${Math.round(val * 100)}%;background:linear-gradient(180deg, ${escapeHtml(turntableSwatch)} 0%, var(--df-accent) 100%);"></span>
            `).join("")}
          </div>
        </div>
      </div>

      <nav class="df-modal-tabs" role="tablist">
        <button type="button" class="df-mtab ${subTab === "discs" ? "is-active" : ""}" data-dfm-tab="discs">Discs (${ownedDiscs.length})</button>
        <button type="button" class="df-mtab ${subTab === "mixer" ? "is-active" : ""}" data-dfm-tab="mixer">9-Channel Mixer</button>
        <button type="button" class="df-mtab ${subTab === "saved" ? "is-active" : ""}" data-dfm-tab="saved">Saved Mixes (${Object.keys(presets).length})</button>
      </nav>

      ${subTab === "discs" ? `
        <div class="df-modal-sec">
          <div class="df-sec-head">
            <h3>Owned Sound Discs</h3>
            <span class="df-muted">Click any disc to load &amp; play</span>
          </div>
          <div class="df-disc-grid">
            ${ownedDiscs.map((disc) => {
              const isAct = !previewDisc && disc.id === activeDiscId;
              return `
                <button type="button" class="df-disc-card ${isAct ? "is-active" : ""}" data-dfm-disc="${escapeHtml(disc.id)}">
                  <span class="df-disc-dot" style="background:${escapeHtml(disc.swatch)};"></span>
                  <span>${escapeHtml(disc.name)}</span>
                </button>
              `;
            }).join("")}
          </div>
        </div>

        ${purchasableDiscs.length > 0 ? `
          <div class="df-modal-sec">
            <div class="df-sec-head">
              <h3>Loop &amp; Ambient Discs (${purchasableDiscs.length})</h3>
              <span class="df-muted tabular-nums">${signedIn ? `${state.wallet.balance} SC available` : "Sign in via /account to buy"}</span>
            </div>
            <div class="df-list-grid-2">
              ${purchasableDiscs.map((disc) => {
                const isSample = previewingDiscId === disc.id;
                return `
                  <article class="df-item-card">
                    <div class="df-item-card-info">
                      <span class="df-disc-dot" style="background:${escapeHtml(disc.swatch)};"></span>
                      <div>
                        <strong>${escapeHtml(disc.name)}</strong>
                        <div class="df-muted tabular-nums">${escapeHtml(disc.tempoLabel)} · ${disc.price} SC</div>
                      </div>
                    </div>
                    <div class="df-item-card-acts">
                      <button type="button" class="df-btn-subtle" data-dfm-preview="${escapeHtml(disc.id)}">${isSample ? "Stop" : "Preview"}</button>
                      <button type="button" class="df-btn-accent" data-dfm-buy-disc="${escapeHtml(disc.id)}" ${!signedIn ? "disabled" : ""}>Buy · ${disc.price} SC</button>
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          </div>
        ` : ""}
      ` : subTab === "mixer" ? `
        <div class="df-item-card" style="flex-direction:column;align-items:stretch;">
          <div class="df-sec-head">
            <strong>Low-Pass Acoustic Warmth</strong>
            <span class="tabular-nums df-muted" id="dfm-lowpass-val">${lowPassLabel}</span>
          </div>
          <input id="dfm-lowpass-slider" type="range" min="400" max="20000" step="100" value="${lowPassHz}" aria-label="Low-pass filter frequency" />
        </div>
        <div class="df-list-grid-2">
          ${AUDIO_CHANNELS.map((ch) => {
            const pct = Math.round((audioManager.levels[ch.id] || 0) * 100);
            return `
              <div class="df-item-card" style="flex-direction:column;align-items:stretch;">
                <div class="df-sec-head">
                  <strong>${escapeHtml(ch.label)}</strong>
                  <span class="tabular-nums df-muted" id="dfm-ch-val-${ch.id}">${pct}%</span>
                </div>
                <input type="range" min="0" max="100" value="${pct}" data-dfm-channel="${ch.id}" aria-label="${escapeHtml(ch.label)} volume" />
              </div>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="df-modal-sec">
          <div class="df-sec-head">
            <h3>Saved Custom Mixes</h3>
            <button type="button" class="df-btn-accent" id="dfm-save-preset">+ Save Current Mix</button>
          </div>
          ${Object.keys(presets).length === 0
            ? `<div class="df-empty-box">Adjust sliders in the 9-Channel Mixer and save your favorite combinations here.</div>`
            : `<div class="df-list-grid-2">
                ${Object.keys(presets).map((name) => `
                  <div class="df-item-card">
                    <strong>${escapeHtml(name)}</strong>
                    <div class="df-item-card-acts">
                      <button type="button" class="df-btn-subtle" data-dfm-load-preset="${escapeHtml(name)}">Load</button>
                      <button type="button" class="df-icon-btn" data-dfm-del-preset="${escapeHtml(name)}" aria-label="Delete mix ${escapeHtml(name)}">×</button>
                    </div>
                  </div>
                `).join("")}
              </div>`}
        </div>
      `}
    `;
  };

  const renderPlanModalBody = () => {
    const tasks = state.localTasks || [];
    const { todo, progress, done } = groupTasksForKanban(tasks);
    const goals = state.localGoals || [];
    const budgets = state.localSubjectBudgets || [];
    const exams = state.localExams || [];
    const records = (state.localStudyRecords || []).filter((r) => (r.mode || "focus") === "focus");
    const today = todayIsoDate();
    const todayFocusMins = summarizeFocusMinutes(records, today).totalMinutes;
    const budgetProgress = computeSubjectBudgetsProgress(budgets, records, new Date());
    const selectedTaskId = getSelectedTaskId?.() || "";

    const renderKanbanCol = (title, colKey, list) => `
      <section class="df-kcol" data-kanban-col="${colKey}" aria-label="${escapeHtml(title)} tasks">
        <header class="df-kcol-head">
          <span>${escapeHtml(title)}</span>
          <span class="tabular-nums df-muted">${list.length}</span>
        </header>
        <div class="df-kcol-list">
          ${list.length === 0 ? `<div class="df-kcol-empty">Drop tasks here</div>` : list.map((t) => `
            <article class="df-kcard ${selectedTaskId === t.id ? "is-selected" : ""}" draggable="true" data-task-id="${escapeHtml(t.id)}">
              <div class="df-kcard-top">
                <span class="df-drag-grip" aria-hidden="true">⋮⋮</span>
                <span class="df-kcard-title">${escapeHtml(t.title)}</span>
                <button type="button" class="df-card-x" data-dfm-del-task="${escapeHtml(t.id)}" aria-label="Delete task ${escapeHtml(t.title)}">×</button>
              </div>
              <div class="df-kcard-foot">
                <span class="df-muted">${escapeHtml(t.subject || "General")} · ${escapeHtml(t.priority || "medium")}${t.dueDate ? ` · ${escapeHtml(t.dueDate)}` : ""}</span>
                ${colKey !== "done" ? `<button type="button" class="df-pin-act" data-dfm-focus-task="${escapeHtml(t.id)}">${selectedTaskId === t.id ? "Pinned" : "Pin"}</button>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    return `
      <nav class="df-modal-tabs" role="tablist">
        <button type="button" class="df-mtab ${subTab === "kanban" ? "is-active" : ""}" data-dfm-tab="kanban">Kanban (${tasks.filter((t) => !t.completed).length})</button>
        <button type="button" class="df-mtab ${subTab === "goals" ? "is-active" : ""}" data-dfm-tab="goals">Goals (${goals.length})</button>
        <button type="button" class="df-mtab ${subTab === "budgets" ? "is-active" : ""}" data-dfm-tab="budgets">Budgets (${budgets.length})</button>
        <button type="button" class="df-mtab ${subTab === "exams" ? "is-active" : ""}" data-dfm-tab="exams">Exams (${exams.length})</button>
      </nav>

      ${subTab === "kanban" ? `
        <form id="dfm-task-form" class="df-inline-form">
          <input id="dfm-task-title" class="df-input" type="text" maxlength="100" required placeholder="New study task (drag cards across columns)..." style="flex:2;min-width:180px;" />
          <input id="dfm-task-subject" class="df-input" type="text" maxlength="40" value="General" aria-label="Subject" style="flex:1;min-width:110px;" />
          <select id="dfm-task-priority" class="df-select" aria-label="Priority" style="width:105px;">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
          <input id="dfm-task-due" class="df-input" type="date" aria-label="Due date" style="width:136px;" />
          <button type="submit" class="df-btn-accent">Add Task</button>
        </form>
        <div class="df-kboard">
          ${renderKanbanCol("To Do", "todo", todo)}
          ${renderKanbanCol("In Progress", "progress", progress)}
          ${renderKanbanCol("Done", "done", done)}
        </div>
      ` : subTab === "goals" ? `
        <form id="dfm-goal-form" class="df-inline-form">
          <input id="dfm-goal-title" class="df-input" type="text" maxlength="60" required placeholder="Daily Focus Target..." style="flex:2;min-width:180px;" />
          <input id="dfm-goal-mins" class="df-input tabular-nums" type="number" min="10" max="600" value="90" required aria-label="Target minutes" style="width:100px;" />
          <button type="submit" class="df-btn-accent">+ Add Goal</button>
        </form>
        <div class="df-stack">
          ${goals.length === 0 ? `<div class="df-empty-box">No study goals configured.</div>` : goals.map((g) => {
            const pct = Math.min(100, Math.round((todayFocusMins / Math.max(1, g.targetMinutes)) * 100));
            return `
              <div class="df-item-card" style="flex-direction:column;align-items:stretch;">
                <div class="df-sec-head">
                  <strong>${escapeHtml(g.title)}</strong>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span class="tabular-nums df-muted">${todayFocusMins} / ${g.targetMinutes}m (${pct}%)</span>
                    <button type="button" class="df-icon-btn" data-dfm-del-goal="${escapeHtml(g.id)}" aria-label="Delete goal">×</button>
                  </div>
                </div>
                <div class="df-subj-track"><div class="df-subj-fill" style="width:${pct}%;"></div></div>
              </div>
            `;
          }).join("")}
        </div>
      ` : subTab === "budgets" ? `
        <form id="dfm-budget-form" class="df-inline-form">
          <input id="dfm-budget-subj" class="df-input" type="text" maxlength="40" required placeholder="Subject (e.g., Linear Algebra)" style="flex:2;min-width:180px;" />
          <input id="dfm-budget-hrs" class="df-input tabular-nums" type="number" min="0.5" max="60" step="0.5" value="5" required aria-label="Weekly goal hours" style="width:100px;" />
          <button type="submit" class="df-btn-accent">+ Set Budget</button>
        </form>
        <div class="df-stack">
          ${budgetProgress.length === 0 ? `<div class="df-empty-box">No weekly subject hour budgets yet.</div>` : budgetProgress.map((b) => `
            <div class="df-item-card" style="flex-direction:column;align-items:stretch;">
              <div class="df-sec-head">
                <strong>${escapeHtml(b.subject)}</strong>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="tabular-nums df-muted">${formatMinutesLabel(b.studiedMinutes)} / ${b.targetHoursPerWeek}h (${b.pct}%)</span>
                  <button type="button" class="df-icon-btn" data-dfm-del-budget="${escapeHtml(b.id)}" aria-label="Delete budget">×</button>
                </div>
              </div>
              <div class="df-subj-track"><div class="df-subj-fill" style="width:${b.pct}%;"></div></div>
            </div>
          `).join("")}
        </div>
      ` : `
        <form id="dfm-exam-form" class="df-inline-form">
          <input id="dfm-exam-title" class="df-input" type="text" maxlength="60" required placeholder="Exam or deadline title..." style="flex:2;min-width:160px;" />
          <input id="dfm-exam-date" class="df-input" type="date" value="${today}" required style="width:142px;" />
          <input id="dfm-exam-hrs" class="df-input tabular-nums" type="number" min="1" max="200" value="12" required aria-label="Prep hours" style="width:88px;" />
          <button type="submit" class="df-btn-accent">+ Add Exam</button>
        </form>
        <div class="df-stack">
          ${exams.length === 0 ? `<div class="df-empty-box">No upcoming exams tracked yet.</div>` : exams.map((ex) => {
            const cd = computeExamCountdown(ex, today);
            return `
              <div class="df-item-card">
                <div>
                  <strong>${escapeHtml(ex.title)}</strong>
                  <div class="df-muted tabular-nums">
                    ${escapeHtml(ex.date)} · ${cd.isPast ? "Past" : `D-${cd.daysRemaining}`}
                    ${cd.suggestedDailyMinutes > 0 ? ` · ${cd.suggestedDailyMinutes}m/day target` : ""}
                  </div>
                </div>
                <button type="button" class="df-icon-btn" data-dfm-del-exam="${escapeHtml(ex.id)}" aria-label="Delete exam">×</button>
              </div>
            `;
          }).join("")}
        </div>
      `}
    `;
  };

  const getFilteredDiaryNotes = () =>
    (state.localDiary || []).filter((n) => {
      if ((n.folder || "diary") !== diaryFolder) return false;
      if (!diaryQuery) return true;
      const q = diaryQuery.toLowerCase();
      return (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
    });

  const getFilteredGuides = () =>
    [...STARTER_GUIDES, ...(state.libraryResources || [])].filter((r) => {
      if (!libQuery) return true;
      const q = libQuery.toLowerCase();
      return (r.title || "").toLowerCase().includes(q) || (r.category || "").toLowerCase().includes(q);
    });

  const renderDiaryListInnerHtml = (notes) =>
    notes.length === 0
      ? `<div class="df-empty-box">No entries in ${diaryFolder} yet.</div>`
      : notes.map((n) => `
          <article class="df-item-card" style="align-items:flex-start;">
            <div style="min-width:0;flex:1;">
              <strong style="font-size:14px;">${escapeHtml(n.title)}</strong>
              <div class="df-md-inline">${renderSafeMarkdownHtml(n.content)}</div>
              <div class="df-muted" style="font-size:11px;margin-top:4px;">${escapeHtml((n.updatedAt || "").slice(0, 10))}</div>
            </div>
            <div class="df-item-card-acts">
              <button type="button" class="df-btn-subtle" data-dfm-edit-note="${escapeHtml(n.id)}">Edit</button>
              <button type="button" class="df-icon-btn" data-dfm-del-note="${escapeHtml(n.id)}" aria-label="Delete note">×</button>
            </div>
          </article>
        `).join("");

  const renderGuidesListInnerHtml = (guides) =>
    guides.length === 0
      ? `<div class="df-empty-box">No study guides match "${escapeHtml(libQuery)}".</div>`
      : guides.map((g) => {
          const saved = (state.localSavedResources || []).some((s) => s.id === g.id);
          return `
            <div class="df-item-card">
              <div style="min-width:0;">
                <strong>${escapeHtml(g.title)}</strong>
                <div class="df-muted">${escapeHtml(g.category || "Guide")} · ${escapeHtml(g.author || "Community")}</div>
                <p style="margin:4px 0 0;font-size:12.5px;color:#cbd5e1;">${escapeHtml(g.summary)}</p>
              </div>
              <button type="button" class="${saved ? "df-btn-accent" : "df-btn-subtle"}" data-dfm-bookmark="${escapeHtml(g.id)}">
                ${saved ? "Saved" : "Save"}
              </button>
            </div>
          `;
        }).join("");

  const renderKnowledgeModalBody = () => {
    const cards = state.localFlashcards || [];
    const dueCards = getDueFlashcards(cards, Date.now());
    const activeCard = dueCards[0] || null;
    const notes = getFilteredDiaryNotes();
    const guides = getFilteredGuides();
    const signedIn = Boolean(state.user?.id && supabase.configured);

    return `
      <nav class="df-modal-tabs" role="tablist">
        <button type="button" class="df-mtab ${subTab === "notes" ? "is-active" : ""}" data-dfm-tab="notes">Diary &amp; Notes (${(state.localDiary || []).length})</button>
        <button type="button" class="df-mtab ${subTab === "flashcards" ? "is-active" : ""}" data-dfm-tab="flashcards">Flashcards (${dueCards.length} due)</button>
        <button type="button" class="df-mtab ${subTab === "guides" ? "is-active" : ""}" data-dfm-tab="guides">Guides Library (${guides.length})</button>
      </nav>

      ${subTab === "notes" ? `
        <div class="df-sec-head">
          <div style="display:flex;gap:6px;">
            <button type="button" class="df-btn-subtle ${diaryFolder === "diary" ? "is-accent" : ""}" data-dfm-folder="diary">Private Diary</button>
            <button type="button" class="df-btn-subtle ${diaryFolder === "notes" ? "is-accent" : ""}" data-dfm-folder="notes">Study Notes</button>
          </div>
          <div style="display:flex;gap:6px;">
            ${notes.length > 0 ? `<button type="button" class="df-btn-subtle" id="dfm-diary-export">Export .md</button>` : ""}
            <button type="button" class="df-btn-accent" id="dfm-diary-new">${diaryWriteOpen ? "Back to List" : "+ New Page"}</button>
          </div>
        </div>

        ${diaryWriteOpen ? `
          <form id="dfm-diary-form" class="df-stack">
            <div class="df-sec-head">
              <span class="df-muted">Folder: ${diaryFolder === "diary" ? "Private Diary (Owner-Only)" : "Markdown Study Notes"}</span>
              <button type="button" class="df-btn-subtle" id="dfm-diary-toggle-preview">${diaryPreviewMd ? "Edit Text" : "Preview Markdown"}</button>
            </div>
            <input id="dfm-diary-title" class="df-input" type="text" required maxlength="80" value="${escapeHtml(draftTitle)}" placeholder="Page heading..." />
            ${diaryPreviewMd ? `
              <div class="df-md-box">${renderSafeMarkdownHtml(draftContent)}</div>
            ` : `
              <textarea id="dfm-diary-body" class="df-textarea" required placeholder="Write with optional Markdown (# headings, **bold**, \`code\`, - [ ] checklists)...">${escapeHtml(draftContent)}</textarea>
            `}
            <div style="display:flex;gap:8px;">
              <button type="submit" class="df-btn-accent">${diaryEditingId ? "Update Page" : "Save Page"}</button>
              ${diaryEditingId ? `<button type="button" class="df-btn-subtle" id="dfm-diary-cancel">Cancel</button>` : ""}
            </div>
          </form>
        ` : `
          <input id="dfm-diary-search" class="df-input" type="search" value="${escapeHtml(diaryQuery)}" placeholder="Search ${diaryFolder}..." />
          <div class="df-stack" id="dfm-diary-list">
            ${renderDiaryListInnerHtml(notes)}
          </div>
        `}
      ` : subTab === "flashcards" ? `
        <div class="df-stack">
          ${activeCard ? `
            <div class="df-flashcard-box">
              <div class="df-sec-head">
                <span class="df-muted">${escapeHtml(activeCard.deck || "General")}</span>
                <span class="df-muted tabular-nums">${dueCards.length} due · Reps ${activeCard.reps || 0}</span>
              </div>
              <div class="df-fc-front">${escapeHtml(activeCard.front)}</div>
              ${showCardBack ? `
                <div class="df-fc-back">${escapeHtml(activeCard.back)}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button type="button" class="df-btn-subtle" data-dfm-rate="again">Again (10m)</button>
                  <button type="button" class="df-btn-subtle" data-dfm-rate="hard">Hard (1d)</button>
                  <button type="button" class="df-btn-accent" data-dfm-rate="good">Good</button>
                  <button type="button" class="df-btn-subtle" data-dfm-rate="easy">Easy (4d+)</button>
                </div>
              ` : `
                <div><button type="button" class="df-btn-accent" id="dfm-fc-reveal">Show Answer</button></div>
              `}
            </div>
          ` : `
            <div class="df-empty-box">All due flashcards reviewed (${cards.length} in deck).</div>
          `}

          <form id="dfm-fc-form" class="df-stack df-item-card" style="flex-direction:column;align-items:stretch;">
            <strong>+ Add Flashcard</strong>
            <div class="df-inline-form">
              <input id="dfm-fc-deck" class="df-input" type="text" maxlength="40" value="General" required style="flex:1;" />
              <input id="dfm-fc-front" class="df-input" type="text" maxlength="180" placeholder="Question or concept..." required style="flex:2;" />
            </div>
            <textarea id="dfm-fc-back" class="df-textarea" style="min-height:58px;" maxlength="360" placeholder="Recall answer..." required></textarea>
            <button type="submit" class="df-btn-accent" style="align-self:flex-start;">Add Card</button>
          </form>

          ${cards.length > 0 ? `
            <div class="df-stack">
              ${cards.slice(0, 10).map((c) => `
                <div class="df-item-card">
                  <div style="min-width:0;">
                    <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.front)}</strong>
                    <div class="df-muted tabular-nums">${escapeHtml(c.deck)} · Interval ${c.intervalDays || 0}d</div>
                  </div>
                  <button type="button" class="df-icon-btn" data-dfm-del-card="${escapeHtml(c.id)}" aria-label="Delete flashcard">×</button>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>
      ` : `
        <div class="df-stack">
          <input id="dfm-lib-search" class="df-input" type="search" value="${escapeHtml(libQuery)}" placeholder="Search study guides..." />
          <div class="df-stack" id="dfm-lib-list">
            ${renderGuidesListInnerHtml(guides)}
          </div>

          <form id="dfm-lib-publish" class="df-stack df-item-card" style="flex-direction:column;align-items:stretch;">
            <strong>+ Publish Study Guide</strong>
            <div class="df-inline-form">
              <input id="dfm-pub-title" class="df-input" type="text" maxlength="80" placeholder="Guide title..." required style="flex:2;" />
              <select id="dfm-pub-audience" class="df-select" style="width:120px;">
                <option value="private">Private</option>
                <option value="friends">Friends</option>
                <option value="public">Public</option>
              </select>
            </div>
            <textarea id="dfm-pub-summary" class="df-textarea" style="min-height:58px;" maxlength="400" placeholder="Key takeaways..." required></textarea>
            <button type="submit" class="df-btn-accent" ${!signedIn ? "disabled" : ""} style="align-self:flex-start;">
              ${signedIn ? "Publish Guide" : "Sign in via /account to publish"}
            </button>
          </form>
        </div>
      `}
    `;
  };

  const renderInsightsModalBody = () => {
    const today = todayIsoDate();
    const records = state.localStudyRecords || [];
    const focusRecords = records.filter((r) => (r.mode || "focus") === "focus");
    const analytics = computeDeepFocusAnalytics(records, today);
    const streaks = computeStudyStreaks(focusRecords, today);
    const saved = state.localSavedResources || [];

    // Monthly calendar
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDay = new Map();
    for (const r of focusRecords) {
      byDay.set(r.date, (byDay.get(r.date) || 0) + Math.round((r.durationSeconds || 0) / 60));
    }
    const examDates = new Set((state.localExams || []).map((ex) => ex.date));
    const calCells = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      calCells.push(`<div class="df-cal-cell is-pad" aria-hidden="true"></div>`);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const mins = byDay.get(iso) || 0;
      const hasExam = examDates.has(iso);
      calCells.push(`
        <div class="df-cal-cell ${mins > 0 ? "has-study" : ""} ${iso === today ? "is-today" : ""}" title="${iso}: ${mins}m">
          <span class="tabular-nums">${d}</span>
          ${hasExam ? `<span class="df-cal-exam">EX</span>` : mins > 0 ? `<span class="df-cal-mins tabular-nums">${mins}m</span>` : ""}
        </div>
      `);
    }

    const verifiedRecords = focusRecords.filter((r) => !r.isManual);
    const verifiedMins = summarizeFocusMinutes(verifiedRecords).totalMinutes;
    const unlocked = computeUnlockedAchievementIds(records, state.unlockedAchievementIds, today);

    return `
      <nav class="df-modal-tabs" role="tablist">
        <button type="button" class="df-mtab ${subTab === "analytics" ? "is-active" : ""}" data-dfm-tab="analytics">Analytics &amp; Calendar</button>
        <button type="button" class="df-mtab ${subTab === "register" ? "is-active" : ""}" data-dfm-tab="register">Register (${records.length})</button>
        <button type="button" class="df-mtab ${subTab === "milestones" ? "is-active" : ""}" data-dfm-tab="milestones">Milestones (${unlocked.size}/${ACHIEVEMENT_DEFS.length})</button>
        <button type="button" class="df-mtab ${subTab === "archive" ? "is-active" : ""}" data-dfm-tab="archive">Archive &amp; Backup</button>
      </nav>

      ${subTab === "analytics" ? `
        <div class="df-kpi-grid">
          <div class="df-kpi-box">
            <span class="df-kpi-label">Total Focus</span>
            <strong class="df-kpi-val tabular-nums">${formatMinutesLabel(analytics.totalMinutes)}</strong>
          </div>
          <div class="df-kpi-box">
            <span class="df-kpi-label">Sessions</span>
            <strong class="df-kpi-val tabular-nums">${analytics.sessionCount}</strong>
          </div>
          <div class="df-kpi-box">
            <span class="df-kpi-label">Streak (Now / Best)</span>
            <strong class="df-kpi-val tabular-nums is-amber">${streaks.currentStreak}d / ${streaks.longestStreak}d</strong>
          </div>
        </div>

        <div class="df-list-grid-2">
          <section class="df-analytics-panel">
            <h3>28-Day Focus Heatmap</h3>
            <div class="df-heatmap-grid">
              ${analytics.heatmapDays.map((d) => `
                <div class="df-heat-cell level-${d.level}" title="${escapeHtml(d.date)}: ${d.minutes}m"></div>
              `).join("")}
            </div>
          </section>

          <section class="df-analytics-panel">
            <h3>${escapeHtml(now.toLocaleString("en-US", { month: "long", year: "numeric" }))}</h3>
            <div class="df-cal-grid">${calCells.join("")}</div>
          </section>
        </div>

        <section class="df-analytics-panel">
          <h3>Subject Time Allocation</h3>
          ${analytics.subjectAllocation.length === 0
            ? `<p class="df-muted" style="margin:0;font-size:13px;">No focus sessions logged yet.</p>`
            : `<div class="df-subject-bars">
                ${analytics.subjectAllocation.map((row) => `
                  <div class="df-subj-row">
                    <div class="df-subj-head">
                      <span>${escapeHtml(row.subject)}</span>
                      <span class="tabular-nums df-muted">${row.minutes}m · ${row.pct}%</span>
                    </div>
                    <div class="df-subj-track"><div class="df-subj-fill" style="width:${row.pct}%;"></div></div>
                  </div>
                `).join("")}
              </div>`}
        </section>
      ` : subTab === "register" ? `
        <div class="df-sec-head">
          <form id="dfm-manual-rec-form" class="df-inline-form" style="flex:1;">
            <input id="dfm-reg-subj" class="df-input" type="text" required maxlength="60" placeholder="Log manual study subject..." style="flex:2;min-width:160px;" />
            <input id="dfm-reg-mins" class="df-input tabular-nums" type="number" min="1" max="480" value="30" required style="width:82px;" />
            <input id="dfm-reg-date" class="df-input" type="date" value="${today}" required style="width:138px;" />
            <button type="submit" class="df-btn-accent">+ Log</button>
          </form>
          ${records.length > 0 ? `
            <div style="display:flex;gap:6px;">
              <button type="button" class="df-btn-subtle" id="dfm-reg-csv">CSV</button>
              <button type="button" class="df-btn-subtle" id="dfm-reg-md">Markdown</button>
            </div>
          ` : ""}
        </div>
        <div class="df-stack">
          ${records.length === 0 ? `<div class="df-empty-box">No study sessions logged yet.</div>` : records.slice(0, 30).map((r) => `
            <div class="df-item-card">
              <div style="min-width:0;">
                <strong>${escapeHtml(r.subject || "General Study")}</strong>
                <div class="df-muted">
                  ${escapeHtml(r.date || "")} · ${r.isManual ? "Manual" : "Timer"}
                  ${r.focusQuality ? ` · Quality ${r.focusQuality}/5` : ""}
                  ${r.interruptions ? ` · ${r.interruptions} switches` : ""}
                </div>
                ${r.reflection ? `<div class="df-muted" style="margin-top:2px;">“${escapeHtml(r.reflection)}”</div>` : ""}
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <strong class="tabular-nums">${formatDuration(r.durationSeconds || 0)}</strong>
              </div>
            </div>
          `).join("")}
        </div>
      ` : subTab === "milestones" ? `
        <div class="df-stack">
          <div class="df-item-card" style="flex-direction:column;align-items:stretch;">
            <div class="df-sec-head">
              <strong>Focus Passport</strong>
              <span class="tabular-nums df-muted">${formatMinutesLabel(verifiedMins)} verified · ${unlocked.size}/${ACHIEVEMENT_DEFS.length} milestones</span>
            </div>
            <div class="df-subj-track"><div class="df-subj-fill" style="width:${Math.round((unlocked.size / ACHIEVEMENT_DEFS.length) * 100)}%;"></div></div>
          </div>
          <div class="df-list-grid-2">
            ${ACHIEVEMENT_DEFS.map((m) => {
              const isDone = unlocked.has(m.id);
              return `
                <div class="df-item-card ${isDone ? "is-active" : ""}">
                  <div>
                    <strong>${escapeHtml(m.title)}</strong>
                    <div class="df-muted">${escapeHtml(m.rule)} · ${isDone ? "Completed" : "Locked"}</div>
                  </div>
                  <span class="tabular-nums ${isDone ? "is-accent-text" : "df-muted"}">${isDone ? "✓" : "—"}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      ` : `
        <div class="df-stack">
          <div class="df-item-card">
            <div>
              <strong>Saved Study Guides (${saved.length})</strong>
              <div class="df-muted">Bookmarked items from the Knowledge Library</div>
            </div>
          </div>
          ${saved.length > 0 ? `
            <div class="df-stack">
              ${saved.map((s) => `
                <div class="df-item-card">
                  <div>
                    <strong>${escapeHtml(s.title)}</strong>
                    <div class="df-muted">${escapeHtml(s.category || "Saved")}</div>
                  </div>
                  <button type="button" class="df-icon-btn" data-dfm-rm-saved="${escapeHtml(s.id)}" aria-label="Remove saved guide">×</button>
                </div>
              `).join("")}
            </div>
          ` : ""}

          <div class="df-list-grid-2">
            <div class="df-item-card" style="flex-direction:column;align-items:flex-start;">
              <strong>Export Full Backup (.json)</strong>
              <span class="df-muted">Tasks, notes, records, flashcards, goals, exams, budgets &amp; preferences.</span>
              <button type="button" class="df-btn-accent" id="dfm-export-json">Download Backup</button>
            </div>
            <div class="df-item-card" style="flex-direction:column;align-items:flex-start;">
              <strong>Restore Backup (.json)</strong>
              <span class="df-muted">Import a previously exported SPRK Desk JSON archive.</span>
              <input id="dfm-restore-json" class="df-input" type="file" accept=".json,application/json" />
            </div>
          </div>
        </div>
      `}
    `;
  };

  const renderCommunityModalBody = () => {
    const signedIn = Boolean(state.user?.id && supabase.configured);
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
    const presenceSnap = presenceService.getSnapshot(Date.now());
    const friendEntries = presenceSnap.entries || [];
    const incoming = state.friendRequests?.incoming || [];

    return `
      <nav class="df-modal-tabs" role="tablist">
        <button type="button" class="df-mtab ${subTab === "halls" ? "is-active" : ""}" data-dfm-tab="halls">Silent Halls</button>
        <button type="button" class="df-mtab ${subTab === "friends" ? "is-active" : ""}" data-dfm-tab="friends">Friends (${friendEntries.length})${incoming.length ? ` · +${incoming.length}` : ""}</button>
        <button type="button" class="df-mtab ${subTab === "rooms" ? "is-active" : ""}" data-dfm-tab="rooms">Rooms &amp; Groups</button>
      </nav>

      ${subTab === "halls" ? `
        <div class="df-stack">
          ${activeHall && syncState ? `
            <div class="df-item-card is-active" style="flex-direction:column;align-items:stretch;">
              <div class="df-sec-head">
                <div>
                  <strong>${escapeHtml(activeHall.name)}</strong>
                  <div class="df-muted">Silent UTC Synchronized Hall · Cycle ${syncState.cycleNumber}</div>
                </div>
                <button type="button" class="df-btn-subtle" id="dfm-hall-leave">Leave Hall</button>
              </div>
              <div class="df-inline-form">
                <div>
                  <div class="df-muted" id="dfm-hall-phase" style="font-size:11px;text-transform:uppercase;">${syncState.phase === "focus" ? "Synchronized Focus" : "Synchronized Break"}</div>
                  <div class="tabular-nums" id="dfm-hall-cd" style="font:700 28px/1.1 'JetBrains Mono', monospace;">${formatDuration(syncState.remainingSeconds)}</div>
                </div>
                <input id="dfm-hall-tag" class="df-input" type="text" maxlength="44" value="${escapeHtml(state.bodyDoublingRoom?.subject || "Deep Reading")}" placeholder="Your quiet desk tag..." style="flex:1;" />
              </div>
              <div class="df-stack">
                <div class="df-sec-head">
                  <strong>You (${escapeHtml(state.user?.displayName || state.localProfile?.displayName || "Student")})</strong>
                  <span class="df-muted">${escapeHtml(state.bodyDoublingRoom?.subject || "Deep Reading")}</span>
                </div>
                ${(activeHall.peers || []).map((peer) => `
                  <div class="df-sec-head">
                    <span>${escapeHtml(peer.desk)}</span>
                    <span class="df-muted">${escapeHtml(peer.subject)} · ${syncState.phase === "focus" ? "Studying" : "Resting"}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : `<div class="df-empty-box">Join a silent synchronized Pomodoro hall below. Zero chat noise, pure quiet accountability.</div>`}

          <div class="df-list-grid-3">
            ${BODY_DOUBLING_HALLS.map((hall) => {
              const ph = computeSyncedRoomPhase({
                cycleStartMs: hall.epochMs,
                focusMinutes: hall.focusMinutes,
                breakMinutes: hall.breakMinutes,
                nowMs: Date.now()
              });
              const joined = activeHall?.id === hall.id;
              return `
                <div class="df-item-card" style="flex-direction:column;align-items:stretch;">
                  <strong>${escapeHtml(hall.name)}</strong>
                  <span class="df-muted tabular-nums">${ph.phase === "focus" ? "Focus" : "Break"} · ${formatDuration(ph.remainingSeconds)} left</span>
                  <button type="button" class="${joined ? "df-btn-accent" : "df-btn-subtle"}" data-dfm-join-hall="${escapeHtml(hall.id)}">
                    ${joined ? "Active" : "Join Silently"}
                  </button>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      ` : subTab === "friends" ? `
        <div class="df-stack">
          <div class="df-sec-head">
            <span class="df-muted">Manage full feed, groups &amp; profile on /account</span>
            <button type="button" class="df-btn-subtle" id="dfm-open-account-page">Open Social Hub →</button>
          </div>

          ${!signedIn ? `
            <div class="df-empty-box">
              <p style="margin:0 0 8px;">Sign in to view student profiles, send friend requests, and visit rooms shared with you.</p>
              <button type="button" class="df-btn-accent" id="dfm-friends-signin">Go to Account Sign In</button>
            </div>
          ` : `
            <form id="dfm-friend-search-form" class="df-inline-form">
              <input id="dfm-friend-query" class="df-input" type="text" required placeholder="Search name, @username, course, or SPRK-ID" style="flex:1;" />
              <button type="submit" class="df-btn-accent">Search</button>
              <button type="button" class="df-btn-subtle" id="dfm-friends-refresh">↻</button>
            </form>

            ${inspectedFriend ? (() => {
              const tp = inspectedFriend.profile || inspectedFriend;
              const tid = tp.id;
              const rel = getRelationshipStatus({
                viewerId: state.user.id,
                targetId: tid,
                friends: state.friends,
                incoming: state.friendRequests?.incoming,
                outgoing: state.friendRequests?.outgoing
              });
              const access = inspectedFriend.roomAccess || canUserVisitRoom({
                targetUserId: tid,
                viewerUserId: state.user.id,
                privacy: tp.privacy,
                isFriend: rel.status === "friends"
              });
              return `
                <div class="df-item-card is-active" style="flex-direction:column;align-items:stretch;">
                  <div class="df-sec-head">
                    <div>
                      <strong>${escapeHtml(tp.displayName)}</strong>
                      <div class="df-muted">
                        ${tp.username ? `@${escapeHtml(tp.username)} · ` : ""}${escapeHtml(tp.publicId || "")}
                        ${tp.courseClass ? ` · ${escapeHtml(tp.courseClass)}` : ""}
                      </div>
                    </div>
                    <div class="df-item-card-acts">
                      ${rel.status === "friends"
                        ? `<button type="button" class="df-btn-subtle" data-dfm-unfriend="${escapeHtml(tid)}">Unfriend</button>`
                        : rel.status === "outgoing"
                          ? `<button type="button" class="df-btn-subtle" data-dfm-cancel-req="${escapeHtml(rel.requestId)}">Cancel Req</button>`
                          : rel.status === "incoming"
                            ? `<button type="button" class="df-btn-accent" data-dfm-req-acc="${escapeHtml(rel.requestId)}">Accept</button>`
                            : rel.status === "none"
                              ? `<button type="button" class="df-btn-accent" data-dfm-add-friend="${escapeHtml(tid)}">+ Add Friend</button>`
                              : ""}
                      ${access.allowed ? `<button type="button" class="df-btn-accent" data-dfm-visit-room="${escapeHtml(tid)}">Visit Room</button>` : ""}
                      <button type="button" class="df-icon-btn" id="dfm-close-inspect">×</button>
                    </div>
                  </div>
                  ${tp.bio ? `<p style="margin:0;font-size:12.5px;color:#cbd5e1;">${escapeHtml(tp.bio)}</p>` : ""}
                  <div class="df-muted">
                    ${tp.examAim ? `Aim: ${escapeHtml(tp.examAim)} · ` : ""}
                    Room: ${access.visibility === "public" ? "Public" : access.visibility === "private" ? "Private" : "Friends Only"}
                  </div>
                  ${!access.allowed ? `<div class="df-muted" style="color:#fbbf24;">🔒 ${escapeHtml(access.reason)}</div>` : ""}
                </div>
              `;
            })() : ""}

            ${friendSearchResults !== null ? `
              <div class="df-stack">
                ${friendSearchResults.length === 0 ? `<div class="df-muted">No matching students found.</div>` : friendSearchResults.map((p) => {
                  const rel = getRelationshipStatus({
                    viewerId: state.user.id,
                    targetId: p.id,
                    friends: state.friends,
                    incoming: state.friendRequests?.incoming,
                    outgoing: state.friendRequests?.outgoing
                  });
                  return `
                    <div class="df-item-card">
                      <div>
                        <strong>${escapeHtml(p.display_name || "Student")}</strong>
                        <div class="df-muted">${escapeHtml(p.public_id || "")}${p.course_class ? ` · ${escapeHtml(p.course_class)}` : ""}</div>
                      </div>
                      <div class="df-item-card-acts">
                        <button type="button" class="df-btn-subtle" data-dfm-inspect-friend="${escapeHtml(p.id)}">Profile</button>
                        ${rel.status === "none"
                          ? `<button type="button" class="df-btn-accent" data-dfm-add-friend="${escapeHtml(p.id)}">+ Add</button>`
                          : `<span class="df-muted">${rel.status === "friends" ? "Friend" : "Pending"}</span>`}
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            ` : ""}

            ${incoming.length > 0 ? `
              <div class="df-stack">
                ${incoming.map((req) => `
                  <div class="df-item-card">
                    <div>
                      <strong>Friend Request · ${escapeHtml(req.profile?.display_name || "Student")}</strong>
                      <div class="df-muted">${escapeHtml(req.profile?.public_id || "")}</div>
                    </div>
                    <div class="df-item-card-acts">
                      <button type="button" class="df-btn-subtle" data-dfm-inspect-friend="${escapeHtml(req.senderId)}">Profile</button>
                      <button type="button" class="df-btn-accent" data-dfm-req-acc="${escapeHtml(req.id)}">Accept</button>
                      <button type="button" class="df-btn-subtle" data-dfm-req-dec="${escapeHtml(req.id)}">Decline</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            ` : ""}

            ${(state.friendRequests?.outgoing || []).length > 0 ? `
              <div class="df-stack">
                ${(state.friendRequests?.outgoing || []).map((req) => `
                  <div class="df-item-card">
                    <div>
                      <strong>Sent Request · ${escapeHtml(req.profile?.display_name || "Student")}</strong>
                      <div class="df-muted">${escapeHtml(req.profile?.public_id || "")}</div>
                    </div>
                    <button type="button" class="df-btn-subtle" data-dfm-cancel-req="${escapeHtml(req.id)}">Cancel</button>
                  </div>
                `).join("")}
              </div>
            ` : ""}

            <div class="df-stack">
              ${friendEntries.length === 0 ? `<div class="df-empty-box">No friends connected yet.</div>` : friendEntries.map((f) => {
                const access = canUserVisitRoom({
                  targetUserId: f.id,
                  viewerUserId: state.user.id,
                  privacy: f.privacy,
                  isFriend: true
                });
                return `
                  <div class="df-item-card">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                      <span class="df-live-indicator ${f.status === "studying" ? "is-live" : ""}"></span>
                      <div style="min-width:0;">
                        <strong>${escapeHtml(f.displayName)}</strong>
                        <div class="df-muted">${f.status === "studying" ? `Studying ${escapeHtml(f.subject || "Focus")}` : f.status === "online" ? "Online" : "Offline"} · ${escapeHtml(f.publicId)}</div>
                      </div>
                    </div>
                    <div class="df-item-card-acts">
                      <button type="button" class="df-btn-subtle" data-dfm-inspect-friend="${escapeHtml(f.id)}">Profile</button>
                      ${access.allowed
                        ? `<button type="button" class="df-btn-accent" data-dfm-visit-room="${escapeHtml(f.id)}">Visit</button>`
                        : `<span class="df-muted">Private</span>`}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          `}
        </div>
      ` : `
        <div class="df-stack">
          ${signedIn && openGroupId && state.activeGroupWorkspace?.group?.id === openGroupId ? (() => {
            const ws = state.activeGroupWorkspace;
            const grp = ws.group;
            return `
              <div class="df-item-card is-active" style="flex-direction:column;align-items:stretch;">
                <div class="df-sec-head">
                  <button type="button" class="df-btn-subtle" id="dfm-grp-back">← All Groups</button>
                  <span class="df-muted tabular-nums">Code: ${escapeHtml(grp.invite_code || "")}</span>
                </div>
                <strong>${escapeHtml(grp.name)}</strong>
                <div class="df-muted">${escapeHtml(grp.subject || "General")} · ${ws.members.length} members</div>
                ${grp.pinned_announcement ? `<div class="df-notice">${escapeHtml(grp.pinned_announcement)}</div>` : ""}
                ${ws.myRole ? `
                  <div class="df-stack" style="max-height:190px;overflow-y:auto;">
                    ${ws.messages.length === 0 ? `<div class="df-muted">No messages yet.</div>` : ws.messages.map((m) => `
                      <div style="font-size:12.5px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
                        <strong>${escapeHtml(m.author?.displayName || "Student")}:</strong> ${escapeHtml(m.content || "")}
                      </div>
                    `).join("")}
                  </div>
                  <form id="dfm-grp-msg-form" class="df-inline-form">
                    <input id="dfm-grp-msg-input" class="df-input" type="text" required maxlength="600" placeholder="Write to group..." style="flex:1;" />
                    <button type="submit" class="df-btn-accent">Send</button>
                  </form>
                ` : `
                  <button type="button" class="df-btn-accent" data-dfm-join-grp="${escapeHtml(grp.id)}">Join Group</button>
                `}
              </div>
            `;
          })() : `
            <div class="df-sec-head">
              <h3>Study Groups (${(state.studyGroups || []).length})</h3>
              <button type="button" class="df-btn-subtle" id="dfm-refresh-groups" ${!signedIn ? "disabled" : ""}>↻ Refresh</button>
            </div>
            ${signedIn ? `
              <form id="dfm-join-code-form" class="df-inline-form">
                <input id="dfm-join-code" class="df-input" type="text" required maxlength="16" placeholder="Join group via invite code..." style="flex:1;" />
                <button type="submit" class="df-btn-accent">Join by Code</button>
              </form>
            ` : ""}
            ${(state.studyGroups || []).length === 0
              ? `<div class="df-empty-box">${signedIn ? "No study groups yet. Create one below!" : "Sign in via /account to join study groups."}</div>`
              : `<div class="df-stack">
                  ${state.studyGroups.map((g) => {
                    const role = (state.groupMemberships || {})[g.id];
                    return `
                      <div class="df-item-card">
                        <div>
                          <strong>${escapeHtml(g.name)}</strong>
                          <div class="df-muted">${escapeHtml(g.subject || "Study")} · ${g.member_count || 1} members · ${g.is_private ? "Private" : "Public"}</div>
                        </div>
                        <div class="df-item-card-acts">
                          <button type="button" class="df-btn-subtle" data-dfm-open-grp="${escapeHtml(g.id)}">Open</button>
                          ${role
                            ? `<button type="button" class="df-btn-subtle" data-dfm-leave-grp="${escapeHtml(g.id)}">Leave</button>`
                            : `<button type="button" class="df-btn-accent" data-dfm-join-grp="${escapeHtml(g.id)}">Join</button>`}
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>`}

            <form id="dfm-create-group-form" class="df-stack df-item-card" style="flex-direction:column;align-items:stretch;">
              <strong>+ Create Study Group</strong>
              <div class="df-inline-form">
                <input id="dfm-grp-name" class="df-input" type="text" required maxlength="50" placeholder="Morning Calculus Club" style="flex:1;" />
                <input id="dfm-grp-subj" class="df-input" type="text" required maxlength="40" value="Mathematics" style="flex:1;" />
              </div>
              <textarea id="dfm-grp-desc" class="df-textarea" style="min-height:52px;" maxlength="240" placeholder="Group focus cadence..."></textarea>
              <div class="df-sec-head">
                <label class="df-check-row"><input id="dfm-grp-priv" type="checkbox" /><span>Private group</span></label>
                <button type="submit" class="df-btn-accent" ${!signedIn ? "disabled" : ""}>Create Group</button>
              </div>
            </form>
          `}
        </div>
      `}
    `;
  };

  const renderCatalogModalBody = () => {
    const allowedCats = new Set(["particles", "music", "theme", "ambience"]);
    const dfItems = SHOP_CATALOG.filter((i) => allowedCats.has(i.category));
    const filtered = catalogCat === "all" ? dfItems : dfItems.filter((i) => i.category === catalogCat);
    const locked = isStrictFocusLockActive();
    const seriousMode = Boolean(state.preferences?.seriousMode);
    const signedIn = Boolean(state.user?.id);

    return `
      <div class="df-sec-head">
        <nav class="df-modal-tabs" role="tablist">
          ${[
            ["all", `All (${dfItems.length})`],
            ["particles", "Particles"],
            ["music", "Music Discs"],
            ["theme", "Themes"],
            ["ambience", "Ambience"]
          ].map(([id, label]) => `
            <button type="button" class="df-mtab ${catalogCat === id ? "is-active" : ""}" data-dfm-cat="${id}">${label}</button>
          `).join("")}
        </nav>
        <span class="tabular-nums df-muted">${signedIn ? `${state.wallet.balance} SC` : "Sign in to buy"}</span>
      </div>

      ${locked ? `<div class="df-notice">Strict Focus Lock is active while the focus timer runs. Pause or finish to equip or buy items.</div>` : ""}

      <div class="df-list-grid-2">
        ${filtered.map((item) => {
          const actuallyOwned = (state.ownedItemIds || []).includes(item.id);
          const freeViaSerious = Boolean(
            seriousMode && item.category === "theme" && isThemeFreeInMode(item.themeId, seriousMode) && !actuallyOwned && item.price > 0
          );
          const owned = item.category === "theme"
            ? isThemeAccessibleInMode(item.themeId, { ownedItemIds: state.ownedItemIds, seriousMode })
            : actuallyOwned;
          const equipped = isShopItemEquipped(item);
          return `
            <article class="df-item-card">
              <div class="df-item-card-info">
                <span class="df-disc-dot" style="background:${escapeHtml(item.swatch)};"></span>
                <div style="min-width:0;">
                  <strong>${escapeHtml(item.name)}</strong>
                  <div class="df-muted tabular-nums">${escapeHtml(item.category)} · ${freeViaSerious ? "Free" : item.price === 0 ? "Starter" : `${item.price} SC`}</div>
                </div>
              </div>
              <div class="df-item-card-acts">
                ${owned
                  ? `<button type="button" class="${equipped ? "df-btn-subtle" : "df-btn-accent"}" data-dfm-equip="${escapeHtml(item.id)}" ${equipped || locked ? "disabled" : ""}>${equipped ? "Equipped" : "Equip"}</button>`
                  : `<button type="button" class="df-btn-accent" data-dfm-buy-item="${escapeHtml(item.id)}" ${!signedIn || locked ? "disabled" : ""}>Buy · ${item.price} SC</button>`}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  };

  const renderBreakModalBody = () => {
    const cycles = Number(state.preferences?.pomodoroCyclesCompleted || 0);
    return `
      <div class="df-stack">
        <div class="df-item-card" style="flex-direction:column;align-items:stretch;">
          <div class="df-sec-head">
            <div>
              <strong>20-20-20 Eye &amp; Breath Rest</strong>
              <div class="df-muted">Look 20 feet away for 20 seconds to reset visual fatigue.</div>
            </div>
            <strong class="tabular-nums" id="dfm-eyerest-val" style="font:700 24px/1 'JetBrains Mono', monospace;color:var(--df-accent);">
              ${eyeRestCountdown > 0 ? `${eyeRestCountdown}s` : "Ready"}
            </strong>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="df-btn-accent" id="dfm-eyerest-start">
              ${eyeRestCountdown > 0 ? "Restart 20s" : "Start 20s Eye Rest"}
            </button>
            <button type="button" class="df-btn-subtle" id="dfm-chime-sip">Play Gentle Chime</button>
          </div>
        </div>

        <div class="df-item-card" style="flex-direction:column;align-items:stretch;">
          <div class="df-sec-head">
            <div>
              <strong>Scheduled Recovery Block</strong>
              <div class="df-muted tabular-nums">${cycles} focus block(s) completed</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="df-btn-subtle" id="dfm-break-5" ${state.activeSession ? "disabled" : ""}>Start 5m Short Break</button>
            <button type="button" class="df-btn-subtle" id="dfm-break-15" ${state.activeSession ? "disabled" : ""}>Start 15m Long Break</button>
          </div>
        </div>
      </div>
    `;
  };

  const renderModalHtml = () => {
    if (!activeModal) return "";
    const titles = {
      music: "Music & Soundscape Studio",
      plan: "Plan & Execute",
      knowledge: "Knowledge & Notes",
      insights: "Insights & Archive",
      community: "Silent Halls & Friends",
      catalog: "Deep Focus Catalog",
      break: "Recovery & Eye Rest"
    };
    let bodyHtml = "";
    if (activeModal === "music") bodyHtml = renderMusicModalBody();
    else if (activeModal === "plan") bodyHtml = renderPlanModalBody();
    else if (activeModal === "knowledge") bodyHtml = renderKnowledgeModalBody();
    else if (activeModal === "insights") bodyHtml = renderInsightsModalBody();
    else if (activeModal === "community") bodyHtml = renderCommunityModalBody();
    else if (activeModal === "catalog") bodyHtml = renderCatalogModalBody();
    else if (activeModal === "break") bodyHtml = renderBreakModalBody();

    const wideClass = activeModal === "plan" || activeModal === "insights" || activeModal === "music" ? "is-wide" : "";

    return `
      <div class="df-modal-backdrop" id="dfm-backdrop" role="dialog" aria-modal="true" aria-labelledby="dfm-title">
        <div class="df-modal-card ${wideClass}">
          <header class="df-modal-head">
            <h2 id="dfm-title">${escapeHtml(titles[activeModal] || "Workspace")}</h2>
            <button type="button" class="df-icon-btn" id="dfm-close" aria-label="Close dialog">×</button>
          </header>
          ${statusMsg ? `<div class="df-notice" role="status">${escapeHtml(statusMsg)}</div>` : ""}
          <div class="df-modal-body">${bodyHtml}</div>
        </div>
      </div>
    `;
  };

  const bindModalEvents = () => {
    if (!activeModal) return;
    const backdrop = shellEl.querySelector("#dfm-backdrop");
    if (!backdrop) return;

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector("#dfm-close")?.addEventListener("click", close);

    backdrop.querySelectorAll("[data-dfm-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        subTab = btn.dataset.dfmTab;
        statusMsg = "";
        onWorkspaceMutated?.();
      });
    });

    // Music Studio Events
    if (activeModal === "music") {
      visInterval = window.setInterval(() => {
        const barsWrap = shellEl.querySelector("#dfm-vis-bars");
        if (!barsWrap) return;
        visTick += 1;
        const levels = computeVisualizerBars({
          isPlaying: audioManager.isPlaying,
          levels: audioManager.levels,
          analyserBins: audioManager.getAnalyserBins(),
          barCount: 18,
          tick: visTick
        });
        barsWrap.querySelectorAll(".df-vis-bar").forEach((bar, i) => {
          bar.style.height = `${Math.round((levels[i] || 0.14) * 100)}%`;
        });
      }, 90);

      backdrop.querySelector("#dfm-audio-toggle")?.addEventListener("click", async () => {
        if (previewSnapshot && audioManager.isPlaying) {
          restoreAudioPreview();
          onWorkspaceMutated?.();
          return;
        }
        await audioManager.togglePlay();
        onWorkspaceMutated?.();
      });

      backdrop.querySelector("#dfm-master-vol")?.addEventListener("input", (e) => {
        audioManager.setMasterVolume(Number(e.target.value) / 100);
      });

      backdrop.querySelector("#dfm-lowpass-slider")?.addEventListener("input", (e) => {
        const hz = Number(e.target.value);
        audioManager.setLowPassFilter(hz);
        savePreferences({ lowPassHz: hz });
        const lbl = backdrop.querySelector("#dfm-lowpass-val");
        if (lbl) lbl.textContent = hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${hz} Hz`;
      });

      backdrop.querySelectorAll("[data-dfm-disc]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { ownedDiscs } = partitionMusicDiscs({
            builtinDiscs: BUILTIN_DISCS,
            catalogItems: SHOP_CATALOG,
            ownedItemIds: state.ownedItemIds || []
          });
          const disc = ownedDiscs.find((d) => d.id === btn.dataset.dfmDisc);
          if (!disc) return;
          previewSnapshot = null;
          previewingDiscId = null;
          for (const ch of AUDIO_CHANNELS) {
            audioManager.setChannelLevel(ch.id, disc.mix?.[ch.id] || 0);
          }
          savePreferences({ activeMusicId: disc.id });
          if (!audioManager.isPlaying) await audioManager.togglePlay(true).catch(() => {});
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-preview]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.dfmPreview;
          if (previewingDiscId === id) {
            restoreAudioPreview();
            onWorkspaceMutated?.();
            return;
          }
          const { purchasableDiscs } = partitionMusicDiscs({
            builtinDiscs: BUILTIN_DISCS,
            catalogItems: SHOP_CATALOG,
            ownedItemIds: state.ownedItemIds || []
          });
          const disc = purchasableDiscs.find((d) => d.id === id);
          if (!disc) return;
          if (!previewSnapshot) {
            previewSnapshot = { wasPlaying: audioManager.isPlaying, levels: { ...audioManager.levels } };
          }
          for (const ch of AUDIO_CHANNELS) {
            audioManager.setChannelLevel(ch.id, Number(disc.mix?.[ch.id] || 0));
          }
          previewingDiscId = disc.id;
          await audioManager.togglePlay(true).catch(() => {});
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-buy-disc]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.dfmBuyDisc;
          const res = await purchaseShopItem(id);
          if (!res.ok) {
            statusMsg = res.error || "Purchase failed.";
            onWorkspaceMutated?.();
            return;
          }
          const item = SHOP_CATALOG.find((i) => i.id === id);
          if (item) equipShopItem(item);
          statusMsg = `Unlocked "${item?.name || "Disc"}" and loaded onto player.`;
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-channel]").forEach((slider) => {
        slider.addEventListener("input", (e) => {
          const id = e.target.dataset.dfmChannel;
          const val = Number(e.target.value);
          audioManager.setChannelLevel(id, val / 100);
          const lbl = backdrop.querySelector(`#dfm-ch-val-${id}`);
          if (lbl) lbl.textContent = `${val}%`;
        });
      });

      backdrop.querySelector("#dfm-save-preset")?.addEventListener("click", () => {
        const presets = state.localAudioPresets || {};
        let idx = 1;
        while (Object.prototype.hasOwnProperty.call(presets, `Mix ${idx}`)) idx += 1;
        const mixName = `Mix ${idx}`;
        persistLocalCollection("localAudioPresets", { ...presets, [mixName]: { ...audioManager.levels } });
        statusMsg = `Saved ${mixName}.`;
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-load-preset]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const mix = (state.localAudioPresets || {})[btn.dataset.dfmLoadPreset];
          if (!mix) return;
          for (const ch of AUDIO_CHANNELS) {
            audioManager.setChannelLevel(ch.id, mix[ch.id] || 0);
          }
          if (!audioManager.isPlaying) await audioManager.togglePlay(true).catch(() => {});
          statusMsg = `Loaded "${btn.dataset.dfmLoadPreset}".`;
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-del-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const next = { ...(state.localAudioPresets || {}) };
          delete next[btn.dataset.dfmDelPreset];
          persistLocalCollection("localAudioPresets", next);
          onWorkspaceMutated?.();
        });
      });
    }

    // Plan Modal Events (Draggable Kanban + Goals + Budgets + Exams)
    if (activeModal === "plan") {
      backdrop.querySelector("#dfm-task-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = backdrop.querySelector("#dfm-task-title")?.value.trim();
        if (!title) return;
        const newTask = {
          id: generateId("task"),
          title,
          subject: backdrop.querySelector("#dfm-task-subject")?.value.trim() || "General",
          priority: backdrop.querySelector("#dfm-task-priority")?.value || "medium",
          dueDate: backdrop.querySelector("#dfm-task-due")?.value || "",
          completed: false,
          kanbanStatus: "todo",
          noteColor: "butter"
        };
        persistLocalCollection("localTasks", [newTask, ...(state.localTasks || [])]);
        await syncTaskUpsert(newTask);
        onWorkspaceMutated?.();
      });

      // Drag and drop for Kanban cards and columns
      let draggedTaskId = null;
      backdrop.querySelectorAll(".df-kcard[draggable='true']").forEach((card) => {
        card.addEventListener("dragstart", (e) => {
          draggedTaskId = card.dataset.taskId;
          card.classList.add("is-dragging");
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", draggedTaskId);
          }
        });
        card.addEventListener("dragend", () => {
          draggedTaskId = null;
          card.classList.remove("is-dragging");
          backdrop.querySelectorAll(".df-kcol").forEach((col) => col.classList.remove("is-drop-target"));
        });
      });

      backdrop.querySelectorAll(".df-kcol[data-kanban-col]").forEach((col) => {
        col.addEventListener("dragover", (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
          col.classList.add("is-drop-target");
        });
        col.addEventListener("dragleave", (e) => {
          if (!col.contains(e.relatedTarget)) {
            col.classList.remove("is-drop-target");
          }
        });
        col.addEventListener("drop", async (e) => {
          e.preventDefault();
          col.classList.remove("is-drop-target");
          const taskId = e.dataTransfer?.getData("text/plain") || draggedTaskId;
          const targetCol = col.dataset.kanbanCol;
          if (!taskId || !targetCol) return;
          const result = moveTaskToKanbanColumn(state.localTasks || [], taskId, targetCol);
          if (result.changed) {
            persistLocalCollection("localTasks", result.tasks);
            if (result.updatedTask) await syncTaskUpsert(result.updatedTask);
            onWorkspaceMutated?.();
          }
        });
      });

      backdrop.querySelectorAll("[data-dfm-focus-task]").forEach((btn) => {
        btn.addEventListener("click", () => {
          onSelectFocusTask?.(btn.dataset.dfmFocusTask);
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-del-task]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.dfmDelTask;
          persistLocalCollection("localTasks", (state.localTasks || []).filter((t) => t.id !== id));
          await syncTaskDelete(id);
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-goal-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = backdrop.querySelector("#dfm-goal-title")?.value.trim();
        const targetMinutes = Math.max(10, Number(backdrop.querySelector("#dfm-goal-mins")?.value) || 90);
        if (!title) return;
        const next = [{ id: generateId("goal"), title, scope: "daily", targetMinutes, subject: "All Subjects" }, ...(state.localGoals || [])];
        persistLocalCollection("localGoals", next);
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-del-goal]").forEach((btn) => {
        btn.addEventListener("click", () => {
          persistLocalCollection("localGoals", (state.localGoals || []).filter((g) => g.id !== btn.dataset.dfmDelGoal));
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-budget-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const subject = backdrop.querySelector("#dfm-budget-subj")?.value.trim();
        const targetHoursPerWeek = Number(backdrop.querySelector("#dfm-budget-hrs")?.value) || 5;
        if (!subject) return;
        const prev = state.localSubjectBudgets || [];
        const next = [
          { id: generateId("budget"), subject, targetHoursPerWeek },
          ...prev.filter((b) => b.subject.toLowerCase() !== subject.toLowerCase())
        ];
        persistLocalCollection("localSubjectBudgets", next);
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-del-budget]").forEach((btn) => {
        btn.addEventListener("click", () => {
          persistLocalCollection("localSubjectBudgets", (state.localSubjectBudgets || []).filter((b) => b.id !== btn.dataset.dfmDelBudget));
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-exam-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = backdrop.querySelector("#dfm-exam-title")?.value.trim();
        const date = backdrop.querySelector("#dfm-exam-date")?.value;
        const targetPrepHours = Number(backdrop.querySelector("#dfm-exam-hrs")?.value) || 10;
        if (!title || !date) return;
        const next = [{ id: generateId("exam"), title, date, targetPrepHours }, ...(state.localExams || [])]
          .sort((a, b) => a.date.localeCompare(b.date));
        persistLocalCollection("localExams", next);
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-del-exam]").forEach((btn) => {
        btn.addEventListener("click", () => {
          persistLocalCollection("localExams", (state.localExams || []).filter((ex) => ex.id !== btn.dataset.dfmDelExam));
          onWorkspaceMutated?.();
        });
      });
    }

    // Knowledge Modal Events
    if (activeModal === "knowledge") {
      backdrop.querySelectorAll("[data-dfm-folder]").forEach((btn) => {
        btn.addEventListener("click", () => {
          diaryFolder = btn.dataset.dfmFolder;
          diaryWriteOpen = false;
          diaryEditingId = null;
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-diary-new")?.addEventListener("click", () => {
        diaryWriteOpen = !diaryWriteOpen;
        diaryEditingId = null;
        draftTitle = "";
        draftContent = "";
        diaryPreviewMd = false;
        onWorkspaceMutated?.();
      });

      backdrop.querySelector("#dfm-diary-title")?.addEventListener("input", (e) => {
        draftTitle = e.target.value;
      });
      backdrop.querySelector("#dfm-diary-body")?.addEventListener("input", (e) => {
        draftContent = e.target.value;
      });
      backdrop.querySelector("#dfm-diary-toggle-preview")?.addEventListener("click", () => {
        diaryPreviewMd = !diaryPreviewMd;
        onWorkspaceMutated?.();
      });
      backdrop.querySelector("#dfm-diary-cancel")?.addEventListener("click", () => {
        diaryWriteOpen = false;
        diaryEditingId = null;
        draftTitle = "";
        draftContent = "";
        onWorkspaceMutated?.();
      });
      const bindDiaryListEvents = () => {
        backdrop.querySelectorAll("[data-dfm-edit-note]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const note = (state.localDiary || []).find((n) => n.id === btn.dataset.dfmEditNote);
            if (!note) return;
            diaryEditingId = note.id;
            draftTitle = note.title || "";
            draftContent = note.content || "";
            diaryWriteOpen = true;
            diaryPreviewMd = false;
            onWorkspaceMutated?.();
          });
        });

        backdrop.querySelectorAll("[data-dfm-del-note]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.dfmDelNote;
            persistLocalCollection("localDiary", (state.localDiary || []).filter((n) => n.id !== id));
            syncNoteDelete(id);
            onWorkspaceMutated?.();
          });
        });
      };

      const bindGuidesListEvents = () => {
        backdrop.querySelectorAll("[data-dfm-bookmark]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.dfmBookmark;
            const saved = state.localSavedResources || [];
            if (saved.some((s) => s.id === id)) {
              persistLocalCollection("localSavedResources", saved.filter((s) => s.id !== id));
              syncSavedResourceDelete(id);
            } else {
              const found = [...STARTER_GUIDES, ...(state.libraryResources || [])].find((g) => g.id === id);
              if (found) {
                persistLocalCollection("localSavedResources", [found, ...saved]);
                syncSavedResourceUpsert(found);
              }
            }
            onWorkspaceMutated?.();
          });
        });
      };

      backdrop.querySelector("#dfm-diary-search")?.addEventListener("input", (e) => {
        diaryQuery = e.target.value;
        const listEl = backdrop.querySelector("#dfm-diary-list");
        if (listEl) {
          listEl.innerHTML = renderDiaryListInnerHtml(getFilteredDiaryNotes());
          bindDiaryListEvents();
        }
      });
      backdrop.querySelector("#dfm-diary-export")?.addEventListener("click", () => {
        const list = (state.localDiary || []).filter((n) => (n.folder || "diary") === diaryFolder);
        const md = list.map((n) => `# ${n.title}\n_Updated: ${(n.updatedAt || "").slice(0, 10)}_\n\n${n.content}\n`).join("\n---\n\n");
        downloadFile(`sprk-${diaryFolder}.md`, md, "text/markdown;charset=utf-8");
      });

      backdrop.querySelector("#dfm-diary-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = draftTitle.trim();
        const content = draftContent.trim();
        if (!title || !content) return;
        const nowIso = new Date().toISOString();
        if (diaryEditingId) {
          const updatedList = (state.localDiary || []).map((n) => (n.id === diaryEditingId ? { ...n, title, content, updatedAt: nowIso } : n));
          persistLocalCollection("localDiary", updatedList);
          const edited = updatedList.find((n) => n.id === diaryEditingId);
          if (edited) syncNoteUpsert(edited);
        } else {
          const entry = {
            id: generateId("note"),
            folder: diaryFolder,
            isDiary: diaryFolder === "diary",
            title,
            content,
            updatedAt: nowIso
          };
          persistLocalCollection("localDiary", [entry, ...(state.localDiary || [])]);
          syncNoteUpsert(entry);
        }
        diaryWriteOpen = false;
        diaryEditingId = null;
        draftTitle = "";
        draftContent = "";
        onWorkspaceMutated?.();
      });

      bindDiaryListEvents();

      // Flashcards
      backdrop.querySelector("#dfm-fc-reveal")?.addEventListener("click", () => {
        showCardBack = true;
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-rate]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cards = state.localFlashcards || [];
          const dueCards = getDueFlashcards(cards, Date.now());
          const activeCard = dueCards[0];
          if (!activeCard) return;
          const updated = reviewFlashcard(activeCard, btn.dataset.dfmRate, Date.now());
          persistLocalCollection("localFlashcards", cards.map((c) => (c.id === activeCard.id ? updated : c)));
          showCardBack = false;
          statusMsg = `Scheduled "${activeCard.front.slice(0, 30)}" (${updated.intervalDays}d interval).`;
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-fc-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const deck = backdrop.querySelector("#dfm-fc-deck")?.value.trim() || "General";
        const front = backdrop.querySelector("#dfm-fc-front")?.value.trim();
        const back = backdrop.querySelector("#dfm-fc-back")?.value.trim();
        if (!front || !back) return;
        const card = createFlashcard({ id: generateId("card"), deck, front, back, nowMs: Date.now() });
        persistLocalCollection("localFlashcards", [card, ...(state.localFlashcards || [])]);
        showCardBack = false;
        statusMsg = `Added card to ${deck}.`;
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-del-card]").forEach((btn) => {
        btn.addEventListener("click", () => {
          persistLocalCollection("localFlashcards", (state.localFlashcards || []).filter((c) => c.id !== btn.dataset.dfmDelCard));
          showCardBack = false;
          onWorkspaceMutated?.();
        });
      });

      // Library Guides
      backdrop.querySelector("#dfm-lib-search")?.addEventListener("input", (e) => {
        libQuery = e.target.value;
        const listEl = backdrop.querySelector("#dfm-lib-list");
        if (listEl) {
          listEl.innerHTML = renderGuidesListInnerHtml(getFilteredGuides());
          bindGuidesListEvents();
        }
      });

      bindGuidesListEvents();

      backdrop.querySelector("#dfm-lib-publish")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!state.user?.id) return;
        const title = backdrop.querySelector("#dfm-pub-title")?.value.trim();
        const audience = backdrop.querySelector("#dfm-pub-audience")?.value || "public";
        const summary = backdrop.querySelector("#dfm-pub-summary")?.value.trim();
        if (!title || !summary) return;
        const { data, error } = await supabase.insert("library_resources", {
          id: generateId("res"),
          author_id: state.user.id,
          title,
          summary,
          audience
        });
        statusMsg = error ? error.message : "Guide published.";
        if (data?.[0]) state.libraryResources = [data[0], ...(state.libraryResources || [])];
        onWorkspaceMutated?.();
      });
    }

    // Insights Modal Events
    if (activeModal === "insights") {
      backdrop.querySelector("#dfm-reg-csv")?.addEventListener("click", () => {
        downloadFile(`sprk-study-log-${todayIsoDate()}.csv`, formatStudyRecordsCsv(state.localStudyRecords || []), "text/csv;charset=utf-8");
      });
      backdrop.querySelector("#dfm-reg-md")?.addEventListener("click", () => {
        downloadFile(`sprk-study-log-${todayIsoDate()}.md`, formatStudyRecordsMarkdown(state.localStudyRecords || []), "text/markdown;charset=utf-8");
      });
      backdrop.querySelector("#dfm-manual-rec-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const subject = backdrop.querySelector("#dfm-reg-subj")?.value.trim();
        const mins = Math.min(480, Math.max(1, Number(backdrop.querySelector("#dfm-reg-mins")?.value) || 30));
        const date = backdrop.querySelector("#dfm-reg-date")?.value || todayIsoDate();
        if (!subject) return;
        const rec = {
          id: generateId("manual"),
          date,
          mode: "focus",
          subject,
          durationSeconds: mins * 60,
          creditsAwarded: 0,
          isManual: true,
          interruptions: 0,
          startedAt: new Date().toISOString()
        };
        persistLocalCollection("localStudyRecords", [rec, ...(state.localStudyRecords || [])]);
        syncManualStudyRecord(rec);
        statusMsg = `Logged ${mins}m for ${subject}.`;
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-rm-saved]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.dfmRmSaved;
          persistLocalCollection("localSavedResources", (state.localSavedResources || []).filter((s) => s.id !== id));
          syncSavedResourceDelete(id);
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-export-json")?.addEventListener("click", () => {
        const snapshot = {
          version: 1,
          exportedAt: new Date().toISOString(),
          preferences: state.preferences,
          localTasks: state.localTasks,
          localGoals: state.localGoals,
          localDiary: state.localDiary,
          localStudyRecords: state.localStudyRecords,
          localSavedResources: state.localSavedResources,
          localFlashcards: state.localFlashcards,
          localExams: state.localExams,
          localSubjectBudgets: state.localSubjectBudgets,
          localWorkspaceProfiles: state.localWorkspaceProfiles,
          localAudioPresets: state.localAudioPresets
        };
        downloadFile(`sprk-desk-backup-${todayIsoDate()}.json`, JSON.stringify(snapshot, null, 2), "application/json");
        statusMsg = "Full JSON backup downloaded.";
        onWorkspaceMutated?.();
      });

      backdrop.querySelector("#dfm-restore-json")?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const parsed = JSON.parse(await file.text());
          const validated = validateBackupPayload(parsed);
          if (!validated.ok) {
            statusMsg = validated.error;
            onWorkspaceMutated?.();
            return;
          }
          const { data } = validated;
          if (data.preferences) {
            const { deepFocusMode: _legacy, ...cleanPrefs } = data.preferences;
            savePreferences(cleanPrefs);
          }
          if (Array.isArray(parsed.localWorkspaceProfiles)) {
            persistLocalCollection("localWorkspaceProfiles", parsed.localWorkspaceProfiles);
          }
          for (const key of [
            "localTasks",
            "localGoals",
            "localDiary",
            "localStudyRecords",
            "localSavedResources",
            "localFlashcards",
            "localExams",
            "localSubjectBudgets",
            "localAudioPresets"
          ]) {
            if (data[key] !== undefined) persistLocalCollection(key, data[key]);
          }
          statusMsg = "Workspace backup restored.";
        } catch {
          statusMsg = "Could not parse JSON backup file.";
        }
        onWorkspaceMutated?.();
      });
    }

    // Community Modal Events
    if (activeModal === "community") {
      hallInterval = window.setInterval(() => {
        if (subTab !== "halls" || !state.bodyDoublingRoom) return;
        const hall = state.bodyDoublingRoom;
        const ph = computeSyncedRoomPhase({
          cycleStartMs: hall.epochMs || 1700000000000,
          focusMinutes: hall.focusMinutes,
          breakMinutes: hall.breakMinutes,
          nowMs: Date.now()
        });
        if (lastHallPhase && lastHallPhase !== ph.phase && !state.preferences?.muteChimes) {
          audioManager.playChime("focus");
        }
        lastHallPhase = ph.phase;
        const cdEl = backdrop.querySelector("#dfm-hall-cd");
        const phEl = backdrop.querySelector("#dfm-hall-phase");
        if (cdEl) cdEl.textContent = formatDuration(ph.remainingSeconds);
        if (phEl) phEl.textContent = ph.phase === "focus" ? "Synchronized Focus" : "Synchronized Break";
      }, 1000);

      backdrop.querySelectorAll("[data-dfm-join-hall]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const hall = BODY_DOUBLING_HALLS.find((h) => h.id === btn.dataset.dfmJoinHall);
          if (!hall) return;
          persistLocalCollection("bodyDoublingRoom", {
            id: hall.id,
            name: hall.name,
            focusMinutes: hall.focusMinutes,
            breakMinutes: hall.breakMinutes,
            epochMs: hall.epochMs,
            subject: state.bodyDoublingRoom?.subject || "Deep Reading"
          });
          lastHallPhase = null;
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-hall-leave")?.addEventListener("click", () => {
        persistLocalCollection("bodyDoublingRoom", null);
        lastHallPhase = null;
        onWorkspaceMutated?.();
      });

      backdrop.querySelector("#dfm-hall-tag")?.addEventListener("change", (e) => {
        if (!state.bodyDoublingRoom) return;
        persistLocalCollection("bodyDoublingRoom", {
          ...state.bodyDoublingRoom,
          subject: e.target.value.trim() || "Deep Reading"
        });
        onWorkspaceMutated?.();
      });

      backdrop.querySelector("#dfm-open-account-page")?.addEventListener("click", () => {
        close();
        navigateToPage(PAGE_ROUTES.ACCOUNT);
      });
      backdrop.querySelector("#dfm-friends-signin")?.addEventListener("click", () => {
        close();
        navigateToPage(PAGE_ROUTES.ACCOUNT);
      });

      backdrop.querySelector("#dfm-friends-refresh")?.addEventListener("click", async () => {
        await loadFriendsAndRequests();
        onWorkspaceMutated?.();
      });

      backdrop.querySelector("#dfm-friend-search-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const q = backdrop.querySelector("#dfm-friend-query")?.value.trim();
        const { data, error } = await searchStudentProfiles(q);
        if (error) statusMsg = error.message;
        else friendSearchResults = data || [];
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-inspect-friend]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { data, error } = await fetchUserPublicProfile(btn.dataset.dfmInspectFriend);
          if (error) statusMsg = error.message;
          else inspectedFriend = data;
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-close-inspect")?.addEventListener("click", () => {
        inspectedFriend = null;
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-visit-room]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await visitFriendRoom(btn.dataset.dfmVisitRoom);
          if (error) {
            statusMsg = error.message;
            onWorkspaceMutated?.();
            return;
          }
          close();
          setAppMode("cozy", { syncUrl: false });
          navigateToPage(PAGE_ROUTES.COZY);
        });
      });

      backdrop.querySelectorAll("[data-dfm-add-friend]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const targetId = btn.dataset.dfmAddFriend;
          const { error } = await sendFriendRequest(targetId);
          statusMsg = error ? error.message : "Friend request sent.";
          if (inspectedFriend?.profile?.id === targetId) {
            const { data } = await fetchUserPublicProfile(targetId);
            if (data) inspectedFriend = data;
          }
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-cancel-req]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await cancelFriendRequest(btn.dataset.dfmCancelReq);
          statusMsg = error ? error.message : "Request cancelled.";
          if (inspectedFriend?.profile?.id) {
            const { data } = await fetchUserPublicProfile(inspectedFriend.profile.id);
            if (data) inspectedFriend = data;
          }
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-unfriend]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const targetId = btn.dataset.dfmUnfriend;
          const { error } = await unfriendUser(targetId);
          statusMsg = error ? error.message : "Friend removed.";
          if (inspectedFriend?.profile?.id === targetId) {
            const { data } = await fetchUserPublicProfile(targetId);
            if (data) inspectedFriend = data;
          }
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-req-acc]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await respondFriendRequest(btn.dataset.dfmReqAcc, true);
          statusMsg = error ? error.message : "Friend added.";
          if (inspectedFriend?.profile?.id) {
            const { data } = await fetchUserPublicProfile(inspectedFriend.profile.id);
            if (data) inspectedFriend = data;
          }
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-req-dec]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await respondFriendRequest(btn.dataset.dfmReqDec, false);
          statusMsg = error ? error.message : "Declined.";
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-refresh-groups")?.addEventListener("click", async () => {
        await loadStudyGroups();
        onWorkspaceMutated?.();
      });

      backdrop.querySelector("#dfm-join-code-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const code = backdrop.querySelector("#dfm-join-code")?.value.trim();
        const { data, error } = await joinStudyGroup({ inviteCode: code });
        statusMsg = error ? error.message : "Joined group.";
        if (data?.id) {
          openGroupId = data.id;
          await loadGroupWorkspace(data.id);
        }
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-open-grp]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          openGroupId = btn.dataset.dfmOpenGrp;
          await loadGroupWorkspace(openGroupId);
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-grp-back")?.addEventListener("click", () => {
        openGroupId = null;
        onWorkspaceMutated?.();
      });

      backdrop.querySelectorAll("[data-dfm-join-grp]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const gid = btn.dataset.dfmJoinGrp;
          const { error } = await joinStudyGroup({ groupId: gid });
          statusMsg = error ? error.message : "Joined group.";
          if (!error && openGroupId === gid) await loadGroupWorkspace(gid);
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-leave-grp]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const { error } = await leaveStudyGroup(btn.dataset.dfmLeaveGrp);
          statusMsg = error ? error.message : "Left group.";
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelector("#dfm-grp-msg-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const val = backdrop.querySelector("#dfm-grp-msg-input")?.value.trim();
        if (!val || !openGroupId) return;
        const { error } = await postGroupMessage(openGroupId, val);
        if (error) statusMsg = error.message;
        onWorkspaceMutated?.();
      });

      backdrop.querySelector("#dfm-create-group-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const { data, error } = await createStudyGroup({
          name: backdrop.querySelector("#dfm-grp-name")?.value.trim(),
          description: backdrop.querySelector("#dfm-grp-desc")?.value.trim(),
          subject: backdrop.querySelector("#dfm-grp-subj")?.value.trim(),
          isPrivate: Boolean(backdrop.querySelector("#dfm-grp-priv")?.checked)
        });
        statusMsg = error ? error.message : "Group created.";
        if (!error && data?.id) {
          openGroupId = data.id;
          await loadGroupWorkspace(data.id);
        }
        onWorkspaceMutated?.();
      });
    }

    // Catalog Modal Events
    if (activeModal === "catalog") {
      backdrop.querySelectorAll("[data-dfm-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
          catalogCat = btn.dataset.dfmCat;
          onWorkspaceMutated?.();
        });
      });

      backdrop.querySelectorAll("[data-dfm-equip]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (isStrictFocusLockActive()) return;
          const item = SHOP_CATALOG.find((i) => i.id === btn.dataset.dfmEquip);
          if (item && equipShopItem(item)) {
            statusMsg = `Equipped "${item.name}".`;
            onWorkspaceMutated?.();
          }
        });
      });

      backdrop.querySelectorAll("[data-dfm-buy-item]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (isStrictFocusLockActive()) return;
          const id = btn.dataset.dfmBuyItem;
          const res = await purchaseShopItem(id);
          if (res.ok) {
            const item = SHOP_CATALOG.find((i) => i.id === id);
            if (item) equipShopItem(item);
            statusMsg = `Unlocked "${item?.name || "item"}".`;
          } else {
            statusMsg = res.error || "Purchase failed.";
          }
          onWorkspaceMutated?.();
        });
      });
    }

    // Recovery Break Modal Events
    if (activeModal === "break") {
      backdrop.querySelector("#dfm-eyerest-start")?.addEventListener("click", () => {
        if (breakInterval) window.clearInterval(breakInterval);
        eyeRestCountdown = 20;
        const valEl = backdrop.querySelector("#dfm-eyerest-val");
        if (valEl) valEl.textContent = "20s";
        breakInterval = window.setInterval(() => {
          eyeRestCountdown -= 1;
          const liveVal = shellEl.querySelector("#dfm-eyerest-val");
          if (eyeRestCountdown <= 0) {
            eyeRestCountdown = 0;
            window.clearInterval(breakInterval);
            breakInterval = null;
            audioManager.playChime("focus");
            if (liveVal) liveVal.textContent = "Done";
          } else if (liveVal) {
            liveVal.textContent = `${eyeRestCountdown}s`;
          }
        }, 1000);
      });

      backdrop.querySelector("#dfm-chime-sip")?.addEventListener("click", () => {
        audioManager.playChime("sip");
      });

      const startBreak = (mins, mode) => {
        if (state.activeSession) return;
        const newSess = createFocusSession({
          id: generateId("break"),
          mode,
          targetSeconds: mins * 60,
          scope: "personal",
          subject: mode === "long_break" ? "Long Break" : "Short Break"
        });
        persistLocalCollection("activeSession", newSess);
        close();
      };

      backdrop.querySelector("#dfm-break-5")?.addEventListener("click", () => startBreak(5, "short_break"));
      backdrop.querySelector("#dfm-break-15")?.addEventListener("click", () => startBreak(15, "long_break"));
    }
  };

  return {
    open,
    close,
    getActiveModal,
    renderModalHtml,
    bindModalEvents
  };
}
