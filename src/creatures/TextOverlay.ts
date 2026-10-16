import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";
import { attachPinchZoom } from "./pinchZoom";
import type { PinchZoomHandle } from "./pinchZoom";
import { isTouchDevice } from "./touchSupport";
import { clampToViewport } from "./snapGrid";
import { STICK_NAT_W, STICK_NAT_H, STICK_SCALE_FACTOR, STICK_ANCHOR_PCT } from "./PlacardCreature";

// Below #stage (z-index:500) so bugs and the eye/finger/creature grid render above it.
export const TEXT_Z_INDEX = 100;
/** Hard cap on typed slogan length — keeps a placard legible at crowd scale. */
export const MAX_CHARS = 40;
const DEFAULT_FONT_SIZE = 36;
const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 240;
const HANDLE_SIZE = 14;
const DRAG_HANDLE_SIZE = 18;

/** Subtle light tints, drawn randomly per placard to echo the crowd's signs
 * (see PlacardCreature) — rendered as a white->tint gradient below. */
const PLACARD_TINTS: readonly string[] = [
  "#FDF1DE", // cream
  "#E9F0DD", // light green
  "#FDE7E0", // light peach
  "#E8EEF7", // light blue
  "#F6E9F4", // light pink
  "#FBF3D9", // light yellow
  "#E6F2EE", // light mint
  "#F3ECFB", // light lavender
];

/** Fixed stick geometry borrowed from placard mode. Deliberately independent of
 * the sign's font size, so resizing the slogan never rescales the stick. */
const STICK_W = STICK_NAT_W * STICK_SCALE_FACTOR;
const STICK_H = STICK_NAT_H * STICK_SCALE_FACTOR;
/** The stick's mount point (the "+" anchor, ~30% down). The sign's vertical centre
 * is pinned here, so the stick always shows a bit above the sign, as in placard mode. */
const STICK_ANCHOR_Y = STICK_ANCHOR_PCT.y * STICK_H;

