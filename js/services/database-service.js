// Supabase Database Service: Cloud Sync, Privacy-Scoped Room Visits, Profiles, Friends, Feed & Study Groups
import { supabase } from "./supabase.js";
import { state, savePreferences, saveLocalProfile, persistLocalCollection } from "../state.js";
import { bus } from "../core/event-bus.js";
import { themeManager } from "../core/theme-manager.js";
import { skinManager } from "../core/skin-manager.js";
import { lightingManager } from "../core/lighting-manager.js";
import { layoutManager } from "../core/layout-manager.js";
import { decorationManager } from "../core/decoration-manager.js";
import {
  buildSpectatorSafeRoomView,
  canUserVisitRoom,
  getRelationshipStatus
} from "../utils/privacy-scope.js";
import {
  formatProfilePayload,
  normalizePrivacySettings,
  sanitizeAvatarUrl,
  extractMissingColumn,
  extractMissingProfileColumn,
  buildProfileDbPayload,
  buildProfileAuthMetadata,
  mergeResolvedProfile
} from "../utils/profile-helpers.js";
import { sanitizeRoomLayoutMap } from "../utils/layout-geometry.js";
import { DEFAULT_DECORATIONS } from "../utils/decorations.js";

let prefSyncTimer = null;
let layoutSyncTimer = null;
const missingUserSettingsCols = new Set();
const missingStudyTasksCols = new Set();

