// Pure profile formatting, avatar URL sanitization, favorite subjects, and Supabase error diagnostics

const SAFE_IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const MAX_AVATAR_DATA_URL_LEN = 320_000;

export function sanitizeAvatarUrl(rawUrl) {
  if (typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (SAFE_IMAGE_DATA_URL_RE.test(trimmed)) {
    return trimmed.length <= MAX_AVATAR_DATA_URL_LEN ? trimmed : "";
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    return "";
  }
  return "";
}

export function parseFavoriteSubjects(input) {
  const rawList = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];

  const seen = new Set();
  const subjects = [];
  for (const entry of rawList) {
    if (typeof entry !== "string") continue;
    const cleaned = entry.trim().slice(0, 30);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    subjects.push(cleaned);
    if (subjects.length >= 8) break;
  }
  return subjects;
}

export function formatProfilePayload(fields = {}) {
  const displayName = String(fields.displayName || "Student").trim().slice(0, 32) || "Student";
  const usernameRaw = String(fields.username || "").trim().toLowerCase();
  const username = /^[a-z0-9_]{3,24}$/.test(usernameRaw) ? usernameRaw : "";
  const avatarPreset = String(fields.avatarPreset || "☺").trim().slice(0, 8) || "☺";
  const avatarUrl = sanitizeAvatarUrl(fields.avatarUrl || "");
  const bio = String(fields.bio || "").trim().slice(0, 200);
  const courseClass = String(fields.courseClass || "").trim().slice(0, 64);
  const examAim = String(fields.examAim || "").trim().slice(0, 80);
  const favoriteSubjects = parseFavoriteSubjects(fields.favoriteSubjects);

  return {
    displayName,
    username,
    avatarPreset,
    avatarUrl,
    bio,
    courseClass,
    examAim,
    favoriteSubjects
  };
}

export function normalizeSupabaseError(err, supabaseUrl = "") {
  const rawMessage = typeof err === "string" ? err : (err?.message || "");
  const lower = rawMessage.toLowerCase();
  let host = "";
  try {
    if (supabaseUrl) host = new URL(supabaseUrl).host;
  } catch {
    host = supabaseUrl;
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("err_name_not_resolved") ||
    lower.includes("could not resolve")
  ) {
    return host
      ? `Cannot reach Supabase server (${host}). Check your Project URL and Anon Key in config.js or .env.`
      : "Cannot reach Supabase server. Check your Project URL and Anon Key in config.js or .env.";
  }

  if (lower.includes("email not confirmed")) {
    return "Check your inbox and confirm your email address before signing in.";
  }

  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password. If you haven't created an account on this Supabase project yet, open Register first.";
  }

  if (lower.includes("relation") && lower.includes("does not exist")) {
    return "Supabase tables are not initialized yet. Run supabase/migrations/001_sprk_desk_schema.sql in your Supabase SQL Editor.";
  }

  return rawMessage || "Request failed.";
}
