// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { attachPinchZoom } from "../../src/creatures/pinchZoom";

function touch(id: number, target: EventTarget, clientX: number, clientY: number): Touch {
  return new Touch({ identifier: id, target, clientX, clientY });
}

describe("pinchZoom/attachPinchZoom", () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    el = document.createElement("div");
    document.body.appendChild(el);
  });

  it("ignores a single-finger touchstart (leaves it for drag handling)", () => {
    const onScale = vi.fn();
    const onPinchStart = vi.fn();
    const handle = attachPinchZoom(el, onScale, onPinchStart);
    handle.attach();

    el.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [touch(0, el, 0, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onPinchStart).not.toHaveBeenCalled();
    handle.detach();
  });

  it("reports a scale factor of 2 when the two-finger distance doubles", () => {
    const onScale = vi.fn();
    const onPinchStart = vi.fn();
    const handle = attachPinchZoom(el, onScale, onPinchStart);
    handle.attach();

    el.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [touch(0, el, 0, 0), touch(1, el, 100, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onPinchStart).toHaveBeenCalledTimes(1);

    document.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [touch(0, el, 0, 0), touch(1, el, 200, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onScale).toHaveBeenCalledTimes(1);
    expect(onScale.mock.calls[0]![0]).toBeCloseTo(2);
    handle.detach();
  });

  it("ends the pinch (and fires onPinchEnd) when a finger lifts", () => {
    const onScale = vi.fn();
    const onPinchEnd = vi.fn();
    const handle = attachPinchZoom(el, onScale, undefined, onPinchEnd);
    handle.attach();

    el.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [touch(0, el, 0, 0), touch(1, el, 100, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(
      new TouchEvent("touchend", {
        touches: [touch(0, el, 0, 0)],
        changedTouches: [touch(1, el, 100, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onPinchEnd).toHaveBeenCalledTimes(1);
    handle.detach();
  });

  it("stops firing onScale after detach", () => {
    const onScale = vi.fn();
    const handle = attachPinchZoom(el, onScale);
    handle.attach();
    handle.detach();

    el.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [touch(0, el, 0, 0), touch(1, el, 100, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [touch(0, el, 0, 0), touch(1, el, 300, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onScale).not.toHaveBeenCalled();
  });
});
