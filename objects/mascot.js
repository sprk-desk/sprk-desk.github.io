import { GameObject } from "./inherit.js";

export class Mascot extends GameObject {
  static selector = ".mascot";
  static definition = {
    type: "mascot",
    hoverText: "Study Buddy (Room Guide)",
    hoverAnimation: "mascot-bounce",
    styles: String.raw`
$root {
  left: 34%;
  bottom: 4%;
  width: clamp(52px, min(6.6cqw, 10.6cqh), 110px);
  aspect-ratio: 1 / 1;
  height: auto;
  transition: transform 0.2s ease;
}

$root .buddy-sprite {
  object-position: center bottom;
}
`,
    hover: {
      css: `
        $root:hover, $root:focus-visible { animation: mascot-bounce 0.48s ease-in-out 1; }
        @keyframes mascot-bounce {
          35% { transform: translateY(-7px) rotate(-3deg); }
          70% { transform: translateY(-2px) rotate(3deg); }
        }
      `
    },
    skins: {
      default: { css: "" },
      coral: { css: "$root .buddy-sprite { filter: hue-rotate(-140deg) saturate(1.18); }" }
    }
  };
}
