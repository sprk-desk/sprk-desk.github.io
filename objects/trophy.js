import { GameObject } from "./inherit.js";

export class Trophy extends GameObject {
  static selector = ".trophy";
  static definition = {
    type: "trophy",
    hoverText: "Achievements & Passport",
    hoverAnimation: "trophy-shine",
    styles: String.raw`
$root {
  right: 24%;
  bottom: 5%;
  width: clamp(46px, min(5.8cqw, 9.6cqh), 96px);
  aspect-ratio: 96 / 102;
  height: auto;
  transition: transform 0.2s ease;
}

$root .trophy-sprite {
  display: none;
  object-position: center bottom;
}

$root.has-trophy-sprite .trophy-sprite {
  display: block;
}

$root.has-trophy-sprite .trophy-svg {
  display: none;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: scale(1.06) rotate(-3deg); }`
    },
    skins: {
      default: { css: "" },
      roseGold: {
        css: `
          $root { --trophy-gold: #eeb09c; --trophy-stem: #d48373; --trophy-base: #ad5f54; }
          $root.has-trophy-sprite .trophy-sprite { filter: sepia(0.24) hue-rotate(-22deg) saturate(1.15); }
        `
      }
    }
  };
}
