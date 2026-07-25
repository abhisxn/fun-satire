import { describe, it, expect } from "vitest";
import { bugEatEffect } from "../../src/effects/effectDefs/bugEat";

describe("bugEat effectDef", () => {
  it("is a callable function", () => {
    expect(typeof bugEatEffect).toBe("function");
  });

  it("does not throw when invoked with a mock context", () => {
    const mockCtx = {
      particles: { spawn: () => {} },
      audio: { play: () => {} },
    };
    expect(() => bugEatEffect(mockCtx as any, { x: 0, y: 0 })).not.toThrow();
  });
});
