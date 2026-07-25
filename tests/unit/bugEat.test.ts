import { describe, it, expect, vi } from "vitest";
import { bugEatEffect } from "../../src/effects/effectDefs/bugEat";

describe("bugEat effectDef", () => {
  it("is a callable function", () => {
    expect(typeof bugEatEffect).toBe("function");
  });

  it("spawns a particle at the given position", () => {
    const spawn = vi.fn();
    const ctx = { particles: { spawn }, audio: { play: vi.fn() } };
    bugEatEffect(ctx, { x: 10, y: 20 });
    expect(spawn).toHaveBeenCalledOnce();
    const arg = spawn.mock.calls[0][0];
    expect(arg.x).toBe(10);
    expect(arg.y).toBe(20);
  });

  it("plays the eat sound", () => {
    const play = vi.fn();
    const ctx = { particles: { spawn: vi.fn() }, audio: { play } };
    bugEatEffect(ctx, { x: 0, y: 0 });
    expect(play).toHaveBeenCalledWith("eat");
  });

  it("does not throw when invoked with a mock context", () => {
    const ctx = { particles: { spawn: vi.fn() }, audio: { play: vi.fn() } };
    expect(() => bugEatEffect(ctx, { x: 0, y: 0 })).not.toThrow();
  });
});
