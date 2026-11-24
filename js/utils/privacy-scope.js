// Privacy, spectator visibility, room access, and group role permission checks

export const GROUP_ROLES = Object.freeze({
  OWNER: "owner",
  MODERATOR: "moderator",
  MEMBER: "member"
});

export const ROOM_VISIBILITY = Object.freeze({
  PUBLIC: "public",
  FRIENDS: "friends",
  PRIVATE: "private"
});

export function normalizeRoomVisibility(privacy = {}) {
  const p = privacy && typeof privacy === "object" ? privacy : {};
  const vis = typeof p.roomVisibility === "string" ? p.roomVisibility.toLowerCase() : "";
  if (vis === ROOM_VISIBILITY.PUBLIC || vis === ROOM_VISIBILITY.FRIENDS || vis === ROOM_VISIBILITY.PRIVATE) {
    return vis;
  }
  return p.allowRoomVisits === false ? ROOM_VISIBILITY.PRIVATE : ROOM_VISIBILITY.FRIENDS;
}

export function canUserVisitRoom({ targetUserId = "", viewerUserId = "", privacy = {}, isFriend = false } = {}) {
  const visibility = normalizeRoomVisibility(privacy);
  if (targetUserId && viewerUserId && targetUserId === viewerUserId) {
    return { allowed: true, visibility, reason: "" };
  }
  if (visibility === ROOM_VISIBILITY.PUBLIC) {
    return { allowed: true, visibility, reason: "" };
  }
  if (visibility === ROOM_VISIBILITY.FRIENDS) {
    if (isFriend) {
      return { allowed: true, visibility, reason: "" };
    }
    return {
      allowed: false,
      visibility,
      reason: "This student's study room is Friends Only. Send a friend request to visit their room."
    };
  }
  return {
    allowed: false,
    visibility,
    reason: "This student's study room is set to Private."
  };
}

export function getRelationshipStatus({
  viewerId = "",
  targetId = "",
  friends = [],
  incoming = [],
  outgoing = []
} = {}) {
  if (!targetId) return { status: "none", requestId: null };
  if (viewerId && viewerId === targetId) return { status: "self", requestId: null };
  if ((friends || []).some((f) => (f.id || f.user_id) === targetId)) {
    return { status: "friends", requestId: null };
  }
  const inc = (incoming || []).find((r) => (r.senderId || r.sender_id || r.profile?.id) === targetId);
  if (inc) return { status: "incoming", requestId: inc.id };
  const out = (outgoing || []).find((r) => (r.receiverId || r.receiver_id || r.profile?.id) === targetId);
  if (out) return { status: "outgoing", requestId: out.id };
  return { status: "none", requestId: null };
}

export function buildSpectatorSafeRoomView(roomOwnerData = {}) {
  const privacy = roomOwnerData.privacy || {};
  const lighting = roomOwnerData.lighting && typeof roomOwnerData.lighting === "object"
    ? { ...roomOwnerData.lighting }
    : {};
  const studyRecords = Array.isArray(roomOwnerData.studyRecords)
    ? roomOwnerData.studyRecords.map((r) => ({
        id: String(r?.id || ""),
        date: String(r?.date || "").slice(0, 10),
        mode: r?.mode === "break" ? "break" : "focus",
        subject: String(r?.subject || "General Study").slice(0, 64),
        durationSeconds: Math.max(0, Number(r?.durationSeconds || 0)),
        creditsAwarded: Math.max(0, Number(r?.creditsAwarded || 0)),
        isManual: Boolean(r?.isManual),
        startedAt: r?.startedAt || ""
      }))
    : [];
  const unlockedAchievementIds = Array.isArray(roomOwnerData.unlockedAchievementIds)
    ? roomOwnerData.unlockedAchievementIds.map((id) => String(id)).filter(Boolean)
    : [];
  const libraryResources = Array.isArray(roomOwnerData.libraryResources)
    ? roomOwnerData.libraryResources
        .filter((res) => res && res.audience !== "private")
        .map((res) => ({
          id: String(res.id || ""),
          title: String(res.title || "Study Guide"),
          category: String(res.category || "Study Guide"),
          summary: String(res.summary || ""),
          author: String(res.author || roomOwnerData.displayName || "Student"),
          audience: res.audience === "friends" ? "friends" : "public"
        }))
    : [];
  const savedResources = Array.isArray(roomOwnerData.savedResources)
    ? roomOwnerData.savedResources.map((res) => ({
        id: String(res?.id || ""),
        title: String(res?.title || "Saved Book"),
        category: String(res?.category || "Saved"),
        summary: String(res?.summary || ""),
        author: String(res?.author || "")
      }))
    : [];

  return {
    profile: {
      id: roomOwnerData.id || "",
      publicId: roomOwnerData.publicId || "SPRK-0000",
      displayName: roomOwnerData.displayName || "Student",
      username: roomOwnerData.username || "",
      avatar: roomOwnerData.avatar || "☺",
      avatarUrl: roomOwnerData.avatarUrl || "",
      bannerUrl: roomOwnerData.bannerUrl || "",
      bio: roomOwnerData.bio || "",
      courseClass: roomOwnerData.courseClass || "",
      examAim: roomOwnerData.examAim || "",
      favoriteSubjects: Array.isArray(roomOwnerData.favoriteSubjects) ? [...roomOwnerData.favoriteSubjects] : [],
      isVerified: Boolean(roomOwnerData.isVerified),
      roomVisibility: normalizeRoomVisibility(privacy),
      onlineStatus: privacy.showOnlineStatus === false ? "hidden" : (roomOwnerData.onlineStatus || "online"),
      currentActivity: privacy.showStudyActivity === false ? null : (roomOwnerData.currentActivity || null)
    },
    theme: roomOwnerData.theme || "comic",
    timeOfDay: roomOwnerData.timeOfDay || "afternoon",
    weather: roomOwnerData.weather || "clear",
    lighting,
    skins: { ...(roomOwnerData.skins || {}) },
    decorations: roomOwnerData.decorations && typeof roomOwnerData.decorations === "object"
      ? { ...roomOwnerData.decorations }
      : {},
    customProp: roomOwnerData.customProp && typeof roomOwnerData.customProp === "object"
      ? { ...roomOwnerData.customProp }
      : null,
    layout: { ...(roomOwnerData.layout || {}) },
    friendsCount: Math.max(0, Number(roomOwnerData.friendsCount || 0)),
    studyRecords,
    unlockedAchievementIds,
    libraryResources,
    savedResources,
    // Explicitly strip private content for spectators
    diaryEntries: [],
    privateNotes: [],
    privateResources: [],
    blockedByOwner: Boolean(roomOwnerData.blockedByOwner),
    readOnly: true
  };
}

export function canPerformGroupAction(role, action) {
  if (!role || !Object.values(GROUP_ROLES).includes(role)) return false;
  switch (action) {
    case "view_group":
    case "post_message":
    case "join_shared_focus":
      return true;
    case "pin_announcement":
    case "moderate_messages":
    case "approve_member":
    case "remove_member":
      return role === GROUP_ROLES.OWNER || role === GROUP_ROLES.MODERATOR;
    case "edit_group_settings":
    case "assign_moderator":
    case "delete_group":
      return role === GROUP_ROLES.OWNER;
    default:
      return false;
  }
}
