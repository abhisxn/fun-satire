// tests/unit/drawBug.test.ts
import { describe, it, expect, vi } from "vitest";
import { drawBug, computeScuttleJitter, BUG_DRAW } from "../../src/render/drawers/drawBug";
import { CROWD_ASSET_IDS, getCrowdAssetEntry } from "../../src/render/crowdAssetRegistry";
import type { ImageAssetCache, ImageAssetEntry } from "../../src/render/imageAssets";

const fakeCtx = (): CanvasRenderingContext2D =>
  new Proxy(
    {},
    { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
  ) as unknown as CanvasRenderingContext2D;

const colors = { sclera: "cream", iris: "sage", pupil: "ink", highlight: "cream", outline: "ink" } as const;

function makeReadyCache(): ImageAssetCache {
  const fakeImage = {} as HTMLImageElement;
  const entries = new Map<string, ImageAssetEntry>();
  for (const id of CROWD_ASSET_IDS) {
    const e = getCrowdAssetEntry(id)!;
    entries.set(e.url, { status: "ready", image: fakeImage });
  }
  return {
    get: (url: string): ImageAssetEntry => entries.get(url) ?? { status: "loading" },
    preload: () => Promise.resolve([]),
  } as unknown as ImageAssetCache;
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
    stroke: noop,
    clip: noop,
    fillRect: noop,
    clearRect: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    ellipse: noop,
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

describe("computeScuttleJitter", () => {
  it("is a pure, deterministic function of (id, timeMs)", () => {
    const a = computeScuttleJitter(7, 1234);
    const b = computeScuttleJitter(7, 1234);
    expect(a).toEqual(b);
  });

  it("produces different jitter for different ids at the same time", () => {
    const a = computeScuttleJitter(1, 1000);
    const b = computeScuttleJitter(2, 1000);
    expect(a).not.toEqual(b);
  });

  it("stays within the configured jitter amplitude", () => {
    for (let t = 0; t < 5000; t += 250) {
      const j = computeScuttleJitter(3, t);
      expect(Math.abs(j.x)).toBeLessThanOrEqual(BUG_DRAW.jitterAmpPx + 1e-6);
      expect(Math.abs(j.y)).toBeLessThanOrEqual(BUG_DRAW.jitterAmpPx + 1e-6);
    }
  });

  it("under reducedMotion, returns the zero vector", () => {
    const reduced = computeScuttleJitter(7, 1234, { reducedMotion: true });
    expect(reduced).toEqual({ x: 0, y: 0 });
  });
});

describe("drawBug / Figma asset rendering", () => {
  it("dispatches a ctx.drawImage call when the asset is ready", () => {
    const ctx = makeSpyCtx();
    const cache = makeReadyCache();
    drawBug(ctx, { pos: { x: 100, y: 100 }, sizePx: 64, colors, timeMs: 0, id: 5, imageCache: cache });
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("draws exactly one asset image per call (no per-frame stacking)", () => {
    const ctx = makeSpyCtx();
    const cache = makeReadyCache();
    drawBug(ctx, { pos: { x: 0, y: 0 }, sizePx: 50, colors, timeMs: 0, id: 9, imageCache: cache });
    expect(ctx.drawImage.mock.calls.length).toBe(1);
  });

  it("preserves the look-at rotation plus scuttle jitter (no rotation, default jitter)", () => {
    const ctx = makeSpyCtx();
    const cache = makeReadyCache();
    drawBug(ctx, { pos: { x: 0, y: 0 }, sizePx: 50, colors, timeMs: 1234, id: 3, imageCache: cache });
    const translateArgs = ctx.translate.mock.calls.map((c) => c.map((n) => Number((n as number).toFixed(3))));
    const lastTranslate = translateArgs[translateArgs.length - 1];
    const jitter = computeScuttleJitter(3, 1234);
    expect(lastTranslate![0]).toBeCloseTo(jitter.x, 3);
    expect(lastTranslate![1]).toBeCloseTo(jitter.y, 3);
    expect(ctx.rotate).toHaveBeenCalledWith(0);
  });

  it("composes user rotation on top of identity rotation", () => {
    const ctx = makeSpyCtx();
    const cache = makeReadyCache();
    drawBug(ctx, { pos: { x: 0, y: 0 }, sizePx: 50, colors, timeMs: 0, id: 1, imageCache: cache, rotation: 0.42 });
    expect(ctx.rotate).toHaveBeenCalledWith(0.42);
  });

  it("under reducedMotion, ctx.translate is invoked with the entity pos (no jitter offset)", () => {
    const ctx = makeSpyCtx();
    const cache = makeReadyCache();
    drawBug(ctx, {
      pos: { x: 77, y: 33 },
      sizePx: 50,
      colors,
      timeMs: 1234,
      id: 3,
      imageCache: cache,
      reducedMotion: true,
    });
    const args = ctx.translate.mock.calls.map((c) => c.map((n) => Number((n as number).toFixed(3))));
    const last = args[args.length - 1];
    expect(last![0]).toBe(77);
    expect(last![1]).toBe(33);
  });

  it("balances canvas state (save count equals restore count)", () => {
    const ctx = makeSpyCtx();
    const cache = makeReadyCache();
    drawBug(ctx, { pos: { x: 0, y: 0 }, sizePx: 50, colors, timeMs: 0, id: 1, imageCache: cache });
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
    expect(ctx.restore.mock.calls.length).toBeGreaterThan(0);
  });

  it("while the asset is loading, drawBug draws a restrained fallback in the same bounds", () => {
    const ctx = makeSpyCtx();
    const cache = makeLoadingCache();
    drawBug(ctx, { pos: { x: 0, y: 0 }, sizePx: 50, colors, timeMs: 0, id: 1, imageCache: cache });
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("on asset error, drawBug draws a stable fallback (no drawImage, balanced state)", () => {
    const ctx = makeSpyCtx();
    const cache = makeErrorCache();
    drawBug(ctx, { pos: { x: 0, y: 0 }, sizePx: 50, colors, timeMs: 0, id: 1, imageCache: cache });
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("never calls console.warn per frame (no per-frame logging on load failure)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ctx = makeSpyCtx();
    const cache = makeErrorCache();
    for (let i = 0; i < 5; i++) {
      drawBug(ctx, { pos: { x: 0, y: 0 }, sizePx: 50, colors, timeMs: 0, id: i, imageCache: cache });
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

// Design-system requirement: when drawBug falls back to procedural geometry
// (no imageCache / asset error), the body silhouette must use the shared
// paperCut.ts utility (paperCutEdgePath + withPaperCutShadow), the same
// treatment drawEye.ts/drawSubject*.ts use — not a bespoke ctx.ellipse fill.
describe("paperCut.ts consistency (no bespoke edge/shadow styling)", () => {
  it("drawBug applies the shared paper-cut shadow treatment to its fallback body", () => {
    const shadowColors: string[] = [];
    const ctx = new Proxy(
      {},
      { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
    );
    Object.defineProperty(ctx, "shadowColor", {
      set: (v: string) => shadowColors.push(v),
      get: () => "",
    });
    drawBug(ctx as unknown as CanvasRenderingContext2D, { pos: { x: 20, y: 20 }, sizePx: 40, colors, timeMs: 500, id: 5 });
    expect(shadowColors).toContain("rgba(42, 36, 32, 0.22)");
  });
});
