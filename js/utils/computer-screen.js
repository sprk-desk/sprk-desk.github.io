// Pure Flat Computer Skin Screen Geometry & Media Config Helpers
import { sanitizeAvatarUrl } from "./profile-helpers.js";

export const FLAT_COMPUTER_THEME_IDS = Object.freeze(["modern", "editorial"]);
export const FLAT_COMPUTER_SKIN_IDS = Object.freeze([
  "flat-dark",
  "flat-light",
  "theme:modern",
  "theme:editorial"
]);

export const MAX_LOCAL_IMAGE_BYTES = 5 * 1024 * 1024;  // 5 MB
export const MAX_LOCAL_VIDEO_BYTES = 15 * 1024 * 1024; // 15 MB

export const SUPPORTED_SCREEN_IMAGE_MIMES = Object.freeze([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
]);

export const SUPPORTED_SCREEN_VIDEO_MIMES = Object.freeze([
  "video/mp4",
  "video/webm"
]);

export function resolveEffectiveComputerSkinKey({ skinId = "default", roomThemeId = "comic" } = {}) {
  const cleanSkin = String(skinId || "default");
  if (cleanSkin === "flat-dark" || cleanSkin === "flat-light") {
    return cleanSkin;
  }
  if (cleanSkin === "theme:modern" || cleanSkin === "theme:editorial") {
    return cleanSkin.slice(6);
  }
  if (cleanSkin === "default" && FLAT_COMPUTER_THEME_IDS.includes(roomThemeId)) {
    return roomThemeId;
  }
  return null;
}

export function isFlatComputerSkin({ skinId = "default", roomThemeId = "comic" } = {}) {
  return resolveEffectiveComputerSkinKey({ skinId, roomThemeId }) !== null;
}

const SCREEN_FRAME_BOXES = {
  editorial: { left: "2.8%", right: "2.8%", top: "24.8%", bottom: "20.2%", radius: "2px", bg: "#ffffff" },
  modern: { left: "4.6%", right: "4.6%", top: "17.8%", bottom: "31.2%", radius: "3px", bg: "#dff1f2" },
  "flat-dark": { left: "3.2%", right: "3.2%", top: "21.8%", bottom: "23.8%", radius: "3px", bg: "#101214" },
  "flat-light": { left: "3.2%", right: "3.2%", top: "21.8%", bottom: "23.8%", radius: "3px", bg: "#f4f4f1" }
};

export function getComputerScreenFrameBox(skinKey) {
  return SCREEN_FRAME_BOXES[skinKey] || null;
}

export function inferMediaTypeFromFile(file) {
  const mime = String(file?.type || "").toLowerCase();
  if (SUPPORTED_SCREEN_IMAGE_MIMES.includes(mime)) return "image";
  if (SUPPORTED_SCREEN_VIDEO_MIMES.includes(mime)) return "video";
  const name = String(file?.name || "").toLowerCase();
  if (/\.(mp4|webm)$/.test(name)) return "video";
  if (/\.(png|jpe?g|webp|gif)$/.test(name)) return "image";
  return null;
}

export function validateScreenMediaFile(file) {
  if (!file) return { ok: false, error: "Select an image or video file." };
  const mediaType = inferMediaTypeFromFile(file);
  if (!mediaType) {
    return { ok: false, error: "Use PNG, JPG, WEBP, GIF, MP4, or WEBM." };
  }
  const size = Number(file.size || 0);
  const limit = mediaType === "video" ? MAX_LOCAL_VIDEO_BYTES : MAX_LOCAL_IMAGE_BYTES;
  if (size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    return { ok: false, error: `File exceeds ${mb} MB local limit.` };
  }
  return { ok: true, mediaType };
}

export function inferMediaTypeFromUrl(url) {
  const clean = String(url || "").trim().toLowerCase();
  if (clean.startsWith("data:video/") || /\.(mp4|webm)(\?|#|$)/.test(clean)) {
    return "video";
  }
  return "image";
}

export function sanitizeComputerScreenPrefs(raw = {}) {
  const obj = raw && typeof raw === "object" ? raw : {};
  const mode = obj.mode === "upload" || obj.mode === "url" ? obj.mode : "none";
  const safeUrl = mode === "url" ? sanitizeAvatarUrl(obj.url || "") : "";
  const resolvedMode = mode === "url" && !safeUrl ? "none" : mode;
  return {
    mode: resolvedMode,
    mediaType: obj.mediaType === "video" ? "video" : "image",
    url: safeUrl,
    fit: obj.fit === "contain" ? "contain" : "cover",
    muted: obj.muted !== false,
    label: String(obj.label || "").trim().slice(0, 64)
  };
}