function cleanPostgrestSearchTerm(raw = "") {
  return String(raw || "").trim().replace(/^@/, "").replace(/[(),*"]/g, "").slice(0, 48);
}

function mapProfileRow(p = {}) {
  return {
    id: p.id || "",
    publicId: p.public_id || "SPRK-USER",
    username: p.username || "",
    displayName: p.display_name || "Student",
    avatarPreset: p.avatar_preset || "☺",
    avatarUrl: sanitizeAvatarUrl(p.avatar_url || ""),
    bannerUrl: sanitizeAvatarUrl(p.banner_url || ""),
    bio: p.bio || "",
    courseClass: p.course_class || "",
    examAim: p.exam_aim || "",
    favoriteSubjects: Array.isArray(p.favorite_subjects) ? p.favorite_subjects : [],
    isVerified: Boolean(p.is_verified),
    privacy: normalizePrivacySettings(p.privacy)
  };
}

export async function syncAuthenticatedUserData() {
  if (!supabase.configured || !state.user?.id) return;
  const uid = state.user.id;

  const [
    settingsRes,
    layoutsRes,
    ledgerRes,
    invRes,
    eqRes,
    tasksRes,
    goalsRes,
    notesRes,
    savedRes,
    sessionsRes,
    notifRes,
    achRes,
    userAchRes,
    libRes,
    roomsRes,
    groupsRes,
    groupMemRes
  ] = await Promise.all([
    supabase.select("user_settings", `user_id=eq.${uid}&limit=1`),
    supabase.select("room_layouts", `user_id=eq.${uid}&order=updated_at.desc&limit=5`),
    supabase.select("study_credit_transactions", `user_id=eq.${uid}&order=created_at.desc&limit=50`),
    supabase.select("user_inventory", `user_id=eq.${uid}`),
    supabase.select("user_equipped_items", `user_id=eq.${uid}`),
    supabase.select("study_tasks", `user_id=eq.${uid}&order=created_at.desc`),
    supabase.select("study_goals", `user_id=eq.${uid}&order=created_at.desc`),
    supabase.select("study_notes", `user_id=eq.${uid}&order=updated_at.desc`),
    supabase.select("saved_resources", `user_id=eq.${uid}&order=created_at.desc`),
    supabase.select("focus_sessions", `user_id=eq.${uid}&order=started_at.desc&limit=100`),
    supabase.select("notifications", `user_id=eq.${uid}&order=created_at.desc&limit=30`),
    supabase.select("achievements", "order=id.asc"),
    supabase.select("user_achievements", `user_id=eq.${uid}`),
    supabase.select("library_resources", "order=created_at.desc&limit=40"),
    supabase.select("study_rooms", "order=created_at.desc&limit=20"),
    supabase.select("study_groups", "order=created_at.desc&limit=30"),
    supabase.select("study_group_members", `user_id=eq.${uid}`)
  ]);

  // 1. Restore Cloud Theme, Skins, Lighting & Window Beam Preference
  const cloudSettings = settingsRes.data?.[0];
  if (cloudSettings) {
    savePreferences({
      appMode: cloudSettings.app_mode === "deepfocus" || cloudSettings.app_mode === "cozy"
        ? cloudSettings.app_mode
        : state.preferences.appMode,
      seriousMode: typeof cloudSettings.serious_mode === "boolean"
        ? cloudSettings.serious_mode
        : state.preferences.seriousMode,
      hideGamification: typeof cloudSettings.hide_gamification === "boolean"
        ? cloudSettings.hide_gamification
        : state.preferences.hideGamification,
      strictFocusLock: typeof cloudSettings.strict_focus_lock === "boolean"
        ? cloudSettings.strict_focus_lock
        : state.preferences.strictFocusLock,
      autoCycleBreaks: typeof cloudSettings.auto_cycle_breaks === "boolean"
        ? cloudSettings.auto_cycle_breaks
        : state.preferences.autoCycleBreaks,
      defaultFocusMinutes: typeof cloudSettings.default_focus_minutes === "number"
        ? cloudSettings.default_focus_minutes
        : state.preferences.defaultFocusMinutes,
      muteChimes: typeof cloudSettings.mute_chimes === "boolean"
        ? cloudSettings.mute_chimes
        : state.preferences.muteChimes,
      lowPassHz: typeof cloudSettings.low_pass_hz === "number"
        ? cloudSettings.low_pass_hz
        : state.preferences.lowPassHz,
      autoDuskLamp: typeof cloudSettings.auto_dusk_lamp === "boolean"
        ? cloudSettings.auto_dusk_lamp
        : state.preferences.autoDuskLamp,
      studyTogetherVisualMode: typeof cloudSettings.study_together_visual_mode === "boolean"
        ? cloudSettings.study_together_visual_mode
        : state.preferences.studyTogetherVisualMode,
      deepFocus: cloudSettings.deep_focus && typeof cloudSettings.deep_focus === "object"
        ? cloudSettings.deep_focus
        : state.preferences.deepFocus,
      theme: cloudSettings.theme || state.preferences.theme,
      timeOfDay: cloudSettings.time_of_day || state.preferences.timeOfDay,
      weather: cloudSettings.weather || state.preferences.weather,
      lighting: cloudSettings.lighting || state.preferences.lighting,
      skins: cloudSettings.skins || {},
      lockedSkins: cloudSettings.locked_skins || {},
      decorations: cloudSettings.decorations || state.preferences.decorations || DEFAULT_DECORATIONS,
      customProp: cloudSettings.custom_prop || state.preferences.customProp,
      layoutLocked: Boolean(cloudSettings.layout_locked),
      activeLayoutName: cloudSettings.active_layout_name || "Default Desk",
      reducedMotion: Boolean(cloudSettings.reduced_motion),
      lowPerformance: Boolean(cloudSettings.low_performance),
      localDisplayName: cloudSettings.local_display_name || state.user.displayName,
      activeMusicId: cloudSettings.active_music_id || undefined,
      activeAmbienceId: cloudSettings.active_ambience_id || undefined
    }, { replaceSkins: true, skipCloudSync: true });

    if (!state.spectatingRoom) {
      themeManager.apply(state.preferences.theme || "comic", { persist: false });
      skinManager.applySavedSkins();
      decorationManager.apply();
      decorationManager.applyCustomProp();
      lightingManager.apply();
    }
  } else {
    saveCloudPreferences(state.preferences);
  }

  // 2. Restore Cloud Room Object Positions
  if (Array.isArray(layoutsRes.data) && layoutsRes.data.length > 0) {
    const mergedLayouts = { ...(state.savedLayouts || {}) };
    for (const row of layoutsRes.data) {
      if (row.name && row.layout_json && typeof row.layout_json === "object") {
        mergedLayouts[row.name] = sanitizeRoomLayoutMap(row.layout_json);
      }
    }
    persistLocalCollection("savedLayouts", mergedLayouts);
    if (!state.spectatingRoom) {
      layoutManager.restoreOwnLayout();
    }
  } else {
    const activeName = state.preferences.activeLayoutName || "Default Desk";
    const localMap = state.savedLayouts?.[activeName] || {};
    if (Object.keys(localMap).length > 0) {
      saveCloudLayout(activeName, localMap);
    }
  }

  // 3. Economy & Inventory
  if (Array.isArray(ledgerRes.data)) {
    const ledger = ledgerRes.data;
    const balance = ledger.reduce((acc, tx) => acc + (tx.amount || 0), 0);
    const earned = ledger.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0);
    const spent = ledger.filter((t) => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
    state.wallet = { balance: Math.max(0, balance), earned, spent, ledger };
  }

  if (Array.isArray(invRes.data)) {
    state.ownedItemIds = Array.from(
      new Set([
        "theme_comic",
        "music_rainy_vinyl",
        "ambience_golden_hour",
        "deco_penstand_classic",
        "deco_penstand_mint",
        "deco_charm_terrarium",
        ...invRes.data.map((r) => r.item_id)
      ])
    );
  }
  if (Array.isArray(eqRes.data)) {
    const equipped = {};
    for (const row of eqRes.data) equipped[row.slot] = row.item_id;
    state.equippedItems = equipped;
  }

  // 4. Productivity & Study Collections
  if (Array.isArray(tasksRes.data)) {
    persistLocalCollection("localTasks", tasksRes.data.map((t) => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      priority: t.priority,
      dueDate: t.due_date || "",
      completed: Boolean(t.completed),
      kanbanStatus: t.kanban_status || (t.completed ? "done" : "todo"),
      noteColor: t.note_color || "butter"
    })));
  }
  if (Array.isArray(goalsRes.data) && goalsRes.data.length > 0) {
    persistLocalCollection("localGoals", goalsRes.data.map((g) => ({
      id: g.id,
      title: g.title,
      scope: g.scope || "daily",
      targetMinutes: g.target_minutes || 90,
      subject: g.subject || "All Subjects"
    })));
  }
  if (Array.isArray(notesRes.data)) {
    persistLocalCollection("localDiary", notesRes.data.map((n) => ({
      id: n.id,
      folder: n.folder || (n.is_diary ? "diary" : "notes"),
      isDiary: Boolean(n.is_diary),
      title: n.title,
      content: n.content,
      pinned: Boolean(n.pinned),
      updatedAt: n.updated_at
    })));
  }
  if (Array.isArray(savedRes.data)) {
    persistLocalCollection("localSavedResources", savedRes.data.map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category || "Saved",
      summary: s.summary || "",
      author: s.author || ""
    })));
  }
  if (Array.isArray(sessionsRes.data)) {
    persistLocalCollection("localStudyRecords", sessionsRes.data.map((s) => ({
      id: s.id,
      date: (s.started_at || "").slice(0, 10),
      mode: s.mode || "focus",
      subject: s.subject || "General Study",
      durationSeconds: s.verified_seconds || 0,
      creditsAwarded: s.credits_awarded || 0,
      isManual: Boolean(s.is_manual),
      startedAt: s.started_at
    })));
  }
  if (Array.isArray(notifRes.data)) state.notifications = notifRes.data;
  if (Array.isArray(achRes.data)) state.achievements = achRes.data;
  if (Array.isArray(userAchRes.data)) {
    state.unlockedAchievementIds = userAchRes.data.map((a) => a.achievement_id);
  }
  if (Array.isArray(libRes.data)) state.libraryResources = libRes.data;
  if (Array.isArray(roomsRes.data)) state.studyRooms = roomsRes.data;
  if (Array.isArray(groupsRes.data)) state.studyGroups = groupsRes.data;
  if (Array.isArray(groupMemRes.data)) {
    const map = {};
    for (const row of groupMemRes.data) {
      map[row.group_id] = row.role;
    }
    state.groupMemberships = map;
  }

  await Promise.all([
    loadFriendsAndRequests(),
    loadSocialFeed("all"),
    fetchSuggestedStudents(10)
  ]);
  bus.emit("sync:completed");
}

