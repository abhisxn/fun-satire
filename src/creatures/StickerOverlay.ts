import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";
import { attachPinchZoom } from "./pinchZoom";
import type { PinchZoomHandle } from "./pinchZoom";
import { isTouchDevice } from "./touchSupport";

// Below #stage (z-index:500) so bugs and the eye/finger/creature grid render above it.
export const STICKER_Z_INDEX = 100;
export const DEFAULT_WIDTH = 160;
const MIN_WIDTH = 48;
const MAX_WIDTH = 480;
const HANDLE_SIZE = 14;
/** Scale the sticker pops down to on a full-power protest win (lockSqueeze()) —
 * applied only once the raid's despawn sweep has actually finished on screen (see
 * RaidController's onProtestWin), never as a live preview while still holding (a held
 * charge crossing FULL_POWER_THRESHOLD must NOT visibly change the sticker — that was
 * a bug: it telegraphed the win before the player let go). */
const SQUEEZE_MIN_SCALE = 0.55;
/** Ceiling for setScaleForRaidSize() — the sticker's resting scale maps linearly from
 * the current raid's unit count, and never grows past this even at the security cap. */
const MAX_SCALE = 2;
/** Smooth ease-in-out — reads as a continuous "slide" between two scales rather than a
 * snap or a spring, since it accelerates and decelerates symmetrically instead of
 * front-loading all the motion. Long enough that growing/shrinking reads as its own
 * visible beat once a raid's spawn/respawn/despawn has actually settled (see
 * RaidController's onProtestWin / onProtestBackfireSettled — these never fire
 * immediately on button release). Applied on `el` (the wrapper), not just the image, so
 * the resize handle and the element's actual hit-tested/dragged box scale along with
 * it — see getWidth() and handleResizeStart for the other half of that. */
const SQUEEZE_TRANSITION = "transform 1s cubic-bezier(0.4, 0, 0.2, 1)";

export class StickerOverlay {
  readonly el: HTMLDivElement;
  private readonly img: HTMLImageElement;
  private readonly handle: HTMLDivElement;
  private readonly drag: DragHandle;
  private readonly pinch: PinchZoomHandle;
  private pinchStartWidth = 0;
  private cornerResizing = false;
  private currentSrc: string;
  private width: number;
  private dragHint: HTMLDivElement | null = null;
  private dragHintTimeout: number | undefined;
  /** Resting scale — 1 by default, forced to SQUEEZE_MIN_SCALE by lockSqueeze() on a
   * full-power win, or continuously driven by setScaleForRaidSize() as the live raid
   * size changes. Not a permanent lock: unlock() (called once a new raid actually
   * starts) restores setScaleForRaidSize()'s ability to update it again. */
  private baseScale = 1;
  /** True from lockSqueeze() until unlock() — while locked, setScaleForRaidSize() is
   * a no-op, so a live crowd-size update arriving right after a win can't silently
   * overwrite the win's fixed floor scale before the next raid has actually begun. */
  private locked = false;

  private readonly dragSrc: string | null;

  constructor(
    src: string,
    initialX?: number,
    initialY?: number,
    onDragStart?: () => void,
    onDragEnd?: () => void,
    onDragMove?: (x: number, y: number) => void,
    showDragHint?: boolean,
    dragSrc?: string,
  ) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = initialX ?? Math.max(20, vw / 2 - 80);
    const y = initialY ?? Math.max(20, vh / 2 - 80);

    this.currentSrc = src;
    this.width = DEFAULT_WIDTH;
    this.dragSrc = dragSrc ?? null;

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
      `transition:${SQUEEZE_TRANSITION}`,
      "transform-origin:center",
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
      `opacity:${isTouchDevice() ? "1" : "0"}`,
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

    if (showDragHint) {
      this.dragHint = this.buildDragHint();
      this.el.appendChild(this.dragHint);
    }

    this.drag = attachDrag(
      this.el,
      { x, y },
      onDragMove,
      undefined,
      () => {
        this.hideDragHint();
        if (this.dragSrc) this.img.src = this.dragSrc;
        onDragStart?.();
      },
      () => {
        if (this.dragSrc) this.img.src = this.currentSrc;
        onDragEnd?.();
      },
    );
    this.drag.attach();
    this.attachResize();

