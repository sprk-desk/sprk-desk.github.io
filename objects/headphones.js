import { GameObject } from "./inherit.js";

export class Headphones extends GameObject {
  static selector = ".desk-headphones";
  static definition = {
    type: "headphones",
    hoverText: "Music & Ambience",
    styles: String.raw`
$root {
  z-index: 15;
  right: 17.5%;
  top: 19%;
  width: clamp(64px, min(8.4cqw, 13.5cqh), 140px);
  aspect-ratio: 336 / 340;
  height: auto;
  transition: transform 0.2s ease;
}

$root .headphones-sprite {
  object-position: center bottom;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-4px); }`
    },
    skins: {
      default: { css: "" },
      violet: { css: "$root .headphones-sprite { filter: hue-rotate(245deg) saturate(1.08); }" }
    }
  };
}