export function scheduleCloudPreferencesSync(prefs = state.preferences) {
  if (!supabase.configured || !state.user?.id || state.spectatingRoom) return;
  if (prefSyncTimer) clearTimeout(prefSyncTimer);
  prefSyncTimer = window.setTimeout(() => {
    saveCloudPreferences(prefs);
  }, 350);
}

export async function saveCloudPreferences(prefs = state.preferences) {
  if (!supabase.configured || !state.user?.id || state.spectatingRoom) return { error: null };
  const rawPayload = {
    user_id: state.user.id,
    theme: prefs.theme || "comic",
    time_of_day: prefs.timeOfDay || "auto",
    weather: prefs.weather || "clear",
    lighting: prefs.lighting || {},
    skins: prefs.skins || {},
    locked_skins: prefs.lockedSkins || {},
    decorations: prefs.decorations || DEFAULT_DECORATIONS,
    custom_prop: prefs.customProp || {},
    layout_locked: Boolean(prefs.layoutLocked),
    active_layout_name: prefs.activeLayoutName || "Default Desk",
    reduced_motion: Boolean(prefs.reducedMotion),
    low_performance: Boolean(prefs.lowPerformance),
    local_display_name: prefs.localDisplayName || state.user.displayName || "Student",
    active_music_id: prefs.activeMusicId || null,
    active_ambience_id: prefs.activeAmbienceId || null,
    app_mode: prefs.appMode === "deepfocus" ? "deepfocus" : "cozy",
    serious_mode: Boolean(prefs.seriousMode),
    hide_gamification: Boolean(prefs.hideGamification),
    strict_focus_lock: Boolean(prefs.strictFocusLock),
    auto_cycle_breaks: Boolean(prefs.autoCycleBreaks),
    default_focus_minutes: Number(prefs.defaultFocusMinutes || 25),
    mute_chimes: Boolean(prefs.muteChimes),
    low_pass_hz: Number(prefs.lowPassHz || 18000),
    auto_dusk_lamp: Boolean(prefs.autoDuskLamp),
    study_together_visual_mode: Boolean(prefs.studyTogetherVisualMode),
    deep_focus: prefs.deepFocus || {},
    updated_at: new Date().toISOString()
  };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const payload = {};
    for (const [key, val] of Object.entries(rawPayload)) {
      if (!missingUserSettingsCols.has(key)) payload[key] = val;
    }
    const res = await supabase.upsert("user_settings", payload, "user_id");
    if (!res.error) return res;
    const missingCol = extractMissingColumn(res.error.message, "user_settings");
    if (missingCol && missingCol !== "user_id" && !missingUserSettingsCols.has(missingCol)) {
      missingUserSettingsCols.add(missingCol);
      continue;
    }
    return res;
  }
  return { error: null };
}

export function scheduleCloudLayoutSync(layoutName, layoutJson) {
  if (!supabase.configured || !state.user?.id || state.spectatingRoom) return;
  if (layoutSyncTimer) clearTimeout(layoutSyncTimer);
  layoutSyncTimer = window.setTimeout(() => {
    saveCloudLayout(layoutName, layoutJson);
  }, 250);
}

export async function saveCloudLayout(layoutName = "Default Desk", layoutJson = {}) {
  if (!supabase.configured || !state.user?.id || state.spectatingRoom) return { error: null };
  const cleanLayout = sanitizeRoomLayoutMap(layoutJson);
  return supabase.upsert("room_layouts", {
    user_id: state.user.id,
    name: layoutName,
    layout_json: cleanLayout,
    is_default: layoutName === (state.preferences.activeLayoutName || "Default Desk"),
    updated_at: new Date().toISOString()
  }, "user_id,name");
}

export async function updateProfile(fields) {
  const clean = formatProfilePayload(fields);
  const normalizedPrivacy = fields.privacy
    ? normalizePrivacySettings({ ...(state.user?.privacy || state.localProfile?.privacy || {}), ...fields.privacy })
    : normalizePrivacySettings(state.user?.privacy || state.localProfile?.privacy || {});

  if (!supabase.configured || !state.user?.id) {
    const localPatch = { ...clean, privacy: normalizedPrivacy };
    saveLocalProfile(localPatch);
    return { data: [localPatch], error: null, localOnly: true };
  }

  const uid = state.user.id;
  const excludedColumns = [];
  let data = null;
  let error = null;
  const dbFields = { ...fields, privacy: normalizedPrivacy };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const payload = buildProfileDbPayload(clean, dbFields, excludedColumns);
    const res = await supabase.update("profiles", `id=eq.${uid}`, payload);
    data = res.data;
    error = res.error;

    if (error) {
      const missingCol = extractMissingProfileColumn(error.message);
      if (missingCol && !excludedColumns.includes(missingCol)) {
        excludedColumns.push(missingCol);
        continue;
      }
      break;
    }

    if (!Array.isArray(data) || data.length === 0) {
      const upsertRes = await supabase.upsert("profiles", { id: uid, ...payload }, "id");
      if (!upsertRes.error) {
        data = upsertRes.data;
        error = null;
      } else {
        const missingCol = extractMissingProfileColumn(upsertRes.error.message);
        if (missingCol && !excludedColumns.includes(missingCol)) {
          excludedColumns.push(missingCol);
          continue;
        }
        error = upsertRes.error;
      }
    }
    break;
  }

  const authMeta = buildProfileAuthMetadata(clean);
  const metaRes = await supabase.request("/auth/v1/user", {
    method: "PUT",
    body: JSON.stringify({ data: authMeta })
  });

  if (!error || !metaRes.error) {
    const row = Array.isArray(data) ? (data[0] || {}) : {};
    const merged = mergeResolvedProfile({
      uid,
      email: state.user.email,
      dbRow: row,
      userMetadata: authMeta,
      localProfile: { ...clean, privacy: normalizedPrivacy }
    });
    state.user = {
      ...state.user,
      ...merged,
      privacy: normalizePrivacySettings(row.privacy || normalizedPrivacy)
    };
    saveLocalProfile({ ...clean, privacy: state.user.privacy });
    savePreferences({ localDisplayName: state.user.displayName });
    bus.emit("auth:changed", state.user);
    bus.emit("profile:changed", state.user);
  }

  return { data, error: error || metaRes.error };
}

