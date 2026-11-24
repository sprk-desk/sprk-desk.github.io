// Live Friend Study Presence Service (Supabase Realtime + Active Focus Session Sync)
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { supabase } from "./supabase.js";
import { realtime } from "./realtime-service.js";
import { mergeFriendsWithPresence, summarizeStudyCircle } from "../utils/study-circle.js";

const CIRCLE_TOPIC = "realtime:sprk_study_circle";

class PresenceService {
  constructor() {
    this.presenceByUserId = {};
    this.activeFocusByUserId = {};
    this.unsubscribeChannel = null;
    this.pollTimer = null;
    this.broadcastTimer = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    bus.on("auth:changed", () => this.syncConnection());
    bus.on("friends:changed", () => {
      this.pollFriendFocusSessions();
      bus.emit("studyCircle:changed", this.getSnapshot());
    });
    bus.on("state:activeSession", () => {
      this.broadcastSelfState();
      bus.emit("studyCircle:changed", this.getSnapshot());
    });
    bus.on("preferences:changed", () => {
      bus.emit("studyCircle:changed", this.getSnapshot());
    });

    this.syncConnection();
  }

  buildSelfState() {
    const uid = state.user?.id;
    const sess = state.activeSession;
    const isStudying = Boolean(sess && sess.status === "running");
    const privacy = state.user?.privacy || { showOnlineStatus: true, showStudyActivity: true };
    return {
      userId: uid || "",
      displayName: state.user?.displayName || "Student",
      isStudying,
      subject: isStudying ? (sess.subject || "Studying") : "",
      mode: isStudying ? (sess.mode || "focus") : "",
      startedAtMs: isStudying ? Number(sess.startedAtMs || Date.now()) : 0,
      targetSeconds: isStudying ? Number(sess.targetSeconds || 0) : 0,
      showOnlineStatus: privacy.showOnlineStatus !== false,
      showStudyActivity: privacy.showStudyActivity !== false,
      updatedAtMs: Date.now()
    };
  }

  broadcastSelfState() {
    if (!supabase.configured || !state.user?.id || !this.unsubscribeChannel) return;
    const payload = this.buildSelfState();
    realtime.publish(CIRCLE_TOPIC, "study_state", payload);
    realtime.send({
      topic: CIRCLE_TOPIC,
      event: "presence",
      payload: { type: "presence", event: "track", payload },
      ref: realtime.nextRef()
    });
  }

  applyPresenceMap(rawPresenceState) {
    if (!rawPresenceState || typeof rawPresenceState !== "object") return;
    const next = {};
    for (const [key, entry] of Object.entries(rawPresenceState)) {
      const meta = Array.isArray(entry?.metas) ? entry.metas[0] : entry;
      const uid = meta?.userId || key;
      if (!uid || uid === state.user?.id) continue;
      next[uid] = meta;
    }
    this.presenceByUserId = next;
    bus.emit("studyCircle:changed", this.getSnapshot());
  }

  syncConnection() {
    if (this.unsubscribeChannel) {
      this.unsubscribeChannel();
      this.unsubscribeChannel = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }

    if (!supabase.configured || !state.user?.id) {
      this.presenceByUserId = {};
      this.activeFocusByUserId = {};
      bus.emit("studyCircle:changed", this.getSnapshot());
      return;
    }

    const uid = state.user.id;
    this.unsubscribeChannel = realtime.subscribe(
      CIRCLE_TOPIC,
      (msg) => {
        if (msg.event === "phx_reply" && msg.payload?.status === "ok") {
          this.broadcastSelfState();
        } else if (msg.event === "presence_state") {
          this.applyPresenceMap(msg.payload);
        } else if (msg.event === "presence_diff") {
          const joins = msg.payload?.joins || {};
          const leaves = msg.payload?.leaves || {};
          const updated = { ...this.presenceByUserId };
          for (const key of Object.keys(leaves)) {
            if (!joins[key]) delete updated[key];
          }
          for (const [key, entry] of Object.entries(joins)) {
            const meta = Array.isArray(entry?.metas) ? entry.metas[0] : entry;
            const userKey = meta?.userId || key;
            if (userKey && userKey !== uid) updated[userKey] = meta;
          }
          this.presenceByUserId = updated;
          bus.emit("studyCircle:changed", this.getSnapshot());
        } else if (msg.event === "broadcast" && msg.payload?.event === "study_state") {
          const peer = msg.payload.payload;
          if (peer?.userId && peer.userId !== uid) {
            this.presenceByUserId = { ...this.presenceByUserId, [peer.userId]: peer };
            bus.emit("studyCircle:changed", this.getSnapshot());
          }
        }
      },
      {
        config: {
          broadcast: { self: false },
          presence: { key: uid }
        }
      }
    );

    this.pollFriendFocusSessions();
    this.pollTimer = window.setInterval(() => this.pollFriendFocusSessions(), 25_000);
    this.broadcastTimer = window.setInterval(() => this.broadcastSelfState(), 20_000);
  }

  async pollFriendFocusSessions() {
    if (!supabase.configured || !state.user?.id) {
      this.activeFocusByUserId = {};
      return;
    }
    const friendIds = (state.friends || []).map((f) => f.id).filter(Boolean);
    if (friendIds.length === 0) {
      this.activeFocusByUserId = {};
      bus.emit("studyCircle:changed", this.getSnapshot());
      return;
    }
    try {
      const idList = friendIds.join(",");
      const cutoffIso = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
      const { data, error } = await supabase.select(
        "focus_sessions",
        `user_id=in.(${idList})&status=eq.running&started_at=gte.${encodeURIComponent(cutoffIso)}&order=started_at.desc`
      );
      if (!error && Array.isArray(data)) {
        const nextMap = {};
        for (const row of data) {
          if (row.user_id && !nextMap[row.user_id]) {
            nextMap[row.user_id] = row;
          }
        }
        this.activeFocusByUserId = nextMap;
        bus.emit("studyCircle:changed", this.getSnapshot());
      }
    } catch {
      // RLS or offline fallback: realtime presence/broadcast handles peer state
    }
  }

  getSnapshot(nowMs = Date.now()) {
    const userIsStudying = Boolean(state.activeSession && state.activeSession.status === "running");
    const entries = mergeFriendsWithPresence({
      friends: state.friends || [],
      presenceByUserId: this.presenceByUserId,
      activeFocusByUserId: this.activeFocusByUserId,
      userIsStudying,
      nowMs
    });
    return {
      entries,
      summary: summarizeStudyCircle(entries, state.activeSession),
      signedIn: Boolean(supabase.configured && state.user?.id)
    };
  }
}

export const presenceService = new PresenceService();
