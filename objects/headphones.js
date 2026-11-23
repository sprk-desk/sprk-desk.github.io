import { GameObject } from "./inherit.js";

export class Headphones extends GameObject {
  static selector = ".desk-headphones";
  static definition = {
    type: "headphones",
    hoverText: "Music & Ambience",
    styles: String.raw`
$root {
  z-index: 15;
  right: 21%;
  top: 26%;
  width: 9.2%;
  min-width: 80px;
  aspect-ratio: 336 / 340;
  height: auto;
  max-height: 48%;
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
