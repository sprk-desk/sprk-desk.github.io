// Browser-local IndexedDB Media Persistence for Flat Computer Screen (Images & Small Videos)
import { validateScreenMediaFile } from "../utils/computer-screen.js";

const DB_NAME = "sprk_desk_local_media_v1";
const STORE_NAME = "media_blobs";
const SCREEN_KEY = "computer-screen";

function openMediaDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB unavailable."));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open local media storage."));
  });
}

export async function saveLocalScreenBlob(file) {
  const check = validateScreenMediaFile(file);
  if (!check.ok) return { ok: false, error: check.error };

  try {
    const db = await openMediaDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({
        id: SCREEN_KEY,
        blob: file,
        mediaType: check.mediaType,
        name: String(file.name || "screen-media").slice(0, 64),
        mime: String(file.type || ""),
        updatedAt: Date.now()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to store local media."));
    });
    const objectUrl = URL.createObjectURL(file);
    return {
      ok: true,
      objectUrl,
      mediaType: check.mediaType,
      name: String(file.name || "screen-media").slice(0, 64)
    };
  } catch (err) {
    return { ok: false, error: err?.message || "Could not store local media." };
  }
}

export async function loadLocalScreenBlob() {
  try {
    const db = await openMediaDb();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(SCREEN_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("Failed to read local media."));
    });
    if (!record || !record.blob) return null;
    return {
      blob: record.blob,
      mediaType: record.mediaType === "video" ? "video" : "image",
      name: record.name || "Saved Screen Media",
      objectUrl: URL.createObjectURL(record.blob)
    };
  } catch {
    return null;
  }
}

export async function clearLocalScreenBlob() {
  try {
    const db = await openMediaDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(SCREEN_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to clear local media."));
    });
    return true;
  } catch {
    return false;
  }
}
