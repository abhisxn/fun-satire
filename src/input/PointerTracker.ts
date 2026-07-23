export type PointerState = {
  x: number;
  y: number;
  active: boolean;
  pressed: boolean;
  pointerType: "mouse" | "touch" | "pen" | "";
};

export type PointerSink = {
  setCursor(x: number, y: number): void;
  clearCursor(): void;
  press(): void;
  release(): void;
};

const toCanvas = (
  el: Element,
  clientX: number,
  clientY: number,
): { x: number; y: number } => {
  const rect = el.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
};

export class PointerTracker {
  private pointer: PointerState = {
    x: 0,
    y: 0,
    active: false,
    pressed: false,
    pointerType: "",
  };
  private attached = false;
  private listeners: Array<{ target: EventTarget; type: string; fn: EventListener; opt?: AddEventListenerOptions | boolean }> = [];
  private readonly element: HTMLElement;
  private readonly sink: PointerSink;

  constructor(element: HTMLElement, sink: PointerSink) {
    this.element = element;
    this.sink = sink;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.add(this.element, "pointermove", (e) => this.onMove(e as PointerEvent));
    this.add(this.element, "pointerdown", (e) => this.onDown(e as PointerEvent));
    this.add(this.element, "pointerup", (e) => this.onUp(e as PointerEvent));
    this.add(this.element, "pointercancel", (e) => this.onCancel(e as PointerEvent));
    this.add(this.element, "pointerleave", (e) => this.onCancel(e as PointerEvent));
    this.add(this.element, "touchstart", (e) => this.onTouchStart(e as TouchEvent), { passive: true });
    this.add(this.element, "touchmove", (e) => this.onTouchMove(e as TouchEvent), { passive: true });
    this.add(this.element, "touchend", (e) => this.onTouchEnd(e as TouchEvent));
    this.add(this.element, "blur", () => this.onBlur());
  }

  detach(): void {
    for (const l of this.listeners) {
      l.target.removeEventListener(l.type, l.fn, l.opt);
    }
    this.listeners = [];
    this.attached = false;
  }

  state(): PointerState {
    return this.pointer;
  }

  private add(
    target: EventTarget,
    type: string,
    fn: EventListener,
    opt?: AddEventListenerOptions | boolean,
  ): void {
    target.addEventListener(type, fn, opt);
    this.listeners.push({ target, type, fn, opt });
  }

  private onMove(e: PointerEvent): void {
    const p = toCanvas(this.element, e.clientX, e.clientY);
    this.pointer = {
      x: p.x,
      y: p.y,
      active: true,
      pressed: this.pointer.pressed,
      pointerType: (e.pointerType as PointerState["pointerType"]) || "mouse",
    };
    this.sink.setCursor(p.x, p.y);
  }

  private onDown(e: PointerEvent): void {
    const p = toCanvas(this.element, e.clientX, e.clientY);
    this.pointer = {
      x: p.x,
      y: p.y,
      active: true,
      pressed: true,
      pointerType: (e.pointerType as PointerState["pointerType"]) || "mouse",
    };
    this.sink.setCursor(p.x, p.y);
    this.sink.press();
  }

  private onUp(e: PointerEvent): void {
    const p = toCanvas(this.element, e.clientX, e.clientY);
    this.pointer = { ...this.pointer, x: p.x, y: p.y, pressed: false };
    this.sink.release();
  }

  private onCancel(_e: PointerEvent): void {
    if (this.pointer.pressed) this.sink.release();
    this.pointer = { ...this.pointer, active: false, pressed: false };
    this.sink.clearCursor();
  }

  private onTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;
    const p = toCanvas(this.element, touch.clientX, touch.clientY);
    this.pointer = { x: p.x, y: p.y, active: true, pressed: true, pointerType: "touch" };
    this.sink.setCursor(p.x, p.y);
    this.sink.press();
  }

  private onTouchMove(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;
    const p = toCanvas(this.element, touch.clientX, touch.clientY);
    this.pointer = { ...this.pointer, x: p.x, y: p.y };
    this.sink.setCursor(p.x, p.y);
  }

  private onTouchEnd(_e: TouchEvent): void {
    if (this.pointer.pressed) this.sink.release();
    this.pointer = { ...this.pointer, pressed: false };
  }

  private onBlur(): void {
    if (this.pointer.pressed) this.sink.release();
    this.pointer = { x: 0, y: 0, active: false, pressed: false, pointerType: "" };
    this.sink.clearCursor();
  }
}
