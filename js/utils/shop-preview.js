// Visual Thumbnail & Preview Dialog Stage Renderers for the Desk Shop
import { escapeHtml } from "./dom.js";
import {
  BASE_SPRITES,
  hasCustomSpritePack,
  resolveObjectSpriteSrc,
  resolveThemeSpritePack
} from "./theme-sprites.js";
import { getShopPreviewDescriptor, THEME_PALETTES } from "./shop-catalog.js";
import { renderDecorationSvg } from "./decorations.js";
import { AUDIO_CHANNELS } from "../core/audio-manager.js";

function varsToInlineStyle(vars = {}) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function renderObjectSvgMarkup(targetObject, vars = {}) {
  const styleAttr = varsToInlineStyle(vars);
  if (targetObject === "clock") {
    return `
      <svg class="sprk-preview-svg" viewBox="0 0 100 104" style="${escapeHtml(styleAttr)}" aria-hidden="true">
        <circle cx="24" cy="22" r="13" fill="var(--clock-ear, #f1c47b)" stroke="var(--ink)" stroke-width="3.2"/>
        <circle cx="24" cy="22" r="7" fill="#fff3d6"/>
        <circle cx="76" cy="22" r="13" fill="var(--clock-ear, #f1c47b)" stroke="var(--ink)" stroke-width="3.2"/>
        <circle cx="76" cy="22" r="7" fill="#fff3d6"/>
        <rect x="46" y="7" width="8" height="10" rx="3" fill="#d9a154" stroke="var(--ink)" stroke-width="2.5"/>
        <path d="M26 88 L20 98 M74 88 L80 98" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="50" cy="54" r="39" fill="var(--clock-shell, #e2a866)" stroke="var(--ink)" stroke-width="3.4"/>
        <circle cx="50" cy="54" r="31" fill="var(--clock-dial, #fffaf0)" stroke="var(--ink)" stroke-width="2.4"/>
        <circle cx="50" cy="30" r="2.2" fill="var(--clock-hand, var(--ink))" opacity="0.55"/>
        <circle cx="74" cy="54" r="2.2" fill="var(--clock-hand, var(--ink))" opacity="0.55"/>
        <circle cx="50" cy="78" r="2.2" fill="var(--clock-hand, var(--ink))" opacity="0.55"/>
        <circle cx="26" cy="54" r="2.2" fill="var(--clock-hand, var(--ink))" opacity="0.55"/>
        <line x1="50" y1="54" x2="50" y2="33" stroke="var(--clock-hand, var(--ink))" stroke-width="3" stroke-linecap="round"/>
        <line x1="50" y1="54" x2="66" y2="54" stroke="var(--clock-hand, var(--ink))" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="50" cy="54" r="3.2" fill="var(--clock-hand, var(--ink))"/>
      </svg>
    `;
  }

  if (targetObject === "notebook") {
    return `
      <svg class="sprk-preview-svg" viewBox="0 0 130 106" style="${escapeHtml(styleAttr)}" aria-hidden="true">
        <g transform="rotate(-4 65 53)">
          <path d="M98 90 L98 102 L105 97 L112 102 L112 90 Z" fill="#e67360" stroke="var(--ink)" stroke-width="2.2" stroke-linejoin="round"/>
          <rect x="14" y="10" width="102" height="82" rx="7" fill="var(--nb-cover, #f5dca4)" stroke="var(--ink)" stroke-width="3.2"/>
          <path d="M14 17 C14 13, 17 10, 21 10 L32 10 L32 92 L21 92 C17 92, 14 89, 14 85 Z" fill="var(--nb-spine, #e98872)" stroke="var(--ink)" stroke-width="3"/>
          <rect x="42" y="20" width="58" height="20" rx="4" fill="#fff9ea" stroke="var(--ink)" stroke-width="2"/>
          <line x1="48" y1="28" x2="92" y2="28" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
          <line x1="48" y1="34" x2="80" y2="34" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
          <rect x="88" y="6" width="24" height="12" rx="2" transform="rotate(24 100 12)" fill="#9fd1be" stroke="var(--ink)" stroke-width="2"/>
          <circle cx="58" cy="70" r="6" fill="#f3c558" stroke="var(--ink)" stroke-width="1.8"/>
        </g>
      </svg>
    `;
  }

  if (targetObject === "phone") {
    return `
      <svg class="sprk-preview-svg" viewBox="0 0 88 134" style="${escapeHtml(styleAttr)}" aria-hidden="true">
        <path d="M74 36 C82 44, 82 58, 76 68" fill="none" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M76 66 L78.8 71.8 L85 72.7 L80.5 77.1 L81.6 83.2 L76 80.3 L70.4 83.2 L71.5 77.1 L67 72.7 L73.2 71.8 Z" fill="#f5cf6d" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>
        <rect x="8" y="8" width="66" height="118" rx="14" fill="var(--phone-body, #6d9aa2)" stroke="var(--ink)" stroke-width="3.2"/>
        <rect x="15" y="18" width="52" height="84" rx="7" fill="#bce6de" stroke="var(--ink)" stroke-width="2.2"/>
        <rect x="29" y="12" width="24" height="3" rx="1.5" fill="var(--ink)" opacity="0.5"/>
        <rect x="21" y="31" width="38" height="22" rx="7" fill="#fffaf0" stroke="var(--ink)" stroke-width="1.8"/>
        <path d="M40 46 C35 42, 34 37, 38 35.5 C40 35, 41.2 37, 41.5 37.8 C41.8 37, 43 35, 45 35.5 C49 37, 48 42, 40 46 Z" fill="#ea7b6e"/>
        <rect x="23" y="64" width="36" height="14" rx="5" fill="#fff5cf" stroke="var(--ink)" stroke-width="1.6"/>
        <circle cx="41" cy="113" r="5.5" fill="#f4ecd8" stroke="var(--ink)" stroke-width="2"/>
      </svg>
    `;
  }

  // Trophy fallback SVG
  return `
    <svg class="sprk-preview-svg" viewBox="0 0 96 102" style="${escapeHtml(styleAttr)}" aria-hidden="true">
      <path d="M24 22 C8 22, 8 48, 25 50" fill="none" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M24 22 C10 22, 10 48, 25 50" fill="none" stroke="var(--trophy-gold, #f3ca5f)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M72 22 C88 22, 88 48, 71 50" fill="none" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M72 22 C86 22, 86 48, 71 50" fill="none" stroke="var(--trophy-gold, #f3ca5f)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M23 14 L73 14 L68 46 C66 60, 58 67, 48 67 C38 67, 30 60, 28 46 Z" fill="var(--trophy-gold, #f3ca5f)" stroke="var(--ink)" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M48 27 L51.2 33.4 L58.2 34.4 L53.1 39.3 L54.3 46.2 L48 42.9 L41.7 46.2 L42.9 39.3 L37.8 34.4 L44.8 33.4 Z" fill="#fff7d6" stroke="var(--ink)" stroke-width="1.7" stroke-linejoin="round"/>
      <rect x="42" y="66" width="12" height="15" fill="var(--trophy-stem, #dfb149)" stroke="var(--ink)" stroke-width="2.8"/>
      <rect x="26" y="80" width="44" height="13" rx="4" fill="var(--trophy-base, #c28538)" stroke="var(--ink)" stroke-width="3"/>
    </svg>
  `;
}

