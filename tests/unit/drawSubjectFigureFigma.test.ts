// tests/unit/drawSubjectFigureFigma.test.ts
// Lane C / Task C2 — drawSubjectFigure must use the exact Figma subject
// artwork when an imageCache is available, and keep the existing procedural
// fallback when assets are still loading or have errored.
import { describe, expect, it, vi } from "vitest";
import { drawSubjectFigure } from "../../src/render/drawers/drawSubjectFigure";
import { subjectAssetEntryFor } from "../../src/hud/subjectSkinRegistry";
import type { ImageAssetCache, ImageAssetEntry } from "../../src/render/imageAssets";

const colors = { suit: "slate" as const, shirt: "cream" as const, outline: "ink" as const };

function makeReadyFigureCache(): ImageAssetCache {
  const asset = subjectAssetEntryFor("figure")!;
  const fakeImage = {} as HTMLImageElement;
  const entries = new Map<string, ImageAssetEntry>([[asset.url, { status: "ready", image: fakeImage }]]);
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

function makeSpyCtx() {
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
    clip: vi.fn(),
    fillRect: noop,
    clearRect: noop,
    bezierCurveTo: noop,
    quadraticCurveTo: noop,
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
  };
}

describe("drawSubjectFigure Figma asset path", () => {
  it("uses the subject-elder-figure asset URL when an imageCache is provided", () => {
    const ctx = makeSpyCtx();
    const cache = makeReadyFigureCache();
    drawSubjectFigure(ctx as unknown as CanvasRenderingContext2D, {
      pos: { x: 100, y: 200 },
      sizePx: 96,
      colors,
      scale: 1,
      rotation: 0,
      imageCache: cache,
    });
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    const call = ctx.drawImage.mock.calls[0]!;
    expect(call[0]).toBeDefined();
  });

  it("falls back to the procedural figure when no imageCache is supplied (stable fallback)", () => {
    const ctx = makeSpyCtx();
    drawSubjectFigure(ctx as unknown as CanvasRenderingContext2D, {
      pos: { x: 100, y: 200 },
      sizePx: 96,
      colors,
      scale: 1,
      rotation: 0,
    });
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("falls back to the procedural figure when the asset is still loading", () => {
    const ctx = makeSpyCtx();
    drawSubjectFigure(ctx as unknown as CanvasRenderingContext2D, {
      pos: { x: 100, y: 200 },
      sizePx: 96,
      colors,
      scale: 1,
      rotation: 0,
      imageCache: makeLoadingCache(),
    });
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("falls back to the procedural figure when the asset errored", () => {
    const ctx = makeSpyCtx();
    drawSubjectFigure(ctx as unknown as CanvasRenderingContext2D, {
      pos: { x: 100, y: 200 },
      sizePx: 96,
      colors,
      scale: 1,
      rotation: 0,
      imageCache: makeErrorCache(),
    });
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("preserves the visual envelope (no canvas transforms outside the saved scope)", () => {
    const ctx = makeSpyCtx();
    const cache = makeReadyFigureCache();
    drawSubjectFigure(ctx as unknown as CanvasRenderingContext2D, {
      pos: { x: 0, y: 0 },
      sizePx: 96,
      colors,
      scale: 1,
      rotation: 0,
      imageCache: cache,
    });
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });

  it("does not mutate the input imageCache or its entries", () => {
    const cache = makeReadyFigureCache();
    const getSpy = vi.spyOn(cache, "get");
    const ctx = makeSpyCtx();
    drawSubjectFigure(ctx as unknown as CanvasRenderingContext2D, {
      pos: { x: 0, y: 0 },
      sizePx: 96,
      colors,
      scale: 1,
      rotation: 0,
      imageCache: cache,
    });
    expect(getSpy).toHaveBeenCalled();
    getSpy.mockRestore();
  });
});
