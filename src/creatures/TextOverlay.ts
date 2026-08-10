import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";
import { attachPinchZoom } from "./pinchZoom";
import type { PinchZoomHandle } from "./pinchZoom";
import { isTouchDevice } from "./touchSupport";

// Below #stage (z-index:500) so bugs and the eye/finger/creature grid render above it.
export const TEXT_Z_INDEX = 100;
const DEFAULT_FONT_SIZE = 56;
const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 240;
const HANDLE_SIZE = 14;
const DRAG_HANDLE_SIZE = 18;

export class TextOverlay {
  readonly el: HTMLDivElement;
  private readonly editor: HTMLDivElement;
  private readonly handle: HTMLDivElement;
  private readonly dragHandle: HTMLDivElement;
  private readonly drag: DragHandle;
  private readonly pinch: PinchZoomHandle;
  private pinchStartFontSize = 0;
  private fontSize: number;
  private currentFont: string;

  constructor(
    fontFamily: string,
    initialX?: number,
    initialY?: number,
    onDragStart?: () => void,
    onDragEnd?: () => void,
    onDragMove?: (x: number, y: number) => void,
  ) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = initialX ?? Math.max(20, vw / 2 - 160);
    const y = initialY ?? Math.max(20, vh / 2 - 40);

    this.fontSize = DEFAULT_FONT_SIZE;
    this.currentFont = fontFamily;

    this.el = document.createElement("div");
    this.el.className = "text-overlay";
    this.el.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "display:inline-block",
      "min-width:120px",
      "max-width:80vw",
      `z-index:${TEXT_Z_INDEX}`,
      "filter:drop-shadow(0 2px 4px rgba(0,0,0,0.18))",
      "user-select:none",
      "-webkit-user-select:none",
      "touch-action:none",
    ].join(";");

    this.dragHandle = document.createElement("div");
    this.dragHandle.className = "text-overlay-drag";
    this.dragHandle.style.cssText = [
      "position:absolute",
      `width:${DRAG_HANDLE_SIZE}px`,
      `height:${DRAG_HANDLE_SIZE}px`,
      "left:-9px",
      "top:-9px",
      "border-radius:50%",
      "background:#fff",
      "border:1px solid rgba(0,0,0,0.25)",
      "cursor:grab",
      "box-shadow:0 1px 3px rgba(0,0,0,0.2)",
      `opacity:${isTouchDevice() ? "1" : "0"}`,
      "transition:opacity 0.15s",
      "z-index:2",
    ].join(";");
    this.el.appendChild(this.dragHandle);

    this.editor = document.createElement("div");
    this.editor.className = "text-overlay-editor";
    this.editor.contentEditable = "true";
    this.editor.spellcheck = false;
    this.editor.dataset.placeholder = "Type here";
    this.editor.style.cssText = [
      "outline:none",
      "display:inline-block",
      "min-width:120px",
      "padding:6px 10px",
      "border-radius:6px",
      "background:transparent",
      "color:#111",
      "line-height:1.1",
      "text-transform:none",
      "white-space:pre-wrap",
      "word-break:break-word",
      `font-family:${fontFamily}`,
      `font-size:${fontSize(this.fontSize)}`,
      "cursor:text",
      "user-select:text",
      "-webkit-user-select:text",
    ].join(";");
    this.editor.textContent = "Type here";
    this.el.appendChild(this.editor);

    this.handle = document.createElement("div");
    this.handle.className = "text-overlay-resize";
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
      `opacity:${isTouchDevice() ? "1" : "0"}`,
      "transition:opacity 0.15s",
      "touch-action:none",
      "z-index:1",
    ].join(";");
    this.el.appendChild(this.handle);

    this.el.addEventListener("mouseenter", () => {
      this.handle.style.opacity = "1";
      this.dragHandle.style.opacity = "1";
    });
    this.el.addEventListener("mouseleave", () => {
      this.handle.style.opacity = "0";
      this.dragHandle.style.opacity = "0";
    });

    this.drag = attachDrag(this.dragHandle, { x, y }, onDragMove, this.el, onDragStart, onDragEnd);
    this.drag.attach();
    this.attachResize();

    this.pinch = attachPinchZoom(
      this.el,
      (factor) => {
        const next = clamp(this.pinchStartFontSize * factor, MIN_FONT_SIZE, MAX_FONT_SIZE);
        this.fontSize = next;
        this.editor.style.fontSize = fontSize(next);
      },
      () => {
        this.pinchStartFontSize = this.fontSize;
      },
    );
    this.pinch.attach();
  }

  setFont(fontFamily: string): void {
    this.currentFont = fontFamily;
    this.editor.style.fontFamily = fontFamily;
  }

  getFont(): string {
    return this.currentFont;
  }

  getEditor(): HTMLDivElement {
    return this.editor;
  }

  getCenter(): { x: number; y: number } {
    const rect = this.el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  destroy(): void {
    this.drag.detach();
    this.pinch.detach();
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
    const startSize = this.fontSize;
    const startY = pointerY(e);
    const onMove = (ev: MouseEvent | TouchEvent): void => {
      const y = pointerY(ev);
      const dy = y - startY;
      const next = clamp(startSize + dy, MIN_FONT_SIZE, MAX_FONT_SIZE);
      this.fontSize = next;
      this.editor.style.fontSize = fontSize(next);
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

function fontSize(px: number): string {
  return `${px}px`;
}

function pointerY(e: MouseEvent | TouchEvent): number {
  if ("touches" in e && e.touches.length > 0) {
    return e.touches[0]!.clientY;
  }
  if ("changedTouches" in e && e.changedTouches.length > 0 && e.type === "touchend") {
    return e.changedTouches[0]!.clientY;
  }
  return (e as MouseEvent).clientY;
}
