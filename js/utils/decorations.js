// Pure Fixed Room Decorations Registry, SVG Artwork & Equip/Remove Rules

export const DECORATION_SLOTS = [
  {
    id: "penstand",
    label: "Desk Penstand",
    selector: ".desk-pen-cup",
    defaultStyle: "classic",
    locationLabel: "Desk Top"
  },
  {
    id: "shelfCandle",
    label: "Shelf Accent",
    selector: ".shelf-deco-candle",
    defaultStyle: "classic",
    locationLabel: "Shelf 2"
  },
  {
    id: "bookend",
    label: "Shelf Bookend",
    selector: ".shelf-deco-bookend",
    defaultStyle: "classic",
    locationLabel: "Shelf 4"
  },
  {
    id: "deskCharm",
    label: "Desk Accent",
    selector: ".desk-deco-charm",
    defaultStyle: "none",
    locationLabel: "Desk Corner"
  },
  {
    id: "stringLights",
    label: "Bookcase Garland",
    selector: ".bookcase-fairy-lights",
    defaultStyle: "none",
    locationLabel: "Bookcase Crown"
  }
];

export const DEFAULT_DECORATIONS = {
  penstand: "classic",
  shelfCandle: "classic",
  bookend: "classic",
  deskCharm: "none",
  stringLights: "none"
};

export const DECORATION_STYLES = {
  penstand: {
    classic: { id: "classic", name: "Classic Ceramic Cup", swatch: "#fff3dc", starter: true },
    mint: { id: "mint", name: "Mint Ribbed Holder", swatch: "#9fd1be", starter: true },
    cat: { id: "cat", name: "Calico Cat Penstand", swatch: "#f5c798", shopItemId: "deco_penstand_cat" },
    brass: { id: "brass", name: "Brass Studio Caddy", swatch: "#cfa152", shopItemId: "deco_penstand_brass" },
    crystal: { id: "crystal", name: "Amethyst Prism Cup", swatch: "#b896e0", shopItemId: "deco_penstand_crystal" }
  },
  shelfCandle: {
    classic: { id: "classic", name: "Beeswax Pillar Candle", swatch: "#f5dfb2", starter: true },
    lantern: { id: "lantern", name: "Brass Mini Lantern", swatch: "#d9a24e", shopItemId: "deco_candle_lantern" },
    jar: { id: "jar", name: "Lavender Glass Jar", swatch: "#b99fd8", shopItemId: "deco_candle_jar" }
  },
  bookend: {
    classic: { id: "classic", name: "Botanical Sage Arch", swatch: "#6ba689", starter: true },
    luckyCat: { id: "luckyCat", name: "Lucky Study Cat", swatch: "#f5e3c8", shopItemId: "deco_bookend_cat" },
    globe: { id: "globe", name: "Mini Desk Globe", swatch: "#6fb7c4", shopItemId: "deco_bookend_globe" }
  },
  deskCharm: {
    terrarium: { id: "terrarium", name: "Moss Terrarium Orb", swatch: "#84ba86", starter: true },
    washiTray: { id: "washiTray", name: "Pastel Washi Stand", swatch: "#f0a8b8", shopItemId: "deco_charm_washi" },
    snowglobe: { id: "snowglobe", name: "Moonlight Snowglobe", swatch: "#7ea8d8", shopItemId: "deco_charm_snowglobe" }
  },
  stringLights: {
    warmGarland: { id: "warmGarland", name: "Warm Fairy Lights", swatch: "#ffd578", shopItemId: "deco_lights_warm" },
    starGarland: { id: "starGarland", name: "Starlight Vine", swatch: "#9fd6b0", shopItemId: "deco_lights_starlight" }
  }
};

export function normalizeDecorationsMap(raw = {}) {
  const clean = { ...DEFAULT_DECORATIONS };
  if (!raw || typeof raw !== "object") return clean;
  for (const slot of DECORATION_SLOTS) {
    const val = raw[slot.id];
    if (val === "none") {
      clean[slot.id] = "none";
    } else if (typeof val === "string" && DECORATION_STYLES[slot.id]?.[val]) {
      clean[slot.id] = val;
    }
  }
  return clean;
}

export function isDecorationOwned(slotId, styleId, ownedItemIds = []) {
  if (styleId === "none") return true;
  const style = DECORATION_STYLES[slotId]?.[styleId];
  if (!style) return false;
  if (style.starter) return true;
  if (!style.shopItemId) return true;
  return Array.isArray(ownedItemIds) && ownedItemIds.includes(style.shopItemId);
}

export function applyDecorationPatch(current = {}, slotId, styleId) {
  const next = normalizeDecorationsMap(current);
  if (!DECORATION_STYLES[slotId]) return next;
  if (styleId === "none" || DECORATION_STYLES[slotId][styleId]) {
    next[slotId] = styleId;
  }
  return next;
}

