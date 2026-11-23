// Pure Registry for Minimalist Object Dialog Headers, Per-Object Skin Thumbnails & Audio Visualiser Math
import { escapeHtml } from "./dom.js";
import { BASE_SPRITES, hasCustomSpritePack, resolveObjectSpriteSrc } from "./theme-sprites.js";
import { THEME_PALETTES, SKIN_STYLES } from "./shop-catalog.js";
import { getObjectTypeForFeature, getObjectVisualConfig } from "./object-skins.js";

export const DIALOG_OBJECT_DEFS = {
  focus: { objectName: "Wall Clock", kind: "svg" },
  register: { objectName: "Hourglass", kind: "svg" },
  calendar: { objectName: "Wall Calendar", kind: "svg" },
  tasks: { objectName: "Cork Pinboard", kind: "svg" },
  diary: { objectName: "Desk Notebook", kind: "svg" },
  audio: { objectName: "Headphones", kind: "sprite", spriteKey: "headphones" },
  shop: { objectName: "Merchant Bird", kind: "sprite", spriteKey: "bird" },
  customization: { objectName: "Desk Plant", kind: "sprite", spriteKey: "plant" },
  environment: { objectName: "Garden Window", kind: "svg" },
  profile: { objectName: "Photo Frame", kind: "svg" },
  friends: { objectName: "Desk Phone", kind: "svg" },
  community: { objectName: "Study Computer", kind: "sprite", spriteKey: "computer" },
  buddy: { objectName: "Study Buddy", kind: "sprite", spriteKey: "buddy" },
  library: { objectName: "Bookshelf", kind: "svg" },
  cabinet: { objectName: "Cabinet Drawer", kind: "svg" },
  achievements: { objectName: "Shelf Trophy", kind: "trophy" },
  coffee: { objectName: "Coffee Mug", kind: "sprite", spriteKey: "mug" },
  lamp: { objectName: "Desk Lamp", kind: "sprite", spriteKey: "lamp" },
  customProp: { objectName: "Custom Keepsake", kind: "svg" },
  ops: { objectName: "Ops Console", kind: "svg" }
};

