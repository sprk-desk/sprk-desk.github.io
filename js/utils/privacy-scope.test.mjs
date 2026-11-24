import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSpectatorSafeRoomView,
  canPerformGroupAction,
  GROUP_ROLES,
  ROOM_VISIBILITY,
  normalizeRoomVisibility,
  canUserVisitRoom,
  getRelationshipStatus
} from "./privacy-scope.js";

test("spectator room view strips private diary, notes, and hidden status while keeping safe public fields", () => {
  const safe = buildSpectatorSafeRoomView({
    displayName: "Mina",
    publicId: "SPK-4821",
    courseClass: "B.Sc Physics",
    examAim: "GRE Physics",
    favoriteSubjects: ["Quantum Mechanics", "Optics"],
    lighting: { windowBeamOn: false, lampOn: true },
    onlineStatus: "online",
    currentActivity: "Organic Chemistry",
    privacy: { showOnlineStatus: false, showStudyActivity: false },
    diaryEntries: [{ id: "d1", body: "Secret" }],
    privateNotes: [{ id: "n1", body: "Private" }]
  });
  assert.equal(safe.readOnly, true);
  assert.equal(safe.profile.onlineStatus, "hidden");
  assert.equal(safe.profile.currentActivity, null);
  assert.equal(safe.profile.courseClass, "B.Sc Physics");
  assert.equal(safe.profile.examAim, "GRE Physics");
  assert.deepEqual(safe.profile.favoriteSubjects, ["Quantum Mechanics", "Optics"]);
  assert.equal(safe.lighting.windowBeamOn, false);
  assert.deepEqual(safe.diaryEntries, []);
  assert.deepEqual(safe.privateNotes, []);
});

test("group role permissions enforce owner, moderator, and member boundaries", () => {
  assert.equal(canPerformGroupAction(GROUP_ROLES.MEMBER, "post_message"), true);
  assert.equal(canPerformGroupAction(GROUP_ROLES.MEMBER, "pin_announcement"), false);
  assert.equal(canPerformGroupAction(GROUP_ROLES.MODERATOR, "pin_announcement"), true);
  assert.equal(canPerformGroupAction(GROUP_ROLES.MODERATOR, "assign_moderator"), false);
  assert.equal(canPerformGroupAction(GROUP_ROLES.OWNER, "assign_moderator"), true);
  assert.equal(canPerformGroupAction("admin_spoof", "delete_group"), false);
});

test("room visibility separates public, friends-only, and private room access while keeping legacy compat", () => {
  assert.equal(normalizeRoomVisibility({ allowRoomVisits: false }), ROOM_VISIBILITY.PRIVATE);
  assert.equal(normalizeRoomVisibility({ allowRoomVisits: true }), ROOM_VISIBILITY.FRIENDS);
  assert.equal(normalizeRoomVisibility({ roomVisibility: "public" }), ROOM_VISIBILITY.PUBLIC);

  assert.equal(
    canUserVisitRoom({ targetUserId: "u2", viewerUserId: "u1", privacy: { roomVisibility: "public" }, isFriend: false }).allowed,
    true
  );
  assert.equal(
    canUserVisitRoom({ targetUserId: "u2", viewerUserId: "u1", privacy: { roomVisibility: "friends" }, isFriend: false }).allowed,
    false
  );
  assert.equal(
    canUserVisitRoom({ targetUserId: "u2", viewerUserId: "u1", privacy: { roomVisibility: "friends" }, isFriend: true }).allowed,
    true
  );
  assert.equal(
    canUserVisitRoom({ targetUserId: "u2", viewerUserId: "u1", privacy: { roomVisibility: "private" }, isFriend: true }).allowed,
    false
  );
  assert.equal(
    canUserVisitRoom({ targetUserId: "u1", viewerUserId: "u1", privacy: { roomVisibility: "private" }, isFriend: false }).allowed,
    true
  );
});

test("getRelationshipStatus identifies self, friends, incoming, outgoing, and none", () => {
  const base = {
    viewerId: "me",
    friends: [{ id: "f1" }],
    incoming: [{ id: "req_in", senderId: "u_in" }],
    outgoing: [{ id: "req_out", receiverId: "u_out" }]
  };
  assert.equal(getRelationshipStatus({ ...base, targetId: "me" }).status, "self");
  assert.equal(getRelationshipStatus({ ...base, targetId: "f1" }).status, "friends");
  assert.deepEqual(getRelationshipStatus({ ...base, targetId: "u_in" }), { status: "incoming", requestId: "req_in" });
  assert.deepEqual(getRelationshipStatus({ ...base, targetId: "u_out" }), { status: "outgoing", requestId: "req_out" });
  assert.equal(getRelationshipStatus({ ...base, targetId: "stranger" }).status, "none");
});