export function renderDecorationSvg(slotId, styleId) {
  if (!styleId || styleId === "none") return "";

  if (slotId === "penstand") {
    if (styleId === "mint") {
      return `
        <svg viewBox="0 0 64 78" aria-hidden="true">
          <rect x="15" y="10" width="7" height="30" rx="2" transform="rotate(-14 18 25)" fill="#f29b7a" stroke="var(--ink)" stroke-width="2"/>
          <rect x="28" y="6" width="6" height="34" rx="2" transform="rotate(2 31 23)" fill="#f5cf64" stroke="var(--ink)" stroke-width="2"/>
          <path d="M40 34 L45 11 L49 34 Z" fill="#6b8eb8" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>
          <rect x="13" y="34" width="38" height="41" rx="8" fill="#9fd1be" stroke="var(--ink)" stroke-width="2.6"/>
          <line x1="21" y1="40" x2="21" y2="69" stroke="var(--ink)" stroke-width="1.6" opacity="0.35"/>
          <line x1="32" y1="40" x2="32" y2="69" stroke="var(--ink)" stroke-width="1.6" opacity="0.35"/>
          <line x1="43" y1="40" x2="43" y2="69" stroke="var(--ink)" stroke-width="1.6" opacity="0.35"/>
          <ellipse cx="32" cy="34" rx="19" ry="4.5" fill="#7cb8a1" stroke="var(--ink)" stroke-width="2.2"/>
        </svg>
      `;
    }
    if (styleId === "cat") {
      return `
        <svg viewBox="0 0 64 78" aria-hidden="true">
          <rect x="17" y="8" width="7" height="31" rx="2" transform="rotate(-10 20 23)" fill="#e76d50" stroke="var(--ink)" stroke-width="2"/>
          <rect x="30" y="5" width="7" height="34" rx="2" transform="rotate(5 33 22)" fill="#7bb8d4" stroke="var(--ink)" stroke-width="2"/>
          <rect x="41" y="11" width="6" height="28" rx="2" transform="rotate(14 44 25)" fill="#f5cb5c" stroke="var(--ink)" stroke-width="2"/>
          <polygon points="15,35 20,21 28,34" fill="#f7e6cf" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"/>
          <polygon points="49,35 44,21 36,34" fill="#df9e67" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M13 35 L51 35 L48 70 C47 73, 45 75, 41 75 L23 75 C19 75, 17 73, 16 70 Z" fill="#fff6ea" stroke="var(--ink)" stroke-width="2.6" stroke-linejoin="round"/>
          <circle cx="25" cy="52" r="2.3" fill="var(--ink)"/>
          <circle cx="39" cy="52" r="2.3" fill="var(--ink)"/>
          <ellipse cx="22" cy="57" rx="3.2" ry="1.8" fill="#f49d92"/>
          <ellipse cx="42" cy="57" rx="3.2" ry="1.8" fill="#f49d92"/>
          <path d="M29 55 Q32 58 35 55" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
    }
    if (styleId === "brass") {
      return `
        <svg viewBox="0 0 64 78" aria-hidden="true">
          <rect x="16" y="6" width="8" height="36" rx="1.5" transform="rotate(-11 20 24)" fill="#efe2c4" stroke="var(--ink)" stroke-width="2"/>
          <rect x="29" y="4" width="6" height="36" rx="3" fill="#2c3e52" stroke="var(--ink)" stroke-width="2"/>
          <polygon points="32,2 35,9 29,9" fill="#f2cf6d" stroke="var(--ink)" stroke-width="1.6"/>
          <rect x="40" y="10" width="7" height="30" rx="2" transform="rotate(11 43 25)" fill="#8c3d35" stroke="var(--ink)" stroke-width="2"/>
          <path d="M12 34 L52 34 L48 71 C47 73, 45 75, 41 75 L23 75 C19 75, 17 73, 16 71 Z" fill="#d9ab58" stroke="var(--ink)" stroke-width="2.6" stroke-linejoin="round"/>
          <ellipse cx="32" cy="34" rx="20" ry="5" fill="#9c722c" stroke="var(--ink)" stroke-width="2.4"/>
          <rect x="17" y="48" width="30" height="7" rx="2" fill="#f3d689" stroke="var(--ink)" stroke-width="1.6"/>
        </svg>
      `;
    }
    if (styleId === "crystal") {
      return `
        <svg viewBox="0 0 64 78" aria-hidden="true">
          <path d="M20 35 L15 9 C21 10, 25 18, 25 35 Z" fill="#f5dff7" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>
          <rect x="30" y="7" width="6" height="32" rx="2" transform="rotate(6 33 23)" fill="#7ce0ec" stroke="var(--ink)" stroke-width="2"/>
          <polygon points="12,42 20,32 44,32 52,42 46,74 18,74" fill="#b896e0" stroke="var(--ink)" stroke-width="2.6" stroke-linejoin="round"/>
          <polygon points="20,32 32,46 44,32" fill="#dec8f7" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>
          <polygon points="32,46 24,74 40,74" fill="#9974c7" opacity="0.55"/>
          <circle cx="32" cy="54" r="3.5" fill="#fff7cc"/>
        </svg>
      `;
    }
    // classic
    return `
      <svg viewBox="0 0 64 78" aria-hidden="true">
        <rect x="16" y="8" width="7" height="32" rx="2" transform="rotate(-12 19 24)" fill="#f3c558" stroke="var(--ink)" stroke-width="2"/>
        <rect x="29" y="5" width="7" height="34" rx="2" transform="rotate(3 32 22)" fill="#e76d50" stroke="var(--ink)" stroke-width="2"/>
        <rect x="41" y="10" width="8" height="30" rx="2" transform="rotate(14 45 25)" fill="#6ba689" stroke="var(--ink)" stroke-width="2"/>
        <path d="M12 34 L52 34 L48 70 C47 73, 45 75, 41 75 L23 75 C19 75, 17 73, 16 70 Z" fill="#fff3dc" stroke="var(--ink)" stroke-width="2.6" stroke-linejoin="round"/>
        <ellipse cx="32" cy="34" rx="20" ry="5" fill="#d8c6a6" stroke="var(--ink)" stroke-width="2.4"/>
        <circle cx="32" cy="54" r="5" fill="var(--accent, #e76d50)" opacity="0.65"/>
      </svg>
    `;
  }

  if (slotId === "shelfCandle") {
    if (styleId === "lantern") {
      return `
        <svg viewBox="0 0 40 52" aria-hidden="true">
          <path d="M13 13 C13 6, 27 6, 27 13" fill="none" stroke="var(--ink)" stroke-width="2.2"/>
          <rect x="9" y="13" width="22" height="5" rx="2" fill="#cfa04d" stroke="var(--ink)" stroke-width="2"/>
          <rect x="10" y="18" width="20" height="25" rx="3" fill="#ffe7ad" stroke="var(--ink)" stroke-width="2.2"/>
          <path d="M20 23 C23 28, 23 34, 20 36 C17 34, 17 28, 20 23 Z" fill="#f29b42"/>
          <rect x="8" y="43" width="24" height="6" rx="2" fill="#b48436" stroke="var(--ink)" stroke-width="2"/>
        </svg>
      `;
    }
    if (styleId === "jar") {
      return `
        <svg viewBox="0 0 40 52" aria-hidden="true">
          <path d="M20 9 C23 14, 23 18, 20 20 C17 18, 17 14, 20 9 Z" fill="#ffd269" stroke="var(--ink)" stroke-width="1.4"/>
          <rect x="9" y="21" width="22" height="27" rx="5" fill="#c7b2e3" stroke="var(--ink)" stroke-width="2.2"/>
          <rect x="13" y="29" width="14" height="11" rx="2" fill="#fffaf0" stroke="var(--ink)" stroke-width="1.5"/>
          <ellipse cx="20" cy="21" rx="11" ry="3" fill="#ebe0f7" stroke="var(--ink)" stroke-width="1.8"/>
        </svg>
      `;
    }
    // classic candle
    return `
      <svg viewBox="0 0 40 52" aria-hidden="true">
        <path d="M20 8 C24 14, 24 20, 20 22 C16 20, 16 14, 20 8 Z" fill="#f7b44c" stroke="var(--ink)" stroke-width="1.5"/>
        <rect x="11" y="22" width="18" height="26" rx="4" fill="#fffaf0" stroke="var(--ink)" stroke-width="2.2"/>
        <path d="M11 26 Q16 30 20 26 T29 26" fill="#f3e3c6"/>
      </svg>
    `;
  }

  if (slotId === "bookend") {
    if (styleId === "luckyCat") {
      return `
        <svg viewBox="0 0 44 50" aria-hidden="true">
          <polygon points="10,16 14,6 20,14" fill="#fff4e3" stroke="var(--ink)" stroke-width="2"/>
          <polygon points="34,16 30,6 24,14" fill="#fff4e3" stroke="var(--ink)" stroke-width="2"/>
          <rect x="9" y="13" width="26" height="32" rx="11" fill="#fff8ee" stroke="var(--ink)" stroke-width="2.4"/>
          <rect x="12" y="28" width="20" height="4" rx="2" fill="#e76d50" stroke="var(--ink)" stroke-width="1.4"/>
          <circle cx="17" cy="21" r="1.8" fill="var(--ink)"/>
          <circle cx="27" cy="21" r="1.8" fill="var(--ink)"/>
          <circle cx="22" cy="36" r="5" fill="#f3c558" stroke="var(--ink)" stroke-width="1.6"/>
        </svg>
      `;
    }
    if (styleId === "globe") {
      return `
        <svg viewBox="0 0 44 50" aria-hidden="true">
          <circle cx="22" cy="20" r="13" fill="#7ac5d1" stroke="var(--ink)" stroke-width="2.2"/>
          <path d="M15 15 Q20 18 18 25 Q24 23 28 28" fill="#82b87a"/>
          <path d="M22 4 C33 4, 38 14, 34 28" fill="none" stroke="#c89448" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M22 33 L22 42 M13 43 L31 43" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `;
    }
    // classic arch
    return `
      <svg viewBox="0 0 44 50" aria-hidden="true">
        <path d="M8 45 L8 22 A14 14 0 0 1 36 22 L36 45 Z" fill="#6ba689" stroke="var(--ink)" stroke-width="2.4"/>
        <circle cx="22" cy="22" r="6" fill="#c7ebdc" stroke="var(--ink)" stroke-width="1.8"/>
      </svg>
    `;
  }

  if (slotId === "deskCharm") {
    if (styleId === "terrarium") {
      return `
        <svg viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r="21" fill="#e6f7f2" stroke="var(--ink)" stroke-width="2.4"/>
          <path d="M10 35 Q28 30 46 35 A19 19 0 0 1 10 35 Z" fill="#6fa66c" stroke="var(--ink)" stroke-width="1.8"/>
          <path d="M24 34 L28 19 L33 34 Z" fill="#52915b" stroke="var(--ink)" stroke-width="1.6"/>
          <circle cx="20" cy="20" r="3" fill="#ffffff" opacity="0.8"/>
        </svg>
      `;
    }
    if (styleId === "washiTray") {
      return `
        <svg viewBox="0 0 60 52" aria-hidden="true">
          <rect x="8" y="28" width="44" height="16" rx="4" fill="#d9a16c" stroke="var(--ink)" stroke-width="2.4"/>
          <circle cx="20" cy="24" r="10" fill="#f49cb2" stroke="var(--ink)" stroke-width="2.2"/>
          <circle cx="20" cy="24" r="4" fill="#fffaf0" stroke="var(--ink)" stroke-width="1.6"/>
          <circle cx="38" cy="24" r="10" fill="#9fd1be" stroke="var(--ink)" stroke-width="2.2"/>
          <circle cx="38" cy="24" r="4" fill="#fffaf0" stroke="var(--ink)" stroke-width="1.6"/>
        </svg>
      `;
    }
    if (styleId === "snowglobe") {
      return `
        <svg viewBox="0 0 56 58" aria-hidden="true">
          <circle cx="28" cy="25" r="19" fill="#cce2f7" stroke="var(--ink)" stroke-width="2.4"/>
          <path d="M29 14 A8 8 0 1 0 33 30 A6.5 6.5 0 1 1 29 14 Z" fill="#ffe487"/>
          <circle cx="19" cy="19" r="1.6" fill="#fff"/><circle cx="36" cy="23" r="1.5" fill="#fff"/><circle cx="25" cy="31" r="1.5" fill="#fff"/>
          <rect x="13" y="40" width="30" height="12" rx="4" fill="#7d563c" stroke="var(--ink)" stroke-width="2.4"/>
        </svg>
      `;
    }
  }

  if (slotId === "stringLights") {
    const bulbColor = styleId === "starGarland" ? "#9ce7e0" : "#ffd66e";
    const wireColor = styleId === "starGarland" ? "#4e7a5e" : "#4a3b2e";
    return `
      <svg viewBox="0 0 420 42" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 6 Q55 30 105 8 Q155 30 210 8 Q265 30 315 8 Q365 30 416 6" fill="none" stroke="${wireColor}" stroke-width="2.2"/>
        <circle cx="55" cy="20" r="5" fill="${bulbColor}" stroke="var(--ink)" stroke-width="1.4"/>
        <circle cx="105" cy="10" r="4.5" fill="#fff4bd" stroke="var(--ink)" stroke-width="1.4"/>
        <circle cx="155" cy="20" r="5" fill="${bulbColor}" stroke="var(--ink)" stroke-width="1.4"/>
        <circle cx="210" cy="10" r="4.5" fill="#fff4bd" stroke="var(--ink)" stroke-width="1.4"/>
        <circle cx="265" cy="20" r="5" fill="${bulbColor}" stroke="var(--ink)" stroke-width="1.4"/>
        <circle cx="315" cy="10" r="4.5" fill="#fff4bd" stroke="var(--ink)" stroke-width="1.4"/>
        <circle cx="365" cy="20" r="5" fill="${bulbColor}" stroke="var(--ink)" stroke-width="1.4"/>
      </svg>
    `;
  }

  return "";
}