const OBJECT_TYPE_THEME_VARS = {
  clock: {
    space: { "--clock-ear": "#7a9bb8", "--clock-shell": "#3b5370", "--clock-dial": "#16263d", "--clock-hand": "#7be2ed" },
    jungle: { "--clock-ear": "#8fb86e", "--clock-shell": "#b9824a", "--clock-dial": "#f8f6e8" },
    vintage: { "--clock-ear": "#c89b54", "--clock-shell": "#7a4b2a", "--clock-dial": "#f8edd4" },
    modern: { "--clock-ear": "#cbe3e8", "--clock-shell": "#6293a3", "--clock-dial": "#ffffff" },
    anime: { "--clock-ear": "#f4a8c4", "--clock-shell": "#d99bc2", "--clock-dial": "#fff8fc" },
    ocean: { "--clock-ear": "#d9ab64", "--clock-shell": "#5395a3", "--clock-dial": "#effbfc" },
    alchemy: { "--clock-ear": "#c78b4b", "--clock-shell": "#523b66", "--clock-dial": "#241936", "--clock-hand": "#f4d27a" },
    editorial: { "--clock-ear": "#e4e4e0", "--clock-shell": "#141414", "--clock-dial": "#ffffff", "--clock-hand": "#0a0a0a" },
    noir: { "--clock-ear": "#333333", "--clock-shell": "#111111", "--clock-dial": "#1e1e1e", "--clock-hand": "#f5f5f2" }
  },
  hourglass: {
    space: { "--hg-frame": "#6a8aa8", "--hg-sand": "#7be2ed", "--hg-glass": "#d7f2f8" },
    jungle: { "--hg-frame": "#8f6c3a", "--hg-sand": "#7cc46b", "--hg-glass": "#eef8ea" },
    vintage: { "--hg-frame": "#7a4b2a", "--hg-sand": "#d4a657", "--hg-glass": "#f5ebd2" },
    modern: { "--hg-frame": "#588a9a", "--hg-sand": "#63c5cc", "--hg-glass": "#f0fafb" },
    anime: { "--hg-frame": "#d489ad", "--hg-sand": "#f7a6c9", "--hg-glass": "#fff5fa" },
    ocean: { "--hg-frame": "#c89648", "--hg-sand": "#5bc2cf", "--hg-glass": "#e3f9fb" },
    alchemy: { "--hg-frame": "#6b4e7d", "--hg-sand": "#d8a752", "--hg-glass": "#ece0f7" },
    editorial: { "--hg-frame": "#181818", "--hg-sand": "#525250", "--hg-glass": "#f7f7f5" },
    noir: { "--hg-frame": "#3b3b3b", "--hg-sand": "#dcdcd8", "--hg-glass": "#222222" }
  },
  calendar: {
    space: { "--cal-head": "#3d8ea8" },
    jungle: { "--cal-head": "#529450" },
    vintage: { "--cal-head": "#96493d" },
    modern: { "--cal-head": "#43919c" },
    anime: { "--cal-head": "#e682a8" },
    ocean: { "--cal-head": "#e07a67" },
    alchemy: { "--cal-head": "#6b4982" },
    editorial: { "--cal-head": "#111111" },
    noir: { "--cal-head": "#242424" }
  },
  pinboard: {
    space: { "--pin-bg": "#36506e", "--note-a-bg": "#d6eef8", "--note-b-bg": "#a7d4e6" },
    jungle: { "--pin-bg": "#9db888", "--note-a-bg": "#f8f3cc", "--note-b-bg": "#d6edd1" },
    vintage: { "--pin-bg": "#bfa171", "--note-a-bg": "#f7ead0", "--note-b-bg": "#e6d4b3" },
    modern: { "--pin-bg": "#c5dce0", "--note-a-bg": "#ffffff", "--note-b-bg": "#d5eef0" },
    anime: { "--pin-bg": "#e8c7da", "--note-a-bg": "#fff4f8", "--note-b-bg": "#e7dcfa" },
    ocean: { "--pin-bg": "#8cc4cb", "--note-a-bg": "#fff9e6", "--note-b-bg": "#ffd8cc" },
    alchemy: { "--pin-bg": "#4a3b63", "--note-a-bg": "#f2e4ff", "--note-b-bg": "#f7e6c4" },
    editorial: { "--pin-bg": "#e4e4e0", "--note-a-bg": "#ffffff", "--note-b-bg": "#d2d2ce" },
    noir: { "--pin-bg": "#242424", "--note-a-bg": "#efefef", "--note-b-bg": "#3c3c3c" }
  },
  notebook: {
    space: { "--nb-cover": "#dce7f2", "--nb-spine": "#428ea8" },
    jungle: { "--nb-cover": "#e8f0d8", "--nb-spine": "#559150" },
    vintage: { "--nb-cover": "#e8d2ac", "--nb-spine": "#7d482d" },
    modern: { "--nb-cover": "#eef7f9", "--nb-spine": "#397987" },
    anime: { "--nb-cover": "#fcebf3", "--nb-spine": "#e07fa4" },
    ocean: { "--nb-cover": "#e3f7f8", "--nb-spine": "#e07a67" },
    alchemy: { "--nb-cover": "#e9d9f0", "--nb-spine": "#5f4178" },
    editorial: { "--nb-cover": "#ffffff", "--nb-spine": "#111111" },
    noir: { "--nb-cover": "#2a2a2a", "--nb-spine": "#111111" }
  },
  "photo-frame": {
    space: { "--frame-bg": "#63809f", "--pic-sky": "#172844", "--pic-hill": "#5ec4cf" },
    jungle: { "--frame-bg": "#a87e49", "--pic-sky": "#cbe5c0", "--pic-hill": "#528e53" },
    vintage: { "--frame-bg": "#9b6d3c", "--pic-sky": "#efe0be", "--pic-hill": "#9c6334" },
    modern: { "--frame-bg": "#7ea8b5", "--pic-sky": "#e6f2f4", "--pic-hill": "#2c5868" },
    anime: { "--frame-bg": "#d99eb8", "--pic-sky": "#f3c6de", "--pic-hill": "#9a82ba" },
    ocean: { "--frame-bg": "#5d9aa6", "--pic-sky": "#63bcc9", "--pic-hill": "#2f7e8e" },
    alchemy: { "--frame-bg": "#7e5d72", "--pic-sky": "#281e3d", "--pic-hill": "#c78b4b" },
    editorial: { "--frame-bg": "#262626", "--pic-sky": "#f2f2ef", "--pic-hill": "#111111" },
    noir: { "--frame-bg": "#3a3a38", "--pic-sky": "#121212", "--pic-hill": "#e8e8e4" }
  },
  phone: {
    space: { "--phone-body": "#4b6e8c" },
    jungle: { "--phone-body": "#588c52" },
    vintage: { "--phone-body": "#8c5a3c" },
    modern: { "--phone-body": "#498694" },
    anime: { "--phone-body": "#e694b4" },
    ocean: { "--phone-body": "#3e8c9e" },
    alchemy: { "--phone-body": "#5f4578" },
    editorial: { "--phone-body": "#161616" },
    noir: { "--phone-body": "#2c2c2c" }
  },
  bookshelf: {
    space: { "--book-1": "#4dc4d6", "--book-2": "#5b7899", "--book-3": "#e8be6b", "--book-4": "#36506e" },
    jungle: { "--book-1": "#5ea35c", "--book-2": "#d9835b", "--book-3": "#e8c768", "--book-4": "#3d7552" },
    vintage: { "--book-1": "#8c3d35", "--book-2": "#3d6349", "--book-3": "#b88642", "--book-4": "#405570" },
    modern: { "--book-1": "#6cb0ba", "--book-2": "#e3ecee", "--book-3": "#f29b7a", "--book-4": "#3a6070" },
    anime: { "--book-1": "#f29ab8", "--book-2": "#a3d5c8", "--book-3": "#fbe094", "--book-4": "#b5a1e0" },
    ocean: { "--book-1": "#469aa8", "--book-2": "#eb8c76", "--book-3": "#f2d68a", "--book-4": "#2d687d" },
    alchemy: { "--book-1": "#6b4275", "--book-2": "#3f6b5f", "--book-3": "#c78b4b", "--book-4": "#3d3669" },
    editorial: { "--book-1": "#111111", "--book-2": "#e8e8e4", "--book-3": "#666664", "--book-4": "#2b2b2b" },
    noir: { "--book-1": "#f0f0ec", "--book-2": "#2e2e2e", "--book-3": "#7a7a76", "--book-4": "#171717" }
  },
  drawer: {
    space: { "--drawer-face": "#567291", "--drawer-pull-bg": "#c7dce8" },
    jungle: { "--drawer-face": "#9c733e", "--drawer-pull-bg": "#cbe0b8" },
    vintage: { "--drawer-face": "#7c4e2e", "--drawer-pull-bg": "#deb876" },
    modern: { "--drawer-face": "#7faab6", "--drawer-pull-bg": "#eef7f9" },
    anime: { "--drawer-face": "#d89db6", "--drawer-pull-bg": "#ffeaf2" },
    ocean: { "--drawer-face": "#5d9aa6", "--drawer-pull-bg": "#f5dfb2" },
    alchemy: { "--drawer-face": "#5c4362", "--drawer-pull-bg": "#dfb178" },
    editorial: { "--drawer-face": "#d8d8d4", "--drawer-pull-bg": "#111111" },
    noir: { "--drawer-face": "#262626", "--drawer-pull-bg": "#e4e4e0" }
  }
};

