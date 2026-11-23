// Zero-dependency native Supabase REST, Auth, Token Refresh, RPC & Storage client
import { APP_CONFIG, isSupabaseConfigured } from "../../config.js";
import { normalizeSupabaseError } from "../utils/profile-helpers.js";

const SESSION_KEY = "sprk_desk_supabase_session";

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(session) {
  try {
    if (!session) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

class SupabaseLiteClient {
  constructor() {
    this.session = loadStoredSession();
    this._refreshPromise = null;
  }

  get configured() {
    return isSupabaseConfigured();
  }

  get baseUrl() {
    return APP_CONFIG.supabase.url.replace(/\/$/, "");
  }

  get anonKey() {
    return APP_CONFIG.supabase.anonKey;
  }

  get accessToken() {
    return this.session?.access_token || null;
  }

  get refreshToken() {
    return this.session?.refresh_token || null;
  }

  headers(extra = {}) {
    const token = this.accessToken || this.anonKey;
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...extra
    };
  }

  isTokenExpiringSoon() {
    if (!this.session?.expires_at) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return Number(this.session.expires_at) - nowSec < 45;
  }

  async refreshAccessToken() {
    if (!this.configured || !this.refreshToken) return false;
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: {
            apikey: this.anonKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ refresh_token: this.refreshToken })
        });
        if (!res.ok) {
          if (res.status === 400 || res.status === 401) {
            this.setSession(null);
          }
          return false;
        }
        const refreshed = await res.json().catch(() => null);
        if (refreshed?.access_token) {
          this.setSession(refreshed);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  }

  async request(path, options = {}, { skipAutoRefresh = false } = {}) {
    if (!this.configured) {
      return { data: null, error: { message: "Supabase is not configured in config.js" } };
    }

    if (!skipAutoRefresh && this.accessToken && this.refreshToken && this.isTokenExpiringSoon()) {
      await this.refreshAccessToken();
    }

    const runFetch = async () => {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: this.headers(options.headers)
      });
      const text = await response.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
      return { response, parsed };
    };

    try {
      let { response, parsed } = await runFetch();

      if (response.status === 401 && !skipAutoRefresh && this.refreshToken) {
        const ok = await this.refreshAccessToken();
        if (ok) {
          ({ response, parsed } = await runFetch());
        }
      }

      if (!response.ok) {
        const rawMsg =
          parsed?.msg ||
          parsed?.error_description ||
          parsed?.message ||
          parsed?.error ||
          response.statusText;
        return {
          data: null,
          error: {
            status: response.status,
            message: normalizeSupabaseError(rawMsg, this.baseUrl)
          }
        };
      }
      return { data: parsed, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          networkError: true,
          message: normalizeSupabaseError(err, this.baseUrl)
        }
      };
    }
  }

  setSession(session) {
    if (session && !session.expires_at && session.expires_in) {
      session.expires_at = Math.floor(Date.now() / 1000) + Number(session.expires_in);
    }
    this.session = session;
    saveStoredSession(session);
  }

  async rpc(fnName, params = {}) {
    return this.request(`/rest/v1/rpc/${encodeURIComponent(fnName)}`, {
      method: "POST",
      body: JSON.stringify(params)
    });
  }

  async select(table, query = "") {
    const qs = query ? `?${query}` : "";
    return this.request(`/rest/v1/${table}${qs}`, { method: "GET" });
  }

  async insert(table, payload, { upsert = false, onConflict = "", returning = true } = {}) {
    const prefer = [
      returning ? "return=representation" : "return=minimal",
      upsert ? "resolution=merge-duplicates" : ""
    ].filter(Boolean).join(",");
    const qs = upsert && onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
    return this.request(`/rest/v1/${table}${qs}`, {
      method: "POST",
      headers: { Prefer: prefer },
      body: JSON.stringify(payload)
    });
  }

  async upsert(table, payload, onConflict = "") {
    return this.insert(table, payload, { upsert: true, onConflict, returning: true });
  }

  async update(table, matchQuery, payload) {
    return this.request(`/rest/v1/${table}?${matchQuery}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
  }

  async remove(table, matchQuery) {
    return this.request(`/rest/v1/${table}?${matchQuery}`, {
      method: "DELETE"
    });
  }

  async uploadFile(bucket, path, file) {
    if (!this.configured || !this.accessToken) {
      return { data: null, error: { message: "Sign in to upload files." } };
    }
    try {
      const response = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${path}`, {
        method: "POST",
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true"
        },
        body: file
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        return { data: null, error: { message: normalizeSupabaseError(json?.message || "Upload failed", this.baseUrl) } };
      }
      return {
        data: {
          path,
          publicUrl: `${this.baseUrl}/storage/v1/object/public/${bucket}/${path}?v=${Date.now()}`
        },
        error: null
      };
    } catch (err) {
      return { data: null, error: { message: normalizeSupabaseError(err, this.baseUrl) } };
    }
  }
}

export const supabase = new SupabaseLiteClient();