async function uploadStudioImageFile(file, { filePrefix, errTypeLabel }) {
  if (!file) return { url: "", error: { message: "No file selected." } };
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { url: "", error: { message: `Please choose a PNG, JPG, WEBP, or GIF ${errTypeLabel}.` } };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { url: "", error: { message: "Image must be 2 MB or smaller." } };
  }

  if (supabase.configured && state.user?.id) {
    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const path = `${state.user.id}/${filePrefix}.${ext}`;
    const { data, error } = await supabase.uploadFile("avatars", path, file);
    if (!error && data?.publicUrl) {
      return { url: data.publicUrl, error: null };
    }
    if (error && !error.message?.includes("Cannot reach")) {
      return { url: "", error };
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const safe = sanitizeAvatarUrl(String(reader.result || ""));
      if (!safe) {
        resolve({ url: "", error: { message: "Image file is too large for local storage (keep under 220 KB)." } });
      } else {
        resolve({ url: safe, error: null });
      }
    };
    reader.onerror = () => resolve({ url: "", error: { message: "Could not read image file." } });
    reader.readAsDataURL(file);
  });
}

export function uploadAvatarFile(file) {
  return uploadStudioImageFile(file, { filePrefix: "avatar", errTypeLabel: "image" });
}

export function uploadBannerFile(file) {
  return uploadStudioImageFile(file, { filePrefix: "banner", errTypeLabel: "banner" });
}

export function uploadCustomPropFile(file) {
  return uploadStudioImageFile(file, { filePrefix: "custom-prop", errTypeLabel: "sprite" });
}

// Productivity CRUD Cloud Helpers
export async function syncTaskUpsert(task) {
  if (!supabase.configured || !state.user?.id) return;
  const rawPayload = {
    id: task.id,
    user_id: state.user.id,
    title: task.title,
    subject: task.subject || "General",
    priority: task.priority || "medium",
    due_date: task.dueDate || "",
    completed: Boolean(task.completed),
    kanban_status: task.kanbanStatus || (task.completed ? "done" : "todo"),
    note_color: task.noteColor || "butter",
    updated_at: new Date().toISOString()
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const payload = {};
    for (const [key, val] of Object.entries(rawPayload)) {
      if (!missingStudyTasksCols.has(key)) payload[key] = val;
    }
    const res = await supabase.upsert("study_tasks", payload, "id");
    if (!res.error) return res;
    const missingCol = extractMissingColumn(res.error.message, "study_tasks");
    if (missingCol && missingCol !== "id" && !missingStudyTasksCols.has(missingCol)) {
      missingStudyTasksCols.add(missingCol);
      continue;
    }
    return res;
  }
  return { error: null };
}

export async function syncTaskDelete(taskId) {
  if (!supabase.configured || !state.user?.id) return;
  return supabase.remove("study_tasks", `id=eq.${encodeURIComponent(taskId)}&user_id=eq.${state.user.id}`);
}

export async function syncNoteUpsert(note) {
  if (!supabase.configured || !state.user?.id) return;
  return supabase.upsert("study_notes", {
    id: note.id,
    user_id: state.user.id,
    folder: note.folder || "diary",
    is_diary: Boolean(note.isDiary),
    title: note.title,
    content: note.content,
    pinned: Boolean(note.pinned),
    updated_at: note.updatedAt || new Date().toISOString()
  }, "id");
}

export async function syncNoteDelete(noteId) {
  if (!supabase.configured || !state.user?.id) return;
  return supabase.remove("study_notes", `id=eq.${encodeURIComponent(noteId)}&user_id=eq.${state.user.id}`);
}

export async function syncManualStudyRecord(rec) {
  if (!supabase.configured || !state.user?.id) return;
  return supabase.upsert("focus_sessions", {
    id: rec.id,
    user_id: state.user.id,
    mode: rec.mode || "focus",
    scope: rec.scope || "personal",
    subject: rec.subject || "General Study",
    target_seconds: rec.durationSeconds || 0,
    verified_seconds: rec.durationSeconds || 0,
    credits_awarded: 0,
    is_manual: true,
    status: "completed",
    started_at: rec.startedAt || new Date().toISOString(),
    completed_at: new Date().toISOString()
  }, "id");
}

export async function updateFocusSessionSubject(sessionId, subject) {
  if (!supabase.configured || !state.user?.id || !sessionId) return { error: null };
  const cleanSubject = String(subject || "General Study").trim().slice(0, 64) || "General Study";
  return supabase.update(
    "focus_sessions",
    `id=eq.${encodeURIComponent(sessionId)}&user_id=eq.${state.user.id}`,
    { subject: cleanSubject }
  );
}

export async function syncSavedResourceUpsert(resItem) {
  if (!supabase.configured || !state.user?.id) return;
  return supabase.upsert("saved_resources", {
    id: resItem.id,
    user_id: state.user.id,
    title: resItem.title,
    category: resItem.category || "Saved",
    summary: resItem.summary || "",
    author: resItem.author || ""
  }, "id");
}

export async function syncSavedResourceDelete(resId) {
  if (!supabase.configured || !state.user?.id) return;
  return supabase.remove("saved_resources", `id=eq.${encodeURIComponent(resId)}&user_id=eq.${state.user.id}`);
}

// ---------------------------------------------------------------------------
// Friends, Friend Requests & Public Profile Directory
// ---------------------------------------------------------------------------

