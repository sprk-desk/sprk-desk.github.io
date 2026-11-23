import { GameObject } from "./inherit.js";

export class Room extends GameObject {
  static selector = ".room-screen";
  static definition = {
    type: "room",
    styles: String.raw`
.back-wall {
  position: absolute;
  inset: 0 0 31%;
  z-index: -2;
  background-color: var(--wall);
  background-image:
    radial-gradient(ellipse at 20% 34%, rgba(255, 252, 238, 0.45), transparent 46%),
    radial-gradient(rgba(67, 55, 39, 0.08) 0.55px, transparent 0.7px);
  background-size: auto, 8px 8px;
  box-shadow: inset 0 -12px 0 rgba(45, 35, 25, 0.06);
  transition: background-color 0.35s ease;
}

.back-wall::after {
  position: absolute;
  right: 0;
  bottom: -6px;
  left: 0;
  height: 6px;
  content: "";
  background: var(--wall-shadow);
  box-shadow: 0 3px 5px rgba(38, 30, 22, 0.18);
}

.floor {
  position: absolute;
  z-index: -3;
  inset: 69% 0 0;
  background-color: var(--floor, #d7c4a4);
  background-image:
    repeating-linear-gradient(0deg, transparent 0 58px, rgba(50, 36, 22, 0.11) 59px, rgba(255, 248, 226, 0.14) 61px, transparent 63px),
    repeating-linear-gradient(90deg, transparent 0 210px, rgba(50, 36, 22, 0.09) 211px, rgba(255, 248, 226, 0.14) 213px, transparent 215px);
  transform: perspective(500px) rotateX(5deg);
  transform-origin: top;
}

.wall-trim {
  position: absolute;
  top: 0;
  width: 10px;
  height: 69%;
  background: linear-gradient(90deg, var(--trim-dark, #a98d69), var(--trim-light, #efe1c5) 35%, var(--trim-dark, #aa8d69));
  box-shadow: 2px 0 4px rgba(32, 25, 18, 0.14);
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

.room-object::after {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  content: attr(data-label);
  width: max-content;
  max-width: 170px;
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
  z-index: 60;
}

.room-object:hover::after,
.room-object:focus-visible::after {
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
  opacity: 0.92;
  pointer-events: none;
  filter: drop-shadow(8px 12px 10px rgba(35, 28, 22, 0.3));
  transform: rotate(2deg) scale(1.04);
  transition: none;
}

body.object-dragging {
  cursor: grabbing;
  user-select: none;
}

@media (hover: none), (pointer: coarse) {
  .room-object::after {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .room-object,
  .room-object::after,
  .room-object * {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
`,
    themes: {}
  };
}
