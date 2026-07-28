import { describe, it, expect, vi } from "vitest";
import { drawPointedFinger, computePointShake, FINGER_DRAW } from "../../src/render/drawers/drawPointedFinger";
import type { ImageAssetCache } from "../../src/render/imageAssets";

const fakeImage = () => ({ naturalWidth: 405, naturalHeight: 171 }) as HTMLImageElement;

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
});

describe("drawPointedFinger", () => {
  it("does not throw when imageCache is ready", () => {
    expect(() =>
      drawPointedFinger(fakeCtx(), { pos: { x: 5, y: 5 }, sizePx: 44, timeMs: 300, id: 9, rotation: -0.5, imageCache: fakeCache() }),
    ).not.toThrow();
  });

  it("does not throw when imageCache is still loading", () => {
    expect(() =>
      drawPointedFinger(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 44, timeMs: 0, id: 1, imageCache: fakeCache("loading") }),
    ).not.toThrow();
  });

  it("does not throw when imageCache is omitted", () => {
    expect(() =>
      drawPointedFinger(fakeCtx(), { pos: { x: 0, y: 0 }, sizePx: 44, timeMs: 0, id: 1 }),
    ).not.toThrow();
  });

  it("calls drawImage when image is ready", () => {
    const drawImage = vi.fn();
    const ctx = new Proxy(
      { drawImage },
      { get: (t, prop) => (typeof prop === "string" ? (t[prop as keyof typeof t] ?? vi.fn()) : undefined) },
    ) as unknown as CanvasRenderingContext2D;
    drawPointedFinger(ctx, { pos: { x: 5, y: 5 }, sizePx: 44, timeMs: 300, id: 9, rotation: 0, imageCache: fakeCache() });
    expect(drawImage).toHaveBeenCalled();
  });
});
