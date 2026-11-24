import { GameObject } from "./inherit.js";

export class Computer extends GameObject {
  static selector = ".desk-computer";
  static definition = {
    type: "computer",
    hoverText: "Discover, Rooms & Groups",
    styles: String.raw`
$root {
  z-index: 14;
  left: 27.5%;
  top: -21%;
  width: clamp(110px, min(14.5cqw, 22cqh), 240px);
  aspect-ratio: 352 / 360;
  height: auto;
  transition: transform 0.2s ease;
}

$root .computer-sprite {
  object-position: center bottom;
}

$root .computer-flat-svg {
  display: none;
  object-position: center bottom;
}

$root[data-flat-bezel] .computer-sprite {
  display: none;
}

$root[data-flat-bezel] .computer-flat-svg {
  display: block;
}

$root[data-flat-bezel="light"] {
  --flat-bezel: #f4f4f1;
  --flat-screen-bg: #ffffff;
  --flat-stand: #d5d5d0;
  --flat-stand-base: #bebeb8;
  --flat-cam: #2a2a2c;
  --flat-idle-ring: rgba(15, 15, 15, 0.28);
}

$root[data-flat-bezel="dark"] {
  --flat-bezel: #1a1a1d;
  --flat-screen-bg: #101215;
  --flat-stand: #3d3d42;
  --flat-stand-base: #2a2a2e;
  --flat-cam: #6e6e75;
  --flat-idle-ring: rgba(242, 242, 239, 0.34);
}

$root .computer-screen-slot {
  position: absolute;
  z-index: 3;
  left: var(--screen-left, 3.2%);
  right: var(--screen-right, 3.2%);
  top: var(--screen-top, 21.8%);
  bottom: var(--screen-bottom, 23.8%);
  border-radius: var(--screen-radius, 3px);
  background: var(--screen-bg, #101215);
  overflow: hidden;
  pointer-events: none;
}

$root .computer-screen-slot[hidden] {
  display: none !important;
}

$root .computer-screen-img,
$root .computer-screen-video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: var(--screen-fit, cover);
  pointer-events: none;
}

$root .computer-screen-img[hidden],
$root .computer-screen-video[hidden] {
  display: none !important;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-4px); }`
    },
    skins: {
      default: { css: "" },
      "flat-light": { css: "" },
      "flat-dark": { css: "" }
    }
  };
}
