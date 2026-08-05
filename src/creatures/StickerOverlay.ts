import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";

export const STICKER_Z_INDEX = 400;

export class StickerOverlay {
  readonly el: HTMLImageElement;
  private readonly drag: DragHandle;
  private currentSrc: string;

  constructor(src: string, initialX?: number, initialY?: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = initialX ?? Math.max(20, vw / 2 - 80);
    const y = initialY ?? Math.max(20, vh / 2 - 80);

    this.currentSrc = src;
    this.el = document.createElement("img");
    this.el.className = "sticker-overlay";
    this.el.alt = "Sticker";
    this.el.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "width:160px",
      "height:auto",
      "cursor:grab",
      "user-select:none",
      "-webkit-user-select:none",
      `z-index:${STICKER_Z_INDEX}`,
      "filter:drop-shadow(0 2px 4px rgba(0,0,0,0.18))",
      "transition:filter 0.15s",
      "pointer-events:auto",
    ].join(";");
    this.el.src = src;
    this.drag = attachDrag(this.el, { x, y });
    this.drag.attach();
  }

  setImage(src: string): void {
    this.currentSrc = src;
    this.el.src = src;
  }

  getImage(): string {
    return this.currentSrc;
  }

  destroy(): void {
    this.drag.detach();
    this.el.remove();
  }
}
