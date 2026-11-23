import { GameObject } from "./inherit.js";

export class Hourglass extends GameObject {
  static selector = ".desk-hourglass";
  static definition = {
    type: "hourglass",
    hoverText: "Study Register",
    styles: String.raw`
$root {
  left: 26%;
  bottom: 8%;
  width: 12%;
  aspect-ratio: 80 / 100;
  height: auto;
  max-height: 82%;
  transition: transform 0.2s ease;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-3px) rotate(6deg); }`
    }
  };
}
