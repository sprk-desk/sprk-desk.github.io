// Pure room layout geometry, clamping, and permission helpers

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function computeDropPlacement({
  clientX,
  clientY,
  targetRect,
  objectRect,
  isDesk = false
}) {
  const paddingX = isDesk ? 8 : 6;
  const paddingY = isDesk ? 8 : 5;
  const maxLeft = Math.max(paddingX, targetRect.width - objectRect.width - paddingX);
  const leftPx = clamp(clientX - targetRect.left - objectRect.width / 2, paddingX, maxLeft);
  const leftPct = (leftPx / Math.max(1, targetRect.width)) * 100;

  if (isDesk) {
    const maxTop = Math.max(paddingY, targetRect.height - objectRect.height - paddingY);
    const topPx = clamp(clientY - targetRect.top - objectRect.height / 2, paddingY, maxTop);
    const topPct = (topPx / Math.max(1, targetRect.height)) * 100;
    return {
      left: `${leftPct.toFixed(2)}%`,
      top: `${topPct.toFixed(2)}%`,
      bottom: "auto"
    };
  }

  const maxBottom = Math.max(paddingY, targetRect.height - objectRect.height - paddingY);
  const bottomPx = clamp(targetRect.bottom - clientY - objectRect.height / 2, paddingY, maxBottom);
  const bottomPct = (bottomPx / Math.max(1, targetRect.height)) * 100;
  return {
    left: `${leftPct.toFixed(2)}%`,
    top: "auto",
    bottom: `${bottomPct.toFixed(2)}%`
  };
}

export const IMMOVABLE_OBJECT_TYPES = Object.freeze([
  "bird",
  "pinboard",
  "window",
  "computer",
  "room",
  "bookcase",
  "desk",
  "drawer",
  "desk-pen-cup",
  "shelf-deco-candle",
  "shelf-deco-bookend",
  "desk-deco-charm",
  "bookcase-fairy-lights"
]);

export function isImmovableRoomObject(objectKey) {
  return IMMOVABLE_OBJECT_TYPES.includes(String(objectKey || "").toLowerCase());
}

export function sanitizeRoomLayoutMap(layoutMap) {
  if (!layoutMap || typeof layoutMap !== "object") return {};
  const clean = {};
  for (const [key, entry] of Object.entries(layoutMap)) {
    if (isImmovableRoomObject(key)) continue;
    if (!entry || typeof entry !== "object" || !entry.target) continue;
    clean[key] = {
      target: String(entry.target),
      left: typeof entry.left === "string" ? entry.left : "auto",
      top: typeof entry.top === "string" ? entry.top : "auto",
      bottom: typeof entry.bottom === "string" ? entry.bottom : "auto"
    };
  }
  return clean;
}

export function canModifyRoomLayout({ isSpectator = false, isLocked = false }) {
  return !isSpectator && !isLocked;
}
