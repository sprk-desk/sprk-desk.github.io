import { GameObject } from "./inherit.js";

export class CustomProp extends GameObject {
  static selector = ".custom-prop";
  static definition = {
    type: "custom-prop",
    hoverText: "Custom Keepsake",
    styles: String.raw`
$root {
  z-index: 15;
  left: 44%;
  bottom: 6%;
  width: clamp(46px, calc(min(6.2cqw, 10.2cqh) * var(--custom-prop-scale, 1)), 145px);
  aspect-ratio: 1 / 1;
  height: auto;
  transition: transform 0.2s ease;
}

$root .custom-prop-img {
  display: none;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

$root .custom-prop-placeholder {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

$root.has-custom-image .custom-prop-img {
  display: block;
}

$root.has-custom-image .custom-prop-placeholder {
  display: none;
}

$root[data-frame-style="framed"].has-custom-image {
  padding: 5px;
  border: 2px solid var(--ink);
  border-radius: 9px;
  background: var(--wall-light, #fff8e9);
  box-shadow: 2px 3px 0 rgba(35, 28, 22, 0.2);
}

$root[data-frame-style="framed"].has-custom-image .custom-prop-img {
  object-fit: cover;
  border-radius: 5px;
  border: 1.5px solid rgba(52, 44, 37, 0.28);
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-4px) scale(1.03); }`
    }
  };
}
