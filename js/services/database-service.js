// Supabase Database Service with clean fallback boundaries
import { supabase } from "./supabase.js";
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { buildSpectatorSafeRoomView } from "../utils/privacy-scope.js";

export async function syncAuthenticatedUserData() {
  if (!supabase.configured || !state.user?.id) return;
  const uid = state.user.id;

  const [
    ledgerRes,
    invRes,
    eqRes,
    tasksRes,
    notesRes,
    sessionsRes,
    notifRes,
    achRes,
    userAchRes
  ] = await Promise.all([
    supabase.select("study_credit_transactions", `user_id=eq.${uid}&order=created_at.desc&limit=50`),
    supabase.select("user_inventory", `user_id=eq.${uid}`),
    supabase.select("user_equipped_items", `user_id=eq.${uid}`),
    supabase.select("study_tasks", `user_id=eq.${uid}&order=created_at.desc`),
    supabase.select("study_notes", `user_id=eq.${uid}&order=updated_at.desc`),
    supabase.select("focus_sessions", `user_id=eq.${uid}&order=started_at.desc&limit=100`),
    supabase.select("notifications", `user_id=eq.${uid}&order=created_at.desc&limit=30`),
    supabase.select("achievements", "order=id.asc"),
    supabase.select("user_achievements", `user_id=eq.${uid}`)
  ]);

  if (Array.isArray(ledgerRes.data)) {
    const ledger = ledgerRes.data;
    const balance = ledger.reduce((acc, tx) => acc + (tx.amount || 0), 0);
    const earned = ledger.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0);
    const spent = ledger.filter((t) => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
    state.wallet = { balance: Math.max(0, balance), earned, spent, ledger };
  }

  if (Array.isArray(invRes.data)) {
    state.ownedItemIds = Array.from(new Set(["theme_comic", "theme_modern", ...invRes.data.map((r) => r.item_id)]));
  }
  if (Array.isArray(eqRes.data)) {
    const equipped = {};
    for (const row of eqRes.data) equipped[row.slot] = row.item_id;
    state.equippedItems = equipped;
  }
  if (Array.isArray(tasksRes.data)) {
    state.localTasks = tasksRes.data.map((t) => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      priority: t.priority,
      dueDate: t.due_date || "",
      completed: t.completed,
      noteColor: t.note_color || "butter"
    }));
  }
  if (Array.isArray(notesRes.data)) {
    state.localDiary = notesRes.data.map((n) => ({
      id: n.id,
      folder: n.folder,
      isDiary: n.is_diary,
      title: n.title,
      content: n.content,
      pinned: n.pinned,
      updatedAt: n.updated_at
    }));
  }
  if (Array.isArray(sessionsRes.data)) {
    state.localStudyRecords = sessionsRes.data.map((s) => ({
      id: s.id,
      date: (s.started_at || "").slice(0, 10),
      mode: s.mode,
      subject: s.subject,
      durationSeconds: s.verified_seconds || 0,
      creditsAwarded: s.credits_awarded || 0,
      isManual: Boolean(s.is_manual),
      startedAt: s.started_at
    }));
  }
  if (Array.isArray(notifRes.data)) state.notifications = notifRes.data;
  if (Array.isArray(achRes.data)) state.achievements = achRes.data;
  if (Array.isArray(userAchRes.data)) {
    state.unlockedAchievementIds = userAchRes.data.map((a) => a.achievement_id);
  }

  bus.emit("sync:completed");
}

export async function updateProfile(fields) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in with Supabase to save cloud profile." } };
  }
  const { data, error } = await supabase.update(
    "profiles",
    `id=eq.${state.user.id}`,
    {
      display_name: fields.displayName,
      username: fields.username || null,
      avatar_preset: fields.avatarPreset,
      bio: fields.bio,
      updated_at: new Date().toISOString()
    }
  );
  if (!error && data?.[0]) {
    state.user = {
      ...state.user,
      displayName: data[0].display_name,
      username: data[0].username || "",
      avatarPreset: data[0].avatar_preset,
      bio: data[0].bio || ""
    };
    bus.emit("auth:changed", state.user);
  }
  return { data, error };
}

export async function fetchSpectatorRoom(targetUserId) {
  if (!supabase.configured || !state.user?.id) {
    return { error: { message: "Sign in with Supabase to visit another student's room." } };
  }
  const [profileRes, settingsRes, layoutRes] = await Promise.all([
    supabase.select("profiles", `id=eq.${targetUserId}&limit=1`),
    supabase.select("user_settings", `user_id=eq.${targetUserId}&limit=1`),
    supabase.select("room_layouts", `user_id=eq.${targetUserId}&is_default=eq.true&limit=1`)
  ]);
  const profile = profileRes.data?.[0];
  if (!profile) {
    return { error: { message: "Room is unavailable or private." } };
  }
  const settings = settingsRes.data?.[0] || {};
  const layout = layoutRes.data?.[0]?.layout_json || {};
  return {
    data: buildSpectatorSafeRoomView({
      publicId: profile.public_id,
      displayName: profile.display_name,
      avatar: profile.avatar_preset,
      bio: profile.bio,
      theme: settings.theme,
      timeOfDay: settings.time_of_day,
      weather: settings.weather,
      layout
    }),
    error: null
  };
}
