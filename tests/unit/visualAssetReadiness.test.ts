// tests/unit/visualAssetReadiness.test.ts
import { describe, expect, it, vi } from "vitest";
import { drawSubjectAvatar } from "../../src/render/drawers/drawSubjectAvatar";
import type { ImageAssetCache, ImageAssetEntry } from "../../src/render/imageAssets";

const makeContext = () => {
  const geometry: Array<readonly [string, ...unknown[]]> = [];
  const record = (name: string) => (...args: unknown[]) => geometry.push([name, ...args]);
  const context = {
    save: record("save"),
    restore: record("restore"),
    beginPath: record("beginPath"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    closePath: record("closePath"),
    arc: record("arc"),
    ellipse: record("ellipse"),
    fill: record("fill"),
    translate: record("translate"),
    rotate: record("rotate"),
    drawImage: record("drawImage"),
    clip: record("clip"),
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: "",
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
  return { context, geometry };
};

const makeCache = (entry: ImageAssetEntry): ImageAssetCache => ({
  get: vi.fn(() => entry),
}) as unknown as ImageAssetCache;

const drawWith = (entry: ImageAssetEntry) => {
  const { context, geometry } = makeContext();
  drawSubjectAvatar(context, {
    pos: { x: 100, y: 200 },
    sizePx: 96,
    colors: { suit: "slate", shirt: "cream", outline: "ink" },
    scale: 1,
    rotation: 0,
    assetId: "frame-38",
    imageCache: makeCache(entry),
  });
  return geometry;
};

describe("visual asset readiness", () => {
  it("keeps drawer geometry stable when an image changes from loading to error", () => {
    const loadingGeometry = drawWith({ status: "loading" });
    const errorGeometry = drawWith({ status: "error" });

    expect(errorGeometry).toEqual(loadingGeometry);
    expect(errorGeometry.some(([name]) => name === "drawImage")).toBe(false);
    expect(errorGeometry.some(([name]) => name === "fill")).toBe(true);
  });
});
