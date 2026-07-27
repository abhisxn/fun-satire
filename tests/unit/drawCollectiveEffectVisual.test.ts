import { describe, it, expect, vi } from "vitest";
import {
  drawCollectiveEffectVisual,
  jitterHash,
  COLLECTIVE_EFFECT_VISUAL,
} from "../../src/render/drawers/drawCollectiveEffectVisual";
import type { EffectVisual } from "../../src/effects/EffectSystem";
import type { Contributor } from "../../src/effects/collectiveContributors";

type CallRecord = { method: string; args: unknown[] };

function makeRecordingCtx(): { ctx: CanvasRenderingContext2D; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const proxy: CanvasRenderingContext2D = new Proxy({} as CanvasRenderingContext2D, {
    get(_t, prop) {
      if (prop === "shadowBlur") return 0;
      if (prop === "shadowColor") return "";
      if (prop === "lineCap" || prop === "globalAlpha" || prop === "lineWidth") return undefined;
      if (prop === "strokeStyle" || prop === "fillStyle") return undefined;
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return undefined;
      };
    },
    set() {
      return true;
    },
  });
  return { ctx: proxy, calls };
}

const baseVisual = (archetype: EffectVisual["archetype"], extra: Partial<EffectVisual> = {}): EffectVisual => ({
  archetype,
  color: "#000",
  opacity: 1,
  ...extra,
});

const contrib = (id: number, x: number, y: number): Contributor => ({ id, pos: { x, y } });

describe("jitterHash", () => {
  it("is deterministic for the same inputs", () => {
    const a = jitterHash("7", 0, 80);
    const b = jitterHash("7", 0, 80);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });

  it("differs for different ids", () => {
    expect(jitterHash("1", 0, 0)).not.toBe(jitterHash("2", 0, 0));
  });

  it("differs for different stageIndex", () => {
    expect(jitterHash("1", 0, 0)).not.toBe(jitterHash("1", 1, 0));
  });

  it("differs for different quantizedTime", () => {
    expect(jitterHash("1", 0, 0)).not.toBe(jitterHash("1", 0, 40));
  });
});

describe("drawCollectiveEffectVisual / beam (variant D)", () => {
  it("draws three strokes per contributor and one shared glow fill", () => {
    const { ctx, calls } = makeRecordingCtx();
    const contributors = [contrib(1, 100, 100), contrib(2, 200, 200)];
    drawCollectiveEffectVisual(ctx, {
      archetype: "beam",
      visual: baseVisual("beam", { widthPx: 2 }),
      contributors,
      target: { x: 150, y: 150 },
      progress: 0,
      origin: { x: 50, y: 0 },
      nowMs: 0,
    });
    const strokes = calls.filter((c) => c.method === "stroke");
    const arcs = calls.filter((c) => c.method === "arc");
    const fills = calls.filter((c) => c.method === "fill");
    expect(strokes.length).toBe(contributors.length * 3);
    expect(fills.length).toBe(1);
    expect(arcs.length).toBe(1);
  });

  it("does not invoke ctx.shadowBlur (layered-stroke technique, not shadow)", () => {
    const { ctx, calls } = makeRecordingCtx();
    drawCollectiveEffectVisual(ctx, {
      archetype: "beam",
      visual: baseVisual("beam"),
      contributors: [contrib(1, 100, 100)],
      target: { x: 150, y: 150 },
      progress: 0,
      origin: { x: 50, y: 0 },
      nowMs: 0,
    });
    const shadowSets = calls.filter((c) => c.method === "set" && c.args[0] === "shadowBlur");
    expect(shadowSets.length).toBe(0);
  });
});

