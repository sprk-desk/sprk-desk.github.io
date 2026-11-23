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
    themes: {
      space: `$root { background: #36506e; border-color: #6b85a1; } $root .note-a { background: #d6eef8; } $root .note-b { background: #a7d4e6; }`,
      jungle: `$root { background: #9db888; border-color: #6e4e2a; } $root .note-a { background: #f8f3cc; } $root .note-b { background: #d6edd1; }`,
      vintage: `$root { background: #bfa171; border-color: #5c3a21; } $root .note-a { background: #f7ead0; } $root .note-b { background: #e6d4b3; }`,
      modern: `$root { background: #c5dce0; border-color: #3f6978; } $root .note-a { background: #ffffff; } $root .note-b { background: #d5eef0; }`,
      anime: `$root { background: #e8c7da; border-color: #9e6b89; } $root .note-a { background: #fff4f8; } $root .note-b { background: #e7dcfa; }`,
      ocean: `$root { background: #8cc4cb; border-color: #2d6270; } $root .note-a { background: #fff9e6; } $root .note-b { background: #ffd8cc; }`,
      alchemy: `$root { background: #4a3b63; border-color: #9c7240; } $root .note-a { background: #f2e4ff; } $root .note-b { background: #f7e6c4; }`,
      editorial: `$root { border-radius: 2px; border-color: #0f0f0f; background: repeating-linear-gradient(90deg, rgba(15, 15, 15, 0.05) 0 1px, transparent 1px 14px), linear-gradient(135deg, #f5f5f2, #e2e2dd); box-shadow: 2px 3px 0 #0f0f0f; } $root .pin { background: #0f0f0f; } $root .pin-b { background: #595959; } $root .note-a { border-radius: 0; background: repeating-linear-gradient(0deg, transparent 0 9px, rgba(15, 15, 15, 0.14) 10px, transparent 11px), #ffffff; } $root .note-b { border-radius: 0; background: repeating-linear-gradient(0deg, transparent 0 9px, rgba(15, 15, 15, 0.16) 10px, transparent 11px), #dcdcd7; }`,
      noir: `$root { border-radius: 2px; border-color: #3a3a3a; outline-color: #050505; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 14px), linear-gradient(135deg, #252525, #181818); box-shadow: 2px 4px 0 rgba(0, 0, 0, 0.55); } $root .pin { background: #f2f2ef; border-color: #050505; } $root .pin-b { background: #888888; border-color: #050505; } $root .note-a { border-radius: 0; border-color: #0a0a0a; background: repeating-linear-gradient(0deg, transparent 0 9px, rgba(255, 255, 255, 0.14) 10px, transparent 11px), #2f2f2f; } $root .note-b { border-radius: 0; border-color: #0a0a0a; background: repeating-linear-gradient(0deg, transparent 0 9px, rgba(15, 15, 15, 0.18) 10px, transparent 11px), #d8d8d4; }`
    },
    skins: {
      default: { css: "" },
      mint: { css: "$root { background: #9fc9b1; } $root .note-a { background: #f4d0c8; }" }
    }
  };
}
