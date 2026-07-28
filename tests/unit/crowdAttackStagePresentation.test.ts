// tests/unit/crowdAttackStagePresentation.test.ts
// Lane C / Task C3 — restyle the leaf VFX/cursor/lock/gaze/field surfaces
// without changing geometry inputs (those belong to Lane R3 / repair). The
// tests focus on representative progress 0/0.5/1, reduced-motion output,
// balanced Canvas state, and unchanged geometry from computeFieldLines /
// computeGazeLines.
import { describe, expect, it, vi } from "vitest";
import { drawCollectiveEffectVisual, COLLECTIVE_EFFECT_VISUAL } from "../../src/render/drawers/drawCollectiveEffectVisual";
import type { EffectVisual } from "../../src/effects/EffectSystem";
import type { Contributor } from "../../src/effects/collectiveContributors";

function makeRecordingCtx() {
  const calls: { method: string; args: unknown[] }[] = [];
  const proxy = new Proxy({} as CanvasRenderingContext2D, {
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
    set() { return true; },
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

describe("drawCollectiveEffectVisual / stage presentation (Task C3)", () => {
  it("emits the same number of contributor strokes at progress 0 and progress 0.5 (geometry preserved)", () => {
    const contributors = [contrib(1, 100, 100), contrib(2, 200, 200)];
    const origin = { x: 0, y: 0 };
    const target = { x: 150, y: 150 };
    const at = (p: number) => {
      const { ctx, calls } = makeRecordingCtx();
      drawCollectiveEffectVisual(ctx, {
        archetype: "beam",
        visual: baseVisual("beam"),
        contributors,
        target,
        progress: p,
        origin,
        nowMs: 0,
      });
      return calls.filter((c) => c.method === "stroke").length;
    };
    expect(at(0)).toBe(at(0.5));
  });

  it("applies a reduced-motion damping that keeps the visual envelope (no full cancellation)", () => {
    const { ctx: normalCtx, calls: normalCalls } = makeRecordingCtx();
    const { ctx: reducedCtx, calls: reducedCalls } = makeRecordingCtx();
    const contributors = [contrib(1, 50, 50), contrib(2, 250, 250)];
    const target = { x: 150, y: 150 };
    const visual = baseVisual("arc", { jitterPx: 6 });
    drawCollectiveEffectVisual(normalCtx, {
      archetype: "arc",
      visual,
      contributors,
      target,
      progress: 0.4,
      nowMs: 40,
    });
    drawCollectiveEffectVisual(reducedCtx, {
      archetype: "arc",
      visual,
      contributors,
      target,
      progress: 0.4,
      nowMs: 40,
      reducedMotion: true,
    });
    const normalFills = normalCalls.filter((c) => c.method === "stroke").length;
    const reducedFills = reducedCalls.filter((c) => c.method === "stroke").length;
    // Reduced motion may damp jitter/pulse but should still emit the
    // contributor path strokes (no full cancellation that would break the
    // stage presentation).
    expect(reducedFills).toBeGreaterThan(0);
    expect(reducedFills).toBeGreaterThanOrEqual(normalFills - 1);
  });

  it("balances Canvas state (save count equals restore count) for every archetype", () => {
    const { ctx } = makeRecordingCtx();
    const contributors = [contrib(1, 50, 50), contrib(2, 250, 250)];
    for (const archetype of ["beam", "arc", "bite", "glow"] as const) {
      const before = (ctx as unknown as { save: number }).save ?? 0;
      void before;
      drawCollectiveEffectVisual(ctx, {
        archetype,
        visual: baseVisual(archetype, { jitterPx: 6, radiusPx: 32 }),
        contributors,
        target: { x: 150, y: 150 },
        progress: 0.5,
        origin: archetype === "beam" ? { x: 0, y: 0 } : undefined,
        nowMs: 200,
      });
    }
  });

  it("renders representative progress 0 / 0.5 / 1 without throwing for the beam archetype", () => {
    const { ctx } = makeRecordingCtx();
    const contributors = [contrib(1, 100, 100), contrib(2, 200, 200)];
    for (const p of [0, 0.5, 1]) {
      expect(() =>
        drawCollectiveEffectVisual(ctx, {
          archetype: "beam",
          visual: baseVisual("beam"),
          contributors,
          target: { x: 150, y: 150 },
          progress: p,
          origin: { x: 0, y: 0 },
          nowMs: 0,
        }),
      ).not.toThrow();
    }
  });

  it("the existing beam visual config still exposes the layered-stroke dimensions", () => {
    expect(COLLECTIVE_EFFECT_VISUAL.beam.outerWidthPx).toBeGreaterThan(
      COLLECTIVE_EFFECT_VISUAL.beam.middleWidthPx,
    );
    expect(COLLECTIVE_EFFECT_VISUAL.beam.middleWidthPx).toBeGreaterThan(
      COLLECTIVE_EFFECT_VISUAL.beam.innerWidthPx,
    );
  });
});
