// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { drawEye, __resetEyeDrawerCacheForTests } from "../../src/render/drawers/drawEye";
import type { ImageAssetCache } from "../../src/render/imageAssets";

type Path2DCall = { d: string };

function installPath2DMock() {
  const calls: Path2DCall[] = [];
  class MockPath2D {
    readonly d: string;
    constructor(d?: string) {
      this.d = d ?? "";
      calls.push({ d: this.d });
    }
  }
  const ctor = MockPath2D as unknown as typeof Path2D;
  (globalThis as Record<string, unknown>).Path2D = ctor;
  return {
    calls,
    ctor,
    restore() {
      delete (globalThis as Record<string, unknown>).Path2D;
    },
  };
}

const baseColors = {
  sclera: "cream",
  iris: "slate",
  pupil: "ink",
  highlight: "coral" as string | null,
  outline: "ink",
} as const;

function makeCtx() {
  const calls: string[] = [];
  const paths: Path2D[] = [];
  const ctx: Record<string, unknown> = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"),
    closePath: () => calls.push("closePath"),
    bezierCurveTo: () => calls.push("bezierCurveTo"),
    arc: (x: number, y: number, r: number) => {
      calls.push("arc");
      calls.push(`arc(${x.toFixed(2)},${y.toFixed(2)},${r.toFixed(2)})`);
    },
    clip: (p?: Path2D) => {
      if (p) paths.push(p);
      calls.push("clip");
    },
    fill: (p?: Path2D) => {
      if (p) paths.push(p);
      calls.push("fill");
    },
    stroke: () => calls.push("stroke"),
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    lineWidth: 0,
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
  };
  ctx.calls = calls;
  ctx.paths = paths;
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[]; paths: Path2D[] };
}

const loadingCache = {
  get: (_url: string) => ({ status: "loading" as const }),
  hasFailure: () => false,
} as unknown as ImageAssetCache;

const errorCache = {
  get: (_url: string) => ({ status: "error" as const }),
  hasFailure: () => true,
} as unknown as ImageAssetCache;

const KNOWN_SOCKET_PATH = "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z";

describe("render/drawers/drawEye (asset geometry path)", () => {
  let p2d: ReturnType<typeof installPath2DMock>;
  beforeEach(() => {
    p2d = installPath2DMock();
    __resetEyeDrawerCacheForTests();
  });
  afterEach(() => {
    p2d.restore();
    __resetEyeDrawerCacheForTests();
  });

  it("builds a Path2D from the asset's socketPath and clips/fills with it (vector geometry path)", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      assetId: "eye-compact-01",
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 4, y: 0 },
      imageCache: loadingCache,
    });
    expect(p2d.calls.length).toBeGreaterThanOrEqual(1);
    expect(p2d.calls[0]!.d).toBe(KNOWN_SOCKET_PATH);
    expect(ctx.paths.length).toBeGreaterThanOrEqual(2);
    for (const p of ctx.paths) {
      expect(p.d).toBe(KNOWN_SOCKET_PATH);
    }
  });

  it("moves the iris/pupil based on pupilOffset (live gaze, not baked-in position)", () => {
    const callsByOffset: string[][] = [];
    for (const offset of [{ x: -10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 6 }]) {
      const ctx = makeCtx();
      drawEye(ctx, {
        pos: { x: 0, y: 0 },
        sizePx: 56,
        assetId: "eye-compact-01",
        shapeVariant: "almond",
        colors: baseColors,
        blinkScaleY: 1,
        pupilOffset: offset,
        imageCache: loadingCache,
      });
      callsByOffset.push(ctx.calls.filter((c) => c.startsWith("arc(")));
    }
    expect(callsByOffset[0]).not.toEqual(callsByOffset[1]);
    expect(callsByOffset[1]).not.toEqual(callsByOffset[2]);
  });

  it("suppresses iris/pupil rendering below the blink threshold (blinkScaleY ≤ 0.18)", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      assetId: "eye-compact-01",
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 0.1,
      pupilOffset: { x: 4, y: 0 },
      imageCache: loadingCache,
    });
    expect(ctx.calls.filter((c) => c.startsWith("arc(")).length).toBe(0);
  });

  it("balances every save() with a matching restore()", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      assetId: "eye-compact-01",
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 0, y: 0 },
      imageCache: loadingCache,
    });
    const saves = ctx.calls.filter((c) => c === "save").length;
    const restores = ctx.calls.filter((c) => c === "restore").length;
    expect(saves).toBe(restores);
    expect(saves).toBeGreaterThan(0);
  });

  it("falls back to the procedural path when the asset is in an error state on the imageCache", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      assetId: "eye-compact-01",
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 0, y: 0 },
      imageCache: errorCache,
    });
    expect(p2d.calls.length).toBe(0);
    expect(ctx.calls).toContain("bezierCurveTo");
  });

  it("renders successfully while the asset is still loading (loading is not an error)", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      assetId: "eye-compact-01",
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 0, y: 0 },
      imageCache: loadingCache,
    });
    expect(p2d.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.calls.filter((c) => c.startsWith("arc(")).length).toBeGreaterThanOrEqual(2);
  });
});

