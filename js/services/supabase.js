// Zero-dependency native Supabase REST, Auth, RPC & Storage client
import { APP_CONFIG, isSupabaseConfigured } from "../../config.js";

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
    // ignore
  }
}

class SupabaseLiteClient {
  constructor() {
    this.session = loadStoredSession();
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

  headers(extra = {}) {
    const token = this.accessToken || this.anonKey;
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...extra
    };
  }

  async request(path, options = {}) {
    if (!this.configured) {
      return { data: null, error: { message: "Supabase is not configured in config.js" } };
    }
    try {
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
      if (!response.ok) {
        return {
          data: null,
          error: {
            status: response.status,
            message: parsed?.msg || parsed?.error_description || parsed?.message || response.statusText
          }
        };
      }
      return { data: parsed, error: null };
    } catch (err) {
      return { data: null, error: { message: err?.message || "Network error" } };
    }
  }

  setSession(session) {
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

  async insert(table, payload, { upsert = false, returning = true } = {}) {
    const prefer = [
      returning ? "return=representation" : "return=minimal",
      upsert ? "resolution=merge-duplicates" : ""
    ].filter(Boolean).join(",");
    return this.request(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: prefer },
      body: JSON.stringify(payload)
    });
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
        return { data: null, error: { message: json?.message || "Upload failed" } };
      }
      return {
        data: {
          path,
          publicUrl: `${this.baseUrl}/storage/v1/object/public/${bucket}/${path}`
        },
        error: null
      };
    } catch (err) {
      return { data: null, error: { message: err?.message || "Upload error" } };
    }
  }
}

export const supabase = new SupabaseLiteClient();
