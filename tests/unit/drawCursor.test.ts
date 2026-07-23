import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");
function readText(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}
function exists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

describe("custom cursor (T4)", () => {
  it("ships a pure drawCursor module that exports a compute/state function", async () => {
    expect(exists("src/render/drawers/drawCursor.ts")).toBe(true);
    const mod = await import("../../src/render/drawers/drawCursor");
    expect(typeof mod.computeCursorState).toBe("function");
    expect(typeof mod.drawCursor).toBe("function");
  });

  describe("computeCursorState", () => {
    it("returns base circle radius and crosshair opacity when not charging", async () => {
      const { computeCursorState, CURSOR } = await import("../../src/render/drawers/drawCursor");
      const s = computeCursorState({
        x: 100,
        y: 100,
        chargeT: 0,
        hover: false,
        reducedMotion: false,
        timeMs: 0,
      });
      expect(s.x).toBe(100);
      expect(s.y).toBe(100);
      expect(s.ringRadius).toBe(CURSOR.baseRingPx);
      expect(s.crosshairOpacity).toBe(1);
      expect(s.charging).toBe(false);
    });

    it("grows the ring and fades it as chargeT increases", async () => {
      const { computeCursorState, CURSOR } = await import("../../src/render/drawers/drawCursor");
      const samples = [0, 0.2, 0.4, 0.6, 0.8].map((chargeT) =>
        computeCursorState({ x: 0, y: 0, chargeT, hover: true, reducedMotion: false, timeMs: 0 }),
      );
      for (let i = 1; i < samples.length; i++) {
        expect(samples[i].ringRadius).toBeGreaterThan(samples[i - 1].ringRadius);
      }
      expect(samples[samples.length - 1].ringRadius).toBeGreaterThan(CURSOR.baseRingPx + 10);
      expect(samples[0].ringOpacity).toBeGreaterThan(samples[samples.length - 1].ringOpacity);
      expect(samples[samples.length - 1].charging).toBe(true);
    });

    it("clamps ringRadius to the max during over-charge", async () => {
      const { computeCursorState, CURSOR } = await import("../../src/render/drawers/drawCursor");
      const s = computeCursorState({ x: 0, y: 0, chargeT: 2, hover: true, reducedMotion: false, timeMs: 0 });
      expect(s.ringRadius).toBeLessThanOrEqual(CURSOR.maxRingPx + 0.01);
    });

    it("under reduced motion, ringRadius amplitude is damped", async () => {
      const { computeCursorState } = await import("../../src/render/drawers/drawCursor");
      const full = computeCursorState({ x: 0, y: 0, chargeT: 1, hover: true, reducedMotion: false, timeMs: 0 });
      const reduced = computeCursorState({ x: 0, y: 0, chargeT: 1, hover: true, reducedMotion: true, timeMs: 0 });
      expect(reduced.ringRadius).toBeLessThan(full.ringRadius);
    });

    it("when chargeT=0 and reducedMotion=true, ringRadius equals the base", async () => {
      const { computeCursorState, CURSOR } = await import("../../src/render/drawers/drawCursor");
      const s = computeCursorState({ x: 0, y: 0, chargeT: 0, hover: false, reducedMotion: true, timeMs: 0 });
      expect(s.ringRadius).toBeCloseTo(CURSOR.baseRingPx, 1);
    });
  });

  it("drawCursor accepts the state and draws via a CanvasRenderingContext2D", async () => {
    const { drawCursor, computeCursorState } = await import("../../src/render/drawers/drawCursor");
    const calls: string[] = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      beginPath: () => calls.push("beginPath"),
      arc: () => calls.push("arc"),
      moveTo: () => calls.push("moveTo"),
      lineTo: () => calls.push("lineTo"),
      stroke: () => calls.push("stroke"),
      fill: () => calls.push("fill"),
      fillStyle: "",
      strokeStyle: "",
      globalAlpha: 1,
      lineWidth: 0,
      lineCap: "",
    } as unknown as CanvasRenderingContext2D;
    drawCursor(ctx, computeCursorState({ x: 50, y: 75, chargeT: 0.5, hover: true, reducedMotion: false, timeMs: 0 }));
    expect(calls).toContain("save");
    expect(calls).toContain("restore");
    expect(calls).toContain("beginPath");
    expect(calls).toContain("arc");
    expect(calls).toContain("stroke");
    expect(calls.length).toBeGreaterThan(4);
  });

  it("hides the native cursor only over the canvas element", () => {
    const css = readText("src/styles/global.css");
    expect(css).toMatch(/#stage\s*\{[\s\S]*cursor\s*:\s*none/);
    expect(css).toMatch(/@media\s*\(\s*pointer:\s*coarse\s*\)/);
  });

  it("uses only the locked palette colors in drawCursor.ts", () => {
    const text = readText("src/render/drawers/drawCursor.ts");
    expect(text).toMatch(/PALETTE\.coral/);
    expect(text).toMatch(/PALETTE\.ink/);
    const banned = ["#aa3bff", "#646cff", "#ffffff", "#000000", "#000"];
    for (const b of banned) {
      expect(text.toLowerCase()).not.toContain(b);
    }
  });
});
