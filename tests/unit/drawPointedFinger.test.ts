import { describe, it, expect, vi } from "vitest";
import { drawPointedFinger, computePointShake, FINGER_DRAW } from "../../src/render/drawers/drawPointedFinger";
import type { ImageAssetCache, ImageAssetEntry } from "../../src/render/imageAssets";

const fakeCtx = (): CanvasRenderingContext2D =>
  new Proxy(
    {},
    { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
  ) as unknown as CanvasRenderingContext2D;

const colors = { suit: "slate", shirt: "cream", outline: "ink" } as const;

function makeSpyCtx(): CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
} {
  const noop = vi.fn();
  return {
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    arc: noop,
    fill: noop,
    stroke: vi.fn(),
    clip: noop,
    fillRect: noop,
    clearRect: noop,
    quadraticCurveTo: noop,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    lineCap: "",
    lineJoin: "",
    shadowColor: "",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
    rotate: ReturnType<typeof vi.fn>;
  };
}

function makeLoadingCache(): ImageAssetCache {
  return {
    get: (): ImageAssetEntry => ({ status: "loading" }),
    preload: () => Promise.resolve([]),
  } as unknown as ImageAssetCache;
}

function makeErrorCache(): ImageAssetCache {
  return {
    get: (): ImageAssetEntry => ({ status: "error" }),
    preload: () => Promise.resolve([]),
  } as unknown as ImageAssetCache;
}

describe("computePointShake", () => {
  it("is a pure, deterministic function of (id, timeMs)", () => {
    expect(computePointShake(4, 2000)).toBe(computePointShake(4, 2000));
  });

  it("stays within the configured shake amplitude", () => {
    for (let t = 0; t < 5000; t += 200) {
      const s = computePointShake(2, t);
      expect(Math.abs(s)).toBeLessThanOrEqual(FINGER_DRAW.shakeAmpRad + 1e-6);
    }
  });

  it("under reducedMotion, returns 0 (no decorative shake)", () => {
    expect(computePointShake(4, 2000, { reducedMotion: true })).toBe(0);
  });
});

describe("drawPointedFinger", () => {
  it("does not throw with a rotation applied", () => {
    expect(() =>
      drawPointedFinger(fakeCtx(), { pos: { x: 5, y: 5 }, sizePx: 44, colors, timeMs: 300, id: 9, rotation: -0.5 }),
    ).not.toThrow();
  });

  it("defaults rotation to 0 when omitted", () => {
    expect(() => drawPointedFinger(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 44, colors, timeMs: 0, id: 1 })).not.toThrow();
  });

  it("under reducedMotion, the draw path is balanced and the shake is omitted", () => {
    const ctx = makeSpyCtx();
    drawPointedFinger(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 44,
      colors,
      timeMs: 1234,
      id: 5,
      rotation: 0.3,
      reducedMotion: true,
    });
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
    expect(ctx.rotate).toHaveBeenCalledWith(0.3);
  });

  it("composes the shake on top of the user rotation when not in reduced motion", () => {
    const ctx = makeSpyCtx();
    drawPointedFinger(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 44,
      colors,
      timeMs: 0,
      id: 1,
      rotation: 0.1,
    });
    const last = ctx.rotate.mock.calls[ctx.rotate.mock.calls.length - 1]?.[0] as number;
    const shake = computePointShake(1, 0);
    expect(last).toBeCloseTo(0.1 + shake, 5);
  });

  it("uses the procedural fallback when no pointed-finger Figma export is available", () => {
    const ctx = makeSpyCtx();
    drawPointedFinger(ctx, { pos: { x: 0, y: 0 }, sizePx: 44, colors, timeMs: 0, id: 1 });
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("balances canvas state when assets are still loading", () => {
    const ctx = makeSpyCtx();
    drawPointedFinger(ctx, { pos: { x: 0, y: 0 }, sizePx: 44, colors, timeMs: 0, id: 1, imageCache: makeLoadingCache() });
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("balances canvas state when assets error", () => {
    const ctx = makeSpyCtx();
    drawPointedFinger(ctx, { pos: { x: 0, y: 0 }, sizePx: 44, colors, timeMs: 0, id: 1, imageCache: makeErrorCache() });
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("never logs per frame on asset error", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ctx = makeSpyCtx();
    const cache = makeErrorCache();
    for (let i = 0; i < 5; i++) {
      drawPointedFinger(ctx, { pos: { x: 0, y: 0 }, sizePx: 44, colors, timeMs: 0, id: i, imageCache: cache });
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

// Design-system requirement: when drawPointedFinger falls back to procedural
// geometry, the wrist silhouette must use the shared paperCut.ts utility
// (paperCutEdgePath + withPaperCutShadow), the same treatment drawEye.ts /
// drawSubject*.ts / drawBug.ts use.
describe("paperCut.ts consistency (no bespoke edge/shadow styling)", () => {
  it("drawPointedFinger applies the shared paper-cut shadow treatment to its wrist", () => {
    const shadowColors: string[] = [];
    const ctx = new Proxy(
      {},
      { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
    );
    Object.defineProperty(ctx, "shadowColor", {
      set: (v: string) => shadowColors.push(v),
      get: () => "",
    });
    drawPointedFinger(ctx as unknown as CanvasRenderingContext2D, {
      pos: { x: 5, y: 5 },
      sizePx: 44,
      colors,
      timeMs: 300,
      id: 9,
    });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