const EXTRA_SKIN_VARS = {
  "hourglass:midnight": { "--hg-frame": "#3a4663", "--hg-sand": "#f3cf72", "--hg-glass": "#dbe6f5" },
  "calendar:ocean": { "--cal-head": "#4e99ad" },
  "pinboard:mint": { "--pin-bg": "#9fc9b1", "--note-a-bg": "#f4d0c8", "--note-b-bg": "#c9ebd8" },
  "bookshelf:pastel": { "--book-1": "#e8a4a4", "--book-2": "#93c6b0", "--book-3": "#f0d18a", "--book-4": "#9db8d5" },
  "photo-frame:walnut": { "--frame-bg": "#6e442b" },
  "drawer:brass": { "--drawer-pull-bg": "#b4863f" }
};

function varsToStyle(vars = {}) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function resolveSvgVars(objectType, effectiveThemeId, skinId) {
  const themeVars = OBJECT_TYPE_THEME_VARS[objectType]?.[effectiveThemeId] || {};
  const shopVars = SKIN_STYLES[`${objectType}:${skinId}`]?.vars || {};
  const starterVars = EXTRA_SKIN_VARS[`${objectType}:${skinId}`] || {};
  return { ...themeVars, ...shopVars, ...starterVars };
}

function renderObjectSvgPictureByType(objectType, themeId = "comic", vars = {}) {
  const palette = THEME_PALETTES[themeId] || THEME_PALETTES.comic;
  const styleAttr = escapeHtml(varsToStyle(vars));

  if (objectType === "clock") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 100 104" style="${styleAttr}" aria-hidden="true">
        <circle cx="24" cy="22" r="13" fill="var(--clock-ear, #f1c47b)" stroke="var(--ink)" stroke-width="4"/>
        <circle cx="76" cy="22" r="13" fill="var(--clock-ear, #f1c47b)" stroke="var(--ink)" stroke-width="4"/>
        <circle cx="50" cy="54" r="38" fill="var(--clock-shell, #e2a866)" stroke="var(--ink)" stroke-width="4"/>
        <circle cx="50" cy="54" r="29" fill="var(--clock-dial, #fffaf0)" stroke="var(--ink)" stroke-width="3"/>
        <line x1="50" y1="54" x2="50" y2="34" stroke="var(--clock-hand, var(--ink))" stroke-width="4" stroke-linecap="round"/>
        <line x1="50" y1="54" x2="66" y2="54" stroke="var(--clock-hand, var(--ink))" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="50" cy="54" r="4" fill="var(--clock-hand, var(--ink))"/>
      </svg>
    `;
  }

  if (objectType === "hourglass") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 80 100" style="${styleAttr}" aria-hidden="true">
        <path d="M18 14 L18 86 M62 14 L62 86" stroke="var(--hg-frame, #b98552)" stroke-width="5" stroke-linecap="round"/>
        <path d="M22 14 C22 36, 36 46, 40 50 C44 46, 58 36, 58 14 Z" fill="var(--hg-glass, #e6f6f7)" stroke="var(--ink)" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M22 86 C22 64, 36 54, 40 50 C44 54, 58 64, 58 86 Z" fill="var(--hg-glass, #e6f6f7)" stroke="var(--ink)" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M27 31 C30 41, 38 46, 40 48 C42 46, 50 41, 53 31 Z" fill="var(--hg-sand, #f0c56e)"/>
        <path d="M25 84 C27 72, 36 69, 40 69 C44 69, 53 72, 55 84 Z" fill="var(--hg-sand, #e8b658)"/>
        <rect x="11" y="6" width="58" height="10" rx="4" fill="var(--hg-frame, var(--wood-light, #e2a56d))" stroke="var(--ink)" stroke-width="3.5"/>
        <rect x="11" y="84" width="58" height="10" rx="4" fill="var(--hg-frame, var(--wood-light, #e2a56d))" stroke="var(--ink)" stroke-width="3.5"/>
      </svg>
    `;
  }

  if (objectType === "calendar") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 92 104" style="${styleAttr}" aria-hidden="true">
        <rect x="10" y="16" width="72" height="80" rx="10" fill="#fffaf0" stroke="var(--ink)" stroke-width="4"/>
        <path d="M10 26 C10 20, 15 16, 20 16 L72 16 C77 16, 82 20, 82 26 L82 39 L10 39 Z" fill="var(--cal-head, #e37962)" stroke="var(--ink)" stroke-width="4"/>
        <rect x="24" y="6" width="9" height="18" rx="4" fill="#d9cfc0" stroke="var(--ink)" stroke-width="3"/>
        <rect x="59" y="6" width="9" height="18" rx="4" fill="#d9cfc0" stroke="var(--ink)" stroke-width="3"/>
        <path d="M56 59 L58.2 63.5 L63 64.2 L59.5 67.6 L60.4 72.4 L56 70.1 L51.6 72.4 L52.5 67.6 L49 64.2 L53.8 63.5 Z" fill="#f3c65d" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `;
  }

  if (objectType === "pinboard") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 96 96" style="${styleAttr}" aria-hidden="true">
        <rect x="8" y="12" width="80" height="72" rx="8" fill="var(--pin-bg, #d8b57c)" stroke="var(--ink)" stroke-width="4"/>
        <rect x="18" y="26" width="28" height="38" rx="3" transform="rotate(-6 32 45)" fill="var(--note-a-bg, #fff3b0)" stroke="var(--ink)" stroke-width="3"/>
        <rect x="49" y="28" width="28" height="38" rx="3" transform="rotate(5 63 47)" fill="var(--note-b-bg, #c9ebd8)" stroke="var(--ink)" stroke-width="3"/>
        <circle cx="31" cy="25" r="5" fill="#e66b56" stroke="var(--ink)" stroke-width="2.5"/>
        <circle cx="63" cy="26" r="5" fill="#68a88e" stroke="var(--ink)" stroke-width="2.5"/>
      </svg>
    `;
  }

  if (objectType === "notebook") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 130 106" style="${styleAttr}" aria-hidden="true">
        <g transform="rotate(-4 65 53)">
          <path d="M98 90 L98 102 L105 97 L112 102 L112 90 Z" fill="#e67360" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
          <rect x="14" y="10" width="102" height="82" rx="7" fill="var(--nb-cover, #f5dca4)" stroke="var(--ink)" stroke-width="4"/>
          <path d="M14 17 C14 13, 17 10, 21 10 L34 10 L34 92 L21 92 C17 92, 14 89, 14 85 Z" fill="var(--nb-spine, #e98872)" stroke="var(--ink)" stroke-width="3.5"/>
          <rect x="44" y="22" width="56" height="22" rx="4" fill="#fff9ea" stroke="var(--ink)" stroke-width="2.5"/>
          <circle cx="58" cy="70" r="7" fill="#f3c558" stroke="var(--ink)" stroke-width="2.2"/>
        </g>
      </svg>
    `;
  }

  if (objectType === "window") {
    const skyTop = escapeHtml(palette.skyTop || "#89c8d8");
    const skyBot = escapeHtml(palette.skyBottom || "#efe6b9");
    const hill = escapeHtml(palette.hillB || "#548b70");
    const frameFill = escapeHtml(palette.woodLight || "#f8edcf");
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 96 96" style="${styleAttr}" aria-hidden="true">
        <defs>
          <linearGradient id="win-pic-sky-${escapeHtml(themeId)}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${skyTop}"/>
            <stop offset="100%" stop-color="${skyBot}"/>
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="76" height="72" rx="${palette.windowShape === "porthole" ? 36 : palette.windowShape === "viewport" ? 18 : 8}" fill="${frameFill}" stroke="var(--ink)" stroke-width="4"/>
        <rect x="17" y="17" width="62" height="58" rx="${palette.windowShape === "porthole" ? 29 : palette.windowShape === "viewport" ? 13 : 4}" fill="url(#win-pic-sky-${escapeHtml(themeId)})" stroke="var(--ink)" stroke-width="3"/>
        <circle cx="64" cy="31" r="8" fill="#f8d778"/>
        <path d="M17 66 Q45 50 79 64 L79 75 L17 75 Z" fill="${hill}"/>
        <line x1="48" y1="17" x2="48" y2="75" stroke="#f8efd9" stroke-width="4"/>
        <line x1="17" y1="48" x2="79" y2="48" stroke="#f8efd9" stroke-width="4"/>
        <rect x="6" y="79" width="84" height="9" rx="3" fill="${escapeHtml(palette.wood || "#e2a56d")}" stroke="var(--ink)" stroke-width="3.5"/>
      </svg>
    `;
  }

  if (objectType === "photo-frame") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 96 96" style="${styleAttr}" aria-hidden="true">
        <rect x="10" y="14" width="76" height="68" rx="8" fill="var(--frame-bg, #d9a55e)" stroke="var(--ink)" stroke-width="4"/>
        <rect x="19" y="23" width="58" height="50" rx="3" fill="var(--pic-sky, #cbe5c0)" stroke="var(--ink)" stroke-width="3"/>
        <circle cx="62" cy="36" r="7" fill="#f7da79"/>
        <path d="M19 66 Q40 46 58 60 Q68 52 77 62 L77 73 L19 73 Z" fill="var(--pic-hill, #5b965d)"/>
      </svg>
    `;
  }

  if (objectType === "phone") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 88 134" style="${styleAttr}" aria-hidden="true">
        <rect x="11" y="8" width="66" height="118" rx="14" fill="var(--phone-body, #6d9aa2)" stroke="var(--ink)" stroke-width="4"/>
        <rect x="18" y="18" width="52" height="84" rx="7" fill="#bce6de" stroke="var(--ink)" stroke-width="3"/>
        <rect x="24" y="32" width="38" height="22" rx="7" fill="#fffaf0" stroke="var(--ink)" stroke-width="2.2"/>
        <circle cx="44" cy="113" r="6" fill="#f4ecd8" stroke="var(--ink)" stroke-width="2.5"/>
      </svg>
    `;
  }

  if (objectType === "bookshelf") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 110 96" style="${styleAttr}" aria-hidden="true">
        <rect x="12" y="22" width="18" height="58" rx="3" fill="var(--book-1, #df7761)" stroke="var(--ink)" stroke-width="3.5"/>
        <rect x="33" y="14" width="17" height="66" rx="3" fill="var(--book-2, #6ba689)" stroke="var(--ink)" stroke-width="3.5"/>
        <rect x="53" y="20" width="19" height="60" rx="3" fill="var(--book-3, #e6be67)" stroke="var(--ink)" stroke-width="3.5"/>
        <rect x="75" y="16" width="18" height="64" rx="3" fill="var(--book-4, #6c8eb1)" stroke="var(--ink)" stroke-width="3.5"/>
        <rect x="6" y="79" width="98" height="9" rx="3" fill="var(--wood-light, #d79f68)" stroke="var(--ink)" stroke-width="3.5"/>
      </svg>
    `;
  }

  if (objectType === "drawer") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 96 96" style="${styleAttr}" aria-hidden="true">
        <rect x="12" y="14" width="72" height="28" rx="5" fill="#463224" stroke="var(--ink)" stroke-width="3.5"/>
        <rect x="24" y="20" width="22" height="14" rx="2" fill="#fff3b0" stroke="var(--ink)" stroke-width="2.5"/>
        <rect x="50" y="17" width="22" height="17" rx="2" fill="#cfead9" stroke="var(--ink)" stroke-width="2.5"/>
        <rect x="10" y="34" width="76" height="46" rx="7" fill="var(--drawer-face, var(--wood-light, #dfb17b))" stroke="var(--ink)" stroke-width="4"/>
        <rect x="32" y="48" width="32" height="18" rx="7" fill="var(--drawer-pull-bg, #fff3d6)" stroke="var(--ink)" stroke-width="3"/>
        <circle cx="48" cy="57" r="4.5" fill="var(--drawer-pull-bg, #d6b06b)" stroke="var(--ink)" stroke-width="2.5"/>
      </svg>
    `;
  }

  if (objectType === "trophy") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 96 102" style="${styleAttr}" aria-hidden="true">
        <path d="M24 22 C10 22, 10 48, 25 50" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
        <path d="M72 22 C86 22, 86 48, 71 50" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
        <path d="M23 14 L73 14 L68 46 C66 60, 58 67, 48 67 C38 67, 30 60, 28 46 Z" fill="var(--trophy-gold, #f3ca5f)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>
        <path d="M48 27 L51.2 33.4 L58.2 34.4 L53.1 39.3 L54.3 46.2 L48 42.9 L41.7 46.2 L42.9 39.3 L37.8 34.4 L44.8 33.4 Z" fill="#fff7d6" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>
        <rect x="42" y="66" width="12" height="15" fill="var(--trophy-stem, #dfb149)" stroke="var(--ink)" stroke-width="3.5"/>
        <rect x="26" y="80" width="44" height="13" rx="4" fill="var(--trophy-base, #c28538)" stroke="var(--ink)" stroke-width="3.5"/>
      </svg>
    `;
  }

  if (objectType === "custom-prop") {
    return `
      <svg class="sprk-obj-pic-svg" viewBox="0 0 96 96" aria-hidden="true">
        <rect x="14" y="14" width="68" height="68" rx="12" fill="#fffaf0" stroke="var(--ink)" stroke-width="4" stroke-dasharray="6 4"/>
        <path d="M48 31 L53 43 L66 44 L56 52 L59 65 L48 58 L37 65 L40 52 L30 44 L43 43 Z" fill="#f3c65d" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>
      </svg>
    `;
  }

  // ops console fallback
  return `
    <svg class="sprk-obj-pic-svg" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="24" fill="#d9e3e8" stroke="var(--ink)" stroke-width="4"/>
      <circle cx="48" cy="48" r="10" fill="var(--accent, #e76d50)" stroke="var(--ink)" stroke-width="3.5"/>
    </svg>
  `;
}

export function renderObjectSkinVisual(objectType, skinId = "default", roomThemeId = "comic") {
  const vis = getObjectVisualConfig(objectType, skinId, roomThemeId);

  if (objectType === "trophy") {
    if (vis.spriteSrc) {
      const filterAttr = vis.filterCss ? ` style="filter:${escapeHtml(vis.filterCss)};"` : "";
      return `<img class="sprk-obj-pic-img" src="${escapeHtml(vis.spriteSrc)}"${filterAttr} alt="" draggable="false" />`;
    }
    const vars = resolveSvgVars("trophy", vis.effectiveThemeId, skinId);
    return renderObjectSvgPictureByType("trophy", vis.effectiveThemeId, vars);
  }

  if (vis.spriteSrc) {
    const filterAttr = vis.filterCss ? ` style="filter:${escapeHtml(vis.filterCss)};"` : "";
    const fallback = BASE_SPRITES[vis.spriteKey] || vis.spriteSrc;
    return `<img class="sprk-obj-pic-img" src="${escapeHtml(vis.spriteSrc)}"${filterAttr} onerror="this.src='${escapeHtml(fallback)}'" alt="" draggable="false" />`;
  }

  const vars = resolveSvgVars(objectType, vis.effectiveThemeId, skinId);
  return renderObjectSvgPictureByType(objectType, vis.effectiveThemeId, vars);
}

export function getDialogObjectMeta(feature, themeId = "comic", skinsMap = {}, customProp = null) {
  if (feature === "customProp") {
    const label = customProp?.label?.trim() || "Custom Keepsake";
    const imgUrl = customProp?.imageUrl || "";
    return {
      objectName: label,
      pictureHtml: imgUrl
        ? `<img class="sprk-obj-pic-img" src="${escapeHtml(imgUrl)}" alt="" draggable="false" referrerpolicy="no-referrer" />`
        : renderObjectSvgPictureByType("custom-prop", themeId)
    };
  }

  const def = DIALOG_OBJECT_DEFS[feature];
  if (!def) {
    return {
      objectName: "Study Object",
      pictureHtml: renderObjectSvgPictureByType("ops", themeId)
    };
  }

  const objectType = getObjectTypeForFeature(feature);
  if (!objectType) {
    return {
      objectName: def.objectName,
      pictureHtml: renderObjectSvgPictureByType("ops", themeId)
    };
  }

  const skinId = skinsMap?.[objectType] || "default";
  return {
    objectName: def.objectName,
    pictureHtml: renderObjectSkinVisual(objectType, skinId, themeId)
  };
}

export function computeVisualizerBars({
  isPlaying = false,
  levels = {},
  analyserBins = null,
  barCount = 18,
  tick = 0
} = {}) {
  const count = Math.max(4, Math.min(32, Number(barCount) || 18));
  const vals = Object.values(levels || {}).map((v) => Math.max(0, Math.min(1, Number(v) || 0)));
  const activeEnergy = vals.length
    ? Math.min(1, vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.filter((v) => v > 0.01).length || 1))
    : 0;

  const hasLiveBins = Array.isArray(analyserBins) && analyserBins.some((b) => b > 2);
  const sampleSpan = hasLiveBins ? Math.max(6, Math.min(analyserBins.length, 14)) : 1;

  return Array.from({ length: count }, (_, idx) => {
    if (!isPlaying || activeEnergy <= 0.01) {
      return Number((0.12 + ((idx % 3) * 0.03)).toFixed(3));
    }

    const phase = tick * 0.16 + idx * 0.58;
    const wave = 0.52 + 0.33 * Math.sin(phase) + 0.15 * Math.cos(phase * 1.65 + idx);
    const arch = 1 - Math.abs((idx / (count - 1)) - 0.5) * 0.38;
    const synthHeight = Math.max(0.2, Math.min(1, (0.3 + activeEnergy * 0.7) * wave * arch));

    if (hasLiveBins) {
      const binIdx = Math.min(sampleSpan - 1, Math.floor((idx / count) * sampleSpan));
      const binNorm = Math.min(1, (Number(analyserBins[binIdx]) || 0) / 180);
      return Number(Math.max(0.2, Math.min(1, binNorm * 0.35 + synthHeight * 0.65)).toFixed(3));
    }

    return Number(synthHeight.toFixed(3));
  });
}
