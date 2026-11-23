import { GameObject } from "./inherit.js";

export class WindowObject extends GameObject {
  static selector = ".window-object";
  static definition = {
    type: "window",
    hoverText: "Window & Weather",
    styles: String.raw`
$root {
  position: absolute;
  top: 3.5%;
  left: 1.6%;
  width: 40.5%;
  height: 45%;
  z-index: 4;
}

$root .window-frame-btn {
  position: absolute;
  inset: 0 0 10px;
  width: 100%;
  height: calc(100% - 10px);
  padding: clamp(7px, 1vw, 12px);
  border: 3px solid var(--ink);
  border-radius: var(--window-radius, 6px);
  background: var(--window-frame-bg, linear-gradient(100deg, #f8edcf 0%, #fff9e9 25%, #e5d3b1 60%, #f5e8ca 100%));
  box-shadow: 3px 5px 0 rgba(45, 36, 26, 0.24), inset 0 0 0 2px rgba(255, 255, 255, 0.45);
  cursor: pointer;
  display: block;
}

$root .window-view {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 2px solid var(--ink);
  border-radius: calc(var(--window-radius, 6px) - 3px);
  background: linear-gradient(180deg, var(--sky-top, #89c8d8) 0%, var(--sky-mid, #cbe8df) 60%, var(--sky-bottom, #efe6b9) 100%);
  box-shadow: inset 0 0 28px rgba(25, 45, 42, 0.2);
}

html[data-custom-window-brightness="true"] $root .window-view {
  filter: brightness(var(--window-brightness, 1));
}

$root .weather-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 4;
  pointer-events: none;
}

$root .window-crossbar {
  position: absolute;
  z-index: 5;
  background: var(--window-mullion, #f8efd9);
  box-shadow: 0 0 0 1.5px var(--ink);
  pointer-events: none;
}
$root .window-crossbar.vertical { top: 0; bottom: 0; left: 50%; width: 7px; transform: translateX(-50%); }
$root .window-crossbar.horizontal { top: 56%; left: 0; right: 0; height: 7px; transform: translateY(-50%); }

$root .sun {
  position: absolute;
  top: 14%;
  right: 14%;
  width: clamp(22px, 3.8vw, 50px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff6ca 0%, #f8d778 55%, #ebb14a 100%);
  box-shadow: 0 0 0 7px rgba(248, 215, 120, 0.24), 0 0 24px rgba(255, 224, 145, 0.55);
  opacity: var(--sun-opacity, 1);
  transition: opacity 0.6s ease;
}

$root .moon {
  position: absolute;
  top: 15%;
  right: 18%;
  width: clamp(20px, 3.2vw, 42px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 30%, #fff9e3, #f3d78f 65%, #d6a95b 100%);
  box-shadow: 0 0 18px rgba(255, 227, 156, 0.65);
  opacity: var(--moon-opacity, 0);
  transition: opacity 0.6s ease;
}

$root .distant-star {
  position: absolute;
  z-index: 2;
  color: #eefcff;
  font-size: 12px;
  opacity: var(--stars-opacity, 0);
  transition: opacity 0.6s ease;
}
$root .star-a { top: 18%; left: 20%; }
$root .star-b { top: 34%; left: 38%; font-size: 9px; }
$root .star-c { top: 24%; left: 62%; font-size: 10px; }

$root .cloud {
  position: absolute;
  z-index: 2;
  width: 15%;
  height: 6%;
  border-radius: 30px;
  background: rgba(255, 249, 232, 0.88);
  opacity: var(--sun-opacity, 0.9);
}
$root .cloud::before, $root .cloud::after {
  position: absolute;
  bottom: 22%;
  content: "";
  border-radius: 50%;
  background: inherit;
}
$root .cloud::before { left: 16%; width: 44%; aspect-ratio: 1; }
$root .cloud::after { left: 48%; width: 34%; aspect-ratio: 1; }
$root .cloud-a { top: 28%; left: 12%; }
$root .cloud-b { top: 40%; right: 13%; transform: scale(0.75); }

$root .scenery-hill {
  position: absolute;
  bottom: -12%;
  width: 78%;
  height: 38%;
  border-radius: 50% 50% 0 0;
  z-index: 3;
}
$root .hill-a { left: -12%; background: var(--hill-a, #8ebc91); transform: rotate(-6deg); }
$root .hill-b { right: -16%; bottom: -15%; height: 35%; background: var(--hill-b, #548b70); transform: rotate(7deg); }
$root .hill-c { left: 32%; bottom: -21%; width: 52%; height: 32%; background: var(--hill-c, #71a981); transform: rotate(-3deg); }

$root .window-ledge {
  position: absolute;
  z-index: 6;
  right: -2.5%;
  bottom: 0;
  left: -2.5%;
  height: 12px;
  border: 2px solid var(--ink);
  border-radius: 3px;
  background: var(--wood-light);
  box-shadow: 0 5px 5px rgba(35, 28, 22, 0.2);
  pointer-events: none;
}

$root .window-shadow {
  position: absolute;
  z-index: -1;
  right: -4%;
  bottom: -10px;
  left: 6%;
  height: 10px;
  border-radius: 50%;
  background: rgba(35, 28, 22, 0.16);
  filter: blur(4px);
}
`,
    themes: {
      space: String.raw`
        $root .window-frame-btn { border-radius: 28px; background: linear-gradient(110deg, #5d7591, #8aa2bd 45%, #465d78); }
        $root .window-view { border-radius: 22px; background: linear-gradient(180deg, #0b1629 0%, #152b4a 60%, #1f3c63 100%); }
        $root .window-mullion, $root .window-crossbar { background: #6b85a1; }
        $root .scenery-hill { display: none; }
        $root .cloud { display: none; }
        $root .distant-star { opacity: 0.95; }
      `,
      jungle: String.raw`
        $root .window-frame-btn { background: linear-gradient(100deg, #cfa066, #e6be86 45%, #b37e48); }
        $root .window-crossbar { background: #c5955d; }
        $root .window-ledge { background: #a87b47; }
      `,
      vintage: String.raw`
        $root .window-frame-btn { background: linear-gradient(100deg, #825232, #aa744a 35%, #694126); }
        $root .window-crossbar { background: #7a4c2d; }
        $root .window-ledge { background: #8f5c39; }
      `,
      modern: String.raw`
        $root .window-frame-btn { border-radius: 4px; background: linear-gradient(100deg, #d6e4e9, #eff7fa 45%, #bccdd4); }
        $root .window-crossbar.vertical { width: 4px; background: #5a7b8c; }
        $root .window-crossbar.horizontal { height: 4px; background: #5a7b8c; }
      `,
      anime: String.raw`
        $root .window-frame-btn { background: linear-gradient(100deg, #f3d5e5, #fff5fa 35%, #dcc4df); }
        $root .window-view { background: linear-gradient(180deg, #b89bd1 0%, #eab6d2 56%, #ffe3ca 100%); }
        $root .window-crossbar { background: #f8e5ef; }
      `,
      ocean: String.raw`
        $root .window-frame-btn { border-radius: 38% / 46%; background: linear-gradient(125deg, #d9ab64, #f0cf8e 36%, #996c35); }
        $root .window-view { border-radius: 35% / 43%; background: linear-gradient(180deg, #74ccd4 0%, #3a92a3 58%, #1f5c6e 100%); }
        $root .window-crossbar { background: #b88848; }
        $root .cloud { display: none; }
      `,
      alchemy: String.raw`
        $root .window-frame-btn { border-radius: 44% 44% 8px 8px / 32% 32% 8px 8px; background: linear-gradient(105deg, #684f5c, #997970 40%, #483649); }
        $root .window-view { border-radius: 41% 41% 5px 5px / 29% 29% 5px 5px; background: linear-gradient(180deg, #1b1736 0%, #392b5c 58%, #61426d 100%); }
        $root .window-crossbar { background: #755b66; }
        $root .distant-star { opacity: 0.9; }
      `,
      japanese: String.raw`
        $root .window-crossbar.vertical { width: 4px; box-shadow: none; }
        $root .window-crossbar.horizontal { height: 4px; box-shadow: none; }
      `
    }
  };
}
