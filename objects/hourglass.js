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
  width: clamp(40px, min(4.8cqw, 8.2cqh), 84px);
  aspect-ratio: 80 / 100;
  height: auto;
  transition: transform 0.2s ease;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-3px) rotate(6deg); }`
    },
    themes: {
      space: `$root { --hg-frame: #6a8aa8; --hg-sand: #7be2ed; --hg-glass: #d7f2f8; }`,
      jungle: `$root { --hg-frame: #8f6c3a; --hg-sand: #7cc46b; --hg-glass: #eef8ea; }`,
      vintage: `$root { --hg-frame: #7a4b2a; --hg-sand: #d4a657; --hg-glass: #f5ebd2; }`,
      modern: `$root { --hg-frame: #588a9a; --hg-sand: #63c5cc; --hg-glass: #f0fafb; }`,
      anime: `$root { --hg-frame: #d489ad; --hg-sand: #f7a6c9; --hg-glass: #fff5fa; }`,
      ocean: `$root { --hg-frame: #c89648; --hg-sand: #5bc2cf; --hg-glass: #e3f9fb; }`,
      alchemy: `$root { --hg-frame: #6b4e7d; --hg-sand: #d8a752; --hg-glass: #ece0f7; }`
    },
    skins: {
      default: { css: "" },
      midnight: { css: `$root { --hg-frame: #3a4663; --hg-sand: #f3cf72; --hg-glass: #dbe6f5; }` }
    }
  };
}
