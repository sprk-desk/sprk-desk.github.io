import { GameObject } from "./inherit.js";

export class Clock extends GameObject {
  static selector = ".desk-clock";
  static definition = {
    type: "clock",
    hoverText: "Focus Timer",
    hoverAnimation: "clock-tick",
    styles: String.raw`
$root {
  left: 7%;
  bottom: 8%;
  width: clamp(46px, min(5.8cqw, 9.6cqh), 96px);
  aspect-ratio: 100 / 104;
  height: auto;
  transition: transform 0.18s ease;
}

$root .clock-face {
  position: absolute;
  left: 19%;
  right: 19%;
  top: 22%;
  bottom: 18%;
  border-radius: 50%;
  pointer-events: none;
}

$root .clock-face i,
$root .clock-face b {
  position: absolute;
  left: 50%;
  bottom: 50%;
  width: 2px;
  height: 36%;
  border-radius: 2px;
  background: var(--clock-hand, var(--ink));
  transform-origin: bottom;
}

$root .clock-face i { transform: translateX(-50%) rotate(28deg); }
$root .clock-face b { height: 24%; transform: translateX(-50%) rotate(112deg); }

$root.is-focus-running {
  filter: drop-shadow(0 0 6px var(--accent)) drop-shadow(2px 4px 3px rgba(35, 28, 22, 0.24));
}

$root.is-focus-running .clock-face i {
  animation: clock-active-sweep 60s linear infinite;
}

@keyframes clock-active-sweep {
  from { transform: translateX(-50%) rotate(0deg); }
  to { transform: translateX(-50%) rotate(360deg); }
}
`,
    hover: {
      css: `
        $root:hover, $root:focus-visible { transform: translateY(-3px) rotate(-3deg); }
      `
    },
    themes: {
      space: `$root { --clock-ear: #7a9bb8; --clock-shell: #3b5370; --clock-dial: #16263d; --clock-hand: #7be2ed; }`,
      jungle: `$root { --clock-ear: #8fb86e; --clock-shell: #b9824a; --clock-dial: #f8f6e8; --clock-hand: #2c4a26; }`,
      vintage: `$root { --clock-ear: #c89b54; --clock-shell: #7a4b2a; --clock-dial: #f8edd4; --clock-hand: #332419; }`,
      modern: `$root { --clock-ear: #cbe3e8; --clock-shell: #6293a3; --clock-dial: #ffffff; --clock-hand: #193b4b; }`,
      anime: `$root { --clock-ear: #f4a8c4; --clock-shell: #d99bc2; --clock-dial: #fff8fc; --clock-hand: #704970; }`,
      ocean: `$root { --clock-ear: #d9ab64; --clock-shell: #5395a3; --clock-dial: #effbfc; --clock-hand: #173a47; }`,
      alchemy: `$root { --clock-ear: #c78b4b; --clock-shell: #523b66; --clock-dial: #241936; --clock-hand: #f4d27a; }`
    },
    skins: {
      default: { css: "" },
      midnight: {
        css: `$root { --clock-ear: #475478; --clock-shell: #323c59; --clock-dial: #242b42; --clock-hand: #f3d58c; }`
      }
    }
  };
}