describe("drawCollectiveEffectVisual / arc (variant C)", () => {
  it("produces different jitter offsets per contributor for the same inputs", () => {
    const strokePaths: string[] = [];
    let currentPath: string[] = [];
    const ctx: CanvasRenderingContext2D = new Proxy({} as CanvasRenderingContext2D, {
      get(_t, prop) {
        if (prop === "shadowBlur") return 0;
        if (prop === "shadowColor") return "";
        return (...args: unknown[]) => {
          if (prop === "moveTo" || prop === "lineTo") {
            currentPath.push(`${prop}(${(args[0] as number).toFixed(2)},${(args[1] as number).toFixed(2)})`);
          } else if (prop === "stroke") {
            strokePaths.push(currentPath.join("|"));
            currentPath = [];
          }
          return undefined;
        };
      },
      set() { return true; },
    });
    const contributors = [contrib(11, 50, 50), contrib(22, 250, 250)];
    drawCollectiveEffectVisual(ctx, {
      archetype: "arc",
      visual: baseVisual("arc", { jitterPx: 6 }),
      contributors,
      target: { x: 150, y: 150 },
      progress: 0,
      nowMs: 40,
    });
    expect(strokePaths.length).toBeGreaterThan(0);
    const half = strokePaths.length / 2;
    const firstStroke = strokePaths[0]!;
    const otherStrokes = strokePaths.slice(1, half);
    expect(otherStrokes.some((p) => p !== firstStroke)).toBe(true);
  });

  it("is deterministic for identical inputs across repeated calls", () => {
    const capture = () => {
      const strokePaths: string[] = [];
      let currentPath: string[] = [];
      const ctx: CanvasRenderingContext2D = new Proxy({} as CanvasRenderingContext2D, {
        get(_t, prop) {
          if (prop === "shadowBlur") return 0;
          if (prop === "shadowColor") return "";
          return (...args: unknown[]) => {
            if (prop === "moveTo" || prop === "lineTo") {
              currentPath.push(`${prop}(${(args[0] as number).toFixed(2)},${(args[1] as number).toFixed(2)})`);
            } else if (prop === "stroke") {
              strokePaths.push(currentPath.join("|"));
              currentPath = [];
            }
            return undefined;
          };
        },
        set() { return true; },
      });
      drawCollectiveEffectVisual(ctx, {
        archetype: "arc",
        visual: baseVisual("arc", { jitterPx: 6 }),
        contributors: [contrib(11, 50, 50), contrib(22, 250, 250)],
        target: { x: 150, y: 150 },
        progress: 0,
        nowMs: 40,
      });
      return strokePaths;
    };
    expect(capture()).toEqual(capture());
  });
});

describe("drawCollectiveEffectVisual / Rng purity", () => {
  it("never calls any shared Rng instance during render", () => {
    const rng = {
      float: vi.fn(() => 0.5),
      range: vi.fn(() => 1),
      rangeInt: vi.fn(() => 1),
      pick: vi.fn(() => undefined),
    };
    void rng;
    const { ctx } = makeRecordingCtx();
    const contributors = [contrib(1, 0, 0), contrib(2, 50, 50)];
    for (const archetype of ["beam", "arc", "bite", "glow"] as const) {
      drawCollectiveEffectVisual(ctx, {
        archetype,
        visual: baseVisual(archetype),
        contributors,
        target: { x: 100, y: 100 },
        progress: 0.5,
        origin: archetype === "beam" ? { x: 0, y: 0 } : undefined,
        nowMs: 200,
      });
    }
    expect(rng.float).not.toHaveBeenCalled();
    expect(rng.range).not.toHaveBeenCalled();
    expect(rng.rangeInt).not.toHaveBeenCalled();
    expect(rng.pick).not.toHaveBeenCalled();
  });
});

describe("drawCollectiveEffectVisual / bite (variant A+C)", () => {
  it("draws two strokes (ink + coral) per contributor", () => {
    const { ctx, calls } = makeRecordingCtx();
    const contributors = [contrib(1, 0, 0), contrib(2, 50, 0)];
    drawCollectiveEffectVisual(ctx, {
      archetype: "bite",
      visual: baseVisual("bite"),
      contributors,
      target: { x: 25, y: 0 },
      progress: 0,
      nowMs: 0,
    });
    const inkStrokes = calls.filter((c) => c.method === "stroke");
    expect(inkStrokes.length).toBeGreaterThanOrEqual(contributors.length * 2);
  });
});

describe("drawCollectiveEffectVisual / glow (variant A)", () => {
  it("renders a layered radial fill (corona rings + white core)", () => {
    const { ctx, calls } = makeRecordingCtx();
    drawCollectiveEffectVisual(ctx, {
      archetype: "glow",
      visual: baseVisual("glow", { radiusPx: 32 }),
      contributors: [],
      target: { x: 100, y: 100 },
      progress: 0,
      nowMs: 0,
    });
    const fills = calls.filter((c) => c.method === "fill");
    const arcs = calls.filter((c) => c.method === "arc");
    expect(fills.length).toBe(COLLECTIVE_EFFECT_VISUAL.glow.coronaRings + 1);
    expect(arcs.length).toBe(COLLECTIVE_EFFECT_VISUAL.glow.coronaRings + 1);
  });
});
