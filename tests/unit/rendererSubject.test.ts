// tests/unit/rendererSubject.test.ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/render/drawers/drawEye", () => ({ drawEye: vi.fn() }));
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
import { drawSubject } from "../../src/render/drawers/drawSubject";
import { EntityStore } from "../../src/entities/EntityStore";
import type { Entity } from "../../src/entities/Entity";

function makeCtx(): CanvasRenderingContext2D {
  const noop = () => {};
  return {
    save: noop, restore: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
    arc: noop, fill: noop, stroke: noop, clip: noop, bezierCurveTo: noop,
    fillRect: noop, clearRect: noop,
    fillStyle: "", strokeStyle: "", lineWidth: 0, globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function makeEyeEntity(id: number): Entity {
  return {
    id,
    content: { manifestId: "eye-1", rig: "eye", renderType: "eye", palette: { sclera: "#EDE7DD", iris: "#5B7A8C", pupil: "#2A2420", highlight: null, outline: "#2A2420" } },
    physics: { pos: { x: 10, y: 10 }, vel: { x: 0, y: 0 }, home: { x: 10, y: 10 }, scale: 1, rotation: 0 },
    behavior: { data: { shapeVariant: "almond", blinkScaleY: 1 } },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

function makeSubjectEntity(id: number): Entity {
  return {
    id,
    content: { manifestId: "subject-figure-01", rig: "subject", renderType: "subject" },
    physics: { pos: { x: 50, y: 50 }, vel: { x: 0, y: 0 }, home: { x: 50, y: 50 }, scale: 1, rotation: 0 },
    behavior: { data: { baseSizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" } } },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("render/Renderer subject branching (T35)", () => {
  it("draws eyes via drawEye and does not call drawEye for the subject entity", () => {
    const store = new EntityStore();
    store.insert(makeEyeEntity(1));
    store.insert(makeSubjectEntity(2));
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
      subject: null,
      chargeT: 0,
      assistRadiusPx: 140,
    } as never);
    expect(drawEye).toHaveBeenCalledTimes(1);
  });

  it("calls drawSubject once when opts.subject is provided", () => {
    const store = new EntityStore();
    store.insert(makeSubjectEntity(2));
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
      subject: { id: 2, pos: { x: 50, y: 50 }, sizePx: 96, colors: { suit: "slate", shirt: "cream", outline: "ink" }, scale: 1 },
      chargeT: 0,
      assistRadiusPx: 140,
    } as never);
    expect(drawSubject).toHaveBeenCalledTimes(1);
  });
});