    this.pinch = attachPinchZoom(
      this.el,
      (factor) => {
        if (this.cornerResizing) return;
        const next = clamp(this.pinchStartWidth * factor, MIN_WIDTH, MAX_WIDTH);
        this.width = next;
        this.img.style.width = `${next}px`;
      },
      () => {
        if (this.cornerResizing) return;
        this.hideDragHint();
        this.pinchStartWidth = this.width;
      },
    );
    this.pinch.attach();
  }

  private buildDragHint(): HTMLDivElement {
    const hint = document.createElement("div");
    hint.className = "sticker-overlay-drag-hint";
    hint.textContent = "Drag or Shake Me";
    hint.style.cssText = [
      "position:absolute",
      "left:50%",
      "top:-8px",
      "transform:translate(-50%, -100%)",
      "background:rgba(20,20,20,0.92)",
      "color:#fff",
      "font:600 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "padding:6px 10px",
      "border-radius:6px",
      "white-space:nowrap",
      "pointer-events:none",
      "box-shadow:0 2px 6px rgba(0,0,0,0.25)",
      "opacity:0",
      "transition:opacity 0.2s ease",
      "z-index:2",
    ].join(";");

    requestAnimationFrame(() => {
      if (hint.isConnected) hint.style.opacity = "1";
    });

    this.dragHintTimeout = window.setTimeout(() => this.hideDragHint(), 4000);
    return hint;
  }

  private hideDragHint(): void {
    if (!this.dragHint) return;
    clearTimeout(this.dragHintTimeout);
    const hint = this.dragHint;
    this.dragHint = null;
    hint.style.opacity = "0";
    window.setTimeout(() => hint.remove(), 200);
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

  /** True on-screen width, including the current squeeze/inflate scale — not just the
   * underlying CSS width. Callers that care about the sticker's actual footprint (e.g.
   * RaidController's escort-radius/repel-radius math, via main.ts's per-frame
   * `setAvatarWidth(getWidth())`) need this, not the pre-scale value: a 2x-inflated
   * sticker should push the crowd/escort ring back proportionally further, and a
   * shrunk one should let them approach closer. */
  getWidth(): number {
    return this.width * this.baseScale;
  }

  /** Called continuously as the live raid's security-unit count changes (RaidController's
   * onCrowdSizeChanged — never on button release itself, and not just at settle events).
   * Sets the sticker's resting scale from where the raid's size currently sits within
   * [0, maxUnits], linearly mapped to [1, MAX_SCALE] — not an incremental bump, so it
   * reflects the raid's actual current size rather than a click count that could drift
   * out of sync with what's on screen. Also swaps the face back to `src` (the calm/default
   * expression) if lockSqueeze() had switched it to `dragSrc` — a new raid means the win's
   * weird face is over. A no-op while locked (see lockSqueeze()/unlock()) — a win's fixed
   * floor scale must not be overwritten by a live update before the next raid starts. */
  setScaleForRaidSize(unitCount: number, maxUnits: number): void {
    if (this.locked) return;
    const t = maxUnits > 0 ? Math.max(0, Math.min(1, unitCount / maxUnits)) : 0;
    this.baseScale = 1 + t * (MAX_SCALE - 1);
    this.el.style.transform = `scale(${this.baseScale})`;
    if (this.dragSrc) this.img.src = this.currentSrc;
  }

  /** Called once a full-power protest release's despawn sweep has actually finished
   * on screen (RaidController's onProtestWin — never on button release itself): pops
   * the sticker down to SQUEEZE_MIN_SCALE and, for face stickers, swaps to `dragSrc`
   * (the "weird" expression already used mid-drag/shake — see the constructor) so the
   * face-pull reads as part of the same "under strain" moment as the shrink. Not a
   * permanent lock — unlock() (called once the next raid actually starts) reverts both
   * the scale and the face via the next setScaleForRaidSize() call. Starting a fresh
   * drag right after a win will also revert the face early (onDragEnd always restores
   * `currentSrc`) — an acceptable overlap between the two mechanics rather than
   * something worth extra state to avoid. */
  lockSqueeze(): void {
    this.locked = true;
    this.baseScale = SQUEEZE_MIN_SCALE;
    this.el.style.transform = `scale(${SQUEEZE_MIN_SCALE})`;
    if (this.dragSrc) this.img.src = this.dragSrc;
  }

  /** Releases the lock set by lockSqueeze(), letting setScaleForRaidSize() drive the
   * scale again. Called once a new raid actually starts (RaidController's onRaidStart)
   * — not merely once a backfire settles, since a backfire on an already-running raid
   * must not un-clock a still-standing win. Does not itself change the scale; the next
   * setScaleForRaidSize() call (which follows immediately once a raid starts) supplies
   * the new value. */
  unlock(): void {
    this.locked = false;
  }

  destroy(): void {
    clearTimeout(this.dragHintTimeout);
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
    this.cornerResizing = true;
    const startWidth = this.width;
    const startX = pointerX(e);
    const onMove = (ev: MouseEvent | TouchEvent): void => {
      // A second finger joining means this is now a pinch gesture (see
      // attachPinchZoom above) — stop reacting to touches[0] so the two
      // resize mechanisms don't fight over width on the same event.
      if ("touches" in ev && ev.touches.length !== 1) return;
      const x = pointerX(ev);
      // Divide by the current squeeze/inflate scale: dx is a physical screen-pixel
      // delta, but `width` is a pre-transform CSS value — without this, dragging the
      // handle the same physical distance would resize a 2x-inflated sticker twice
      // as much on screen as a normal one, and a shrunk one barely at all.
      const dx = (x - startX) / this.baseScale;
      const next = clamp(startWidth + dx, MIN_WIDTH, MAX_WIDTH);
      this.width = next;
      this.img.style.width = `${next}px`;
    };
    const onUp = (): void => {
      this.cornerResizing = false;
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
