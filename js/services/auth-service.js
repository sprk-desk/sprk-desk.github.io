// Supabase Authentication Service
import { supabase } from "./supabase.js";
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";

export async function signUpWithEmail({ email, password, displayName }) {
  if (!supabase.configured) {
    return { error: { message: "Connect Supabase in config.js before creating a cloud account." } };
  }
  const { data, error } = await supabase.request("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      data: { display_name: displayName || "Student" }
    })
  });
  if (error) return { error };
  if (data?.access_token) {
    supabase.setSession(data);
    await restoreSession();
  }
  return { data, error: null };
}

export async function signInWithEmail({ email, password }) {
  if (!supabase.configured) {
    return { error: { message: "Connect Supabase in config.js to sign in." } };
  }
  const { data, error } = await supabase.request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (error) return { error };
  supabase.setSession(data);
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
  });
}

export async function signOut() {
  if (supabase.configured && supabase.accessToken) {
    await supabase.request("/auth/v1/logout", { method: "POST" });
  }
  supabase.setSession(null);
  state.user = null;
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
    supabase.setSession(null);
    state.user = null;
    bus.emit("auth:changed", null);
    return null;
  }

  const uid = userResp.id;
  const [profileRes, roleRes, entRes] = await Promise.all([
    supabase.select("profiles", `id=eq.${uid}&limit=1`),
    supabase.select("user_roles", `user_id=eq.${uid}&limit=1`),
    supabase.select("user_entitlements", `user_id=eq.${uid}&status=eq.active`)
  ]);

  const profile = profileRes.data?.[0] || {};
  const role = roleRes.data?.[0]?.role || "user";
  const isPremium = Boolean(entRes.data?.some((e) => e.entitlement === "premium"));

  state.user = {
    id: uid,
    email: userResp.email,
    publicId: profile.public_id || "SPK-USER",
    username: profile.username || "",
    displayName: profile.display_name || userResp.user_metadata?.display_name || "Student",
    avatarPreset: profile.avatar_preset || "☺",
    avatarUrl: profile.avatar_url || "",
    bio: profile.bio || "",
    role,
    isPremium
  };
  bus.emit("auth:changed", state.user);
  return state.user;
}
