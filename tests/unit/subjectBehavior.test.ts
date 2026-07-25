import { describe, expect, it } from "vitest";
import {
  SUBJECT_BEHAVIOR,
  homeFor,
  stepSubjectPhysics,
} from "../../src/entities/behaviors/SubjectBehavior";
import type { Vec2 } from "../../src/entities/Entity";

function makePhysics(pos: Vec2): { pos: Vec2; vel: Vec2; home: Vec2 } {
  return { pos, vel: { x: 0, y: 0 }, home: { x: 0, y: 0 } };
}

describe("entities/behaviors/SubjectBehavior", () => {
  it("exports SUBJECT_BEHAVIOR with offsetX: 0, offsetY: -40", () => {
    expect(SUBJECT_BEHAVIOR.offsetX).toBe(0);
    expect(SUBJECT_BEHAVIOR.offsetY).toBe(-40);
  });

  it("homeFor returns cursor position offset by SUBJECT_BEHAVIOR.offsetX/offsetY", () => {
    const cursor = { x: 200, y: 300 };
    expect(homeFor(cursor)).toEqual({
      x: cursor.x + SUBJECT_BEHAVIOR.offsetX,
      y: cursor.y + SUBJECT_BEHAVIOR.offsetY,
    });
  });

  it("eases position toward the cursor-derived home over time rather than snapping", () => {
    const physics = makePhysics({ x: 0, y: 0 });
    const cursor = { x: 400, y: 400 };
    const home = homeFor(cursor);
    const distBefore = Math.hypot(home.x - physics.pos.x, home.y - physics.pos.y);

    stepSubjectPhysics(physics, cursor, 1 / 60);
    const distAfterOneStep = Math.hypot(home.x - physics.pos.x, home.y - physics.pos.y);

    // Should have moved closer, but not have arrived instantly (no snapping).
    expect(distAfterOneStep).toBeLessThan(distBefore);
    expect(distAfterOneStep).toBeGreaterThan(0.01);
  });

  it("converges toward the cursor-derived home point over many steps", () => {
    const physics = makePhysics({ x: 0, y: 0 });
    const cursor = { x: 400, y: 400 };
    for (let i = 0; i < 600; i++) {
      stepSubjectPhysics(physics, cursor, 1 / 60);
    }
    const home = homeFor(cursor);
    expect(physics.pos.x).toBeCloseTo(home.x, 0);
    expect(physics.pos.y).toBeCloseTo(home.y, 0);
  });

  it("re-targets when the cursor moves (home is dynamic, not fixed at first call)", () => {
    const physics = makePhysics({ x: 0, y: 0 });
    for (let i = 0; i < 300; i++) {
      stepSubjectPhysics(physics, { x: 100, y: 100 }, 1 / 60);
    }
    const firstHome = homeFor({ x: 100, y: 100 });
    expect(physics.pos.x).toBeCloseTo(firstHome.x, 0);

    for (let i = 0; i < 300; i++) {
      stepSubjectPhysics(physics, { x: 900, y: 900 }, 1 / 60);
    }
    const secondHome = homeFor({ x: 900, y: 900 });
    expect(physics.pos.x).toBeCloseTo(secondHome.x, 0);
    expect(physics.pos.y).toBeCloseTo(secondHome.y, 0);
  });

  it("sets physics.home to the cursor-derived home point", () => {
    const physics = makePhysics({ x: 0, y: 0 });
    const cursor = { x: 50, y: 60 };
    stepSubjectPhysics(physics, cursor, 1 / 60);
    expect(physics.home).toEqual(homeFor(cursor));
  });
});
