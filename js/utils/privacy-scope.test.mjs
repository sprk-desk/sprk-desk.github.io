import test from "node:test";
import assert from "node:assert/strict";
import { buildSpectatorSafeRoomView, canPerformGroupAction, GROUP_ROLES } from "./privacy-scope.js";

test("spectator room view strips private diary, notes, and hidden status", () => {
  const safe = buildSpectatorSafeRoomView({
    displayName: "Mina",
    publicId: "SPK-4821",
    onlineStatus: "online",
    currentActivity: "Organic Chemistry",
    privacy: { showOnlineStatus: false, showStudyActivity: false },
    diaryEntries: [{ id: "d1", body: "Secret" }],
    privateNotes: [{ id: "n1", body: "Private" }]
  });
  assert.equal(safe.readOnly, true);
  assert.equal(safe.profile.onlineStatus, "hidden");
  assert.equal(safe.profile.currentActivity, null);
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
