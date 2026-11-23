import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeAvatarUrl,
  parseFavoriteSubjects,
  formatProfilePayload,
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

test("formatProfilePayload normalizes academic profile fields cleanly", () => {
  const out = formatProfilePayload({
    displayName: "  Aarav  ",
    username: "Aarav_Study",
    avatarPreset: "🦉",
    avatarUrl: "https://example.com/a.jpg",
    bio: "Late night notes",
    courseClass: "B.Tech CSE · Sem 5",
    examAim: "GATE 2026",
    favoriteSubjects: "OS, DBMS, Algorithms"
  });
  assert.equal(out.displayName, "Aarav");
  assert.equal(out.username, "aarav_study");
  assert.equal(out.courseClass, "B.Tech CSE · Sem 5");
  assert.equal(out.examAim, "GATE 2026");
  assert.deepEqual(out.favoriteSubjects, ["OS", "DBMS", "Algorithms"]);
});

test("normalizeSupabaseError produces actionable message on unreachable host", () => {
  const msg = normalizeSupabaseError(new TypeError("Failed to fetch"), "https://cthoznbtmxgrzdxttog.supabase.co");
  assert.match(msg, /Cannot reach Supabase server \(cthoznbtmxgrzdxttog\.supabase\.co\)/);
});
