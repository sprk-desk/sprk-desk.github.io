import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeAvatarUrl,
  parseFavoriteSubjects,
  validateUsernameInput,
  formatProfilePayload,
  normalizePrivacySettings,
  extractMissingProfileColumn,
  buildProfileDbPayload,
  buildProfileAuthMetadata,
  mergeResolvedProfile,
  normalizeSupabaseError
} from "./profile-helpers.js";

test("sanitizeAvatarUrl permits https and safe base64 images and rejects javascript/svg payloads", () => {
  assert.equal(sanitizeAvatarUrl("https://cdn.example.com/pfp.png"), "https://cdn.example.com/pfp.png");
  assert.equal(
    sanitizeAvatarUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="),
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
  );
  assert.equal(sanitizeAvatarUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeAvatarUrl("data:image/svg+xml;base64,PHN2Zz4="), "");
});

test("parseFavoriteSubjects deduplicates, trims, and caps at 8 subjects", () => {
  const subs = parseFavoriteSubjects(" Calculus, calculus , Physics, Algorithms, Linear Algebra, Biology, Chemistry, History, Economics, Art ");
  assert.deepEqual(subs, [
    "Calculus",
    "Physics",
    "Algorithms",
    "Linear Algebra",
    "Biology",
    "Chemistry",
    "History",
    "Economics"
  ]);
});

test("validateUsernameInput allows blank or 3-24 lowercase/underscore handles and rejects invalid chars", () => {
  assert.deepEqual(validateUsernameInput(""), { valid: true, value: "", error: "" });
  assert.deepEqual(validateUsernameInput("  Aarav_01 "), { valid: true, value: "aarav_01", error: "" });
  const badShort = validateUsernameInput("ab");
  assert.equal(badShort.valid, false);
  assert.match(badShort.error, /3–24 characters/);
  const badChars = validateUsernameInput("aarav-study!");
  assert.equal(badChars.valid, false);
});

test("formatProfilePayload normalizes academic profile fields and bannerUrl cleanly", () => {
  const out = formatProfilePayload({
    displayName: "  Aarav  ",
    username: "Aarav_Study",
    avatarPreset: "🦉",
    avatarUrl: "https://example.com/a.jpg",
    bannerUrl: "javascript:alert(1)",
    bio: "Late night notes",
    courseClass: "B.Tech CSE · Sem 5",
    examAim: "GATE 2026",
    favoriteSubjects: "OS, DBMS, Algorithms"
  });
  assert.equal(out.displayName, "Aarav");
  assert.equal(out.username, "aarav_study");
  assert.equal(out.bannerUrl, "");
  assert.equal(out.courseClass, "B.Tech CSE · Sem 5");
  assert.equal(out.examAim, "GATE 2026");
  assert.deepEqual(out.favoriteSubjects, ["OS", "DBMS", "Algorithms"]);
});

test("normalizePrivacySettings keeps roomVisibility and allowRoomVisits synchronized", () => {
  assert.deepEqual(normalizePrivacySettings({ roomVisibility: "public" }), {
    showOnlineStatus: true,
    showStudyActivity: true,
    allowRoomVisits: true,
    roomVisibility: "public"
  });
  assert.deepEqual(normalizePrivacySettings({ allowRoomVisits: false, showOnlineStatus: false }), {
    showOnlineStatus: false,
    showStudyActivity: true,
    allowRoomVisits: false,
    roomVisibility: "private"
  });
});

test("extractMissingProfileColumn parses PostgREST and Postgres missing column errors", () => {
  assert.equal(
    extractMissingProfileColumn("Could not find the 'course_class' column of 'profiles' in the schema cache"),
    "course_class"
  );
  assert.equal(
    extractMissingProfileColumn('column "exam_aim" of relation "profiles" does not exist'),
    "exam_aim"
  );
  assert.equal(extractMissingProfileColumn("Permission denied"), null);
});

test("buildProfileDbPayload filters excluded columns and preserves privacy when passed", () => {
  const clean = formatProfilePayload({
    displayName: "Meera",
    username: "meera_med",
    bio: "Anatomy flashcards",
    courseClass: "MBBS Year 2"
  });
  const payload = buildProfileDbPayload(clean, { privacy: { showOnlineStatus: false } }, ["course_class", "exam_aim"]);
  assert.equal(payload.display_name, "Meera");
  assert.equal(payload.bio, "Anatomy flashcards");
  assert.equal("course_class" in payload, false);
  assert.equal("exam_aim" in payload, false);
  assert.deepEqual(payload.privacy, { showOnlineStatus: false });

  const meta = buildProfileAuthMetadata(clean);
  assert.equal(meta.bio, "Anatomy flashcards");
  assert.equal(meta.course_class, "MBBS Year 2");
});

test("mergeResolvedProfile prefers non-empty DB row fields and falls back to auth metadata when DB omits newer columns", () => {
  const merged = mergeResolvedProfile({
    uid: "abcdef12-3456-7890-abcd-ef1234567890",
    email: "meera@example.com",
    dbRow: {
      display_name: "Meera",
      bio: "DB bio"
    },
    userMetadata: {
      display_name: "Old Name",
      course_class: "MBBS Year 2",
      exam_aim: "NEET PG",
      favorite_subjects: ["Anatomy", "Physiology"]
    }
  });
  assert.equal(merged.publicId, "SPK-ABCDEF");
  assert.equal(merged.displayName, "Meera");
  assert.equal(merged.bio, "DB bio");
  assert.equal(merged.courseClass, "MBBS Year 2");
  assert.equal(merged.examAim, "NEET PG");
  assert.deepEqual(merged.favoriteSubjects, ["Anatomy", "Physiology"]);
});

test("normalizeSupabaseError produces actionable messages for network, duplicate username, and RLS errors", () => {
  const msg = normalizeSupabaseError(new TypeError("Failed to fetch"), "https://cthoznbtmxgrzdxttog.supabase.co");
  assert.match(msg, /Cannot reach Supabase server \(cthoznbtmxgrzdxttog\.supabase\.co\)/);

  const dup = normalizeSupabaseError('duplicate key value violates unique constraint "profiles_username_key"');
  assert.match(dup, /username is already taken/i);

  const rls = normalizeSupabaseError("new row violates row-level security policy for table profiles");
  assert.match(rls, /security policy/i);
});
