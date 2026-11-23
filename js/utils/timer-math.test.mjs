import test from "node:test";
import assert from "node:assert/strict";
import {
  createFocusSession,
  computeElapsedActiveSeconds,
  computeRemainingSeconds,
  pauseFocusSession,
  resumeFocusSession,
  completeFocusSession,
  calculateStudyCreditsForSession,
  computeStudyStreaks
} from "./timer-math.js";

test("focus session derives elapsed time from timestamps and excludes paused duration", () => {
  const start = 1_700_000_000_000;
  let sess = createFocusSession({ targetSeconds: 1500, nowMs: start });
  assert.equal(computeElapsedActiveSeconds(sess, start + 120_000), 120);
  assert.equal(computeRemainingSeconds(sess, start + 120_000), 1380);

  sess = pauseFocusSession(sess, start + 120_000, "manual");
  assert.equal(sess.status, "paused");
  // Even 5 minutes later while paused, active seconds stay at 120
  assert.equal(computeElapsedActiveSeconds(sess, start + 420_000), 120);

  sess = resumeFocusSession(sess, start + 420_000);
  assert.equal(sess.status, "running");
  assert.equal(sess.pausedMs, 300_000);
  assert.equal(computeElapsedActiveSeconds(sess, start + 480_000), 180);

  const done = completeFocusSession(sess, start + 480_000);
  assert.equal(done.status, "completed");
  assert.equal(computeElapsedActiveSeconds(done, start + 900_000), 180);
});

test("study credit rewards reject manual notes, short sessions, and enforce daily cap", () => {
  assert.equal(
    calculateStudyCreditsForSession({ verifiedSeconds: 1500, isManualRecord: true }),
    0
  );
  assert.equal(
    calculateStudyCreditsForSession({ verifiedSeconds: 1500, mode: "short_break" }),
    0
  );
  assert.equal(
    calculateStudyCreditsForSession({ verifiedSeconds: 180 }),
    0
  );
  assert.equal(
    calculateStudyCreditsForSession({ verifiedSeconds: 1500, alreadyEarnedToday: 0 }),
    10
  );
  assert.equal(
    calculateStudyCreditsForSession({ verifiedSeconds: 3000, alreadyEarnedToday: 115, maxDailyCredits: 120 }),
    5
  );
});

test("study streak calculation counts consecutive focus days accurately", () => {
  const records = [
    { date: "2026-11-20", durationSeconds: 1500, mode: "focus" },
    { date: "2026-11-21", durationSeconds: 1500, mode: "focus" },
    { date: "2026-11-22", durationSeconds: 1500, mode: "focus" },
    { date: "2026-11-22", durationSeconds: 120, mode: "focus" },
    { date: "2026-11-15", durationSeconds: 1500, mode: "focus" }
  ];
  const streaks = computeStudyStreaks(records, "2026-11-23");
  assert.equal(streaks.currentStreak, 3);
  assert.equal(streaks.longestStreak, 3);
  assert.equal(streaks.activeDaysCount, 4);
});
