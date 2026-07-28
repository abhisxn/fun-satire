import { describe, it, expect, vi } from "vitest";
import { drawBug, computeScuttleJitter, BUG_DRAW } from "../../src/render/drawers/drawBug";
import type { ImageAssetCache } from "../../src/render/imageAssets";

const fakeImage = () => ({ naturalWidth: 420, naturalHeight: 216 }) as HTMLImageElement;

const fakeCache = (status: "ready" | "loading" = "ready"): ImageAssetCache =>
  ({
    get: () =>
      status === "ready"
        ? { status: "ready" as const, image: fakeImage() }
        : { status: "loading" as const },
  }) as unknown as ImageAssetCache;

const fakeCtx = () =>
  new Proxy(
    {},
    { get: (_t, prop) => (typeof prop === "string" ? vi.fn() : undefined) },
  ) as unknown as CanvasRenderingContext2D;

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
});

describe("drawBug", () => {
  it("does not throw when imageCache is ready", () => {
    expect(() =>
      drawBug(fakeCtx(), { pos: { x: 20, y: 20 }, sizePx: 40, timeMs: 500, id: 5, rotation: 0.4, imageCache: fakeCache() }),
    ).not.toThrow();
  });

  it("does not throw when imageCache is still loading", () => {
    expect(() =>
      drawBug(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 40, timeMs: 0, id: 1, imageCache: fakeCache("loading") }),
    ).not.toThrow();
  });

  it("does not throw when imageCache is omitted", () => {
    expect(() =>
      drawBug(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 40, timeMs: 0, id: 1 }),
    ).not.toThrow();
  });

  it("calls drawImage when image is ready", () => {
    const drawImage = vi.fn();
    const ctx = new Proxy(
      { drawImage },
      { get: (t, prop) => (typeof prop === "string" ? (t[prop as keyof typeof t] ?? vi.fn()) : undefined) },
    ) as unknown as CanvasRenderingContext2D;
    drawBug(ctx, { pos: { x: 10, y: 10 }, sizePx: 80, timeMs: 0, id: 1, rotation: 0, imageCache: fakeCache() });
    expect(drawImage).toHaveBeenCalled();
  });
});
