import test from "node:test";
import assert from "node:assert/strict";
import {
  createFlashcard,
  reviewFlashcard,
  isFlashcardDue,
  getDueFlashcards,
  resolveNextPomodoroStep,
  computeSubjectBudgetsProgress,
  computeExamCountdown,
  renderSafeMarkdownHtml,
  formatStudyRecordsCsv,
  formatStudyRecordsMarkdown,
  computeSyncedRoomPhase,
  kelvinToLampRgb,
  validateBackupPayload
} from "./study-tools.js";

test("flashcard SM-2 review schedules intervals accurately", () => {
  const t0 = 1_700_000_000_000;
  const card = createFlashcard({ id: "c1", deck: "Calc", front: "d/dx ln(x)", back: "1/x", nowMs: t0 });
  assert.equal(isFlashcardDue(card, t0), true);

  const afterGood1 = reviewFlashcard(card, "good", t0);
  assert.equal(afterGood1.intervalDays, 1);
  assert.equal(isFlashcardDue(afterGood1, t0 + 1000), false);
  assert.equal(isFlashcardDue(afterGood1, t0 + 86400000), true);

  const afterGood2 = reviewFlashcard(afterGood1, "good", t0 + 86400000);
  assert.equal(afterGood2.intervalDays, 6);

  const afterAgain = reviewFlashcard(afterGood2, "again", t0 + 86400000);
  assert.equal(afterAgain.reps, 0);
  assert.equal(afterAgain.intervalDays, 0);

  const due = getDueFlashcards([afterGood2, card], t0);
  assert.equal(due.length, 1);
  assert.equal(due[0].id, "c1");
});

test("Pomodoro cycle transitions focus -> short break -> long break on 4th cycle", () => {
  const s1 = resolveNextPomodoroStep({ completedMode: "focus", completedFocusCycles: 0 });
  assert.equal(s1.nextMode, "short_break");
  assert.equal(s1.nextMinutes, 5);
  assert.equal(s1.nextCycleCount, 1);

  const s4 = resolveNextPomodoroStep({ completedMode: "focus", completedFocusCycles: 3 });
  assert.equal(s4.nextMode, "long_break");
  assert.equal(s4.nextMinutes, 15);
  assert.equal(s4.nextCycleCount, 4);

  const backToWork = resolveNextPomodoroStep({ completedMode: "short_break", completedFocusCycles: 2, defaultFocusMinutes: 50 });
  assert.equal(backToWork.nextMode, "focus");
  assert.equal(backToWork.nextMinutes, 50);
});

test("subject weekly budgets and exam countdown compute progress and daily minutes", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  const budgets = [{ id: "b1", subject: "Calculus", targetHoursPerWeek: 3 }];
  const records = [
    { date: "2026-11-22", subject: "calculus", mode: "focus", durationSeconds: 5400 },
    { date: "2026-11-01", subject: "Calculus", mode: "focus", durationSeconds: 7200 } // outside 7 days
  ];
  const [res] = computeSubjectBudgetsProgress(budgets, records, now);
  assert.equal(res.studiedMinutes, 90);
  assert.equal(res.targetMinutes, 180);
  assert.equal(res.pct, 50);

  const exam = computeExamCountdown({ date: "2026-11-28", targetPrepHours: 10 }, "2026-11-23");
  assert.equal(exam.daysRemaining, 5);
  assert.equal(exam.isPast, false);
  assert.equal(exam.suggestedDailyMinutes, 120);
});

test("safe Markdown renderer escapes raw HTML and renders headings, checklists, and code", () => {
  const md = "# Title\n- [x] Done\n- [ ] Todo with <script>alert(1)</script>\n`inline`\n**bold**";
  const html = renderSafeMarkdownHtml(md);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), true);
  assert.equal(html.includes("<h2"), true);
  assert.equal(html.includes("is-done"), true);
  assert.equal(html.includes("<strong>bold</strong>"), true);
  assert.equal(html.includes("<code"), true);
});

test("CSV and Markdown study log exporters serialize records cleanly", () => {
  const recs = [
    { date: "2026-11-23", subject: "Physics, Lab", mode: "focus", durationSeconds: 1500, isManual: false, focusQuality: 5, interruptions: 1, reflection: "Finished ch 4" }
  ];
  const csv = formatStudyRecordsCsv(recs);
  assert.equal(csv.includes('"Physics, Lab"'), true);
  assert.equal(csv.includes(",25,Timer,5,1,Finished ch 4"), true);

  const md = formatStudyRecordsMarkdown(recs);
  assert.equal(md.includes("| 2026-11-23 | Physics, Lab | focus | 25 | 5/5 | Finished ch 4 |"), true);
});

test("body-doubling synced clock computes deterministic phase and Kelvin RGB stays bounded", () => {
  const start = 1_700_000_000_000;
  const pFocus = computeSyncedRoomPhase({ cycleStartMs: start, focusMinutes: 25, breakMinutes: 5, nowMs: start + 600_000 });
  assert.equal(pFocus.phase, "focus");
  assert.equal(pFocus.remainingSeconds, 900);
  assert.equal(pFocus.cycleNumber, 1);

  const pBreak = computeSyncedRoomPhase({ cycleStartMs: start, focusMinutes: 25, breakMinutes: 5, nowMs: start + 1560_000 });
  assert.equal(pBreak.phase, "break");
  assert.equal(pBreak.remainingSeconds, 240);

  assert.match(kelvinToLampRgb(2700), /^\d+, \d+, \d+$/);
  assert.match(kelvinToLampRgb(5500), /^\d+, \d+, \d+$/);
});

test("backup validator accepts valid SPRK data and rejects malformed input", () => {
  assert.equal(validateBackupPayload(null).ok, false);
  assert.equal(validateBackupPayload({ foo: "bar" }).ok, false);
  const good = validateBackupPayload({ localFlashcards: [{ id: "1" }], preferences: { seriousMode: true } });
  assert.equal(good.ok, true);
  assert.equal(good.data.localFlashcards.length, 1);
});
