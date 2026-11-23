import { GameObject } from "./inherit.js";

export class Bookshelf extends GameObject {
  static selector = ".bookshelf";
  static definition = {
    type: "bookshelf",
    hoverText: "Knowledge Library",
    styles: String.raw`
$root {
  left: 5%;
  bottom: 4%;
  width: clamp(110px, min(14cqw, 21cqh), 220px);
  aspect-ratio: 210 / 105;
  height: auto;
  transition: transform 0.2s ease;
}

$root .books-svg {
  object-position: left bottom;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-3px); }`
    },
    themes: {
      space: `$root { --book-1: #4dc4d6; --book-2: #5b7899; --book-3: #e8be6b; --book-4: #36506e; --book-5: #8ba8c4; }`,
      jungle: `$root { --book-1: #5ea35c; --book-2: #d9835b; --book-3: #e8c768; --book-4: #3d7552; --book-5: #b88a56; }`,
      vintage: `$root { --book-1: #8c3d35; --book-2: #3d6349; --book-3: #b88642; --book-4: #405570; --book-5: #6b4738; }`,
      modern: `$root { --book-1: #6cb0ba; --book-2: #e3ecee; --book-3: #f29b7a; --book-4: #3a6070; --book-5: #9cc2c9; }`,
      anime: `$root { --book-1: #f29ab8; --book-2: #a3d5c8; --book-3: #fbe094; --book-4: #b5a1e0; --book-5: #f7b8a1; }`,
      ocean: `$root { --book-1: #469aa8; --book-2: #eb8c76; --book-3: #f2d68a; --book-4: #2d687d; --book-5: #89c9cf; }`,
      alchemy: `$root { --book-1: #6b4275; --book-2: #3f6b5f; --book-3: #c78b4b; --book-4: #3d3669; --book-5: #8f4e63; }`
    },
    skins: {
      default: { css: "" },
      pastel: {
        css: `$root { --book-1: #e8a4a4; --book-2: #93c6b0; --book-3: #f0d18a; --book-4: #9db8d5; --book-5: #c6a5c4; }`
      }
    }
  };
}
