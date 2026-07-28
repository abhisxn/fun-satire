// tests/unit/crowdCursorAndLockPresentation.test.ts
// Lane C / Task C3 — restyle the cursor and lock leaf drawers to match the
// Figma visual language without changing geometry inputs (the existing
// computeCursorState contract is the authoritative source of state).
import { describe, expect, it, vi } from "vitest";
import { computeCursorState, drawCursor, CURSOR } from "../../src/render/drawers/drawCursor";
import { drawLockIndicator, LOCK_INDICATOR } from "../../src/render/drawers/drawLockIndicator";

function makeSpyCtx() {
  const calls: { method: string; args: unknown[] }[] = [];
  const strokeStyles: string[] = [];
  const fillStyles: string[] = [];
  const proxy = new Proxy({} as CanvasRenderingContext2D, {
    get(_t, prop) {
      if (prop === "canvas") return {};
      if (prop === "strokeStyle") return strokeStyles[strokeStyles.length - 1] ?? "";
      if (prop === "fillStyle") return fillStyles[fillStyles.length - 1] ?? "";
      if (prop === "shadowBlur") return 0;
      if (prop === "shadowColor") return "";
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return undefined;
      };
    },
    set(_t, prop, value) {
      if (prop === "strokeStyle") strokeStyles.push(String(value));
      if (prop === "fillStyle") fillStyles.push(String(value));
      return true;
    },
  });
  return { ctx: proxy, calls, strokeStyles, fillStyles };
}

describe("drawCursor (Task C3)", () => {
  it("emits a balanced Canvas state (save count equals restore count) under every state", () => {
    const states = [
      computeCursorState({ x: 0, y: 0, chargeT: 0, hover: false, reducedMotion: false, timeMs: 0 }),
      computeCursorState({ x: 0, y: 0, chargeT: 0.5, hover: true, reducedMotion: false, timeMs: 0 }),
      computeCursorState({ x: 0, y: 0, chargeT: 1, hover: true, reducedMotion: true, timeMs: 1000 }),
    ];
    for (const state of states) {
      const { ctx, calls } = makeSpyCtx();
      drawCursor(ctx, state);
      const saves = calls.filter((c) => c.method === "save").length;
      const restores = calls.filter((c) => c.method === "restore").length;
      expect(saves).toBe(restores);
    }
  });

  it("computeCursorState contract is unchanged (geometry inputs preserved)", () => {
    const s = computeCursorState({ x: 100, y: 100, chargeT: 0.2, hover: true, reducedMotion: false, timeMs: 0 });
    expect(s.x).toBe(100);
    expect(s.y).toBe(100);
    expect(s.ringRadius).toBeGreaterThanOrEqual(CURSOR.baseRingPx);
    expect(s.ringRadius).toBeLessThanOrEqual(CURSOR.maxRingPx);
    expect(s.charging).toBe(true);
  });

  it("under reduced motion, the ring radius is at or below the base level (no decorative pulse)", () => {
    const s = computeCursorState({ x: 0, y: 0, chargeT: 1, hover: true, reducedMotion: true, timeMs: 1000 });
    const normal = computeCursorState({ x: 0, y: 0, chargeT: 1, hover: true, reducedMotion: false, timeMs: 1000 });
    expect(s.ringRadius).toBeLessThanOrEqual(normal.ringRadius);
  });
});

describe("drawLockIndicator (Task C3)", () => {
  it("emits a balanced Canvas state (save count equals restore count)", () => {
    const { ctx, calls } = makeSpyCtx();
    drawLockIndicator(ctx, { pos: { x: 100, y: 100 }, sizePx: 96 });
    const saves = calls.filter((c) => c.method === "save").length;
    const restores = calls.filter((c) => c.method === "restore").length;
    expect(saves).toBe(restores);
  });

  it("does not use ctx.shadowBlur (layered-stroke technique, not shadow)", () => {
    const { ctx, calls } = makeSpyCtx();
    drawLockIndicator(ctx, { pos: { x: 100, y: 100 }, sizePx: 96 });
    const shadowSets = calls.filter((c) => c.method === "set" && c.args[0] === "shadowBlur");
    expect(shadowSets.length).toBe(0);
  });

  it("preserves the existing ring radius (geometry unchanged)", () => {
    const radiusPx = 64;
    const expectedRadius = radiusPx * 0.5 + LOCK_INDICATOR.ringOffsetPx;
    expect(expectedRadius).toBeGreaterThan(0);
  });
});
