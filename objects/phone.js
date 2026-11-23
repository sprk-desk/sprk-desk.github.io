import { GameObject } from "./inherit.js";

export class Phone extends GameObject {
  static selector = ".desk-phone";
  static definition = {
    type: "phone",
    hoverText: "Friends & Messages",
    hoverAnimation: "phone-ring",
    styles: String.raw`
$root {
  z-index: 15;
  left: 15.5%;
  top: 23%;
  width: clamp(44px, min(5cqw, 8.2cqh), 86px);
  aspect-ratio: 88 / 134;
  height: auto;
  transition: transform 0.18s ease;
}

$root .phone-svg {
  object-position: center bottom;
}
`,
    hover: {
      css: `
        $root:hover, $root:focus-visible { animation: phone-ring 0.32s ease-in-out 2; }
        @keyframes phone-ring {
          25% { transform: rotate(-4deg); }
          75% { transform: rotate(4deg); }
        }
      `
    },
    themes: {
      space: `$root { --phone-body: #4b6e8c; }`,
      jungle: `$root { --phone-body: #588c52; }`,
      vintage: `$root { --phone-body: #8c5a3c; }`,
      modern: `$root { --phone-body: #498694; }`,
      anime: `$root { --phone-body: #e694b4; }`,
      ocean: `$root { --phone-body: #3e8c9e; }`,
      alchemy: `$root { --phone-body: #5f4578; }`,
      editorial: `$root { --phone-body: #e4e4e0; }`,
      noir: `$root { --phone-body: #242424; }`
    },
    skins: {
      default: { css: "" },
      rose: { css: "$root { --phone-body: #c97b8b; }" }
    }
  };
}
