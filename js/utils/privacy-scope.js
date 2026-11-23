// Privacy, spectator visibility, and group role permission checks

export const GROUP_ROLES = Object.freeze({
  OWNER: "owner",
  MODERATOR: "moderator",
  MEMBER: "member"
});

export function buildSpectatorSafeRoomView(roomOwnerData = {}) {
  const privacy = roomOwnerData.privacy || {};
  const lighting = roomOwnerData.lighting && typeof roomOwnerData.lighting === "object"
    ? { ...roomOwnerData.lighting }
    : {};
  return {
    profile: {
      id: roomOwnerData.id || "",
      publicId: roomOwnerData.publicId || "SPK-0000",
      displayName: roomOwnerData.displayName || "Student",
      username: roomOwnerData.username || "",
      avatar: roomOwnerData.avatar || "☺",
      avatarUrl: roomOwnerData.avatarUrl || "",
      bio: roomOwnerData.bio || "",
      courseClass: roomOwnerData.courseClass || "",
      examAim: roomOwnerData.examAim || "",
      favoriteSubjects: Array.isArray(roomOwnerData.favoriteSubjects) ? [...roomOwnerData.favoriteSubjects] : [],
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
