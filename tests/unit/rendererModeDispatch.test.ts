// tests/unit/rendererModeDispatch.test.ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/render/drawers/drawEye", () => ({ drawEye: vi.fn() }));
vi.mock("../../src/render/drawers/drawBug", () => ({ drawBug: vi.fn() }));
vi.mock("../../src/render/drawers/drawPointedFinger", () => ({ drawPointedFinger: vi.fn() }));
vi.mock("../../src/render/drawers/drawSubject", () => ({ drawSubject: vi.fn() }));
vi.mock("../../src/render/drawers/drawGazeLines", () => ({ computeGazeLines: vi.fn(() => []) }));
vi.mock("../../src/render/drawers/drawFieldLines", () => ({
  computeFieldLines: vi.fn(() => []),
  drawFieldLines: vi.fn(),
}));
vi.mock("../../src/render/drawers/drawCursor", () => ({
  computeCursorState: vi.fn(() => ({ ringRadius: 0, ringOpacity: 0 })),
  drawCursor: vi.fn(),
}));

import { renderFrame } from "../../src/render/Renderer";
import { drawEye } from "../../src/render/drawers/drawEye";
import { drawBug } from "../../src/render/drawers/drawBug";
import { drawPointedFinger } from "../../src/render/drawers/drawPointedFinger";
import { EntityStore } from "../../src/entities/EntityStore";
import type { Entity } from "../../src/entities/Entity";

function makeCtx(): CanvasRenderingContext2D {
  const noop = () => {};
  return {
    save: noop, restore: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
    arc: noop, fill: noop, stroke: noop, clip: noop, bezierCurveTo: noop,
    fillRect: noop, clearRect: noop, translate: noop, rotate: noop,
    fillStyle: "", strokeStyle: "", lineWidth: 0, globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function makeEyeEntity(id: number, rotation = 0): Entity {
  return {
    id,
    content: { manifestId: "eye-1", rig: "eye", renderType: "eye" },
    physics: { pos: { x: 10, y: 10 }, vel: { x: 0, y: 0 }, home: { x: 10, y: 10 }, scale: 1, rotation },
    behavior: { data: { shapeVariant: "almond", baseSizePx: 56 } },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

function makeOptions(overrides: Record<string, unknown> = {}) {
  const store = new EntityStore();
  store.insert(makeEyeEntity(1));
  return {
    ctx: makeCtx(),
    width: 400,
    height: 300,
    store,
    cursor: { x: 0, y: 0, active: false },
    particles: { draw: () => {} },
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
    subject: null,
    chargeT: 0,
    assistRadiusPx: 140,
    ...overrides,
  } as never;
}

describe("renderFrame mode dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls drawBug when hudMode is 'bugs'", () => {
    renderFrame(makeOptions({ hudMode: "bugs" }));
    expect(drawBug).toHaveBeenCalledTimes(1);
    expect(drawEye).not.toHaveBeenCalled();
    expect(drawPointedFinger).not.toHaveBeenCalled();
  });

  it("calls drawPointedFinger when hudMode is 'pointedFinger'", () => {
    renderFrame(makeOptions({ hudMode: "pointedFinger" }));
    expect(drawPointedFinger).toHaveBeenCalledTimes(1);
    expect(drawEye).not.toHaveBeenCalled();
    expect(drawBug).not.toHaveBeenCalled();
  });

  it("throws for unknown hudMode", () => {
    expect(() => {
      renderFrame(makeOptions({ hudMode: "unknown" }));
    }).toThrow('renderFrame: unknown hudMode "unknown"');
  });
});

describe("renderFrame rotation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies rotation to canvas context before drawing eyes", () => {
    const rotateSpy = vi.fn();
    const noop = () => {};
    const ctx = {
      save: noop, restore: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
      arc: noop, fill: noop, stroke: noop, clip: noop, bezierCurveTo: noop,
      fillRect: noop, clearRect: noop, translate: noop, rotate: rotateSpy,
      fillStyle: "", strokeStyle: "", lineWidth: 0, globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    const store = new EntityStore();
    store.insert(makeEyeEntity(1, 0.75));

    renderFrame(makeOptions({ ctx, store }));
    expect(rotateSpy).toHaveBeenCalledWith(0.75);
  });
});
