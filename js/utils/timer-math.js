// Pure, deterministic focus timer & credit math (zero DOM dependencies)

export function createFocusSession({
  id,
  mode = "focus", // focus | short_break | long_break
  targetSeconds = 1500,
  scope = "personal", // personal | friends | group
  subject = "General Study",
  nowMs = Date.now()
}) {
  return {
    id: id || `sess_${nowMs}`,
    mode,
    scope,
    subject,
    targetSeconds: Math.max(60, Math.floor(targetSeconds)),
    startedAtMs: nowMs,
    lastResumedAtMs: nowMs,
    accumulatedActiveMs: 0,
    pausedMs: 0,
    idlePausedMs: 0,
    status: "running", // running | paused | completed | abandoned
    completedAtMs: null
  };
}

export function computeElapsedActiveSeconds(session, nowMs = Date.now()) {
  if (!session) return 0;
  let activeMs = Number(session.accumulatedActiveMs) || 0;
  if (session.status === "running" && session.lastResumedAtMs != null) {
    const delta = Math.max(0, nowMs - session.lastResumedAtMs);
    activeMs += delta;
  }
  return Math.max(0, Math.floor(activeMs / 1000));
}

export function computeRemainingSeconds(session, nowMs = Date.now()) {
  if (!session) return 0;
  const elapsed = computeElapsedActiveSeconds(session, nowMs);
  return Math.max(0, session.targetSeconds - elapsed);
}

export function pauseFocusSession(session, nowMs = Date.now(), reason = "manual") {
  if (!session || session.status !== "running") return session;
  const delta = Math.max(0, nowMs - (session.lastResumedAtMs ?? nowMs));
  return {
    ...session,
    accumulatedActiveMs: (session.accumulatedActiveMs || 0) + delta,
    lastResumedAtMs: null,
    pausedAtMs: nowMs,
    pauseReason: reason,
    status: "paused"
  };
}

export function resumeFocusSession(session, nowMs = Date.now()) {
  if (!session || session.status !== "paused") return session;
  const pausedDelta = session.pausedAtMs ? Math.max(0, nowMs - session.pausedAtMs) : 0;
  return {
    ...session,
    pausedMs: (session.pausedMs || 0) + pausedDelta,
    idlePausedMs:
      session.pauseReason === "idle"
        ? (session.idlePausedMs || 0) + pausedDelta
        : (session.idlePausedMs || 0),
    pausedAtMs: null,
    pauseReason: null,
    lastResumedAtMs: nowMs,
    status: "running"
  };
}

export function completeFocusSession(session, nowMs = Date.now()) {
  if (!session) return null;
  const activeSeconds = computeElapsedActiveSeconds(session, nowMs);
  const clampedActive = Math.min(activeSeconds, session.targetSeconds + 60);
  return {
    ...session,
    accumulatedActiveMs: clampedActive * 1000,
    lastResumedAtMs: null,
    pausedAtMs: null,
    completedAtMs: nowMs,
    status: "completed"
  };
}

export function calculateStudyCreditsForSession({
  mode = "focus",
  verifiedSeconds = 0,
  alreadyEarnedToday = 0,
  isManualRecord = false,
  minVerifiedSeconds = 300,
  creditsPerBlock = 10,
  minutesPerBlock = 25,
  maxDailyCredits = 120
}) {
  if (isManualRecord || mode !== "focus") return 0;
  if (verifiedSeconds < minVerifiedSeconds) return 0;
  const blocks = Math.floor(verifiedSeconds / (minutesPerBlock * 60));
  const proportional = blocks > 0
    ? blocks * creditsPerBlock
    : Math.floor((verifiedSeconds / (minutesPerBlock * 60)) * creditsPerBlock);
  const raw = Math.max(1, proportional);
  const remainingCap = Math.max(0, maxDailyCredits - alreadyEarnedToday);
  return Math.min(raw, remainingCap);
}

export function computeStudyStreaks(records = [], todayStr) {
  const focusDays = new Set(
    records
      .filter((r) => (r.mode || "focus") === "focus" && (r.durationSeconds || 0) >= 300 && r.date)
      .map((r) => r.date)
  );
  if (focusDays.size === 0) {
    return { currentStreak: 0, longestStreak: 0, activeDaysCount: 0 };
  }

  const sorted = Array.from(focusDays).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`).getTime();
    const curr = new Date(`${sorted[i]}T00:00:00Z`).getTime();
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  let current = 0;
  const anchor = new Date(`${todayStr}T00:00:00Z`);
  for (let offset = 0; offset < 3650; offset += 1) {
    const probe = new Date(anchor.getTime() - offset * 86400000).toISOString().slice(0, 10);
    if (focusDays.has(probe)) {
      current += 1;
    } else if (offset === 0) {
      // Allow streak to remain alive if today has not yet had a session, provided yesterday did
      continue;
    } else {
      break;
    }
  }

  return { currentStreak: current, longestStreak: longest, activeDaysCount: focusDays.size };
}
