import { GameObject } from "./inherit.js";

export class Room extends GameObject {
  static selector = ".room-screen";
  static definition = {
    type: "room",
    styles: String.raw`
.back-wall {
  position: absolute;
  inset: 0 0 30%;
  z-index: -2;
  background-color: var(--wall);
  background-image:
    radial-gradient(ellipse at 22% 28%, rgba(255, 252, 238, 0.56), transparent 52%),
    radial-gradient(ellipse at 78% 20%, rgba(255, 248, 224, 0.25), transparent 45%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, transparent 45%, rgba(45, 35, 25, 0.08) 100%),
    radial-gradient(rgba(67, 55, 39, 0.07) 0.55px, transparent 0.7px);
  background-size: auto, auto, auto, 9px 9px;
  box-shadow: inset 0 -14px 18px rgba(45, 35, 25, 0.08);
  transition: background-color 0.35s ease;
}

.back-wall::after {
  position: absolute;
  right: 0;
  bottom: -7px;
  left: 0;
  height: 7px;
  content: "";
  background: var(--wall-shadow);
  border-top: 1.5px solid rgba(52, 44, 37, 0.28);
  box-shadow: 0 3px 6px rgba(38, 30, 22, 0.22);
}

.wall-wainscot {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 31%;
  border-top: 6px solid var(--wood-light, #e2a56d);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.36),
    0 -2px 0 rgba(52, 44, 37, 0.24),
    0 2px 6px rgba(35, 28, 22, 0.1);
  background:
    repeating-linear-gradient(
      90deg,
      rgba(52, 44, 37, 0.055) 0 2px,
      transparent 2px 42px,
      rgba(255, 255, 255, 0.16) 42px 44px,
      transparent 44px 84px
    ),
    linear-gradient(180deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.09) 100%);
  pointer-events: none;
}

.floor {
  position: absolute;
  z-index: -3;
  inset: 70% 0 0;
  background-color: var(--floor, #d7c4a4);
  background-image:
    linear-gradient(180deg, rgba(35, 25, 16, 0.18) 0%, transparent 26%),
    repeating-linear-gradient(0deg, transparent 0 46px, rgba(50, 36, 22, 0.12) 47px, rgba(255, 248, 226, 0.16) 49px, transparent 51px),
    repeating-linear-gradient(90deg, transparent 0 190px, rgba(50, 36, 22, 0.09) 191px, rgba(255, 248, 226, 0.14) 193px, transparent 195px);
  transform: perspective(500px) rotateX(5deg);
  transform-origin: top;
}

.wall-trim {
  position: absolute;
  top: 0;
  width: 11px;
  height: 70%;
  background: linear-gradient(90deg, var(--trim-dark, #a98d69), var(--trim-light, #efe1c5) 35%, var(--trim-dark, #aa8d69));
  box-shadow: 2px 0 6px rgba(32, 25, 18, 0.16);
}
.wall-trim-left { left: 0; }
.wall-trim-right { right: 0; }

.room-object {
  position: absolute;
  z-index: 12;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  transform-style: preserve-3d;
  filter: drop-shadow(2px 4px 3px rgba(35, 28, 22, 0.18));
  -webkit-tap-highlight-color: transparent;
}

.sprite-img,
.sprite-svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.room-object::after,
.interactive-object[data-label]::after {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  content: attr(data-label);
  width: max-content;
  max-width: 190px;
  padding: 5px 10px;
  border: 1.5px solid var(--ink);
  border-radius: 6px;
  background: var(--wall-light);
  color: var(--ink);
  box-shadow: 2px 3px 0 rgba(35, 28, 22, 0.22);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.1;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 4px);
  transition: opacity 0.16s ease, transform 0.16s ease;
  white-space: nowrap;
  z-index: 80;
}

.room-object:hover::after,
.room-object:focus-visible::after,
.interactive-object[data-label]:hover::after,
.interactive-object[data-label]:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.draggable-object {
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.draggable-object:active,
.draggable-object.is-drag-preview {
  cursor: grabbing;
}

.draggable-object.is-drag-preview {
  margin: 0;
  opacity: 0.94;
  pointer-events: none;
  filter: drop-shadow(8px 14px 12px rgba(35, 28, 22, 0.34));
  transform: rotate(2deg) scale(1.04);
  transition: none !important;
}

body.object-dragging {
  cursor: grabbing;
  user-select: none;
}

body.object-dragging .bookcase .shelf.is-drop-target {
  box-shadow: inset 0 0 0 2.5px var(--accent, #e76d50), inset 0 12px 24px rgba(231, 109, 80, 0.14);
}

body.object-dragging .desk.is-drop-target .desk-top {
  box-shadow: inset 0 0 0 3px var(--accent, #e76d50), 0 5px 0 var(--wood-edge), 0 14px 24px rgba(30, 24, 18, 0.24);
}

@media (hover: none), (pointer: coarse) {
  .room-object::after,
  .interactive-object[data-label]::after {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .room-object,
  .room-object::after,
  .room-object *,
  .interactive-object,
  .interactive-object::after,
  .interactive-object * {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
`,
    themes: {}
  };
}
