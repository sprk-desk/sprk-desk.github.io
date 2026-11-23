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
  bottom: -1.5%;
  left: 0;
  height: 38.5%;
}

$root .desk-top {
  position: absolute;
  z-index: 2;
  top: 0;
  left: -0.5%;
  width: 101%;
  height: 112%;
  border: 3px solid var(--ink);
  border-radius: 6px 6px 2px 2px;
  background:
    radial-gradient(ellipse at 50% 0, rgba(255, 245, 214, 0.28), transparent 55%),
    repeating-linear-gradient(2deg, transparent 0 32px, rgba(0, 0, 0, 0.04) 33px, rgba(255, 255, 255, 0.06) 35px, transparent 38px),
    linear-gradient(180deg, var(--desk-top, #f1c78f) 0%, var(--wood-light, #e5ad70) 45%, var(--wood, #b97848) 100%);
  box-shadow: 0 6px 0 var(--wood-edge), 0 14px 24px rgba(30, 24, 18, 0.24), inset 0 3px 0 rgba(255, 255, 255, 0.35);
  transform: perspective(880px) rotateX(7deg);
  transform-origin: top;
}
`
  };
}
