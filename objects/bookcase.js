import { GameObject } from "./inherit.js";

export class Bookcase extends GameObject {
  static selector = ".bookcase";
  static definition = {
    type: "bookcase",
    styles: String.raw`
$root {
  position: absolute;
  --column-split: 72.6%;
  top: 4.5%;
  right: 1.8%;
  z-index: 4;
  display: grid;
  grid-template-columns: 72.6% 27.4%;
  grid-template-rows: repeat(4, 1fr);
  width: 53.5%;
  height: 46.5%;
  border: 4px solid var(--ink);
  border-radius: var(--case-radius, 5px);
  background:
    repeating-linear-gradient(90deg, rgba(45, 32, 18, 0.055) 0 1px, transparent 1px 28px),
    linear-gradient(180deg, rgba(35, 24, 14, 0.14) 0%, transparent 18%, rgba(35, 24, 14, 0.1) 100%),
    var(--case-back, #f6ecd7);
  box-shadow:
    inset 6px 0 12px rgba(35, 24, 14, 0.18),
    inset -6px 0 12px rgba(35, 24, 14, 0.14),
    inset 0 8px 14px rgba(35, 24, 14, 0.14),
    0 0 0 4px var(--wood, #b97848),
    0 0 0 6px var(--ink),
    6px 10px 0 rgba(45, 35, 25, 0.2),
    10px 14px 18px rgba(35, 24, 14, 0.22);
}

/* Carved 3D crown molding top */
$root::before {
  position: absolute;
  z-index: 6;
  top: -14px;
  left: -10px;
  right: -10px;
  height: 11px;
  content: "";
  border: 2.5px solid var(--ink);
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(180deg, var(--wood-light, #e2a56d) 0%, var(--wood, #b97848) 100%);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.35), 0 4px 6px rgba(35, 24, 14, 0.26);
}

/* Solid 3D center divider post */
$root::after {
  position: absolute;
  z-index: 4;
  top: 0;
  bottom: 0;
  left: var(--column-split);
  width: 8px;
  content: "";
  border-left: 1.5px solid var(--ink);
  border-right: 1.5px solid var(--ink);
  background: linear-gradient(90deg, var(--wood-light), var(--wood) 60%, var(--wood-edge, #7d4f2b));
  box-shadow: 3px 0 8px rgba(35, 25, 15, 0.25), -2px 0 6px rgba(35, 25, 15, 0.15);
  pointer-events: none;
}

/* 3D Cubby Shelf with visible top wood ledge + thick front edge + interior drop shadow */
$root .shelf {
  position: relative;
  min-width: 0;
  border-bottom: 7px solid var(--wood-edge, #7d4f2b);
  background: linear-gradient(180deg, rgba(25, 18, 12, 0.16) 0%, transparent 32%, rgba(25, 18, 12, 0.08) 82%, rgba(25, 18, 12, 0.22) 100%);
  box-shadow:
    inset 0 10px 14px rgba(30, 20, 12, 0.14),
    inset 4px 0 8px rgba(30, 20, 12, 0.1),
    0 5px 0 var(--wood, #b97848),
    0 7px 6px rgba(25, 18, 12, 0.24);
}

$root .shelf::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 11px;
  background: linear-gradient(180deg, var(--desk-top, #f1c78f) 0%, var(--wood-light, #e2a56d) 100%);
  border-top: 1.5px solid rgba(52, 44, 37, 0.32);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.35);
  pointer-events: none;
  z-index: 1;
}

$root .shelf > * {
  z-index: 6;
}

$root .shelf > .room-object,
$root .shelf > .photo-frame {
  z-index: 12;
}

$root .shelf-one { grid-column: 1; grid-row: 1; }
$root .shelf-two { grid-column: 1; grid-row: 2; }
$root .shelf-three { grid-column: 1; grid-row: 3; }
$root .shelf-four { grid-column: 1; grid-row: 4; border-bottom-width: 5px; }

/* Fixed non-draggable shelf & crown decorations */
$root .bookcase-fairy-lights {
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  height: 28px;
  pointer-events: none;
  z-index: 10;
  filter: drop-shadow(0 2px 4px rgba(255, 214, 110, 0.45));
}
$root .bookcase-fairy-lights svg {
  width: 100%;
  height: 100%;
  display: block;
}

$root .shelf-deco-candle {
  position: absolute;
  right: 5%;
  bottom: 7px;
  width: 28px;
  height: 36px;
  pointer-events: none;
  z-index: 3;
  filter: drop-shadow(1px 2px 0 rgba(35, 28, 22, 0.18));
}
$root .shelf-deco-candle svg {
  width: 100%;
  height: 100%;
  display: block;
}

$root .shelf-deco-bookend {
  position: absolute;
  right: 6%;
  bottom: 7px;
  width: 30px;
  height: 34px;
  pointer-events: none;
  z-index: 3;
  filter: drop-shadow(1px 2px 0 rgba(35, 28, 22, 0.18));
}
$root .shelf-deco-bookend svg {
  width: 100%;
  height: 100%;
  display: block;
}
`
  };
}
