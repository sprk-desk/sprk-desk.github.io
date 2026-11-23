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
  background: linear-gradient(180deg, #5c422c, #3e2d22);
  box-shadow: inset 0 0 0 2px rgba(45, 30, 18, 0.65);
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
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.3);
  transition: transform 0.22s ease;
}

.drawer-well:hover $root,
$root:focus-visible {
  transform: translateY(5px) scaleX(0.98);
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
    skins: {
      default: { css: "" },
      brass: { css: "$root .drawer-pull { background: #b4863f; }" }
    }
  };
}
