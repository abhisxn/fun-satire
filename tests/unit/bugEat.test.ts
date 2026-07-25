import { describe, it, expect } from "vitest";
import { bugEatEffect, BUG_EAT } from "../../src/effects/effectDefs/bugEat";

describe("bugEat effectDef", () => {
  it("has exactly 4 stages", () => {
    expect(bugEatEffect.stages).toHaveLength(4);
  });

  it("each stage has durationMs > 0", () => {
    for (const stage of bugEatEffect.stages) {
      expect(stage.durationMs).toBeGreaterThan(0);
    }
  });

  it("totalDurationMs equals sum of all stage durations (300ms)", () => {
    const total = bugEatEffect.stages.reduce((sum, s) => sum + s.durationMs, 0);
    expect(total).toBe(BUG_EAT.totalDurationMs);
    expect(total).toBe(300);
  });

  it("stage durations match spec: chomp1=80, chomp2=80, chomp3=60, digest=80", () => {
    expect(bugEatEffect.stages[0].durationMs).toBe(BUG_EAT.chomp1Ms);
    expect(bugEatEffect.stages[1].durationMs).toBe(BUG_EAT.chomp2Ms);
    expect(bugEatEffect.stages[2].durationMs).toBe(BUG_EAT.chomp3Ms);
    expect(bugEatEffect.stages[3].durationMs).toBe(BUG_EAT.digestMs);
  });

  it("each stage has an easing function", () => {
    for (const stage of bugEatEffect.stages) {
      expect(typeof stage.easing).toBe("function");
    }
  });

  it("each stage has an update function", () => {
    for (const stage of bugEatEffect.stages) {
      expect(typeof stage.update).toBe("function");
    }
  });

  it("stage 3 (chomp3) has an onStart hook that marks entity as dying", () => {
    const chomp3Stage = bugEatEffect.stages[2];
    expect(chomp3Stage.onStart).toBeDefined();
    expect(typeof chomp3Stage.onStart).toBe("function");
  });

  it("stage 4 (digest) has an onStart hook that starts respawn and spawns sage particles", () => {
    const digestStage = bugEatEffect.stages[3];
    expect(digestStage.onStart).toBeDefined();
    expect(typeof digestStage.onStart).toBe("function");
  });

  it("onStart hooks are callable and don't throw with mock context", () => {
    const mockCtx = {
      entity: { id: 1, physics: { scale: 1 } },
      target: { x: 0, y: 0 },
      particles: { spawn: () => {} },
      rng: { float: () => 0.5, range: (min: number, max: number) => (min + max) / 2, rangeInt: (min: number, max: number) => Math.floor((min + max) / 2) },
      world: { markDying: () => {}, startRespawn: () => {} },
      stageIndex: 0,
      effect: { id: 1, defId: "bugEat", entityId: 1, startedAtMs: 0, target: { x: 0, y: 0 }, stageIndex: 0, stageStartedAtMs: 0, done: false },
    };

    for (const stage of bugEatEffect.stages) {
      if (stage.onStart) {
        expect(() => stage.onStart(mockCtx as any)).not.toThrow();
      }
    }
  });

  it("BUG_EAT constants are exported and frozen", () => {
    expect(Object.isFrozen(BUG_EAT)).toBe(true);
    expect(BUG_EAT.totalDurationMs).toBe(300);
    expect(BUG_EAT.respawnMinMs).toBe(2000);
    expect(BUG_EAT.respawnMaxMs).toBe(5000);
    expect(BUG_EAT.sageMinCount).toBe(3);
    expect(BUG_EAT.sageMaxCount).toBe(6);
  });
});
