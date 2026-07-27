// tests/unit/drawSubjectAvatar.test.ts
import { describe, expect, it, vi } from "vitest";
import { drawSubjectAvatar } from "../../src/render/drawers/drawSubjectAvatar";
import type { ImageAssetCache, ImageAssetEntry } from "../../src/render/imageAssets";

const baseColors = { suit: "slate" as const, shirt: "cream" as const, outline: "ink" as const };

const makeCtx = () => {
  const calls: string[] = [];
  const ctx: Record<string, unknown> = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    closePath: () => calls.push("closePath"),
    arc: () => calls.push("arc"),
    ellipse: () => calls.push("ellipse"),
    fill: () => calls.push("fill"),
    translate: () => calls.push("translate"),
    rotate: () => calls.push("rotate"),
    drawImage: (..._args: unknown[]) => calls.push("drawImage"),
    clip: () => calls.push("clip"),
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: "",
    fillStyle: "",
  };
  ctx.calls = calls;
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
};

const makeFakeCache = (entry: ImageAssetEntry): ImageAssetCache => {
  return {
    get: (_url: string): ImageAssetEntry => entry,
    preload: (_urls: readonly string[]): void => {},
  } as unknown as ImageAssetCache;
};

const fakeImage = {} as HTMLImageElement;

describe("drawSubjectAvatar", () => {
  it("does not call ctx.drawImage while the image asset is still loading", () => {
    const ctx = makeCtx();
    const cache = makeFakeCache({ status: "loading" });
    drawSubjectAvatar(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 96,
      colors: baseColors,
      scale: 1,
      rotation: 0,
      assetId: "sticker-1",
      imageCache: cache,
    });
    expect(ctx.calls).not.toContain("drawImage");
    expect(ctx.calls.filter((c) => c === "arc" || c === "ellipse").length).toBeGreaterThan(0);
  });

  it("calls ctx.drawImage with the loaded image once the asset is ready", () => {
    const ctx = makeCtx();
    const drawImageSpy = vi.spyOn(ctx, "drawImage" as never);
    const cache = makeFakeCache({ status: "ready", image: fakeImage });
    drawSubjectAvatar(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 96,
      colors: baseColors,
      scale: 1,
      rotation: 0,
      assetId: "sticker-1",
      imageCache: cache,
    });
    expect(drawImageSpy).toHaveBeenCalledTimes(1);
    const callArgs = drawImageSpy.mock.calls[0]!;
    expect(callArgs[0]).toBe(fakeImage);
  });

  it("draws nothing for an unknown assetId", () => {
    const ctx = makeCtx();
    const cache = makeFakeCache({ status: "ready", image: fakeImage });
    drawSubjectAvatar(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 96,
      colors: baseColors,
      scale: 1,
      rotation: 0,
      assetId: "does-not-exist",
      imageCache: cache,
    });
    expect(ctx.calls).not.toContain("drawImage");
  });
});