export async function loadFriendsAndRequests() {
  if (!supabase.configured || !state.user?.id) {
    state.friends = [];
    state.friendRequests = { incoming: [], outgoing: [] };
    return { friends: [], incoming: [], outgoing: [] };
  }
  const uid = state.user.id;
  const [shipsRes, reqsRes] = await Promise.all([
    supabase.select("friendships", `or=(user_a.eq.${uid},user_b.eq.${uid})`),
    supabase.select("friend_requests", `or=(sender_id.eq.${uid},receiver_id.eq.${uid})&status=eq.pending&order=created_at.desc`)
  ]);

  const friendIds = new Set();
  for (const row of shipsRes.data || []) {
    const otherId = row.user_a === uid ? row.user_b : row.user_a;
    if (otherId) friendIds.add(otherId);
  }

  const incomingRaw = (reqsRes.data || []).filter((r) => r.receiver_id === uid);
  const outgoingRaw = (reqsRes.data || []).filter((r) => r.sender_id === uid);
  const profileIds = new Set([...friendIds]);
  incomingRaw.forEach((r) => profileIds.add(r.sender_id));
  outgoingRaw.forEach((r) => profileIds.add(r.receiver_id));

  const profileMap = new Map();
  if (profileIds.size > 0) {
    const idList = Array.from(profileIds).join(",");
    const profRes = await supabase.select("profiles", `id=in.(${idList})`);
    for (const p of profRes.data || []) {
      profileMap.set(p.id, p);
    }
  }

  state.friends = Array.from(friendIds).map((id) => mapProfileRow(profileMap.get(id) || { id }));

  state.friendRequests = {
    incoming: incomingRaw.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      createdAt: r.created_at,
      profile: profileMap.get(r.sender_id) || { id: r.sender_id, display_name: "Student", public_id: "SPRK-USER" }
    })),
    outgoing: outgoingRaw.map((r) => ({
      id: r.id,
      receiverId: r.receiver_id,
      createdAt: r.created_at,
      profile: profileMap.get(r.receiver_id) || { id: r.receiver_id, display_name: "Student", public_id: "SPRK-USER" }
    }))
  };

  bus.emit("friends:changed", state.friends);
  return { friends: state.friends, ...state.friendRequests };
}

export async function searchStudentProfiles(query) {
  if (!supabase.configured || !state.user?.id) {
    return { data: [], error: { message: "Sign in to search students." } };
  }
  const clean = cleanPostgrestSearchTerm(query);
  if (!clean) return { data: [], error: null };

  const pattern = `*${clean}*`;
  const res = await supabase.select(
    "profiles",
    `or=(public_id.ilike.${encodeURIComponent(pattern)},username.ilike.${encodeURIComponent(pattern)},display_name.ilike.${encodeURIComponent(pattern)},course_class.ilike.${encodeURIComponent(pattern)})&limit=16`
  );
  if (res.error) return res;
  return {
    data: (res.data || []).filter((p) => p.id !== state.user.id),
    error: null
  };
}

export async function fetchSuggestedStudents(limit = 12) {
  if (!supabase.configured || !state.user?.id) {
    state.suggestedStudents = [];
    return { data: [], error: null };
  }
  const res = await supabase.select("profiles", `id=neq.${state.user.id}&order=updated_at.desc&limit=${limit}`);
  if (!res.error && Array.isArray(res.data)) {
    state.suggestedStudents = res.data;
  }
  return res;
}

export async function sendFriendRequest(receiverId) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in to send friend requests." } };
  }
  if (receiverId === state.user.id) {
    return { error: { message: "You cannot send a friend request to yourself." } };
  }
  const rel = getRelationshipStatus({
    viewerId: state.user.id,
    targetId: receiverId,
    friends: state.friends,
    incoming: state.friendRequests?.incoming,
    outgoing: state.friendRequests?.outgoing
  });
  if (rel.status === "friends") return { error: { message: "You are already friends." } };
  if (rel.status === "outgoing") return { error: { message: "Friend request already sent." } };
  if (rel.status === "incoming") {
    return respondFriendRequest(rel.requestId, true);
  }

  const res = await supabase.insert("friend_requests", {
    sender_id: state.user.id,
    receiver_id: receiverId,
    status: "pending"
  });
  if (!res.error) {
    await supabase.insert("notifications", {
      user_id: receiverId,
      actor_id: state.user.id,
      type: "friend_request",
      title: "New Friend Request",
      body: `${state.user.displayName || "A student"} wants to connect with you.`
    });
    await loadFriendsAndRequests();
  }
  return res;
}

export async function cancelFriendRequest(requestId) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in first." } };
  }
  const res = await supabase.remove(
    "friend_requests",
    `id=eq.${encodeURIComponent(requestId)}&sender_id=eq.${state.user.id}`
  );
  if (!res.error) {
    await loadFriendsAndRequests();
  }
  return res;
}

export async function respondFriendRequest(requestId, accept = true) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in first." } };
  }
  const res = await supabase.rpc("accept_friend_request", {
    p_request_id: requestId,
    p_accept: Boolean(accept)
  });
  if (!res.error) {
    await loadFriendsAndRequests();
  }
  return res;
}

export async function unfriendUser(friendId) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in first." } };
  }
  let res = await supabase.rpc("unfriend_user", { p_friend_id: friendId });
  if (res.error) {
    const a = state.user.id < friendId ? state.user.id : friendId;
    const b = state.user.id < friendId ? friendId : state.user.id;
    res = await supabase.remove("friendships", `user_a=eq.${a}&user_b=eq.${b}`);
  }
  if (!res.error) {
    await loadFriendsAndRequests();
  }
  return res;
}