function renderObjectVisual(desc) {
  if (desc.renderKind === "sprite" || (desc.renderKind === "trophy" && desc.spriteSrc)) {
    const filterRule = desc.filterCss ? `filter:${desc.filterCss};` : "";
    return `<img class="sprk-preview-img" src="${escapeHtml(desc.spriteSrc)}" alt="${escapeHtml(desc.title)}" style="${escapeHtml(filterRule)}" draggable="false" />`;
  }
  return renderObjectSvgMarkup(desc.targetObject, desc.cssVars);
}

function getSkyGradientForPhase(phase, fallbackTop, fallbackBottom) {
  if (phase === "morning") return "linear-gradient(180deg, #89c8d8 0%, #cbe8df 58%, #f8e7b8 100%)";
  if (phase === "afternoon") return "linear-gradient(180deg, #79bfd1 0%, #bae1dc 58%, #efe6b9 100%)";
  if (phase === "sunset") return "linear-gradient(180deg, #4f4a7d 0%, #ce7572 56%, #f5b874 100%)";
  if (phase === "night") return "linear-gradient(180deg, #0e1d38 0%, #1b345b 56%, #2b4d6f 100%)";
  return `linear-gradient(180deg, ${fallbackTop} 0%, ${fallbackBottom} 100%)`;
}

