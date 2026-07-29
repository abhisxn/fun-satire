import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

function readText(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("config tokens (T2)", () => {
  it("records the measured Figma stage and overlay geometry", async () => {
    const { UI_TOKENS } = await import("../../src/config/visualTokens");

    expect(UI_TOKENS.stage.gradient).toEqual({
      center: "#ebe9e0",
      mid: "#cdc0b8",
      outer: "#aa988e",
    });
    expect(UI_TOKENS.control.bar.width).toBe(542);
    expect(UI_TOKENS.control.bar.height).toBe(70);
    expect(UI_TOKENS.control.well).toBe(46);
    expect(UI_TOKENS.control.touchMinimum).toBe(44);
    expect(UI_TOKENS.panel.filter).toEqual({ width: 139, height: 170 });
    expect(UI_TOKENS.panel.gallery.width).toBe(284);
    expect(Object.isFrozen(UI_TOKENS)).toBe(true);
  });

  it("freezes nested UI token objects at runtime", async () => {
    const { UI_TOKENS } = await import("../../src/config/visualTokens");

    expect(Object.isFrozen(UI_TOKENS.control)).toBe(true);
    expect(Object.isFrozen(UI_TOKENS.control.bar)).toBe(true);
    expect(Reflect.set(UI_TOKENS.control.bar, "width", 999)).toBe(false);
    expect(UI_TOKENS.control.bar.width).toBe(542);
  });

  it("exposes a frozen palette that mirrors src/styles/tokens.css", async () => {
    const mod = await import("../../src/config/tokens");
    const { PALETTE, COLOR_HEX } = mod;
    expect(PALETTE.cream).toBe("#EDE7DD");
    expect(PALETTE.slate).toBe("#5B7A8C");
    expect(PALETTE.sage).toBe("#6D7A5E");
    expect(PALETTE.ink).toBe("#2A2420");
    expect(PALETTE.coral).toBe("#E8A9A0");
    expect(Object.isFrozen(PALETTE)).toBe(true);
    expect(COLOR_HEX.cream).toBe(PALETTE.cream);
  });

  it("exposes font, easing, duration, and motion tokens", async () => {
    const mod = await import("../../src/config/tokens");
    expect(mod.FONT.display).toMatch(/Fraunces/);
    expect(mod.FONT.mono).toMatch(/Space Mono/);
    expect(typeof mod.EASE.protest).toBe("string");
    expect(typeof mod.EASE.charge).toBe("string");
    expect(mod.EASE.protest).not.toBe("linear");
    expect(mod.EASE.protest).not.toBe("ease-in-out");
    expect(mod.DURATION.fast).toBe(120);
    expect(mod.DURATION.base).toBe(200);
    expect(mod.DURATION.slow).toBe(360);
  });

  it("throws a descriptive error on an unknown palette key", async () => {
    const mod = await import("../../src/config/tokens");
    expect(() => mod.assertPaletteKey("purple")).toThrowError(/palette/);
  });

});

describe("visual token CSS numeric units", () => {
  it("formats dimensional token paths as px", async () => {
    const { formatNumericToken } = await import("../../scripts/generate-visual-tokens.mjs");
    expect(formatNumericToken("control.bar.width", 542)).toBe("542px");
  });

  it("formats duration token paths as ms", async () => {
    const { formatNumericToken } = await import("../../scripts/generate-visual-tokens.mjs");
    expect(formatNumericToken("motion.duration.fast", 120)).toBe("120ms");
  });

  it("formats scale and z-index token paths as unitless", async () => {
    const { formatNumericToken } = await import("../../scripts/generate-visual-tokens.mjs");
    expect(formatNumericToken("scene.densityScale.mobile", 0.74)).toBe("0.74");
    expect(formatNumericToken("overlay.zIndex.hud", 60)).toBe("60");
  });

  it("rejects numeric paths without explicit unit metadata", async () => {
    const { formatNumericToken } = await import("../../scripts/generate-visual-tokens.mjs");
    expect(() => formatNumericToken("unknown.size", 12)).toThrowError(
      'No numeric unit metadata for "unknown.size"',
    );
  });
});
