import { describe, expect, it } from "vitest";
import { SUBJECT_BEHAVIOR, SubjectBehavior } from "../../src/entities/behaviors/SubjectBehavior";

describe("entities/behaviors/SubjectBehavior", () => {
  it("exports SUBJECT_BEHAVIOR with offsetX: 0, offsetY: -40", () => {
    expect(SUBJECT_BEHAVIOR.offsetX).toBe(0);
    expect(SUBJECT_BEHAVIOR.offsetY).toBe(-40);
  });

  it("homeFor returns cursor position offset by SUBJECT_BEHAVIOR.offsetX/offsetY", () => {
    const b = new SubjectBehavior({ x: 100, y: 100 });
    const cursor = { x: 200, y: 300 };
    expect(b.homeFor(cursor)).toEqual({
      x: cursor.x + SUBJECT_BEHAVIOR.offsetX,
      y: cursor.y + SUBJECT_BEHAVIOR.offsetY,
    });
  });

  it("eases position toward the cursor-derived home over time rather than snapping", () => {
    const b = new SubjectBehavior({ x: 0, y: 0 });
    const cursor = { x: 400, y: 400 };
    const home = b.homeFor(cursor);
    const distBefore = Math.hypot(home.x - b.pos.x, home.y - b.pos.y);

    b.update(cursor, 1 / 60);
    const distAfterOneStep = Math.hypot(home.x - b.pos.x, home.y - b.pos.y);

    // Should have moved closer, but not have arrived instantly (no snapping).
    expect(distAfterOneStep).toBeLessThan(distBefore);
    expect(distAfterOneStep).toBeGreaterThan(0.01);
  });

  it("converges toward the cursor-derived home point over many steps", () => {
    const b = new SubjectBehavior({ x: 0, y: 0 });
    const cursor = { x: 400, y: 400 };
    for (let i = 0; i < 600; i++) {
      b.update(cursor, 1 / 60);
    }
    const home = b.homeFor(cursor);
    expect(b.pos.x).toBeCloseTo(home.x, 0);
    expect(b.pos.y).toBeCloseTo(home.y, 0);
  });

  it("re-targets when the cursor moves (home is dynamic, not fixed at construction)", () => {
    const b = new SubjectBehavior({ x: 0, y: 0 });
    for (let i = 0; i < 300; i++) {
      b.update({ x: 100, y: 100 }, 1 / 60);
    }
    const firstHome = b.homeFor({ x: 100, y: 100 });
    expect(b.pos.x).toBeCloseTo(firstHome.x, 0);

    for (let i = 0; i < 300; i++) {
      b.update({ x: 900, y: 900 }, 1 / 60);
    }
    const secondHome = b.homeFor({ x: 900, y: 900 });
    expect(b.pos.x).toBeCloseTo(secondHome.x, 0);
    expect(b.pos.y).toBeCloseTo(secondHome.y, 0);
  });
});
