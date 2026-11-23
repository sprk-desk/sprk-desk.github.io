import { GameObject } from "./inherit.js";

export class Plant extends GameObject {
  static selector = ".desk-plant";
  static definition = {
    type: "plant",
    hoverText: "Room Themes & Studio",
    hoverAnimation: "plant-sway",
    styles: String.raw`
$root {
  right: 6%;
  bottom: 4%;
  width: 16%;
  height: 86%;
  transform-origin: 50% 100%;
  transition: transform 0.2s ease;
}

$root .plant-sprite {
  object-position: center bottom;
}
`,
    hover: {
      css: `
        $root:hover, $root:focus-visible { animation: plant-sway 0.65s ease-in-out 1; }
        @keyframes plant-sway {
          25% { transform: rotate(-2.5deg); }
          55% { transform: rotate(2.5deg); }
          80% { transform: rotate(-1deg); }
        }
      `
    },
    skins: {
      default: { css: "" },
      lavender: {
        css: `$root .plant-sprite { filter: hue-rotate(155deg) saturate(1.08); }`
      },
      jade: {
        css: `$root .plant-sprite { filter: hue-rotate(30deg) saturate(1.25); }`
      },
      sunset: {
        css: `$root .plant-sprite { filter: hue-rotate(-32deg) saturate(1.18); }`
      }
    }
  };
}
