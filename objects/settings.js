import { GameObject } from "./inherit.js";

export class SettingsPanel extends GameObject {
  static selector = ".settings-panel";
  static definition = {
    type: "settings",
    hoverText: "Settings & Focus Modes",
    styles: String.raw`
$root {
  z-index: 16;
  right: 6.4%;
  top: -5%;
  width: clamp(46px, min(5.4cqw, 8.6cqh), 82px);
  aspect-ratio: 1 / 1;
  height: auto;
  transition: transform 0.2s ease, filter 0.2s ease;
}

$root .settings-sprite {
  object-position: center bottom;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-3px); }`
    }
  };
}
