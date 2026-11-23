import { GameObject } from "./inherit.js";

export class Pinboard extends GameObject {
  static selector = ".pinboard";
  static definition = {
    type: "pinboard",
    hoverText: "Tasks & Goals",
    hoverAnimation: "note-toss",
    styles: String.raw`
$root {
  z-index: 8;
  right: 1.5%;
  top: 3%;
  width: 24%;
  height: 56%;
  border: 3px solid var(--wood-edge);
  outline: 1.5px solid var(--ink);
  border-radius: 5px;
  background: radial-gradient(rgba(96, 73, 54, 0.16) 0.8px, transparent 1px) 0 0 / 5px 5px, linear-gradient(135deg, #dfc28d, #c9a66e);
  box-shadow: 2px 4px 0 rgba(45, 35, 25, 0.25), inset 0 2px 6px rgba(60, 40, 20, 0.18);
  transition: transform 0.18s ease;
}

$root .pin {
  position: absolute;
  top: 22%;
  z-index: 3;
  width: 11%;
  aspect-ratio: 1;
  border: 1.5px solid var(--ink);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f5947e, #df6c55);
  box-shadow: 1px 2px 0 rgba(35, 28, 22, 0.22);
}
$root .pin-a { left: 22%; }
$root .pin-b { right: 20%; background: radial-gradient(circle at 35% 30%, #98d4b7, #68a88e); }

$root .pin-note {
  position: absolute;
  bottom: 14%;
  width: 38%;
  height: 52%;
  border: 1.5px solid var(--ink);
  border-radius: 3px;
  background:
    repeating-linear-gradient(0deg, transparent 0 9px, rgba(52, 44, 37, 0.15) 10px, transparent 11px),
    #fff3b0;
  box-shadow: 2px 3px 0 rgba(35, 28, 22, 0.18);
}
$root .note-a { left: 9%; transform: rotate(-4deg); }
$root .note-b {
  right: 9%;
  background:
    repeating-linear-gradient(0deg, transparent 0 9px, rgba(52, 44, 37, 0.15) 10px, transparent 11px),
    #c9ebd8;
  transform: rotate(4deg);
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-4px) rotate(-1deg); }`
    },
    skins: {
      default: { css: "" },
      mint: { css: "$root { background: #9fc9b1; } $root .note-a { background: #f4d0c8; }" }
    }
  };
}
