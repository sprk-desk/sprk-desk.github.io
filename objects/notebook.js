import { GameObject } from "./inherit.js";

export class Notebook extends GameObject {
  static selector = ".desk-notebook";
  static definition = {
    type: "notebook",
    hoverText: "Private Diary & Notes",
    hoverAnimation: "writing-lines",
    styles: String.raw`
$root {
  z-index: 15;
  left: 48.5%;
  top: 29%;
  width: clamp(76px, min(10.2cqw, 16cqh), 165px);
  aspect-ratio: 130 / 106;
  height: auto;
  transition: transform 0.2s ease;
}

$root .notebook-svg {
  object-position: center bottom;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-4px) rotate(1.5deg); }`
    },
    themes: {
      space: `$root { --nb-cover: #dce7f2; --nb-spine: #428ea8; }`,
      jungle: `$root { --nb-cover: #e8f0d8; --nb-spine: #559150; }`,
      vintage: `$root { --nb-cover: #e8d2ac; --nb-spine: #7d482d; }`,
      modern: `$root { --nb-cover: #eef7f9; --nb-spine: #397987; }`,
      anime: `$root { --nb-cover: #fcebf3; --nb-spine: #e07fa4; }`,
      ocean: `$root { --nb-cover: #e3f7f8; --nb-spine: #e07a67; }`,
      alchemy: `$root { --nb-cover: #e9d9f0; --nb-spine: #5f4178; }`,
      editorial: `$root { --nb-cover: #f8f8f6; --nb-spine: #141414; }`,
      noir: `$root { --nb-cover: #2c2c2c; --nb-spine: #080808; }`
    },
    skins: {
      default: { css: "" },
      sky: { css: "$root { --nb-spine: #7faed4; }" }
    }
  };
}
