// Supabase Database Service: Full Cloud Sync for Preferences, Room Layouts, Profile, Friends, Tasks, Diary & Library
import { supabase } from "./supabase.js";
import { state, savePreferences, saveLocalProfile, persistLocalCollection } from "../state.js";
import { bus } from "../core/event-bus.js";
import { themeManager } from "../core/theme-manager.js";
import { skinManager } from "../core/skin-manager.js";
import { lightingManager } from "../core/lighting-manager.js";
import { layoutManager } from "../core/layout-manager.js";
import { decorationManager } from "../core/decoration-manager.js";
import { buildSpectatorSafeRoomView } from "../utils/privacy-scope.js";
import {
  formatProfilePayload,
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
    groupsRes
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
    supabase.select("study_groups", "order=created_at.desc&limit=20")
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
    // First cloud sync for this user -> push current local theme/settings up
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

  await loadFriendsAndRequests();
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

  if (!supabase.configured || !state.user?.id) {
    saveLocalProfile(clean);
    return { data: [clean], error: null, localOnly: true };
  }

  const uid = state.user.id;
  const excludedColumns = [];
  let data = null;
  let error = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const payload = buildProfileDbPayload(clean, fields, excludedColumns);
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

    // If PATCH matched 0 rows (e.g. bootstrap profile row didn't exist yet), upsert it cleanly
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

  // Always back up full academic card fields into Auth user_metadata as a resilient fallback
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
      localProfile: clean
    });
    state.user = {
      ...state.user,
      ...merged,
      privacy: row.privacy || fields.privacy || state.user.privacy
    };
    saveLocalProfile(clean);
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

  // Compact client fallback when in local workspace
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

// Friends & Friend Requests
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

  state.friends = Array.from(friendIds).map((id) => {
    const p = profileMap.get(id) || {};
    return {
      id,
      publicId: p.public_id || "SPK-USER",
      username: p.username || "",
      displayName: p.display_name || "Student",
      avatarPreset: p.avatar_preset || "☺",
      avatarUrl: p.avatar_url || "",
      bio: p.bio || "",
      courseClass: p.course_class || "",
      examAim: p.exam_aim || "",
      favoriteSubjects: Array.isArray(p.favorite_subjects) ? p.favorite_subjects : [],
      privacy: p.privacy || { showOnlineStatus: true, showStudyActivity: true, allowRoomVisits: true }
    };
  });

  state.friendRequests = {
    incoming: incomingRaw.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      profile: profileMap.get(r.sender_id) || { id: r.sender_id, display_name: "Student", public_id: "SPK-USER" }
    })),
    outgoing: outgoingRaw.map((r) => ({
      id: r.id,
      receiverId: r.receiver_id,
      profile: profileMap.get(r.receiver_id) || { id: r.receiver_id, display_name: "Student", public_id: "SPK-USER" }
    }))
  };

  bus.emit("friends:changed", state.friends);
  return { friends: state.friends, ...state.friendRequests };
}

export async function searchStudentProfiles(query) {
  if (!supabase.configured || !state.user?.id) {
    return { data: [], error: { message: "Sign in to search students." } };
  }
  const trimmed = String(query || "").trim();
  if (!trimmed) return { data: [], error: null };

  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  const res = await supabase.select(
    "profiles",
    `or=(public_id.eq.${encodeURIComponent(upper)},username.eq.${encodeURIComponent(lower)})&limit=6`
  );
  if (res.error) return res;
  return {
    data: (res.data || []).filter((p) => p.id !== state.user.id),
    error: null
  };
}

export async function sendFriendRequest(receiverId) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in to send friend requests." } };
  }
  const res = await supabase.insert("friend_requests", {
    sender_id: state.user.id,
    receiver_id: receiverId,
    status: "pending"
  });
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
  if (profile.privacy?.allowRoomVisits === false) {
    return { error: { message: "This student's room is set to private." } };
  }

  const targetUserId = profile.id;
  const [settingsRes, layoutRes] = await Promise.all([
    supabase.select("user_settings", `user_id=eq.${targetUserId}&limit=1`),
    supabase.select("room_layouts", `user_id=eq.${targetUserId}&order=is_default.desc,updated_at.desc&limit=1`)
  ]);
  const settings = settingsRes.data?.[0] || {};
  const layout = sanitizeRoomLayoutMap(layoutRes.data?.[0]?.layout_json || {});

  return {
    data: buildSpectatorSafeRoomView({
      id: profile.id,
      publicId: profile.public_id,
      displayName: profile.display_name,
      username: profile.username,
      avatar: profile.avatar_preset,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      courseClass: profile.course_class,
      examAim: profile.exam_aim,
      favoriteSubjects: profile.favorite_subjects,
      privacy: profile.privacy,
      theme: settings.theme,
      timeOfDay: settings.time_of_day,
      weather: settings.weather,
      lighting: settings.lighting,
      skins: settings.skins,
      decorations: settings.decorations,
      customProp: settings.custom_prop,
      layout
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
