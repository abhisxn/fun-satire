// tests/unit/barrels.test.ts
import { describe, expect, it } from "vitest";
import { stepSubjectPhysics, isWithinBurnAssistRange } from "../../src/entities/behaviors";
import { drawSubject, computeGazeLines } from "../../src/render/drawers";

describe("barrel exports include Subject rig (T34)", () => {
  it("entities/behaviors exports stepSubjectPhysics and isWithinBurnAssistRange", () => {
    expect(typeof stepSubjectPhysics).toBe("function");
    expect(typeof isWithinBurnAssistRange).toBe("function");
  });

  it("render/drawers exports drawSubject and computeGazeLines", () => {
    expect(typeof drawSubject).toBe("function");
    expect(typeof computeGazeLines).toBe("function");
  });
});