describe("render/drawers/drawEye (procedural fallback regression)", () => {
  let p2d: ReturnType<typeof installPath2DMock>;
  beforeEach(() => {
    p2d = installPath2DMock();
    __resetEyeDrawerCacheForTests();
  });
  afterEach(() => {
    p2d.restore();
    __resetEyeDrawerCacheForTests();
  });

  it("falls back to the procedural almond path when no assetId is provided", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 0, y: 0 },
    });
    expect(p2d.calls.length).toBe(0);
    expect(ctx.calls).toContain("bezierCurveTo");
    expect(ctx.calls.filter((c) => c === "arc").length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to the procedural path when the assetId has no geometry on its registry entry", () => {
    // eye-compact-04 has a real geometry. To simulate "no geometry", use an unknown assetId
    // that the registry cannot find; the drawer must fall back rather than throw.
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      assetId: "eye-compact-99" as never,
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 0, y: 0 },
      imageCache: loadingCache,
    });
    expect(p2d.calls.length).toBe(0);
    expect(ctx.calls).toContain("bezierCurveTo");
  });

  it("keeps the existing outline + sclera + iris + pupil + highlight flow for an open eye", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 56,
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 4, y: 1 },
    });
    expect(ctx.calls).toContain("save");
    expect(ctx.calls).toContain("restore");
    expect(ctx.calls.filter((c) => c === "fill").length).toBeGreaterThanOrEqual(4);
    expect(ctx.calls).toContain("stroke");
    expect(ctx.calls.filter((c) => c === "arc").length).toBeGreaterThanOrEqual(3);
    expect(p2d.calls.length).toBe(0);
  });

  it("skips iris/pupil when the eye is mostly closed (blinkScaleY ≤ 0.18)", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 56,
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 0.1,
      pupilOffset: { x: 4, y: 1 },
    });
    const arcs = ctx.calls.filter((c) => c === "arc").length;
    expect(arcs).toBe(0);
  });

  it("omits highlight when colors.highlight is null", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 100, y: 200 },
      sizePx: 56,
      shapeVariant: "round",
      colors: { ...baseColors, highlight: null },
      blinkScaleY: 1,
      pupilOffset: { x: 2, y: 2 },
    });
    expect(ctx.calls.filter((c) => c === "arc").length).toBeLessThan(3);
  });

  it("supports all five shapeVariants without throwing", () => {
    for (const v of ["almond", "round", "hooded", "wide", "narrow"] as const) {
      const ctx = makeCtx();
      drawEye(ctx, {
        pos: { x: 0, y: 0 },
        sizePx: 50,
        shapeVariant: v,
        colors: baseColors,
        blinkScaleY: 0.8,
        pupilOffset: { x: 0, y: 0 },
      });
    }
  });

  it("translates pupilOffset toward the cursor before drawing iris/pupil", () => {
    const ctx = makeCtx();
    drawEye(ctx, {
      pos: { x: 0, y: 0 },
      sizePx: 56,
      shapeVariant: "almond",
      colors: baseColors,
      blinkScaleY: 1,
      pupilOffset: { x: 8, y: -3 },
    });
    expect(ctx.calls).toContain("arc");
  });
});
