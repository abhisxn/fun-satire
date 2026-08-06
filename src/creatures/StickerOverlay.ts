import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";

// Below #stage (z-index:500) so bugs and the eye/finger/creature grid render above it.
export const STICKER_Z_INDEX = 100;
const DEFAULT_WIDTH = 160;
const MIN_WIDTH = 48;
const MAX_WIDTH = 480;
const HANDLE_SIZE = 14;

export class StickerOverlay {
  readonly el: HTMLDivElement;
  private readonly img: HTMLImageElement;
  private readonly handle: HTMLDivElement;
  private readonly drag: DragHandle;
  private currentSrc: string;
  private width: number;

  constructor(src: string, initialX?: number, initialY?: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = initialX ?? Math.max(20, vw / 2 - 80);
    const y = initialY ?? Math.max(20, vh / 2 - 80);

    this.currentSrc = src;
    this.width = DEFAULT_WIDTH;

    this.el = document.createElement("div");
    this.el.className = "sticker-overlay";
    this.el.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "display:inline-block",
      "cursor:grab",
      "user-select:none",
      "-webkit-user-select:none",
      `z-index:${STICKER_Z_INDEX}`,
      "touch-action:none",
      "pointer-events:auto",
    ].join(";");

    this.img = document.createElement("img");
    this.img.alt = "Sticker";
    this.img.draggable = false;
    this.img.style.cssText = [
      "display:block",
      `width:${this.width}px`,
      "height:auto",
      "pointer-events:none",
      "user-select:none",
      "-webkit-user-select:none",
      "filter:drop-shadow(0 2px 4px rgba(0,0,0,0.18))",
      "transition:filter 0.15s",
    ].join(";");
    this.img.src = src;
    this.el.appendChild(this.img);

    this.handle = document.createElement("div");
    this.handle.className = "sticker-overlay-resize";
    this.handle.style.cssText = [
      "position:absolute",
      `width:${HANDLE_SIZE}px`,
      `height:${HANDLE_SIZE}px`,
      "right:-7px",
      "bottom:-7px",
      "background:#fff",
      "border:1px solid rgba(0,0,0,0.25)",
      "border-radius:50%",
      "cursor:nwse-resize",
      "box-shadow:0 1px 3px rgba(0,0,0,0.2)",
      "opacity:0",
      "transition:opacity 0.15s",
      "touch-action:none",
      "z-index:1",
    ].join(";");
    this.el.appendChild(this.handle);

    this.el.addEventListener("mouseenter", () => {
      this.handle.style.opacity = "1";
    });
    this.el.addEventListener("mouseleave", () => {
      this.handle.style.opacity = "0";
    });

    this.drag = attachDrag(this.el, { x, y });
    this.drag.attach();
    this.attachResize();
  }

  setImage(src: string): void {
    this.currentSrc = src;
    this.img.src = src;
  }

  getImage(): string {
    return this.currentSrc;
  }

  getCenter(): { x: number; y: number } {
    const rect = this.el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  destroy(): void {
    this.drag.detach();
    this.handle.removeEventListener("mousedown", this.handleResizeStart);
    this.handle.removeEventListener("touchstart", this.handleResizeStart);
    this.el.remove();
  }

  private attachResize(): void {
    this.handle.addEventListener("mousedown", this.handleResizeStart);
    this.handle.addEventListener("touchstart", this.handleResizeStart, { passive: false });
  }

  private readonly handleResizeStart = (e: MouseEvent | TouchEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = this.width;
    const startX = pointerX(e);
    const onMove = (ev: MouseEvent | TouchEvent): void => {
      const x = pointerX(ev);
      const dx = x - startX;
      const next = clamp(startWidth + dx, MIN_WIDTH, MAX_WIDTH);
      this.width = next;
      this.img.style.width = `${next}px`;
    };
    const onUp = (): void => {
      document.removeEventListener("mousemove", onMove as EventListener);
      document.removeEventListener("mouseup", onUp as EventListener);
      document.removeEventListener("touchmove", onMove as EventListener);
      document.removeEventListener("touchend", onUp as EventListener);
    };
    document.addEventListener("mousemove", onMove as EventListener);
    document.addEventListener("mouseup", onUp as EventListener);
    document.addEventListener("touchmove", onMove as EventListener, { passive: false });
    document.addEventListener("touchend", onUp as EventListener);
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function pointerX(e: MouseEvent | TouchEvent): number {
  if ("touches" in e && e.touches.length > 0) {
    return e.touches[0]!.clientX;
  }
  if ("changedTouches" in e && e.changedTouches.length > 0 && e.type === "touchend") {
    return e.changedTouches[0]!.clientX;
  }
  return (e as MouseEvent).clientX;
}
