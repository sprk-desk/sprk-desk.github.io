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
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-4px); }`
    }
  };
}
