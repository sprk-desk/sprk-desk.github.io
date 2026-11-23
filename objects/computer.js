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
  top: -15%;
  width: 13.5%;
  min-width: 112px;
  aspect-ratio: 352 / 360;
  height: auto;
  max-height: 54%;
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