// Fetch a user's PUBLIC PROFILE (always accessible without revealing restricted rooms)
export async function fetchUserPublicProfile(targetIdentifier) {
  if (!supabase.configured || !state.user?.id) {
    return { data: null, error: { message: "Sign in to view student profiles." } };
  }
  const clean = String(targetIdentifier || "").trim();
  if (!clean) return { data: null, error: { message: "No user specified." } };

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  const filter = isUuid
    ? `id=eq.${clean}&limit=1`
    : `or=(public_id.eq.${encodeURIComponent(clean.toUpperCase())},username.eq.${encodeURIComponent(clean.toLowerCase().replace(/^@/, ""))})&limit=1`;

  const profRes = await supabase.select("profiles", filter);
  if (profRes.error) return { data: null, error: profRes.error };
  const row = profRes.data?.[0];
  if (!row) return { data: null, error: { message: "Student profile not found." } };

  const mapped = mapProfileRow(row);
  const rel = getRelationshipStatus({
    viewerId: state.user.id,
    targetId: mapped.id,
    friends: state.friends,
    incoming: state.friendRequests?.incoming,
    outgoing: state.friendRequests?.outgoing
  });

  const isFriend = rel.status === "friends";
  const roomAccess = canUserVisitRoom({
    targetUserId: mapped.id,
    viewerUserId: state.user.id,
    privacy: mapped.privacy,
    isFriend
  });

  const [postsRes, shipsRes] = await Promise.all([
    supabase.select("social_posts", `author_id=eq.${mapped.id}&order=created_at.desc&limit=15`),
    supabase.select("friendships", `or=(user_a.eq.${mapped.id},user_b.eq.${mapped.id})`)
  ]);

  const likedSet = new Set(state.likedPostIds || []);
  const posts = (postsRes.data || []).map((post) => ({
    ...post,
    author: mapped,
    likedByMe: likedSet.has(post.id)
  }));

  return {
    data: {
      profile: mapped,
      relationship: rel,
      roomAccess,
      friendsCount: Array.isArray(shipsRes.data) ? shipsRes.data.length : 0,
      posts
    },
    error: null
  };
}

// ---------------------------------------------------------------------------
// Privacy-Scoped Room Visiting (Strictly checks roomVisibility: public | friends | private)
// ---------------------------------------------------------------------------

export async function fetchSpectatorRoom(targetIdentifier) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in with Supabase to visit another student's room." } };
  }
  const clean = String(targetIdentifier || "").trim();
  if (!clean) return { error: { message: "Enter a student Public ID or UUID." } };

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  const filter = isUuid
    ? `id=eq.${clean}&limit=1`
    : `public_id=eq.${encodeURIComponent(clean.toUpperCase())}&limit=1`;

  const profileRes = await supabase.select("profiles", filter);
  if (profileRes.error) return { error: profileRes.error };

  const profile = profileRes.data?.[0];
  if (!profile) {
    return { error: { message: "Student room not found." } };
  }

  const targetUserId = profile.id;
  let isFriend = (state.friends || []).some((f) => f.id === targetUserId);
  if (!isFriend && targetUserId !== state.user.id) {
    const a = state.user.id < targetUserId ? state.user.id : targetUserId;
    const b = state.user.id < targetUserId ? targetUserId : state.user.id;
    const shipCheck = await supabase.select("friendships", `user_a=eq.${a}&user_b=eq.${b}&limit=1`);
    isFriend = Boolean(shipCheck.data?.length);
  }

  const access = canUserVisitRoom({
    targetUserId,
    viewerUserId: state.user.id,
    privacy: profile.privacy,
    isFriend
  });

  if (!access.allowed) {
    return { error: { message: access.reason } };
  }

  const [
    settingsRes,
    layoutRes,
    sessionsRes,
    userAchRes,
    libRes,
    savedRes,
    shipsRes
  ] = await Promise.all([
    supabase.select("user_settings", `user_id=eq.${targetUserId}&limit=1`),
    supabase.select("room_layouts", `user_id=eq.${targetUserId}&order=is_default.desc,updated_at.desc&limit=1`),
    supabase.select("focus_sessions", `user_id=eq.${targetUserId}&status=eq.completed&order=started_at.desc&limit=500`),
    supabase.select("user_achievements", `user_id=eq.${targetUserId}`),
    supabase.select("library_resources", `author_id=eq.${targetUserId}&order=created_at.desc&limit=40`),
    supabase.select("saved_resources", `user_id=eq.${targetUserId}&order=created_at.desc&limit=40`),
    supabase.select("friendships", `or=(user_a.eq.${targetUserId},user_b.eq.${targetUserId})`)
  ]);

  if (settingsRes.error) {
    return { error: { message: "Room view is restricted by the owner's privacy settings." } };
  }

  const settings = settingsRes.data?.[0];
  if (!settings && targetUserId !== state.user.id) {
    return { error: { message: "Room view is restricted by the owner's privacy settings." } };
  }

  const safeSettings = settings || {};
  const layout = sanitizeRoomLayoutMap(layoutRes.data?.[0]?.layout_json || {});
  const studyRecords = Array.isArray(sessionsRes.data)
    ? sessionsRes.data.map((s) => ({
        id: s.id,
        date: (s.started_at || "").slice(0, 10),
        mode: s.mode || "focus",
        subject: s.subject || "General Study",
        durationSeconds: s.verified_seconds || 0,
        creditsAwarded: s.credits_awarded || 0,
        isManual: Boolean(s.is_manual),
        startedAt: s.started_at
      }))
    : [];
  const unlockedAchievementIds = Array.isArray(userAchRes.data)
    ? userAchRes.data.map((a) => a.achievement_id)
    : [];
  const libraryResources = Array.isArray(libRes.data) ? libRes.data : [];
  const savedResources = Array.isArray(savedRes.data)
    ? savedRes.data.map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category || "Saved",
        summary: s.summary || "",
        author: s.author || ""
      }))
    : [];
  const friendsCount = Array.isArray(shipsRes.data) ? shipsRes.data.length : 0;

  return {
    data: buildSpectatorSafeRoomView({
      id: profile.id,
      publicId: profile.public_id,
      displayName: profile.display_name,
      username: profile.username,
      avatar: profile.avatar_preset,
      avatarUrl: profile.avatar_url,
      bannerUrl: profile.banner_url,
      bio: profile.bio,
      courseClass: profile.course_class,
      examAim: profile.exam_aim,
      favoriteSubjects: profile.favorite_subjects,
      isVerified: Boolean(profile.is_verified),
      privacy: profile.privacy,
      theme: safeSettings.theme,
      timeOfDay: safeSettings.time_of_day,
      weather: safeSettings.weather,
      lighting: safeSettings.lighting,
      skins: safeSettings.skins,
      decorations: safeSettings.decorations,
      customProp: safeSettings.custom_prop,
      layout,
      friendsCount,
      studyRecords,
      unlockedAchievementIds,
      libraryResources,
      savedResources
    }),
    error: null
  };
}

