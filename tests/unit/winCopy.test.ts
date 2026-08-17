import { describe, it, expect } from "vitest";
import { WIN_COPY_VARIANTS, pickWinCopy } from "../../src/hud/winCopy";

describe("hud/winCopy", () => {
  it("has 8 variants, each with non-empty title and copy", () => {
    expect(WIN_COPY_VARIANTS.length).toBe(8);
    for (const variant of WIN_COPY_VARIANTS) {
      expect(variant.title.length).toBeGreaterThan(0);
      expect(variant.copy.length).toBeGreaterThan(0);
    }
  });

  it("picks the first variant when rng returns 0", () => {
    const picked = pickWinCopy(() => 0);
    expect(picked).toBe(WIN_COPY_VARIANTS[0]);
  });

  it("picks the last variant when rng returns just under 1", () => {
    const picked = pickWinCopy(() => 0.9999999);
    expect(picked).toBe(WIN_COPY_VARIANTS[WIN_COPY_VARIANTS.length - 1]);
  });

  it("defaults to Math.random when no rng is passed", () => {
    const picked = pickWinCopy();
    expect(WIN_COPY_VARIANTS).toContain(picked);
  });
});
