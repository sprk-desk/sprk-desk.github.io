import { GameObject } from "./inherit.js";

export class CoffeeMug extends GameObject {
  static selector = ".coffee-mug";
  static definition = {
    type: "coffee",
    hoverText: "Warm Tea / Coffee Break",
    styles: String.raw`
$root {
  z-index: 15;
  right: 6.2%;
  top: 27%;
  width: clamp(50px, min(6.2cqw, 10cqh), 104px);
  aspect-ratio: 280 / 243;
  height: auto;
  transition: transform 0.2s ease;
}

$root .mug-sprite {
  object-position: center bottom;
}

$root .mug-steam {
  position: absolute;
  top: -16%;
  left: 38%;
  width: 22%;
  height: 26%;
  border-left: 2px solid rgba(255, 250, 240, 0.78);
  border-radius: 50%;
  pointer-events: none;
  animation: steam-rise 2.6s ease-in-out infinite;
}

@keyframes steam-rise {
  0%, 100% { transform: translateY(2px) scaleX(0.9); opacity: 0.4; }
  50% { transform: translateY(-4px) scaleX(1.1); opacity: 0.85; }
}
`,
    hover: {
      css: `$root:hover, $root:focus-visible { transform: translateY(-3px); }`
    }
  };
}
