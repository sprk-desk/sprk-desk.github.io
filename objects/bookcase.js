import { GameObject } from "./inherit.js";

export class Bookcase extends GameObject {
  static selector = ".bookcase";
  static definition = {
    type: "bookcase",
    styles: String.raw`
$root {
  position: absolute;
  --column-split: 72.6%;
  top: 3.6%;
  right: 1.4%;
  z-index: 4;
  display: grid;
  grid-template-columns: 72.6% 27.4%;
  grid-template-rows: repeat(4, 1fr);
  width: 55.2%;
  height: 45.5%;
  border: 4px solid var(--ink);
  border-radius: var(--case-radius, 4px);
  background: var(--case-back, #f6ecd7);
  box-shadow: 3px 4px 0 rgba(45, 35, 25, 0.26), 7px 10px 0 rgba(45, 35, 25, 0.14), inset 0 0 0 2px rgba(255, 255, 255, 0.35);
}

$root::before {
  position: absolute;
  z-index: 5;
  top: -8px;
  left: -4px;
  right: -4px;
  height: 8px;
  content: "";
  border: 2px solid var(--ink);
  border-radius: 3px;
  background: var(--wood-light);
}

$root::after {
  position: absolute;
  z-index: 2;
  top: 0;
  bottom: 0;
  left: var(--column-split);
  width: 5px;
  content: "";
  background: var(--wood);
  box-shadow: 2px 0 3px rgba(35, 25, 15, 0.25);
  pointer-events: none;
}

$root .shelf {
  position: relative;
  min-width: 0;
  border-bottom: 5px solid var(--wood-edge);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.06));
  box-shadow: inset 0 8px 12px rgba(0, 0, 0, 0.08), 0 4px 0 var(--wood);
}

$root .shelf-one { grid-column: 1; grid-row: 1; }
$root .shelf-two { grid-column: 1; grid-row: 2; }
$root .shelf-three { grid-column: 1; grid-row: 3; }
$root .shelf-four { grid-column: 1; grid-row: 4; }
`
  };
}
