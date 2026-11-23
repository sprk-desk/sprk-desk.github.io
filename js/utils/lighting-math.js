// Pure Dynamic Lamp Light Position & Shelf-to-Desk Illumination Math

function clampPct(value, min = 2, max = 98) {
  return Math.min(Math.max(Number.isFinite(value) ? value : 50, min), max);
}

/**
 * Computes normalized room percentages for the desk lamp's primary glow
 * and its downward desk-surface illumination pool (even when moved onto a shelf).
 */
export function computeLampLightCoords({ lampRect, roomRect, deskRect } = {}) {
  if (!lampRect || !roomRect || roomRect.width <= 0 || roomRect.height <= 0) {
    return {
      lampX: "9.0%",
      lampY: "64.0%",
      deskY: "78.0%",
      isElevated: false,
      spillOpacity: "0",
      deskPoolFactor: "0.85"
    };
  }

  const centerX = lampRect.left + lampRect.width * 0.5;
  // Shade sits roughly 34% down from the top of the lamp sprite
  const shadeY = lampRect.top + lampRect.height * 0.34;

  const xPct = clampPct(((centerX - roomRect.left) / roomRect.width) * 100, 3, 97);
  const yPct = clampPct(((shadeY - roomRect.top) / roomRect.height) * 100, 4, 94);

  let deskSurfaceYPct = 78;
  let isElevated = yPct < 54;
  if (deskRect && deskRect.height > 0) {
    const deskTargetY = deskRect.top + deskRect.height * 0.34;
    deskSurfaceYPct = clampPct(((deskTargetY - roomRect.top) / roomRect.height) * 100, 62, 92);
    isElevated = lampRect.bottom < deskRect.top + 18;
  }

  // Distance between shelf lamp and desk attenuates mid-air column gently while keeping desk warmly lit
  const verticalSpan = Math.max(0, deskSurfaceYPct - yPct);
  const spillOpacity = isElevated
    ? Math.max(0.45, Math.min(0.95, 0.55 + verticalSpan / 100)).toFixed(2)
    : "0";
  const deskPoolFactor = isElevated ? "0.95" : "0.78";

  return {
    lampX: `${xPct.toFixed(1)}%`,
    lampY: `${yPct.toFixed(1)}%`,
    deskY: `${deskSurfaceYPct.toFixed(1)}%`,
    isElevated,
    spillOpacity,
    deskPoolFactor
  };
}