export async function visitFriendRoom(targetIdentifier) {
  const { data, error } = await fetchSpectatorRoom(targetIdentifier);
  if (error || !data) return { data: null, error };

  state.spectatingRoom = data;
  themeManager.apply(data.theme, { persist: false });
  decorationManager.apply();
  decorationManager.applyCustomProp();
  lightingManager.apply();
  layoutManager.applySpectatorLayout(data.layout);

  const badge = document.querySelector(".portrait-badge");
  if (badge) badge.textContent = data.profile.displayName || "Friend";

  const whisper = document.getElementById("room-active-whisper");
  if (whisper) {
    whisper.hidden = false;
    whisper.textContent = `🚪 Visiting ${data.profile.displayName} (Click to return home)`;
  }
  bus.emit("spectator:changed", data);
  return { data, error: null };
}

export function exitSpectatorRoom() {
  if (!state.spectatingRoom) return;
  state.spectatingRoom = null;
  themeManager.apply(state.preferences.theme || "comic", { persist: false });
  skinManager.applySavedSkins();
  decorationManager.apply();
  decorationManager.applyCustomProp();
  lightingManager.apply();
  layoutManager.restoreOwnLayout();

  const badge = document.querySelector(".portrait-badge");
  if (badge) {
    badge.textContent =
      state.user?.displayName ||
      state.localProfile?.displayName ||
      state.preferences.localDisplayName ||
      "Local Student";
  }

  const whisper = document.getElementById("room-active-whisper");
  if (whisper) {
    whisper.hidden = true;
    whisper.textContent = "";
  }
  bus.emit("spectator:changed", null);
}

// ---------------------------------------------------------------------------
// Social Feed (Posts, Likes, Comments)
// ---------------------------------------------------------------------------

export async function loadSocialFeed(scope = "all") {
  if (!supabase.configured || !state.user?.id) {
    state.socialFeed = [];
    state.likedPostIds = [];
    return { data: [], error: null };
  }

  const uid = state.user.id;
  let query = "order=created_at.desc&limit=35";
  if (scope === "mine") {
    query = `author_id=eq.${uid}&order=created_at.desc&limit=35`;
  } else if (scope === "friends") {
    const friendIds = [uid, ...(state.friends || []).map((f) => f.id)].filter(Boolean);
    query = `author_id=in.(${friendIds.join(",")})&order=created_at.desc&limit=35`;
  }

  const [postsRes, likesRes] = await Promise.all([
    supabase.select("social_posts", query),
    supabase.select("social_post_likes", `user_id=eq.${uid}`)
  ]);

  if (postsRes.error) {
    return { data: state.socialFeed || [], error: postsRes.error };
  }

  const likedSet = new Set((likesRes.data || []).map((l) => l.post_id));
  state.likedPostIds = Array.from(likedSet);

  const posts = postsRes.data || [];
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id).filter(Boolean)));
  const authorMap = new Map();
  if (authorIds.length > 0) {
    const profRes = await supabase.select("profiles", `id=in.(${authorIds.join(",")})`);
    for (const p of profRes.data || []) {
      authorMap.set(p.id, mapProfileRow(p));
    }
  }

  state.socialFeed = posts.map((post) => ({
    ...post,
    author: authorMap.get(post.author_id) || {
      id: post.author_id,
      displayName: "Student",
      username: "",
      publicId: "SPRK-USER",
      avatarPreset: "☺",
      avatarUrl: ""
    },
    likedByMe: likedSet.has(post.id)
  }));

  bus.emit("socialFeed:changed", state.socialFeed);
  return { data: state.socialFeed, error: null };
}

export async function createSocialPost({ content, subject = "General Study", postType = "update", visibility = "public" }) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in to post updates to the study feed." } };
  }
  const cleanContent = String(content || "").trim().slice(0, 800);
  if (!cleanContent) return { error: { message: "Post cannot be empty." } };

  const res = await supabase.insert("social_posts", {
    author_id: state.user.id,
    content: cleanContent,
    subject: String(subject || "General Study").trim().slice(0, 48) || "General Study",
    post_type: ["update", "milestone", "question", "resource", "reflection"].includes(postType) ? postType : "update",
    visibility: visibility === "friends" ? "friends" : "public"
  });

  if (!res.error) {
    await loadSocialFeed("all");
  }
  return res;
}

export async function toggleSocialPostLike(postId) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in to like posts." } };
  }
  const uid = state.user.id;
  const alreadyLiked = (state.likedPostIds || []).includes(postId);

  const res = alreadyLiked
    ? await supabase.remove("social_post_likes", `post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${uid}`)
    : await supabase.insert("social_post_likes", { post_id: postId, user_id: uid });

  if (!res.error) {
    state.likedPostIds = alreadyLiked
      ? (state.likedPostIds || []).filter((id) => id !== postId)
      : [...(state.likedPostIds || []), postId];
    state.socialFeed = (state.socialFeed || []).map((p) => {
      if (p.id !== postId) return p;
      const delta = alreadyLiked ? -1 : 1;
      return { ...p, likedByMe: !alreadyLiked, likes_count: Math.max(0, (p.likes_count || 0) + delta) };
    });
    bus.emit("socialFeed:changed", state.socialFeed);
  }
  return res;
}

export async function loadPostComments(postId) {
  if (!supabase.configured || !state.user?.id) return { data: [], error: null };
  const res = await supabase.select("social_post_comments", `post_id=eq.${encodeURIComponent(postId)}&order=created_at.asc`);
  if (res.error) return { data: [], error: res.error };

  const rows = res.data || [];
  const authorIds = Array.from(new Set(rows.map((c) => c.author_id).filter(Boolean)));
  const authorMap = new Map();
  if (authorIds.length > 0) {
    const profRes = await supabase.select("profiles", `id=in.(${authorIds.join(",")})`);
    for (const p of profRes.data || []) authorMap.set(p.id, mapProfileRow(p));
  }
  return {
    data: rows.map((c) => ({
      ...c,
      author: authorMap.get(c.author_id) || { id: c.author_id, displayName: "Student", avatarPreset: "☺", avatarUrl: "" }
    })),
    error: null
  };
}

