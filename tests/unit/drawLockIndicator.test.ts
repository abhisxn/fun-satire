// tests/unit/drawLockIndicator.test.ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import { renderFrame } from "../../src/render/Renderer";
import { EntityStore } from "../../src/entities/EntityStore";
import type { Entity } from "../../src/entities/Entity";

const { drawLockIndicatorMock } = vi.hoisted(() => ({
  drawLockIndicatorMock: vi.fn(),
}));

vi.mock("../../src/render/drawers/drawSubject", () => ({ drawSubject: vi.fn() }));
vi.mock("../../src/render/drawers/drawEye", () => ({ drawEye: vi.fn() }));
vi.mock("../../src/render/drawers/drawGazeLines", () => ({ computeGazeLines: vi.fn(() => []) }));
vi.mock("../../src/render/drawers/drawFieldLines", () => ({
  computeFieldLines: vi.fn(() => []),
  drawFieldLines: vi.fn(),
}));
vi.mock("../../src/render/drawers/drawCursor", () => ({
  computeCursorState: vi.fn(() => ({ ringRadius: 0, ringOpacity: 0 })),
  drawCursor: vi.fn(),
}));
vi.mock("../../src/render/drawers/drawLockIndicator", () => ({
  drawLockIndicator: drawLockIndicatorMock,
  LOCK_INDICATOR: {},
}));

function makeCtx(): CanvasRenderingContext2D {
  const noop = () => {};
  return {
    save: noop, restore: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
    arc: noop, fill: noop, stroke: noop, clip: noop, bezierCurveTo: noop,
    fillRect: noop, clearRect: noop, translate: noop, rotate: noop,
    fillStyle: "", strokeStyle: "", lineWidth: 0, globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function makeSubjectEntity(id: number, x: number, y: number): Entity {
  return {
    id,
    content: { manifestId: "subject-figure-01", rig: "subject", renderType: "subject" },
    physics: { pos: { x, y }, vel: { x: 0, y: 0 }, home: { x, y }, scale: 1, rotation: 0 },
    behavior: { data: { baseSizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" } } },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("drawLockIndicator (PR2 Task 6, Gate 1 variant A: thin amber ring)", () => {
  it("draws a ring around a locked subject", async () => {
    const { drawLockIndicator: real } = await vi.importActual<typeof import("../../src/render/drawers/drawLockIndicator")>(
      "../../src/render/drawers/drawLockIndicator",
    );
    const calls: string[] = [];
    const ctx = new Proxy(makeCtx(), {
      get(target, prop) {
        if (prop === "beginPath" || prop === "arc" || prop === "stroke") {
          return () => calls.push(String(prop));
        }
        return Reflect.get(target, prop);
      },
    });
    real(ctx, { pos: { x: 100, y: 100 }, sizePx: 96 });
    expect(calls).toContain("beginPath");
    expect(calls).toContain("arc");
    expect(calls.filter((c) => c === "stroke").length).toBeGreaterThanOrEqual(2);
  });

  it("does not use ctx.shadowBlur (per task constraint)", async () => {
    const { drawLockIndicator: real } = await vi.importActual<typeof import("../../src/render/drawers/drawLockIndicator")>(
      "../../src/render/drawers/drawLockIndicator",
    );
    const shadowValues: number[] = [];
    const ctx = makeCtx() as CanvasRenderingContext2D;
    Object.defineProperty(ctx, "shadowBlur", {
      get() { return undefined; },
      set(v: number) { shadowValues.push(v); },
      configurable: true,
    });
    real(ctx, { pos: { x: 0, y: 0 }, sizePx: 96 });
    const nonZero = shadowValues.filter((v) => v && v > 0);
    expect(nonZero.length).toBe(0);
  });
});

describe("renderFrame: locked-subject indicator (PR2 Task 6)", () => {
  function render(subjectOpts: Parameters<typeof renderFrame>[0]["subjects"][number]) {
    const store = new EntityStore();
    store.insert(makeSubjectEntity(1, 50, 50));
    renderFrame({
      ctx: makeCtx(),
      width: 400,
      height: 300,
      store,
      cursor: { x: 0, y: 0, active: false },
      particles: { draw: () => {} } as never,
      blinkTimers: new Map(),
      pupilOffsets: new Map(),
      hoverEntityId: null,
      cursorRingRadius: 0,
      cursorRingOpacity: 0,
      reducedMotion: false,
      hudMode: "eyes",
      quantity: 20,
      repelMultiplier: 1,
      nowMs: 0,
      subjects: [subjectOpts],
      chargeT: 0,
      assistRadiusPx: 140,
    } as never);
  }

  it("calls drawLockIndicator when subject.locked is true", () => {
    drawLockIndicatorMock.mockClear();
    render({ id: 1, pos: { x: 50, y: 50 }, sizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" }, scale: 1, locked: true });
    expect(drawLockIndicatorMock).toHaveBeenCalledTimes(1);
    expect(drawLockIndicatorMock).toHaveBeenCalledWith(expect.anything(), { pos: { x: 50, y: 50 }, sizePx: 96 });
  });

  it("does not call drawLockIndicator when subject.locked is false", () => {
    drawLockIndicatorMock.mockClear();
    render({ id: 1, pos: { x: 50, y: 50 }, sizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" }, scale: 1, locked: false });
    expect(drawLockIndicatorMock).not.toHaveBeenCalled();
  });

  it("does not call drawLockIndicator when subject.locked is omitted", () => {
    drawLockIndicatorMock.mockClear();
    render({ id: 1, pos: { x: 50, y: 50 }, sizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" }, scale: 1 });
    expect(drawLockIndicatorMock).not.toHaveBeenCalled();
  });
});
