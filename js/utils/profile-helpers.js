// Pure profile formatting, avatar URL sanitization, favorite subjects, schema-fallback helpers, and Supabase error diagnostics

const SAFE_IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const MAX_AVATAR_DATA_URL_LEN = 320_000;

export const AVATAR_PRESETS = Object.freeze(["☺", "🦊", "🦉", "🐱", "🌿", "☕", "🎓", "🚀"]);

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

export function validateUsernameInput(raw = "") {
  const cleaned = String(raw || "").trim().toLowerCase();
  if (!cleaned) return { valid: true, value: "", error: "" };
  if (!/^[a-z0-9_]{3,24}$/.test(cleaned)) {
    return {
      valid: false,
      value: cleaned,
      error: "Username must be 3–24 characters using only letters, numbers, or underscores."
    };
  }
  return { valid: true, value: cleaned, error: "" };
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

export function extractMissingColumn(errorMessage = "", tableName = null) {
  const msg = String(errorMessage || "");
  const patterns = [
    /Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i,
    /column ['"]?([a-zA-Z0-9_]+)['"]? of relation ['"]?[a-zA-Z0-9_]+['"]? does not exist/i,
    /column [a-zA-Z0-9_]+\.([a-zA-Z0-9_]+) does not exist/i
  ];
  if (tableName) {
    const escaped = String(tableName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.unshift(
      new RegExp(`Could not find the ['"]([a-zA-Z0-9_]+)['"] column of ['"]${escaped}['"]`, "i"),
      new RegExp(`column ['"]?([a-zA-Z0-9_]+)['"]? of relation ['"]?${escaped}['"]? does not exist`, "i"),
      new RegExp(`column ${escaped}\\.([a-zA-Z0-9_]+) does not exist`, "i")
    );
  }
  for (const re of patterns) {
    const match = msg.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function extractMissingProfileColumn(errorMessage = "") {
  return extractMissingColumn(errorMessage, "profiles");
}

export function buildProfileDbPayload(clean = {}, fields = {}, excludedColumns = []) {
  const excluded = new Set(excludedColumns || []);
  const raw = {
    display_name: clean.displayName,
    username: clean.username || null,
    avatar_preset: clean.avatarPreset,
    avatar_url: clean.avatarUrl || "",
    bio: clean.bio || "",
    course_class: clean.courseClass || "",
    exam_aim: clean.examAim || "",
    favorite_subjects: Array.isArray(clean.favoriteSubjects) ? clean.favoriteSubjects : [],
    updated_at: new Date().toISOString()
  };

  if (fields.privacy) {
    raw.privacy = fields.privacy;
  }

  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!excluded.has(k)) out[k] = v;
  }
  return out;
}

export function buildProfileAuthMetadata(clean = {}) {
  return {
    display_name: clean.displayName || "Student",
    username: clean.username || "",
    avatar_preset: clean.avatarPreset || "☺",
    avatar_url: clean.avatarUrl || "",
    bio: clean.bio || "",
    course_class: clean.courseClass || "",
    exam_aim: clean.examAim || "",
    favorite_subjects: Array.isArray(clean.favoriteSubjects) ? clean.favoriteSubjects : []
  };
}

export function mergeResolvedProfile({
  uid = "",
  email = "",
  dbRow = {},
  userMetadata = {},
  localProfile = {}
} = {}) {
  const row = dbRow || {};
  const meta = userMetadata || {};
  const local = localProfile || {};

  const pickString = (...candidates) => {
    for (const val of candidates) {
      if (typeof val === "string" && val.length > 0) return val;
    }
    for (const val of candidates) {
      if (typeof val === "string") return val;
    }
    return "";
  };

  const favSubjects = Array.isArray(row.favorite_subjects) && row.favorite_subjects.length > 0
    ? row.favorite_subjects
    : Array.isArray(meta.favorite_subjects) && meta.favorite_subjects.length > 0
      ? meta.favorite_subjects
      : Array.isArray(local.favoriteSubjects)
        ? local.favoriteSubjects
        : [];

  return {
    id: uid,
    email,
    publicId: row.public_id || (uid ? `SPK-${uid.slice(0, 6).toUpperCase()}` : "LOCAL"),
    username: pickString(row.username, meta.username, local.username),
    displayName: pickString(row.display_name, meta.display_name, local.displayName) || "Student",
    avatarPreset: pickString(row.avatar_preset, meta.avatar_preset, local.avatarPreset) || "☺",
    avatarUrl: sanitizeAvatarUrl(pickString(row.avatar_url, meta.avatar_url, local.avatarUrl)),
    bio: pickString(row.bio, meta.bio, local.bio),
    courseClass: pickString(row.course_class, meta.course_class, local.courseClass),
    examAim: pickString(row.exam_aim, meta.exam_aim, local.examAim),
    favoriteSubjects: parseFavoriteSubjects(favSubjects),
    privacy: row.privacy || { showOnlineStatus: true, showStudyActivity: true, allowRoomVisits: true }
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

  if (lower.includes("duplicate key") && lower.includes("username")) {
    return "That username is already taken. Try a different handle.";
  }

  if (lower.includes("row-level security") || lower.includes("42501")) {
    return "Permission denied by Supabase security policy. Try signing out and signing back in.";
  }

  if (lower.includes("relation") && lower.includes("does not exist")) {
    return "Supabase tables are not initialized yet. Run supabase/migrations/001_sprk_desk_schema.sql in your Supabase SQL Editor.";
  }

  return rawMessage || "Request failed.";
}
