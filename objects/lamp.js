import { GameObject } from "./inherit.js";

export class Lamp extends GameObject {
  static selector = ".desk-lamp";
  static definition = {
    type: "lamp",
    hoverText: "Toggle Desk Lamp",
    styles: String.raw`
$root {
  z-index: 13;
  left: 4%;
  top: -22%;
  width: 9.2%;
  min-width: 82px;
  aspect-ratio: 221 / 340;
  height: auto;
  max-height: 58%;
  transition: transform 0.2s ease;
}

$root .lamp-sprite {
  position: relative;
  z-index: 2;
  transition: filter 0.28s ease;
}

$root::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 26%;
  width: 155%;
  height: 115%;
  border-radius: 50%;
  transform: translate(-50%, -35%) scale(0.85);
  background: radial-gradient(circle, rgba(255, 224, 134, 0.72) 0%, rgba(255, 206, 112, 0.28) 46%, transparent 72%);
  opacity: 0;
  pointer-events: none;
  z-index: 1;
  transition: opacity 0.28s ease, transform 0.28s ease;
}

html[data-lamp-on="true"] $root::before {
  opacity: 1;
  transform: translate(-50%, -35%) scale(1.06);
}

html[data-lamp-on="true"] $root .lamp-sprite {
  filter: drop-shadow(0 0 12px rgba(255, 214, 112, 0.68)) brightness(1.05);
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-3px); }`
    }
  };
}
