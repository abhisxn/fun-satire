// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { SubjectDragSource } from "../../src/input/SubjectDragSource";
import type { SubjectSkin } from "../../src/hud/subjectSkinRegistry";

function firePointer(el: EventTarget, type: string, x: number, y: number, pointerType = "mouse"): void {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType, bubbles: true }));
}

describe("SubjectDragSource", () => {
  it("calls onSwap when a mouse drag ends over the drop target", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 100, right: 300, top: 100, bottom: 300, width: 200, height: 200, x: 100, y: 100, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    const skin: SubjectSkin = { kind: "illustrated", id: "figure" };
    source.attachCard(card, () => skin);
    const cb = vi.fn();
    source.onSwap(cb);

    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 150, 150);
    firePointer(window, "pointerup", 150, 150);

    expect(cb).toHaveBeenCalledWith(skin);
  });

  it("does not call onSwap when the drag ends outside the drop target", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 100, right: 300, top: 100, bottom: 300, width: 200, height: 200, x: 100, y: 100, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "illustrated", id: "figure" }));
    const cb = vi.fn();
    source.onSwap(cb);

    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 20, 20);
    firePointer(window, "pointerup", 20, 20);

    expect(cb).not.toHaveBeenCalled();
  });

  it("ignores touch pointerdown (handled separately by tap-to-select)", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 0, right: 999, top: 0, bottom: 999, width: 999, height: 999, x: 0, y: 0, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "illustrated", id: "figure" }));
    const cb = vi.fn();
    source.onSwap(cb);

    firePointer(card, "pointerdown", 10, 10, "touch");
    firePointer(window, "pointermove", 150, 150, "touch");
    firePointer(window, "pointerup", 150, 150, "touch");

    expect(cb).not.toHaveBeenCalled();
  });

  it("reads getSkin() at drag-start time, not attach time (compose preview support)", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 100, right: 300, top: 100, bottom: 300, width: 200, height: 200, x: 100, y: 100, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    let currentValue = "first";
    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "text", value: currentValue, scale: 1 }));
    const cb = vi.fn();
    source.onSwap(cb);

    currentValue = "second";
    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 150, 150);
    firePointer(window, "pointerup", 150, 150);

    expect(cb).toHaveBeenCalledWith({ kind: "text", value: "second", scale: 1 });
  });
});