function renderWindowWeatherDots(weather) {
  if (weather === "rain") {
    return `
      <span class="sprk-mini-particle is-rain" style="left:22%;top:22%;"></span>
      <span class="sprk-mini-particle is-rain" style="left:50%;top:42%;"></span>
      <span class="sprk-mini-particle is-rain" style="left:72%;top:28%;"></span>
      <span class="sprk-mini-particle is-rain" style="left:36%;top:58%;"></span>
    `;
  }
  if (weather === "starlight") {
    return `
      <span class="sprk-mini-particle is-star" style="left:22%;top:30%;"></span>
      <span class="sprk-mini-particle is-star" style="left:64%;top:26%;"></span>
      <span class="sprk-mini-particle is-star" style="left:46%;top:62%;"></span>
      <span class="sprk-mini-particle is-star" style="left:76%;top:66%;"></span>
    `;
  }
  if (weather === "fireflies") {
    return `
      <span class="sprk-mini-particle is-firefly" style="left:22%;top:42%;"></span>
      <span class="sprk-mini-particle is-firefly" style="left:68%;top:32%;"></span>
      <span class="sprk-mini-particle is-firefly" style="left:48%;top:64%;"></span>
    `;
  }
  if (weather === "snow") {
    return `
      <span class="sprk-mini-particle is-snow" style="left:24%;top:28%;"></span>
      <span class="sprk-mini-particle is-snow" style="left:60%;top:46%;"></span>
      <span class="sprk-mini-particle is-snow" style="left:40%;top:68%;"></span>
    `;
  }
  if (weather === "breeze") {
    return `
      <span class="sprk-mini-particle is-leaf" style="left:26%;top:40%;"></span>
      <span class="sprk-mini-particle is-leaf" style="left:64%;top:55%;"></span>
    `;
  }
  return "";
}

export function renderMiniThumbnail(item, currentThemeId = "comic") {
  const desc = getShopPreviewDescriptor(item, currentThemeId);
  if (!desc) return "";

  if (desc.mode === "room") {
    const p = desc.palette;
    const spriteSrc = hasCustomSpritePack(desc.themeId)
      ? resolveObjectSpriteSrc(desc.themeId, "buddy")
      : null;
    const isNightSky = desc.themeId === "space" || desc.themeId === "midnight" || desc.themeId === "alchemy" || desc.themeId === "noir";

    return `
      <div class="sprk-shop-thumb is-theme" style="background:${escapeHtml(p.wall)};--thumb-ink:${escapeHtml(p.ink)};--thumb-wood:${escapeHtml(p.wood)};--thumb-desk:${escapeHtml(p.deskTop)};--thumb-accent:${escapeHtml(p.accent)};">
        <div class="sprk-thumb-floor" style="background:${escapeHtml(p.floor)};"></div>
        <div class="sprk-thumb-window shape-${escapeHtml(p.windowShape)}" style="background:linear-gradient(180deg, ${escapeHtml(p.skyTop)}, ${escapeHtml(p.skyBottom)});border-color:${escapeHtml(p.ink)};">
          <span class="sprk-thumb-orb" style="background:${isNightSky ? "#fff4c9" : "#f7d577"};"></span>
          <span class="sprk-thumb-hill" style="background:${escapeHtml(p.hillB)};"></span>
        </div>
        <div class="sprk-thumb-desk" style="background:${escapeHtml(p.deskTop)};border-color:${escapeHtml(p.ink)};"></div>
        ${spriteSrc
          ? `<img class="sprk-thumb-sprite" src="${escapeHtml(spriteSrc)}" alt="" draggable="false" />`
          : `<div class="sprk-thumb-palette-bars" aria-hidden="true">
               <span style="background:${escapeHtml(p.wood)};"></span>
               <span style="background:${escapeHtml(p.accent)};"></span>
               <span style="background:${escapeHtml(p.hillA)};"></span>
             </div>`}
      </div>
    `;
  }

  if (desc.mode === "object") {
    return `
      <div class="sprk-shop-thumb is-object" style="background:radial-gradient(circle at 50% 42%, #ffffff 0%, #f3ead7 100%);">
        <div class="sprk-thumb-pedestal" style="background:${escapeHtml(item.swatch || "#d7c4a4")};"></div>
        <div class="sprk-thumb-object-wrap">
          ${renderObjectVisual(desc)}
        </div>
      </div>
    `;
  }

  if (desc.mode === "deco") {
    return `
      <div class="sprk-shop-thumb is-object" style="background:radial-gradient(circle at 50% 42%, #ffffff 0%, #f3ead7 100%);">
        <div class="sprk-thumb-pedestal" style="background:${escapeHtml(item.swatch || "#d7c4a4")};"></div>
        <div class="sprk-thumb-object-wrap">
          ${renderDecorationSvg(desc.decoSlot, desc.decoStyle)}
        </div>
      </div>
    `;
  }

  if (desc.mode === "audio") {
    return `
      <div class="sprk-shop-thumb is-audio" style="background:linear-gradient(135deg, #273038 0%, #3a4652 100%);">
        <div class="sprk-thumb-cassette" style="border-color:${escapeHtml(desc.swatch)};">
          <div class="sprk-thumb-cassette-stripe" style="background:${escapeHtml(desc.swatch)};"></div>
          <div class="sprk-thumb-reels"><span></span><span></span></div>
        </div>
      </div>
    `;
  }

  if (desc.mode === "particles") {
    return `
      <div class="sprk-shop-thumb is-ambience" style="background:linear-gradient(180deg, #0b1324 0%, #17253b 100%);border-color:rgba(255,255,255,0.2);">
        <div class="sprk-thumb-ambience-window" style="inset:5px;border-color:rgba(255,255,255,0.25);background:radial-gradient(circle at 50% 45%, ${escapeHtml(desc.swatch)}33 0%, #0b1324 85%);">
          ${renderWindowWeatherDots(desc.particleId)}
        </div>
      </div>
    `;
  }

  // Ambience
  const p = desc.palette;
  const preset = desc.preset;
  const skyBg = getSkyGradientForPhase(preset.timeOfDay, p.skyTop, p.skyBottom);
  const isNight = preset.timeOfDay === "night";
  return `
    <div class="sprk-shop-thumb is-ambience" style="background:${escapeHtml(p.wall)};">
      <div class="sprk-thumb-ambience-window" style="background:${skyBg};">
        <span class="sprk-thumb-orb" style="background:${isNight ? "#fff6d1" : "#f7d577"};"></span>
        <span class="sprk-thumb-hill" style="background:${escapeHtml(p.hillB)};"></span>
        ${renderWindowWeatherDots(preset.weather)}
      </div>
    </div>
  `;
}

