// tests/unit/rendererSubjects.test.ts
// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from "vitest";

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
import { drawSubject } from "../../src/render/drawers/drawSubject";
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

function makeEyeEntity(id: number): Entity {
  return {
    id,
    content: { manifestId: "eye-1", rig: "eye", renderType: "eye", palette: { sclera: "#EDE7DD", iris: "#5B7A8C", pupil: "#2A2420", highlight: null, outline: "#2A2420" } },
    physics: { pos: { x: 10, y: 10 }, vel: { x: 0, y: 0 }, home: { x: 10, y: 10 }, scale: 1, rotation: 0 },
    behavior: { data: { shapeVariant: "almond", blinkScaleY: 1 } },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

const baseColors = { suit: "slate", shirt: "cream", outline: "ink" } as const;

function makeSubjectInfo(id: number, x: number, y: number) {
  return {
    id,
    pos: { x, y },
    sizePx: 96,
    colors: baseColors,
    scale: 1,
    locked: false,
  };
}

describe("render/Renderer multi-subject (PR2 lane 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("draws each subject via drawSubject when opts.subjects contains multiple entries", () => {
    const store = new EntityStore();
    store.insert(makeEyeEntity(1));
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
      subjects: [
        makeSubjectInfo(10, 50, 50),
        makeSubjectInfo(11, 200, 200),
        makeSubjectInfo(12, 350, 100),
      ],
      chargeT: 0,
      assistRadiusPx: 140,
    } as never);
    expect(drawSubject).toHaveBeenCalledTimes(3);
  });

  it("does not call drawSubject when opts.subjects is an empty array", () => {
    const store = new EntityStore();
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
      subjects: [],
      chargeT: 0,
      assistRadiusPx: 140,
    } as never);
    expect(drawSubject).not.toHaveBeenCalled();
  });
});
