// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { SubjectDragSource } from "../../src/input/SubjectDragSource";
import type { SubjectSkin } from "../../src/hud/subjectSkinRegistry";
import type { Vec2 } from "../../src/entities/Entity";

function firePointer(el: EventTarget, type: string, x: number, y: number, pointerType = "mouse"): void {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType, bubbles: true }));
}

describe("SubjectDragSource onDrop", () => {
  it("emits {skin, canvasPos} with a Vec2 when a mouse drag ends over the drop target", () => {
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
    source.onDrop(cb);

    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 150, 150);
    firePointer(window, "pointerup", 150, 150);

    expect(cb).toHaveBeenCalledTimes(1);
    const result = cb.mock.calls[0][0] as { skin: SubjectSkin; canvasPos: Vec2 | null };
    expect(result.skin).toEqual(skin);
    expect(result.canvasPos).toEqual({ x: 50, y: 50 });
  });

  it("emits {skin, canvasPos: null} when a mouse drag ends outside the drop target", () => {
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
    source.onDrop(cb);

    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 20, 20);
    firePointer(window, "pointerup", 20, 20);

    expect(cb).toHaveBeenCalledTimes(1);
    const result = cb.mock.calls[0][0] as { skin: SubjectSkin; canvasPos: Vec2 | null };
    expect(result.skin).toEqual(skin);
    expect(result.canvasPos).toBeNull();
  });
});

describe("SubjectDragSource", () => {
  it("calls onDrop when a mouse drag ends over the drop target", () => {
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
    source.onDrop(cb);

    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 150, 150);
    firePointer(window, "pointerup", 150, 150);

    expect(cb).toHaveBeenCalledWith({ skin, canvasPos: { x: 50, y: 50 } });
  });

  it("calls onDrop with canvasPos: null when the drag ends outside the drop target", () => {
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
    source.onDrop(cb);

    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 20, 20);
    firePointer(window, "pointerup", 20, 20);

    expect(cb).toHaveBeenCalledWith({ skin, canvasPos: null });
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
    source.onDrop(cb);

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
    source.onDrop(cb);

    currentValue = "second";
    firePointer(card, "pointerdown", 10, 10);
    firePointer(window, "pointermove", 150, 150);
    firePointer(window, "pointerup", 150, 150);

    expect(cb).toHaveBeenCalledWith({ skin: { kind: "text", value: "second", scale: 1 }, canvasPos: { x: 50, y: 50 } });
  });

  it("cleans up the ghost and listeners on pointercancel without calling onDrop", () => {
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
    source.onDrop(cb);

    const beforeCount = document.body.children.length;
    firePointer(card, "pointerdown", 10, 10);
    expect(document.body.children.length).toBe(beforeCount + 1);
    firePointer(window, "pointermove", 150, 150);
    firePointer(window, "pointercancel", 150, 150);

    expect(cb).not.toHaveBeenCalled();
    expect(document.body.children.length).toBe(beforeCount);
  });
});

describe("SubjectDragSource cursor affordance", () => {
  it("sets cursor: grab on the attached card", () => {
    const dropTarget = document.createElement("canvas");
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "illustrated", id: "figure" }));

    expect(card.style.cursor).toBe("grab");
  });

  it("sets cursor: grabbing on the drag ghost and restores body cursor after drop", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 100, right: 300, top: 100, bottom: 300, width: 200, height: 200, x: 100, y: 100, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "illustrated", id: "figure" }));

    firePointer(card, "pointerdown", 10, 10);
    const ghost = document.querySelectorAll("body > *")[document.querySelectorAll("body > *").length - 1] as HTMLElement;
    expect(ghost.style.cursor).toBe("grabbing");
    expect(document.body.style.cursor).toBe("grabbing");

    firePointer(window, "pointermove", 150, 150);
    firePointer(window, "pointerup", 150, 150);

    expect(document.body.style.cursor).toBe("");
  });
});

describe("SubjectDragSource touch tap-to-select", () => {
  it("a bare touch pointerup on a card drops immediately with canvasPos: null", () => {
    const dropTarget = document.createElement("canvas");
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    const skin: SubjectSkin = { kind: "illustrated", id: "lotus" };
    source.attachCard(card, () => skin);
    const cb = vi.fn();
    source.onDrop(cb);

    card.dispatchEvent(new PointerEvent("pointerup", { clientX: 5, clientY: 5, pointerType: "touch", bubbles: true }));

    expect(cb).toHaveBeenCalledWith({ skin, canvasPos: null });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("touch tap position is irrelevant — it never checks the drop-target rect", () => {
    const dropTarget = document.createElement("canvas");
    Object.defineProperty(dropTarget, "getBoundingClientRect", {
      value: () => ({ left: 900, right: 999, top: 900, bottom: 999, width: 99, height: 99, x: 900, y: 900, toJSON() {} }),
    });
    document.body.appendChild(dropTarget);
    const card = document.createElement("button");
    document.body.appendChild(card);

    const source = new SubjectDragSource({ dropTarget });
    source.attachCard(card, () => ({ kind: "illustrated", id: "lotus" }));
    const cb = vi.fn();
    source.onDrop(cb);

    card.dispatchEvent(new PointerEvent("pointerup", { clientX: 0, clientY: 0, pointerType: "touch", bubbles: true }));

    expect(cb).toHaveBeenCalled();
  });
});
