import test from "node:test";
import assert from "node:assert/strict";
import { formatElapsedLabel, mergeFriendsWithPresence, summarizeStudyCircle } from "./study-circle.js";

test("formatElapsedLabel formats seconds cleanly into compact durations", () => {
  assert.equal(formatElapsedLabel(20), "<1m");
  assert.equal(formatElapsedLabel(900), "15m");
  assert.equal(formatElapsedLabel(3600), "1h");
  assert.equal(formatElapsedLabel(4500), "1h 15m");
});

test("mergeFriendsWithPresence respects privacy, computes co-studying, and sorts studying > online > offline", () => {
  const now = 1_700_000_900_000;
  const friends = [
    { id: "f1", displayName: "Zara", privacy: { showOnlineStatus: true, showStudyActivity: true } },
    { id: "f2", displayName: "Aarav", privacy: { showOnlineStatus: true, showStudyActivity: true } },
    { id: "f3", displayName: "Dev", privacy: { showOnlineStatus: true, showStudyActivity: false } },
    { id: "f4", displayName: "Nina", privacy: { showOnlineStatus: false, showStudyActivity: false } }
  ];

  const entries = mergeFriendsWithPresence({
    friends,
    userIsStudying: true,
    nowMs: now,
    presenceByUserId: {
      f2: { isStudying: true, subject: "Organic Chem", startedAtMs: now - 600_000, targetSeconds: 1500 },
      f3: { isStudying: true, subject: "Hidden Subject", showStudyActivity: false },
      f4: { isStudying: true, subject: "Hidden All" }
    },
    activeFocusByUserId: {
      f1: null
    }
  });

  assert.deepEqual(entries.map((e) => [e.id, e.status]), [
    ["f2", "studying"],
    ["f3", "online"],
    ["f4", "offline"],
    ["f1", "offline"]
  ]);
  assert.equal(entries[0].subject, "Organic Chem");
  assert.equal(entries[0].elapsedLabel, "10m");
  assert.equal(entries[0].progressPct, 40);
  assert.equal(entries[0].isStudyingWithUser, true);
  assert.equal(entries[1].subject, "");
});

test("summarizeStudyCircle calculates studying, online, and co-studying counts accurately", () => {
  const summaryIdle = summarizeStudyCircle(
    [
      { status: "studying" },
      { status: "online" },
      { status: "offline" }
    ],
    null
  );
  assert.deepEqual(summaryIdle, {
    studyingCount: 1,
    onlineCount: 2,
    totalFriends: 3,
    selfIsStudying: false,
    coStudyingCount: 0
  });

  const summaryActive = summarizeStudyCircle(
    [
      { status: "studying" },
      { status: "studying" },
      { status: "offline" }
    ],
    { status: "running" }
  );
  assert.equal(summaryActive.selfIsStudying, true);
  assert.equal(summaryActive.coStudyingCount, 2);
});