export async function createPostComment(postId, content) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in to comment." } };
  }
  const clean = String(content || "").trim().slice(0, 400);
  if (!clean) return { error: { message: "Comment cannot be empty." } };
  const res = await supabase.insert("social_post_comments", {
    post_id: postId,
    author_id: state.user.id,
    content: clean
  });
  if (!res.error) {
    state.socialFeed = (state.socialFeed || []).map((p) =>
      p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
    );
    bus.emit("socialFeed:changed", state.socialFeed);
  }
  return res;
}

export async function deleteSocialPost(postId) {
  if (!supabase.configured || !state.user?.id) return { error: { message: "Sign in first." } };
  const res = await supabase.remove("social_posts", `id=eq.${encodeURIComponent(postId)}&author_id=eq.${state.user.id}`);
  if (!res.error) {
    state.socialFeed = (state.socialFeed || []).filter((p) => p.id !== postId);
    bus.emit("socialFeed:changed", state.socialFeed);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Study Groups (Discover, Join by Code, Roster, Discussion, Announcements)
// ---------------------------------------------------------------------------

export async function loadStudyGroups() {
  if (!supabase.configured || !state.user?.id) {
    state.studyGroups = [];
    state.groupMemberships = {};
    return { groups: [], memberships: {} };
  }
  const uid = state.user.id;
  const [groupsRes, memRes] = await Promise.all([
    supabase.select("study_groups", "order=created_at.desc&limit=40"),
    supabase.select("study_group_members", `user_id=eq.${uid}`)
  ]);
  if (Array.isArray(groupsRes.data)) state.studyGroups = groupsRes.data;
  if (Array.isArray(memRes.data)) {
    const map = {};
    for (const row of memRes.data) map[row.group_id] = row.role;
    state.groupMemberships = map;
  }
  bus.emit("groups:changed", state.studyGroups);
  return { groups: state.studyGroups, memberships: state.groupMemberships };
}

export async function createStudyGroup({ name, description = "", subject = "General", isPrivate = false }) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in to create a study group." } };
  }
  const res = await supabase.rpc("create_study_group", {
    p_name: String(name || "").trim(),
    p_description: String(description || "").trim(),
    p_subject: String(subject || "General").trim() || "General",
    p_is_private: Boolean(isPrivate)
  });
  if (!res.error) {
    await loadStudyGroups();
  }
  return res;
}

export async function joinStudyGroup({ groupId = null, inviteCode = null } = {}) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in to join study groups." } };
  }
  const res = await supabase.rpc("join_study_group", {
    p_group_id: groupId || null,
    p_invite_code: inviteCode ? String(inviteCode).trim().toUpperCase() : null
  });
  if (!res.error) {
    await loadStudyGroups();
  }
  return res;
}

export async function leaveStudyGroup(groupId) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in first." } };
  }
  const res = await supabase.rpc("leave_study_group", { p_group_id: groupId });
  if (!res.error) {
    if (state.activeGroupWorkspace?.group?.id === groupId) {
      state.activeGroupWorkspace = null;
    }
    await loadStudyGroups();
  }
  return res;
}

export async function loadGroupWorkspace(groupId) {
  if (!supabase.configured || !state.user?.id || !groupId) {
    return { data: null, error: { message: "Sign in to view group workspace." } };
  }
  const [groupRes, membersRes, msgsRes] = await Promise.all([
    supabase.select("study_groups", `id=eq.${encodeURIComponent(groupId)}&limit=1`),
    supabase.select("study_group_members", `group_id=eq.${encodeURIComponent(groupId)}&order=joined_at.asc`),
    supabase.select("study_group_messages", `group_id=eq.${encodeURIComponent(groupId)}&order=created_at.asc&limit=60`)
  ]);

  const group = groupRes.data?.[0];
  if (!group) return { data: null, error: groupRes.error || { message: "Group not found." } };

  const memberRows = membersRes.data || [];
  const messageRows = msgsRes.data || [];
  const userIds = Array.from(new Set([
    ...memberRows.map((m) => m.user_id),
    ...messageRows.map((m) => m.author_id)
  ].filter(Boolean)));

  const profMap = new Map();
  if (userIds.length > 0) {
    const profRes = await supabase.select("profiles", `id=in.(${userIds.join(",")})`);
    for (const p of profRes.data || []) profMap.set(p.id, mapProfileRow(p));
  }

  const members = memberRows.map((m) => ({
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    profile: profMap.get(m.user_id) || { id: m.user_id, displayName: "Student", publicId: "SPRK-USER", avatarPreset: "☺", avatarUrl: "" }
  }));

  const messages = messageRows.map((msg) => ({
    ...msg,
    author: profMap.get(msg.author_id) || { id: msg.author_id, displayName: "Student", avatarPreset: "☺", avatarUrl: "" }
  }));

  const myRole = members.find((m) => m.userId === state.user.id)?.role || null;
  const workspace = { group, members, messages, myRole };
  state.activeGroupWorkspace = workspace;
  return { data: workspace, error: null };
}

export async function postGroupMessage(groupId, content, messageType = "chat") {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in to post in groups." } };
  }
  const clean = String(content || "").trim().slice(0, 600);
  if (!clean) return { error: { message: "Message cannot be empty." } };
  const res = await supabase.insert("study_group_messages", {
    group_id: groupId,
    author_id: state.user.id,
    content: clean,
    message_type: ["chat", "announcement", "focus_invite"].includes(messageType) ? messageType : "chat"
  });
  if (!res.error) {
    await loadGroupWorkspace(groupId);
  }
  return res;
}

export async function updateGroupAnnouncement(groupId, pinnedAnnouncement) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in first." } };
  }
  const clean = String(pinnedAnnouncement || "").trim().slice(0, 260);
  const res = await supabase.update("study_groups", `id=eq.${encodeURIComponent(groupId)}`, {
    pinned_announcement: clean
  });
  if (!res.error) {
    await loadStudyGroups();
    await loadGroupWorkspace(groupId);
  }
  return res;
}