export function renderRoomStageMarkup({
  themeId = "comic",
  palette = THEME_PALETTES.comic,
  timeOfDay = "auto",
  weather = "clear",
  lampOn = true,
  darknessPct = 10
}) {
  const pack = resolveThemeSpritePack(themeId);
  const isNight = timeOfDay === "night" || themeId === "space" || themeId === "midnight" || themeId === "alchemy" || themeId === "noir";
  const skyBg = timeOfDay && timeOfDay !== "auto"
    ? getSkyGradientForPhase(timeOfDay, palette.skyTop, palette.skyBottom)
    : `linear-gradient(180deg, ${palette.skyTop} 0%, ${palette.skyBottom} 100%)`;

  const lampSrc = pack.lamp || BASE_SPRITES.lamp;
  const computerSrc = pack.computer || BASE_SPRITES.computer;
  const headphonesSrc = pack.headphones || BASE_SPRITES.headphones;
  const mugSrc = pack.mug || BASE_SPRITES.mug;
  const plantSrc = pack.plant || BASE_SPRITES.plant;
  const buddySrc = pack.buddy || BASE_SPRITES.buddy;
  const birdSrc = pack.bird || BASE_SPRITES.bird;
  const trophySrc = pack.trophy;

  const darknessAlpha = (Math.min(60, Math.max(0, darknessPct)) / 100 * 0.55).toFixed(2);

  return `
    <div class="sprk-mini-room" data-preview-theme="${escapeHtml(themeId)}" style="
      --wall:${escapeHtml(palette.wall)};
      --wall-light:${escapeHtml(palette.wallLight)};
      --wall-shadow:${escapeHtml(palette.wallShadow)};
      --floor:${escapeHtml(palette.floor)};
      --ink:${escapeHtml(palette.ink)};
      --wood:${escapeHtml(palette.wood)};
      --wood-light:${escapeHtml(palette.woodLight)};
      --desk-top:${escapeHtml(palette.deskTop)};
      --accent:${escapeHtml(palette.accent)};
      --case-back:${escapeHtml(palette.caseBack)};
      --hill-a:${escapeHtml(palette.hillA)};
      --hill-b:${escapeHtml(palette.hillB)};
    ">
      <div class="sprk-mr-wall"></div>
      <div class="sprk-mr-floor"></div>

      <!-- Window + Merchant Bird -->
      <div class="sprk-mr-window-wrap">
        <div class="sprk-mr-window shape-${escapeHtml(palette.windowShape)}" style="background:${skyBg};">
          <span class="sprk-mr-orb" style="background:${isNight ? "#fff5c8" : "#f8d778"};"></span>
          ${isNight ? `<span class="sprk-mr-stars" aria-hidden="true">✦ ✧ ✦</span>` : ""}
          ${palette.windowShape !== "viewport" ? `<span class="sprk-mr-hill-a"></span><span class="sprk-mr-hill-b"></span>` : ""}
          ${renderWindowWeatherDots(weather)}
          <span class="sprk-mr-cross-v"></span>
          <span class="sprk-mr-cross-h"></span>
        </div>
        <div class="sprk-mr-ledge"></div>
        <img class="sprk-mr-bird" src="${escapeHtml(birdSrc)}" onerror="this.src='${BASE_SPRITES.bird}'" alt="" draggable="false" />
      </div>

      <!-- Bookcase -->
      <div class="sprk-mr-bookcase">
        <div class="sprk-mr-shelf">
          <span class="sprk-mr-clock-dot"></span>
          <img class="sprk-mr-plant" src="${escapeHtml(plantSrc)}" onerror="this.src='${BASE_SPRITES.plant}'" alt="" draggable="false" />
        </div>
        <div class="sprk-mr-shelf">
          <span class="sprk-mr-cal-dot"></span>
          ${trophySrc
            ? `<img class="sprk-mr-trophy" src="${escapeHtml(trophySrc)}" alt="" draggable="false" />`
            : `<span class="sprk-mr-trophy-dot">★</span>`}
        </div>
        <div class="sprk-mr-shelf">
          <img class="sprk-mr-buddy" src="${escapeHtml(buddySrc)}" onerror="this.src='${BASE_SPRITES.buddy}'" alt="" draggable="false" />
          <img class="sprk-mr-portrait" src="${BASE_SPRITES.portrait}" alt="" draggable="false" />
        </div>
        <div class="sprk-mr-shelf sprk-mr-books-row">
          <span style="background:#df7761;"></span>
          <span style="background:#6ba689;"></span>
          <span style="background:#e6be67;"></span>
          <span style="background:#6c8eb1;"></span>
          <span style="background:#a986a7;"></span>
        </div>
      </div>

      <!-- Study Desk -->
      <div class="sprk-mr-desk">
        <div class="sprk-mr-desk-top"></div>
        ${lampOn ? `<div class="sprk-mr-lamp-glow"></div>` : ""}
        <img class="sprk-mr-lamp" src="${escapeHtml(lampSrc)}" onerror="this.src='${BASE_SPRITES.lamp}'" alt="" draggable="false" />
        <img class="sprk-mr-computer" src="${escapeHtml(computerSrc)}" onerror="this.src='${BASE_SPRITES.computer}'" alt="" draggable="false" />
        <span class="sprk-mr-notebook"></span>
        <img class="sprk-mr-headphones" src="${escapeHtml(headphonesSrc)}" onerror="this.src='${BASE_SPRITES.headphones}'" alt="" draggable="false" />
        <img class="sprk-mr-mug" src="${escapeHtml(mugSrc)}" onerror="this.src='${BASE_SPRITES.mug}'" alt="" draggable="false" />
      </div>

      <div class="sprk-mr-darkness" style="opacity:${darknessAlpha};"></div>
    </div>
  `;
}

