import { GameObject } from "./inherit.js";

export class Bird extends GameObject {
  static selector = ".merchant-bird";
  static definition = {
    type: "bird",
    hoverText: "Desk Shop (Merchant Bird)",
    hoverAnimation: "bird-flutter",
    styles: String.raw`
$root {
  right: 5%;
  bottom: 2%;
  width: 16%;
  max-width: 96px;
  height: 36%;
  z-index: 9;
  transition: transform 0.22s ease;
}

$root .bird-branch {
  position: absolute;
  right: -35%;
  bottom: 0;
  width: 145%;
  height: 10%;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  background: linear-gradient(#a47452 0 42%, #7d563b 44%);
  box-shadow: 0 2px 3px rgba(35, 28, 22, 0.24);
  transform: rotate(-6deg);
  transform-origin: left center;
}

$root .bird-sprite {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 94%;
  object-position: center bottom;
}
`,
    hover: {
      css: `
        $root:hover, $root:focus-visible { animation: bird-hop 0.42s ease-in-out 1; }
        @keyframes bird-hop {
          40% { transform: translateY(-6px) rotate(-3deg); }
          75% { transform: translateY(-2px) rotate(2deg); }
        }
      `
    },
    skins: {
      default: { css: "" },
      emerald: { css: "$root .bird-sprite { filter: hue-rotate(82deg) saturate(1.12); }" }
    },
    themes: {
      space: `$root .bird-branch { background: linear-gradient(#7d99b6 0 42%, #4a637d 44%); }`,
      modern: `$root .bird-branch { background: linear-gradient(#d8c8b4 0 42%, #a89580 44%); }`,
      vintage: `$root .bird-branch { display: none; }`,
      anime: `$root .bird-branch { background: linear-gradient(#e9bfd0 0 42%, #be8aa2 44%); }`,
      ocean: `$root .bird-branch { background: linear-gradient(#bfa486 0 42%, #876c50 44%); }`,
      alchemy: `$root .bird-branch { background: linear-gradient(#7d5f53 0 42%, #4d3730 44%); }`
    }
  };
}
