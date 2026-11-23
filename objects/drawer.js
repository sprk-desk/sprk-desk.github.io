import { GameObject } from "./inherit.js";

export class Drawer extends GameObject {
  static selector = ".cabinet-drawer";
  static definition = {
    type: "drawer",
    hoverText: "Saved Resources & Inventory",
    styles: String.raw`
.drawer-well {
  position: relative;
  z-index: 3;
  grid-column: 2;
  grid-row: 4;
  background: linear-gradient(180deg, #3a271c, #271a12);
  box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.5), inset 0 0 0 2px rgba(45, 30, 18, 0.65);
  transition: z-index 0s;
}

.drawer-well:hover,
.drawer-well:focus-within {
  z-index: 35;
}

.drawer-well .drawer-contents {
  position: absolute;
  inset: 2px 10px 6px;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.2s ease, transform 0.28s cubic-bezier(0.22, 1.3, 0.36, 1);
}

.drawer-well:hover .drawer-contents,
.drawer-well:focus-within .drawer-contents {
  opacity: 1;
  transform: translateY(0);
}

.drawer-well .drawer-file {
  position: absolute;
  top: 2px;
  width: 44%;
  height: 34px;
  border: 1.5px solid var(--ink);
  border-radius: 3px 3px 0 0;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
}

.drawer-well .drawer-file-a {
  left: 5%;
  background: #fff3b0;
  transform: rotate(-4deg);
}

.drawer-well .drawer-file-b {
  right: 7%;
  top: 4px;
  background: #c9ebd8;
  transform: rotate(3.5deg);
}

$root {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
  border: 2px solid var(--ink);
  background: linear-gradient(145deg, var(--wood-light), var(--wood));
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.3), 0 2px 0 rgba(35, 24, 16, 0.3);
  transition: transform 0.28s cubic-bezier(0.22, 1.35, 0.36, 1), box-shadow 0.24s ease;
  transform-origin: center top;
}

.drawer-well:hover .cabinet-drawer,
$root:hover,
$root:focus-visible {
  transform: translateY(26px) scale(1.04);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.45),
    0 12px 18px rgba(28, 20, 14, 0.36),
    3px 5px 0 rgba(35, 24, 16, 0.28);
}

$root:active {
  transform: translateY(30px) scale(1.05);
}

$root::after {
  left: auto;
  right: 0;
  bottom: calc(100% + 32px);
  transform: translate(0, 4px);
}

$root:hover::after,
$root:focus-visible::after {
  transform: translate(0, 0);
}

$root .drawer-pull {
  display: grid;
  place-items: center;
  width: 58%;
  height: 44%;
  border: 1.5px solid var(--ink);
  border-radius: 10px;
  background: linear-gradient(#fff8e3, #dec092);
  box-shadow: 0 2px 0 rgba(35, 28, 22, 0.2);
  transition: transform 0.24s ease, filter 0.2s ease;
}

.drawer-well:hover .cabinet-drawer .drawer-pull,
$root:hover .drawer-pull,
$root:focus-visible .drawer-pull {
  transform: translateY(2px);
  filter: brightness(1.05);
}

$root .drawer-pull::after {
  display: block;
  width: 14px;
  height: 14px;
  content: "";
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff3c4, #d6b06b);
}
`,
    themes: {
      space: `$root { background: linear-gradient(145deg, #6985a3, #3c5470); } $root .drawer-pull { background: linear-gradient(#e3f1f7, #9eb9cf); }`,
      jungle: `$root { background: linear-gradient(145deg, #b88b53, #7c582d); } $root .drawer-pull { background: linear-gradient(#e8f2dc, #9dc282); }`,
      vintage: `$root { background: linear-gradient(145deg, #9c6842, #5e3920); } $root .drawer-pull { background: linear-gradient(#f2d79c, #b4863f); }`,
      modern: `$root { background: linear-gradient(145deg, #a7cbd4, #5c8a99); } $root .drawer-pull { background: linear-gradient(#ffffff, #cbe0e6); }`,
      anime: `$root { background: linear-gradient(145deg, #e9bfd0, #b87e99); } $root .drawer-pull { background: linear-gradient(#fff5f9, #eab7cc); }`,
      ocean: `$root { background: linear-gradient(145deg, #86bdc7, #3d7585); } $root .drawer-pull { background: linear-gradient(#fff3d9, #d4a65e); }`,
      alchemy: `$root { background: linear-gradient(145deg, #755873, #432e4a); } $root .drawer-pull { background: linear-gradient(#f5deb0, #b88246); }`,
      editorial: `$root { border-radius: 0; background: linear-gradient(145deg, #ededeb, #d2d2ce); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65), 0 2px 0 rgba(15, 15, 15, 0.28); } $root .drawer-pull { border-radius: 2px; background: linear-gradient(#ffffff, #d9d9d5); } $root .drawer-pull::after { background: #141414; } .drawer-well .drawer-file-a { background: #ffffff; } .drawer-well .drawer-file-b { background: #d4d4d0; }`,
      noir: `$root { border-radius: 0; border-color: #050505; background: linear-gradient(145deg, #2d2d2d, #1c1c1c); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 2px 0 rgba(0, 0, 0, 0.55); } $root .drawer-pull { border-radius: 2px; border-color: #050505; background: linear-gradient(#424242, #262626); } $root .drawer-pull::after { border-color: #050505; background: #e8e8e4; } .drawer-well { background: linear-gradient(180deg, #101010, #060606); } .drawer-well .drawer-file-a { background: #e8e8e4; } .drawer-well .drawer-file-b { background: #6a6a6a; }`
    },
    skins: {
      default: { css: "" },
      brass: { css: "$root .drawer-pull { background: #b4863f; }" }
    }
  };
}
