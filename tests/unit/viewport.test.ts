import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
// @vitest-environment happy-dom

import { applyDpr, clampViewportSize, createViewport } from "../../src/render/CanvasUtils";

describe("render/CanvasUtils (T24)", () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    canvas.remove();
    vi.restoreAllMocks();
  });

  it("applyDpr sets canvas.width = floor(cssWidth * dpr)", () => {
    applyDpr(canvas, 800, 600, 2);
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
  });

  it("applyDpr clamps dpr to [1, 3]", () => {
    applyDpr(canvas, 400, 300, 8);
    expect(canvas.width).toBe(1200);
    applyDpr(canvas, 400, 300, 0);
    expect(canvas.width).toBe(400);
  });

  it("applyDpr with non-finite dpr falls back to 1", () => {
    applyDpr(canvas, 500, 400, Number.NaN);
    expect(canvas.width).toBe(500);
  });

  it("applyDpr with zero/negative css dimensions keeps minimum 1px", () => {
    applyDpr(canvas, 0, 0, 2);
    expect(canvas.width).toBe(1);
    expect(canvas.height).toBe(1);
  });

  it("clampViewportSize never returns below 1×1", () => {
    expect(clampViewportSize(-50, 0)).toEqual({ width: 1, height: 1 });
  });

  it("createViewport installs a resize listener and notifies subscribers", () => {
    const seen: Array<{ width: number; height: number }> = [];
    const vp = createViewport(canvas);
    const off = vp.onChange((s) => seen.push({ width: s.width, height: s.height }));
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 768, configurable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    window.dispatchEvent(new Event("resize"));
    expect(seen.length).toBeGreaterThanOrEqual(1);
    expect(seen[0]!.width).toBe(1024);
    off();
    window.dispatchEvent(new Event("resize"));
    expect(seen.length).toBe(1);
  });

  it("createViewport.refresh updates state and reapplies DPR", () => {
    const vp = createViewport(canvas);
    Object.defineProperty(window, "innerWidth", { value: 320, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 480, configurable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: 1.5, configurable: true });
    vp.refresh();
    expect(vp.state.width).toBe(320);
    expect(vp.state.height).toBe(480);
    expect(canvas.width).toBe(480);
  });
});
