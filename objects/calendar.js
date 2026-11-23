import { GameObject } from "./inherit.js";

export class Calendar extends GameObject {
  static selector = ".wall-calendar";
  static definition = {
    type: "calendar",
    hoverText: "Study History & Stats",
    styles: String.raw`
$root {
  left: 15%;
  bottom: 6%;
  width: 16%;
  aspect-ratio: 92 / 104;
  height: auto;
  max-height: 82%;
  transition: transform 0.18s ease;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-4px) rotate(2deg); }`
    },
    themes: {
      space: `$root { --cal-head: #3d8ea8; }`,
      jungle: `$root { --cal-head: #529450; }`,
      vintage: `$root { --cal-head: #96493d; }`,
      modern: `$root { --cal-head: #43919c; }`,
      anime: `$root { --cal-head: #e682a8; }`,
      ocean: `$root { --cal-head: #e07a67; }`,
      alchemy: `$root { --cal-head: #6b4982; }`
    },
    skins: {
      default: { css: "" },
      ocean: { css: "$root { --cal-head: #4e99ad; }" }
    }
  };
}
