// Pure utilities for Live Study Circle (Friends Currently Studying With User)

export function formatElapsedLabel(seconds = 0) {
  const clean = Math.max(0, Math.round(Number(seconds) || 0));
  if (clean < 60) return "<1m";
  const mins = Math.floor(clean / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

export function mergeFriendsWithPresence({
  friends = [],
  presenceByUserId = {},
  activeFocusByUserId = {},
  userIsStudying = false,
  nowMs = Date.now()
} = {}) {
  const statusRank = { studying: 0, online: 1, offline: 2 };

  return (friends || [])
    .map((friend) => {
      const pres = presenceByUserId?.[friend.id] || null;
      const dbSess = activeFocusByUserId?.[friend.id] || null;

      const showOnline = friend.privacy?.showOnlineStatus !== false && pres?.showOnlineStatus !== false;
      const showActivity = friend.privacy?.showStudyActivity !== false && pres?.showStudyActivity !== false;

      const hasActiveTimer = Boolean(pres?.isStudying) || Boolean(dbSess);
      const isOnline = Boolean(pres) || Boolean(dbSess);

      let status = "offline";
      if (hasActiveTimer && showActivity) {
        status = "studying";
      } else if (isOnline && showOnline) {
        status = "online";
      }

      const startedAtMs = Number(
        pres?.startedAtMs ||
          (dbSess?.started_at ? Date.parse(dbSess.started_at) : 0) ||
          0
      );
      const targetSeconds = Number(pres?.targetSeconds || dbSess?.target_seconds || 0);
      const elapsedSeconds = startedAtMs > 0
        ? Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
        : Number(pres?.elapsedSeconds || 0);
      const progressPct = targetSeconds > 0
        ? Math.min(100, Math.max(0, Math.round((elapsedSeconds / targetSeconds) * 100)))
        : 0;

      const rawSubject = pres?.subject || dbSess?.subject || "";
      const subject = status === "studying" ? (rawSubject || "Studying") : "";
      const mode = status === "studying" ? (pres?.mode || dbSess?.mode || "focus") : "";

      return {
        id: friend.id,
        publicId: friend.publicId || "SPK-USER",
        displayName: friend.displayName || "Student",
        avatarPreset: friend.avatarPreset || "☺",
        avatarUrl: friend.avatarUrl || "",
        courseClass: friend.courseClass || "",
        status,
        subject,
        mode,
        elapsedSeconds,
        elapsedLabel: status === "studying" ? formatElapsedLabel(elapsedSeconds) : "",
        targetSeconds,
        progressPct,
        isStudyingWithUser: status === "studying" && Boolean(userIsStudying)
      };
    })
    .sort((a, b) => {
      const rankDiff = (statusRank[a.status] ?? 2) - (statusRank[b.status] ?? 2);
      if (rankDiff !== 0) return rankDiff;
      if (a.status === "studying" && b.status === "studying") {
        return b.elapsedSeconds - a.elapsedSeconds;
      }
      return String(a.displayName).localeCompare(String(b.displayName));
    });
}

export function summarizeStudyCircle(entries = [], selfSession = null) {
  const list = entries || [];
  const studyingCount = list.filter((e) => e.status === "studying").length;
  const onlineCount = list.filter((e) => e.status === "studying" || e.status === "online").length;
  const selfIsStudying = Boolean(selfSession && selfSession.status === "running");

  return {
    studyingCount,
    onlineCount,
    totalFriends: list.length,
    selfIsStudying,
    coStudyingCount: selfIsStudying ? studyingCount : 0
  };
}