export class TextOverlay {
  readonly el: HTMLDivElement;
  private readonly sign: HTMLDivElement;
  private readonly stick: HTMLImageElement;
  private readonly editor: HTMLDivElement;
  private readonly handle: HTMLDivElement;
  private readonly dragHandle: HTMLDivElement;
  private readonly count: HTMLDivElement;
  private readonly drag: DragHandle;
  private readonly pinch: PinchZoomHandle;
  private readonly signObserver: ResizeObserver | null;
  private pinchStartFontSize = 0;
  private cornerResizing = false;
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
      // Block-level so it shrink-wraps the sign's width; vertical padding is
      // computed per sign height by layoutStick() to span the fixed stick.
      "display:inline-block",
      "max-width:90vw",
      `z-index:${TEXT_Z_INDEX}`,
      "user-select:none",
      "-webkit-user-select:none",
      "touch-action:none",
    ].join(";");

    // The sign wraps the editor exactly, so the drag/resize handles and the
    // character counter anchor to the sign rather than the whole stick.
    this.sign = document.createElement("div");
    this.sign.className = "text-overlay-sign";
    this.sign.style.cssText = [
      "position:relative",
      "display:block",
      "z-index:1",
      "filter:drop-shadow(0 4px 10px rgba(0,0,0,0.18))",
    ].join(";");
    this.el.appendChild(this.sign);

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
      `opacity:${isTouchDevice() ? "1" : "0.65"}`,
      "transition:opacity 0.15s",
      "z-index:2",
    ].join(";");
    this.sign.appendChild(this.dragHandle);

    this.editor = document.createElement("div");
    this.editor.className = "text-overlay-editor";
    this.editor.contentEditable = "true";
    this.editor.spellcheck = false;
    this.editor.dataset.placeholder = "Type here";
    this.editor.style.cssText = [
      "outline:none",
      "display:inline-block",
      "box-sizing:border-box",
      "min-width:120px",
      // Sign-like max-width in em so it scales with the chosen font size and
      // wraps onto a few lines instead of stretching into a single long bar.
      "max-width:14em",
      "padding:14px 20px",
      "border-radius:12px",
      "line-height:1.15",
      "text-align:center",
      "text-transform:none",
      "white-space:pre-wrap",
      "word-break:break-word",
      `font-family:${fontFamily}`,
      `font-size:${fontSize(this.fontSize)}`,
      "cursor:text",
      "user-select:text",
      "-webkit-user-select:text",
    ].join(";");
    // Random light placard tint, chosen once at creation (matches the crowd's
    // signs: near-white face with a subtle colour gradient, dark lettering).
    const tint = PLACARD_TINTS[Math.floor(Math.random() * PLACARD_TINTS.length)] ?? PLACARD_TINTS[0]!;
    this.editor.style.background = `linear-gradient(180deg, #ffffff 0%, ${tint} 100%)`;
    this.editor.style.color = "#1b1b1b";
    this.sign.appendChild(this.editor);

    this.count = document.createElement("div");
    this.count.className = "text-overlay-count";
    this.count.style.cssText = [
      "position:absolute",
      "right:6px",
      "bottom:4px",
      "padding:1px 5px",
      "border-radius:8px",
      "background:rgba(0,0,0,0.06)",
      "color:rgba(0,0,0,0.5)",
      'font:10px/1.4 "Inter", sans-serif',
      "letter-spacing:0.4px",
      "pointer-events:none",
      "opacity:0",
      "transition:opacity 0.15s",
      "z-index:3",
    ].join(";");
    this.sign.appendChild(this.count);

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
      `opacity:${isTouchDevice() ? "1" : "0.65"}`,
      "transition:opacity 0.15s",
      "touch-action:none",
      "z-index:1",
    ].join(";");
    this.sign.appendChild(this.handle);

    this.stick = document.createElement("img");
    this.stick.className = "text-overlay-stick";
    this.stick.src = "/creatures/placard_stick.webp";
    this.stick.alt = "";
    this.stick.draggable = false;
    this.stick.style.cssText = [
      "position:absolute",
      "top:0",
      "left:50%",
      "transform:translateX(-50%)",
      "display:block",
      "z-index:0",
      "pointer-events:none",
      "user-select:none",
      "-webkit-user-drag:none",
      `width:${STICK_W}px`,
      `height:${STICK_H}px`,
    ].join(";");
    this.el.appendChild(this.stick);
    this.layoutStick();

    if (typeof ResizeObserver !== "undefined") {
      this.signObserver = new ResizeObserver(() => this.layoutStick());
      this.signObserver.observe(this.sign);
    } else {
      this.signObserver = null;
    }

    this.el.addEventListener("mouseenter", () => {
      this.handle.style.opacity = "1";
      this.dragHandle.style.opacity = "1";
    });
    this.el.addEventListener("mouseleave", () => {
      this.handle.style.opacity = "0";
      this.dragHandle.style.opacity = "0";
    });

    // Show the character counter only while the placard has focus (or is full),
    // so it never competes with the slogan while the user is dragging it around.
    this.editor.addEventListener("focus", () => this.setCounterVisible(true));
    this.editor.addEventListener("blur", () => this.setCounterVisible(false));
    // Block the keystroke that would push a full placard over the limit, rather
    // than letting it land and then truncating (which would jump the caret).
    this.editor.addEventListener("beforeinput", this.onBeforeInput);
    this.editor.addEventListener("input", this.onInput);
    this.updateCounter();

    this.drag = attachDrag(this.dragHandle, { x, y }, onDragMove, this.el, onDragStart, onDragEnd);
    this.drag.attach();
    this.attachResize();

    this.pinch = attachPinchZoom(
      this.el,
      (factor) => {
        if (this.cornerResizing) return;
        const next = clamp(this.pinchStartFontSize * factor, MIN_FONT_SIZE, MAX_FONT_SIZE);
        this.fontSize = next;
        this.editor.style.fontSize = fontSize(next);
        this.layoutStick();
      },
      () => {
        if (this.cornerResizing) return;
        this.pinchStartFontSize = this.fontSize;
      },
      () => {
        if (this.cornerResizing) return;
        clampToViewport(this.el);
      },
    );
    this.pinch.attach();
    clampToViewport(this.el);
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

  /** Current slogan length, including line breaks (which `textContent` omits). */
  getCharCount(): number {
    return readPlainText(this.editor).length;
  }

  private readonly onBeforeInput = (e: Event): void => {
    const ev = e as InputEvent;
    if (!ev.inputType?.startsWith("insert")) return;
    const selection = window.getSelection();
    const replacing = selection ? !selection.isCollapsed : false;
    if (!replacing && this.getCharCount() >= MAX_CHARS) {
      e.preventDefault();
    }
  };

  private readonly onInput = (): void => {
    const text = readPlainText(this.editor);
    if (text.length > MAX_CHARS) {
      setPlainText(this.editor, text.slice(0, MAX_CHARS));
      placeCaretAtEnd(this.editor);
    }
    this.updateCounter();
  };

  private updateCounter(): void {
    const len = this.getCharCount();
    this.count.textContent = `${len}/${MAX_CHARS}`;
    this.count.style.color = len >= MAX_CHARS ? "#c0392b" : "rgba(0,0,0,0.5)";
  }

  private setCounterVisible(visible: boolean): void {
    this.count.style.opacity = visible ? "1" : "0";
  }

  /** Pins the sign's vertical centre to the stick's mount point and pads the
   * overlay so it spans the whole fixed-size stick. The stick therefore keeps its
   * size (and stays visible above the sign) no matter how tall the slogan gets. */
  private layoutStick(): void {
    const signH = this.sign.offsetHeight || this.editor.offsetHeight || this.fontSize * 1.15 + 28;
    const above = Math.max(0, Math.round(STICK_ANCHOR_Y - signH / 2));
    this.el.style.paddingTop = `${above}px`;
    this.el.style.paddingBottom = `${Math.max(0, Math.round(STICK_H - above - signH))}px`;
  }

  getCenter(): { x: number; y: number } {
    const rect = this.el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  destroy(): void {
    this.drag.detach();
    this.pinch.detach();
    this.signObserver?.disconnect();
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
    this.cornerResizing = true;
    const startSize = this.fontSize;
    const startY = pointerY(e);
    const onMove = (ev: MouseEvent | TouchEvent): void => {
      // A second finger joining means this is now a pinch gesture (see
      // attachPinchZoom above) — stop reacting to touches[0] so the two
      // resize mechanisms don't fight over font size on the same event.
      if ("touches" in ev && ev.touches.length !== 1) return;
      const y = pointerY(ev);
      const dy = y - startY;
      const next = clamp(startSize + dy, MIN_FONT_SIZE, MAX_FONT_SIZE);
      this.fontSize = next;
      this.editor.style.fontSize = fontSize(next);
      this.layoutStick();
    };
    const onUp = (): void => {
      this.cornerResizing = false;
      clampToViewport(this.el);
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

function placeCaretAtEnd(el: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Plain text of a contentEditable, counting each line break (from `<br>` or the
 * `<div>` siblings Enter creates) as one character — `textContent` drops them. */
function readPlainText(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent ?? "";
      } else if (child.nodeName === "BR") {
        out += "\n";
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
        out += "\n";
      }
    }
  };
  walk(root);
  return out;
}

/** Replaces a contentEditable's contents with plain text, re-creating line breaks
 * as `<br>` so clamping never flattens the user's line structure. */
function setPlainText(el: HTMLElement, text: string): void {
  el.textContent = "";
  const parts = text.split("\n");
  parts.forEach((part, i) => {
    if (i > 0) el.appendChild(document.createElement("br"));
    if (part) el.appendChild(document.createTextNode(part));
  });
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
