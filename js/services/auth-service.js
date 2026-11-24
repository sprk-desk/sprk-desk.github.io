// Supabase Authentication Service
import { supabase } from "./supabase.js";
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { mergeResolvedProfile } from "../utils/profile-helpers.js";

async function ensureUserBootstrap(userResp, displayNameHint = "Student") {
  const uid = userResp?.id;
  if (!uid) return;
  const fallbackName =
    displayNameHint ||
    userResp.user_metadata?.display_name ||
    (userResp.email ? userResp.email.split("@")[0] : "Student");

  const existingProfile = await supabase.select("profiles", `id=eq.${uid}&limit=1`);
  if (!existingProfile.error && (!existingProfile.data || existingProfile.data.length === 0)) {
    await supabase.upsert("profiles", {
      id: uid,
      display_name: fallbackName
    }, "id");
  }

  const existingSettings = await supabase.select("user_settings", `user_id=eq.${uid}&limit=1`);
  if (!existingSettings.error && (!existingSettings.data || existingSettings.data.length === 0)) {
    await supabase.upsert("user_settings", {
      user_id: uid,
      local_display_name: fallbackName
    }, "user_id");
  }
}

export async function signUpWithEmail({ email, password, displayName }) {
  if (!supabase.configured) {
    return { error: { message: "Connect Supabase in config.js or .env before creating a cloud account." } };
  }
  const cleanName = String(displayName || "").trim() || "Student";
  const { data, error } = await supabase.request("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      data: { display_name: cleanName }
    })
  }, { skipAutoRefresh: true });
  if (error) return { error };

  if (data?.access_token) {
    supabase.setSession(data);
    await ensureUserBootstrap(data.user || { id: data.user?.id, email }, cleanName);
    await restoreSession();
    return { data, requiresEmailConfirmation: false, error: null };
  }

  return {
    data,
    requiresEmailConfirmation: true,
    error: null
  };
}

export async function signInWithEmail({ email, password }) {
  if (!supabase.configured) {
    return { error: { message: "Connect Supabase in config.js or .env to sign in." } };
  }
  const { data, error } = await supabase.request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }, { skipAutoRefresh: true });
  if (error) return { error };

  supabase.setSession(data);
  if (data?.user?.id) {
    await ensureUserBootstrap(data.user, data.user.user_metadata?.display_name);
  }
  await restoreSession();
  return { data, error: null };
}

export async function sendPasswordRecovery(email) {
  if (!supabase.configured) {
    return { error: { message: "Supabase is not configured." } };
  }
  return supabase.request("/auth/v1/recover", {
    method: "POST",
    body: JSON.stringify({ email })
  }, { skipAutoRefresh: true });
}

export async function signOut() {
  if (supabase.configured && supabase.accessToken) {
    await supabase.request("/auth/v1/logout", { method: "POST" });
  }
  supabase.setSession(null);
  state.user = null;
  state.friends = [];
  state.friendRequests = { incoming: [], outgoing: [] };
  state.socialFeed = [];
  state.likedPostIds = [];
  state.suggestedStudents = [];
  state.studyGroups = [];
  state.groupMemberships = {};
  state.activeGroupWorkspace = null;
  state.wallet = { balance: 0, earned: 0, spent: 0, ledger: [] };
  bus.emit("auth:changed", null);
}

export async function restoreSession() {
  if (!supabase.configured || !supabase.accessToken) {
    state.user = null;
    bus.emit("auth:changed", null);
    return null;
  }

  const { data: userResp, error } = await supabase.request("/auth/v1/user", { method: "GET" });
  if (error || !userResp?.id) {
    // Only clear stored session when auth rejects the token (401/403); preserve on transient network issues
    if (!error?.networkError) {
      supabase.setSession(null);
    }
    state.user = null;
    bus.emit("auth:changed", null);
    return null;
  }

  const uid = userResp.id;
  let [profileRes, roleRes, entRes] = await Promise.all([
    supabase.select("profiles", `id=eq.${uid}&limit=1`),
    supabase.select("user_roles", `user_id=eq.${uid}&limit=1`),
    supabase.select("user_entitlements", `user_id=eq.${uid}&status=eq.active`)
  ]);

  if (!profileRes.error && (!profileRes.data || profileRes.data.length === 0)) {
    await ensureUserBootstrap(userResp, userResp.user_metadata?.display_name);
    profileRes = await supabase.select("profiles", `id=eq.${uid}&limit=1`);
  }

  const profile = profileRes.data?.[0] || {};
  const role = roleRes.data?.[0]?.role || "user";
  const isPremium = Boolean(entRes.data?.some((e) => e.entitlement === "premium"));

  state.user = {
    ...mergeResolvedProfile({
      uid,
      email: userResp.email,
      dbRow: profile,
      userMetadata: userResp.user_metadata,
      localProfile: state.localProfile
    }),
    role,
    isPremium
  };
  bus.emit("auth:changed", state.user);
  return state.user;
}
