// Scoped Supabase Realtime Phoenix WebSocket channel manager
import { APP_CONFIG, isSupabaseConfigured } from "../../config.js";
import { supabase } from "./supabase.js";

class RealtimeService {
  constructor() {
    this.socket = null;
    this.refCounter = 1;
    this.channels = new Map();
    this.heartbeatTimer = null;
  }

  connect() {
    if (!isSupabaseConfigured()) return false;
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return true;

    const wsUrl = APP_CONFIG.supabase.url
      .replace(/^https:\/\//, "wss://")
      .replace(/^http:\/\//, "ws://")
      .replace(/\/$/, "");
    const token = supabase.accessToken || APP_CONFIG.supabase.anonKey;
    this.socket = new WebSocket(
      `${wsUrl}/realtime/v1/websocket?apikey=${encodeURIComponent(APP_CONFIG.supabase.anonKey)}&vsn=1.0.0`
    );

    this.socket.addEventListener("open", () => {
      this.heartbeatTimer = window.setInterval(() => {
        this.send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: this.nextRef() });
      }, 25_000);
      for (const topic of this.channels.keys()) {
        this.joinTopic(topic, token);
      }
    });

    this.socket.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        const entry = this.channels.get(msg.topic);
        if (entry) {
          for (const handler of entry.handlers) handler(msg);
        }
      } catch {
        // ignore malformed frames
      }
    });

    this.socket.addEventListener("close", () => {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    });

    return true;
  }

  nextRef() {
    return String(this.refCounter++);
  }

  send(frame) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(frame));
    }
  }

  joinTopic(topic, token) {
    this.send({
      topic,
      event: "phx_join",
      payload: { access_token: token },
      ref: this.nextRef()
    });
  }

  subscribe(topic, handler) {
    if (!isSupabaseConfigured()) return () => {};
    this.connect();
    if (!this.channels.has(topic)) {
      this.channels.set(topic, { handlers: new Set() });
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.joinTopic(topic, supabase.accessToken || APP_CONFIG.supabase.anonKey);
      }
    }
    this.channels.get(topic).handlers.add(handler);
    return () => this.unsubscribe(topic, handler);
  }

  unsubscribe(topic, handler) {
    const entry = this.channels.get(topic);
    if (!entry) return;
    entry.handlers.delete(handler);
    if (entry.handlers.size === 0) {
      this.send({ topic, event: "phx_leave", payload: {}, ref: this.nextRef() });
      this.channels.delete(topic);
    }
    if (this.channels.size === 0 && this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  cleanupAll() {
    for (const topic of Array.from(this.channels.keys())) {
      this.send({ topic, event: "phx_leave", payload: {}, ref: this.nextRef() });
    }
    this.channels.clear();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const realtime = new RealtimeService();
window.addEventListener("beforeunload", () => realtime.cleanupAll());
