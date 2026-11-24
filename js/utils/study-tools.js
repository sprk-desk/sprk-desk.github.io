// Pure utilities for Spaced-Repetition Flashcards, Pomodoro Cycles, Subject Budgets,
// Exam Countdowns, Safe Markdown Rendering, CSV/MD Export, Body-Doubling Clock & Backup Validation

export function createFlashcard({ id, deck = "General", front, back, nowMs = Date.now() }) {
  return {
    id: id || `card_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
    deck: String(deck || "General").trim() || "General",
    front: String(front || "").trim(),
    back: String(back || "").trim(),
    reps: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    dueAtMs: nowMs,
    lastReviewedAtMs: null,
    createdAtMs: nowMs
  };
}

export function reviewFlashcard(card, rating = "good", nowMs = Date.now()) {
  if (!card) return null;
  const DAY_MS = 86400000;
  let ease = Number(card.easeFactor || 2.5);
  let reps = Number(card.reps || 0);
  let intervalDays = Number(card.intervalDays || 0);

  if (rating === "again") {
    reps = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
    return {
      ...card,
      reps,
      intervalDays,
      easeFactor: Number(ease.toFixed(2)),
      dueAtMs: nowMs + 10 * 60 * 1000, // 10 minutes retry
      lastReviewedAtMs: nowMs
    };
  }

  if (rating === "hard") {
    reps += 1;
    intervalDays = reps <= 1 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
    ease = Math.max(1.3, ease - 0.15);
  } else if (rating === "easy") {
    reps += 1;
    intervalDays = reps === 1 ? 4 : reps === 2 ? 10 : Math.max(2, Math.round(intervalDays * ease * 1.3));
    ease = Math.min(3.0, ease + 0.15);
  } else {
    // "good"
    reps += 1;
    intervalDays = reps === 1 ? 1 : reps === 2 ? 6 : Math.max(2, Math.round(intervalDays * ease));
  }

  return {
    ...card,
    reps,
    intervalDays,
    easeFactor: Number(ease.toFixed(2)),
    dueAtMs: nowMs + intervalDays * DAY_MS,
    lastReviewedAtMs: nowMs
  };
}

export function isFlashcardDue(card, nowMs = Date.now()) {
  if (!card) return false;
  return Number(card.dueAtMs || 0) <= nowMs;
}

export function getDueFlashcards(cards = [], nowMs = Date.now()) {
  return (cards || [])
    .filter((c) => isFlashcardDue(c, nowMs))
    .sort((a, b) => (a.dueAtMs || 0) - (b.dueAtMs || 0));
}

export function resolveNextPomodoroStep({
  completedMode = "focus",
  completedFocusCycles = 0,
  defaultFocusMinutes = 25,
  shortBreakMinutes = 5,
  longBreakMinutes = 15,
  longBreakEvery = 4
}) {
  if (completedMode === "focus") {
    const nextCycles = Math.max(1, Number(completedFocusCycles || 0) + 1);
    const isLongBreak = nextCycles % Math.max(2, Number(longBreakEvery || 4)) === 0;
    return {
      nextMode: isLongBreak ? "long_break" : "short_break",
      nextMinutes: isLongBreak ? Number(longBreakMinutes || 15) : Number(shortBreakMinutes || 5),
      nextCycleCount: nextCycles,
      label: isLongBreak ? `Long Break (${longBreakMinutes}m)` : `Short Break (${shortBreakMinutes}m)`
    };
  }
  return {
    nextMode: "focus",
    nextMinutes: Number(defaultFocusMinutes || 25),
    nextCycleCount: Number(completedFocusCycles || 0),
    label: `Focus Block (${defaultFocusMinutes}m)`
  };
}

export function computeSubjectBudgetsProgress(budgets = [], records = [], now = new Date()) {
  const weekCutoff = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const weeklyBySubject = new Map();
  for (const r of records || []) {
    if ((r.mode || "focus") !== "focus") continue;
    if (!r.date || r.date < weekCutoff) continue;
    const key = String(r.subject || "General Study").trim().toLowerCase();
    const mins = Math.round((r.durationSeconds || 0) / 60);
    weeklyBySubject.set(key, (weeklyBySubject.get(key) || 0) + mins);
  }

  return (budgets || []).map((b) => {
    const targetMinutes = Math.max(15, Math.round(Number(b.targetHoursPerWeek || 1) * 60));
    const studiedMinutes = weeklyBySubject.get(String(b.subject || "").trim().toLowerCase()) || 0;
    const pct = Math.min(100, Math.round((studiedMinutes / targetMinutes) * 100));
    const remainingMinutes = Math.max(0, targetMinutes - studiedMinutes);
    return {
      ...b,
      targetMinutes,
      studiedMinutes,
      remainingMinutes,
      pct,
      met: studiedMinutes >= targetMinutes
    };
  });
}

export function computeExamCountdown(exam, todayIso) {
  if (!exam || !exam.date) {
    return { daysRemaining: 0, isPast: false, suggestedDailyMinutes: 0 };
  }
  const todayMs = new Date(`${todayIso}T00:00:00Z`).getTime();
  const targetMs = new Date(`${exam.date}T00:00:00Z`).getTime();
  const daysRemaining = Math.round((targetMs - todayMs) / 86400000);
  const isPast = daysRemaining < 0;
  const remainingHours = Math.max(0, Number(exam.targetPrepHours || 0));
  const effectiveDays = Math.max(1, daysRemaining || 1);
  const suggestedDailyMinutes = isPast || remainingHours <= 0
    ? 0
    : Math.max(10, Math.round((remainingHours * 60) / effectiveDays));

  return {
    daysRemaining,
    isPast,
    suggestedDailyMinutes
  };
}

function escapeText(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInlineMarkdown(escapedLine) {
  return escapedLine
    .replace(/`([^`]+)`/g, '<code class="sprk-md-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function renderSafeMarkdownHtml(markdown = "") {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inCodeBlock = false;
  let codeLines = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    if (rawLine.trim().startsWith("```")) {
      closeList();
      if (inCodeBlock) {
        out.push(`<pre class="sprk-md-pre"><code>${escapeText(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    const escaped = escapeText(rawLine);
    const trimmed = escaped.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      closeList();
      out.push(`<h4 class="sprk-md-h">${formatInlineMarkdown(trimmed.slice(4))}</h4>`);
    } else if (trimmed.startsWith("## ")) {
      closeList();
      out.push(`<h3 class="sprk-md-h">${formatInlineMarkdown(trimmed.slice(3))}</h3>`);
    } else if (trimmed.startsWith("# ")) {
      closeList();
      out.push(`<h2 class="sprk-md-h">${formatInlineMarkdown(trimmed.slice(2))}</h2>`);
    } else if (/^- \[( |x|X)\] /.test(trimmed)) {
      if (!inList) {
        out.push('<ul class="sprk-md-list">');
        inList = true;
      }
      const checked = /^-\s+\[(x|X)\]/.test(trimmed);
      const body = formatInlineMarkdown(trimmed.slice(6));
      out.push(
        `<li class="sprk-md-check ${checked ? "is-done" : ""}">${checked ? "[x]" : "[ ]"} ${body}</li>`
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        out.push('<ul class="sprk-md-list">');
        inList = true;
      }
      out.push(`<li>${formatInlineMarkdown(trimmed.slice(2))}</li>`);
    } else {
      closeList();
      out.push(`<p class="sprk-md-p">${formatInlineMarkdown(trimmed)}</p>`);
    }
  }

  closeList();
  if (inCodeBlock) {
    out.push(`<pre class="sprk-md-pre"><code>${escapeText(codeLines.join("\n"))}</code></pre>`);
  }
  return out.join("");
}

function csvCell(val) {
  const s = String(val ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function formatStudyRecordsCsv(records = []) {
  const header = ["Date", "Subject", "Mode", "DurationMinutes", "Source", "FocusQuality", "Interruptions", "Reflection"].join(",");
  const rows = (records || []).map((r) => [
    csvCell(r.date || ""),
    csvCell(r.subject || "General Study"),
    csvCell(r.mode || "focus"),
    csvCell(Math.round((r.durationSeconds || 0) / 60)),
    csvCell(r.isManual ? "Manual" : "Timer"),
    csvCell(r.focusQuality || ""),
    csvCell(r.interruptions ?? 0),
    csvCell(r.reflection || "")
  ].join(","));
  return [header, ...rows].join("\n");
}

export function formatStudyRecordsMarkdown(records = []) {
  const totalMins = Math.round((records || []).reduce((s, r) => s + (r.durationSeconds || 0), 0) / 60);
  const lines = [
    "# SPRK Desk Study Log",
    "",
    `- Total Sessions: ${(records || []).length}`,
    `- Total Logged Minutes: ${totalMins}m`,
    "",
    "| Date | Subject | Mode | Minutes | Quality | Notes |",
    "| --- | --- | --- | ---: | --- | --- |"
  ];
  for (const r of records || []) {
    const mins = Math.round((r.durationSeconds || 0) / 60);
    const qual = r.focusQuality ? `${r.focusQuality}/5` : "-";
    const note = String(r.reflection || "").replace(/\|/g, "/").replace(/\n/g, " ");
    lines.push(`| ${r.date || ""} | ${r.subject || "General Study"} | ${r.mode || "focus"} | ${mins} | ${qual} | ${note} |`);
  }
  return lines.join("\n");
}

export function computeSyncedRoomPhase({
  cycleStartMs,
  focusMinutes = 25,
  breakMinutes = 5,
  nowMs = Date.now()
}) {
  const focusSec = Math.max(60, Math.round(Number(focusMinutes || 25) * 60));
  const breakSec = Math.max(60, Math.round(Number(breakMinutes || 5) * 60));
  const cycleSec = focusSec + breakSec;
  const elapsedSec = Math.max(0, Math.floor((nowMs - Number(cycleStartMs || nowMs)) / 1000));
  const cycleNumber = Math.floor(elapsedSec / cycleSec) + 1;
  const posInCycle = elapsedSec % cycleSec;

  if (posInCycle < focusSec) {
    const remainingSeconds = focusSec - posInCycle;
    return {
      phase: "focus",
      remainingSeconds,
      totalPhaseSeconds: focusSec,
      cycleNumber,
      progressPct: Math.round((posInCycle / focusSec) * 100)
    };
  }
  const breakElapsed = posInCycle - focusSec;
  const remainingSeconds = breakSec - breakElapsed;
  return {
    phase: "break",
    remainingSeconds,
    totalPhaseSeconds: breakSec,
    cycleNumber,
    progressPct: Math.round((breakElapsed / breakSec) * 100)
  };
}

export function kelvinToLampRgb(kelvin = 3200) {
  const k = Math.min(6000, Math.max(2400, Number(kelvin) || 3200));
  const t = (k - 2400) / (6000 - 2400); // 0 = warm 2400K, 1 = crisp 6000K
  const r = Math.round(255 - t * 14);
  const g = Math.round(196 + t * 50);
  const b = Math.round(110 + t * 145);
  return `${r}, ${g}, ${b}`;
}

export const BUILTIN_WORKSPACE_PROFILES = [
  {
    id: "exam_sprint",
    name: "Exam Sprint",
    description: "Obsidian dark monochrome, Deep Focus dimming, 50m blocks, Brown Noise.",
    settings: {
      seriousMode: true,
      theme: "noir",
      deepFocusMode: true,
      hideGamification: true,
      strictFocusLock: true,
      defaultFocusMinutes: 50,
      autoCycleBreaks: true,
      timeOfDay: "night",
      weather: "clear",
      lampKelvin: 4200,
      audioMix: { brownNoise: 0.55, rain: 0.25 }
    }
  },
  {
    id: "morning_reading",
    name: "Morning Reading",
    description: "Swiss Editorial light, natural daylight, 25m blocks, soft rain.",
    settings: {
      seriousMode: true,
      theme: "editorial",
      deepFocusMode: false,
      hideGamification: false,
      strictFocusLock: false,
      defaultFocusMinutes: 25,
      autoCycleBreaks: true,
      timeOfDay: "morning",
      weather: "clear",
      lampKelvin: 5000,
      audioMix: { rain: 0.45, brownNoise: 0.2 }
    }
  },
  {
    id: "late_night_cozy",
    name: "Late Night Cozy",
    description: "Warm amber 2700K lamp, Gentle Rain, Hearth fireplace & 25m flow.",
    settings: {
      seriousMode: false,
      theme: "comic",
      deepFocusMode: false,
      hideGamification: false,
      strictFocusLock: false,
      defaultFocusMinutes: 25,
      autoCycleBreaks: true,
      timeOfDay: "night",
      weather: "rain",
      lampKelvin: 2700,
      audioMix: { rain: 0.5, fireplace: 0.55, lofi: 0.3 }
    }
  }
];

export function validateBackupPayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid JSON object." };
  }
  const allowedArrays = [
    "localTasks",
    "localGoals",
    "localDiary",
    "localStudyRecords",
    "localSavedResources",
    "localFlashcards",
    "localExams",
    "localSubjectBudgets"
  ];
  const data = {};
  for (const key of allowedArrays) {
    if (Array.isArray(raw[key])) data[key] = raw[key];
  }
  if (raw.preferences && typeof raw.preferences === "object" && !Array.isArray(raw.preferences)) {
    data.preferences = raw.preferences;
  }
  if (raw.localAudioPresets && typeof raw.localAudioPresets === "object" && !Array.isArray(raw.localAudioPresets)) {
    data.localAudioPresets = raw.localAudioPresets;
  }
  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Backup file contains no recognized SPRK Desk data." };
  }
  return { ok: true, data };
}