export function renderPreviewStage(item, { currentThemeId = "comic", isPlayingSample = false } = {}) {
  const desc = getShopPreviewDescriptor(item, currentThemeId);
  if (!desc) return "";

  if (desc.mode === "room") {
    return `
      <div class="sprk-preview-stage-wrap">
        ${renderRoomStageMarkup({
          themeId: desc.themeId,
          palette: desc.palette,
          lampOn: true,
          darknessPct: desc.themeId === "space" || desc.themeId === "midnight" || desc.themeId === "alchemy" || desc.themeId === "noir" ? 18 : 4
        })}
        <div class="sprk-preview-caption">
          <span>Full Room View · ${escapeHtml(desc.hasCustomSprites ? "Includes custom sprite set" : "Custom palette & woodwork")}</span>
          <span class="sprk-swatch-row" aria-hidden="true">
            <span style="background:${escapeHtml(desc.palette.wall)};"></span>
            <span style="background:${escapeHtml(desc.palette.wood)};"></span>
            <span style="background:${escapeHtml(desc.palette.accent)};"></span>
          </span>
        </div>
      </div>
    `;
  }

  if (desc.mode === "object" || desc.mode === "deco") {
    const visual = desc.mode === "deco"
      ? renderDecorationSvg(desc.decoSlot, desc.decoStyle)
      : renderObjectVisual(desc);
    const captionLabel = desc.mode === "deco"
      ? `Fixed Slot · <strong>${escapeHtml(desc.decoSlot)}</strong>`
      : `Object Skin Only · Target: <strong>${escapeHtml(desc.targetLabel)}</strong>`;
    return `
      <div class="sprk-preview-stage-wrap">
        <div class="sprk-object-stage" data-preview-mode="${desc.mode}">
          <div class="sprk-object-halo" style="background:${escapeHtml(item.swatch || "#e76d50")};"></div>
          <div class="sprk-object-figure">
            ${visual}
          </div>
          <div class="sprk-object-pedestal"></div>
        </div>
        <div class="sprk-preview-caption">
          <span>${captionLabel}</span>
          <span class="sprk-swatch-row" aria-hidden="true">
            <span style="background:${escapeHtml(item.swatch || "#e76d50")};"></span>
          </span>
        </div>
      </div>
    `;
  }

  if (desc.mode === "audio") {
    const channelLabels = Object.entries(desc.audioMix)
      .filter(([, level]) => level > 0)
      .map(([id, level]) => {
        const ch = AUDIO_CHANNELS.find((c) => c.id === id);
        return `${ch?.label || id} ${Math.round(level * 100)}%`;
      });

    return `
      <div class="sprk-preview-stage-wrap">
        <div class="sprk-audio-stage ${isPlayingSample ? "is-playing" : ""}" style="--audio-accent:${escapeHtml(desc.swatch)};">
          <div class="sprk-audio-disc" aria-hidden="true">
            <span class="sprk-audio-disc-core" style="background:${escapeHtml(desc.swatch)};"></span>
          </div>
          <div class="sprk-audio-bars" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <button type="button" class="sprk-btn sprk-btn-primary" id="sprk-preview-audio-btn">
            ${isPlayingSample ? "Stop Sample" : "Play Sample"}
          </button>
        </div>
        <div class="sprk-preview-caption">
          <span>${escapeHtml(desc.subtitle)}</span>
          <span>${escapeHtml(channelLabels.join(" · "))}</span>
        </div>
      </div>
    `;
  }

  if (desc.mode === "particles") {
    const cls = desc.particleId === "fireflies" ? "firefly"
      : desc.particleId === "breeze" ? "leaf"
      : desc.particleId === "starlight" ? "star"
      : desc.particleId;
    return `
      <div class="sprk-preview-stage-wrap">
        <div class="sprk-object-stage" style="background:radial-gradient(circle at 50% 30%, ${escapeHtml(desc.swatch)}30 0%, #0c1424 85%);min-height:170px;border-radius:12px;">
          <div style="position:relative;width:100%;height:140px;overflow:hidden;">
            ${renderWindowWeatherDots(desc.particleId)}
            <span class="sprk-mini-particle is-${cls}" style="left:16%;top:35%;"></span>
            <span class="sprk-mini-particle is-${cls}" style="left:78%;top:58%;"></span>
          </div>
        </div>
        <div class="sprk-preview-caption">
          <span>Deep Focus Backdrop Particles · Adjustable Speed, Opacity &amp; Density</span>
          <span class="sprk-swatch-row" aria-hidden="true">
            <span style="background:${escapeHtml(desc.swatch)};"></span>
          </span>
        </div>
      </div>
    `;
  }

  // Ambience
  const preset = desc.preset;
  return `
    <div class="sprk-preview-stage-wrap">
      ${renderRoomStageMarkup({
        themeId: desc.themeId,
        palette: desc.palette,
        timeOfDay: preset.timeOfDay,
        weather: preset.weather,
        lampOn: preset.lighting?.lampOn !== false,
        darknessPct: preset.lighting?.ambientDarkness ?? 14
      })}
      <div class="sprk-preview-caption">
        <span>Room Mood · ${escapeHtml(preset.timeOfDay)} · ${escapeHtml(preset.weather)}</span>
        <span>Lamp ${preset.lighting?.lampOn === false ? "Off" : "On"}</span>
      </div>
    </div>
  `;
}
