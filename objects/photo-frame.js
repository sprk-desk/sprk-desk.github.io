import { GameObject } from "./inherit.js";

export class PhotoFrame extends GameObject {
  static selector = ".photo-frame";
  static definition = {
    type: "photo-frame",
    hoverText: "Profile & Account",
    styles: String.raw`
$root {
  position: absolute;
  z-index: 5;
  left: 6%;
  bottom: 12%;
  width: clamp(58px, min(7.2cqw, 11.5cqh), 116px);
  aspect-ratio: 104 / 82;
  height: auto;
  padding: 6px;
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: linear-gradient(135deg, #f6d88c, #bc8248);
  box-shadow: 2px 3px 0 rgba(45, 35, 25, 0.25), inset 0 0 0 2px rgba(255, 240, 196, 0.55);
  cursor: pointer;
  transform: rotate(-1deg);
  transition: transform 0.18s ease;
}

$root .frame-back {
  position: absolute;
  inset: 7px;
  background: #f7edda;
}

$root .photo-scene {
  position: absolute;
  inset: 10px;
  overflow: hidden;
  border: 1.5px solid var(--ink);
  border-radius: 2px;
  background: #f2e8cf;
}

$root .photo-art-img,
$root .photo-art-svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

$root .photo-art-svg {
  display: none;
}

$root .photo-scene[data-photo-theme]:not([data-photo-theme="default"]) .photo-art-img {
  display: none;
}

$root .photo-scene[data-photo-theme="space"] .photo-art-space,
$root .photo-scene[data-photo-theme="jungle"] .photo-art-jungle,
$root .photo-scene[data-photo-theme="vintage"] .photo-art-vintage,
$root .photo-scene[data-photo-theme="modern"] .photo-art-modern,
$root .photo-scene[data-photo-theme="anime"] .photo-art-anime,
$root .photo-scene[data-photo-theme="ocean"] .photo-art-ocean,
$root .photo-scene[data-photo-theme="alchemy"] .photo-art-alchemy,
$root .photo-scene[data-photo-theme="editorial"] .photo-art-editorial,
$root .photo-scene[data-photo-theme="noir"] .photo-art-noir {
  display: block;
}

$root .photo-scene[data-custom-pfp="true"] .photo-art-img {
  display: block;
}
$root .photo-scene[data-custom-pfp="true"] .photo-art-svg {
  display: none;
}

$root .portrait-badge {
  position: absolute;
  left: 50%;
  bottom: -10px;
  transform: translateX(-50%);
  padding: 2px 7px;
  border: 1.5px solid var(--ink);
  border-radius: 4px;
  background: var(--wall-light);
  color: var(--ink);
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  max-width: 96%;
  overflow: hidden;
  text-overflow: ellipsis;
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { z-index: 35; transform: translateY(-4px) rotate(0deg); }`
    },
    themes: {
      space: `$root { background: linear-gradient(135deg, #9fb9d3, #4a6887); }`,
      vintage: `$root { background: linear-gradient(135deg, #c79557, #6d4627); }`,
      modern: `$root { background: linear-gradient(135deg, #d7e7eb, #588a9a); }`,
      anime: `$root { background: linear-gradient(135deg, #f7d6e6, #b888ac); }`,
      ocean: `$root { background: linear-gradient(135deg, #b8e3e6, #3f7c8a); }`,
      alchemy: `$root { background: linear-gradient(135deg, #b88856, #4b3863); }`,
      editorial: `$root { border-radius: 2px; background: linear-gradient(135deg, #ffffff, #d8d8d4); box-shadow: 2px 3px 0 #0f0f0f; } $root .frame-back { background: #ffffff; } $root .photo-scene { border-radius: 0; background: #f4f4f1; } $root .portrait-badge { border-radius: 2px; }`,
      noir: `$root { border-radius: 2px; border-color: #050505; background: linear-gradient(135deg, #323232, #171717); box-shadow: 2px 3px 0 rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.14); } $root .frame-back { background: #1c1c1c; } $root .photo-scene { border-radius: 0; border-color: #050505; background: #101010; } $root .portrait-badge { border-radius: 2px; background: #161616; color: #f2f2ef; border-color: #d8d8d4; }`
    },
    skins: {
      default: { css: "" },
      walnut: { css: "$root { background: linear-gradient(135deg, #8b5a3c, #533220); }" }
    }
  };
}
