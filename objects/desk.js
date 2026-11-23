import { GameObject } from "./inherit.js";

export class Desk extends GameObject {
  static selector = ".desk";
  static definition = {
    type: "desk",
    styles: String.raw`
$root {
  position: absolute;
  z-index: 6;
  right: 0;
  bottom: 0;
  left: 0;
  height: 36.5%;
}

$root .desk-top {
  position: absolute;
  z-index: 2;
  top: 0;
  left: -0.5%;
  width: 101%;
  height: 82%;
  border: 3px solid var(--ink);
  border-radius: 6px 6px 2px 2px;
  background:
    radial-gradient(ellipse at 50% 0, rgba(255, 245, 214, 0.32), transparent 58%),
    repeating-linear-gradient(2deg, transparent 0 32px, rgba(0, 0, 0, 0.04) 33px, rgba(255, 255, 255, 0.06) 35px, transparent 38px),
    linear-gradient(180deg, var(--desk-top, #f1c78f) 0%, var(--wood-light, #e5ad70) 56%, var(--wood, #b97848) 100%);
  box-shadow: 0 5px 0 var(--wood-edge), 0 14px 24px rgba(30, 24, 18, 0.24), inset 0 3px 0 rgba(255, 255, 255, 0.35);
  transform: perspective(880px) rotateX(6deg);
  transform-origin: top;
}

/* Front 3D Desk Apron + Drawer Trim */
$root .desk-apron {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  bottom: 0;
  height: 21%;
  display: grid;
  grid-template-columns: 1fr 1.35fr 1fr;
  gap: 10px;
  padding: 5px 3.5%;
  border-top: 3px solid var(--ink);
  background: linear-gradient(180deg, var(--wood, #b97848) 0%, var(--wood-edge, #7d4f2b) 100%);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.22);
  pointer-events: none;
}

$root .desk-apron-drawer {
  position: relative;
  height: 100%;
  border: 2px solid var(--ink);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(0, 0, 0, 0.14));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

$root .desk-apron-drawer::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 26px;
  height: 6px;
  border: 1.5px solid var(--ink);
  border-radius: 99px;
  background: var(--wood-light, #f0cf8e);
  transform: translate(-50%, -50%);
}

/* Cozy Stitched Desk Blotter / Workspace Mat */
$root .desk-blotter {
  position: absolute;
  z-index: 4;
  left: 24%;
  width: 49%;
  top: 12%;
  height: 63%;
  border: 2.5px solid var(--ink);
  border-radius: 12px;
  background:
    radial-gradient(ellipse at 50% 25%, rgba(255, 255, 255, 0.18), transparent 65%),
    color-mix(in srgb, var(--accent, #e76d50) 24%, var(--case-back, #f6ecd7));
  box-shadow:
    inset 0 0 0 4px rgba(255, 255, 255, 0.26),
    0 4px 0 rgba(45, 35, 25, 0.16),
    0 8px 14px rgba(35, 25, 16, 0.14);
  transform: perspective(800px) rotateX(8deg);
  transform-origin: center top;
  pointer-events: none;
}

$root .desk-blotter::after {
  content: "";
  position: absolute;
  inset: 7px;
  border: 1.5px dashed rgba(52, 44, 37, 0.26);
  border-radius: 8px;
}

/* Compact Mechanical Keyboard + Mouse right in front of monitor */
$root .desk-keyboard-mouse {
  position: absolute;
  z-index: 9;
  left: 25.5%;
  top: 40%;
  width: 19.5%;
  min-width: 150px;
  aspect-ratio: 210 / 68;
  pointer-events: none;
  filter: drop-shadow(1px 3px 2px rgba(35, 28, 22, 0.18));
}

$root .desk-keyboard-mouse .kb-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Cozy Ceramic Pen Cup beside Notebook */
$root .desk-pen-cup {
  position: absolute;
  z-index: 10;
  left: 63%;
  top: 16%;
  width: 4.5%;
  min-width: 42px;
  aspect-ratio: 64 / 78;
  pointer-events: none;
  filter: drop-shadow(1px 3px 2px rgba(35, 28, 22, 0.2));
}

$root .desk-pen-cup svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Cork Coaster under the Coffee Mug */
$root .desk-coaster {
  position: absolute;
  z-index: 8;
  right: 6.2%;
  top: 52%;
  width: 7.4%;
  min-width: 60px;
  aspect-ratio: 3 / 1.1;
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #e3bd84, #be8f52);
  box-shadow: 0 3px 0 rgba(35, 28, 22, 0.2);
  pointer-events: none;
}

/* Fixed non-draggable tabletop accent corner */
$root .desk-deco-charm {
  position: absolute;
  z-index: 10;
  left: 19.5%;
  top: 11%;
  width: 4.2%;
  min-width: 38px;
  aspect-ratio: 1 / 1;
  pointer-events: none;
  filter: drop-shadow(1px 3px 2px rgba(35, 28, 22, 0.2));
}

$root .desk-deco-charm svg {
  width: 100%;
  height: 100%;
  display: block;
}
`
  };
}
