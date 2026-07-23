// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PointerTracker } from "../../src/input/PointerTracker";

type SinkStub = {
  setCursor: ReturnType<typeof vi.fn>;
  clearCursor: ReturnType<typeof vi.fn>;
  press: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
};

function makeSink(): SinkStub {
  return {
    setCursor: vi.fn(),
    clearCursor: vi.fn(),
    press: vi.fn(),
    release: vi.fn(),
  };
}

function makeElement(): HTMLElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, x: 0, y: 0, toJSON() { return {}; } } as DOMRect),
  });
  document.body.appendChild(el);
  return el;
}

describe("input/PointerTracker (T10)", () => {
  let el: HTMLElement;
  let sink: SinkStub;

  beforeEach(() => {
    el = makeElement();
    sink = makeSink();
  });
  afterEach(() => {
    el.remove();
  });

  it("pointermove writes normalized cursor and marks the tracker active", () => {
    const tracker = new PointerTracker(el, sink);
    tracker.attach();
    el.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 120, clientY: 80, bubbles: true }),
    );
    expect(sink.setCursor).toHaveBeenCalledWith(120, 80);
    expect(tracker.state().active).toBe(true);
    expect(["", "mouse"]).toContain(tracker.state().pointerType);
  });

  it("pointerdown sets cursor, marks pressed, and calls press()", () => {
    const tracker = new PointerTracker(el, sink);
    tracker.attach();
    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 50, bubbles: true, button: 0 }),
    );
    expect(sink.setCursor).toHaveBeenCalledWith(50, 50);
    expect(sink.press).toHaveBeenCalled();
    expect(tracker.state().pressed).toBe(true);
  });

  it("pointerup releases the press", () => {
    const tracker = new PointerTracker(el, sink);
    tracker.attach();
    el.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10, bubbles: true, button: 0 }));
    el.dispatchEvent(new PointerEvent("pointerup", { clientX: 10, clientY: 10, bubbles: true }));
    expect(sink.release).toHaveBeenCalled();
    expect(tracker.state().pressed).toBe(false);
  });

  it("pointercancel releases and clears the cursor", () => {
    const tracker = new PointerTracker(el, sink);
    tracker.attach();
    el.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10, bubbles: true, button: 0 }));
    el.dispatchEvent(new PointerEvent("pointercancel", { clientX: 10, clientY: 10, bubbles: true }));
    expect(sink.release).toHaveBeenCalled();
    expect(sink.clearCursor).toHaveBeenCalled();
    expect(tracker.state().active).toBe(false);
  });

  it("touchstart/touchmove/touchend translate to the sink", () => {
    const tracker = new PointerTracker(el, sink);
    tracker.attach();
    const t = { clientX: 60, clientY: 70 } as unknown as Touch;
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [t], bubbles: true }));
    expect(sink.setCursor).toHaveBeenCalledWith(60, 70);
    expect(sink.press).toHaveBeenCalled();
    expect(tracker.state().pointerType).toBe("touch");
    el.dispatchEvent(new TouchEvent("touchend", { changedTouches: [t], touches: [], bubbles: true }));
    expect(sink.release).toHaveBeenCalled();
  });

  it("detach removes all listeners and prevents further sink writes", () => {
    const tracker = new PointerTracker(el, sink);
    tracker.attach();
    tracker.detach();
    el.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 99, clientY: 99, bubbles: true }),
    );
    expect(sink.setCursor).not.toHaveBeenCalled();
  });

  it("blur clears the cursor and releases a pressed state", () => {
    const tracker = new PointerTracker(el, sink);
    tracker.attach();
    el.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10, bubbles: true, button: 0 }));
    el.dispatchEvent(new Event("blur"));
    expect(sink.clearCursor).toHaveBeenCalled();
    expect(sink.release).toHaveBeenCalled();
  });
});
