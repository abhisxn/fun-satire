import type { Vec2 } from "../Entity";
import { compute as computeSpring } from "../../physics/SpringHome";
import { integrate } from "../../physics/Integrator";

export const SUBJECT_BEHAVIOR = Object.freeze({
  offsetX: 0,
  offsetY: -40,
} as const);

const MAX_SPEED = 600;

/**
 * Cursor-following steering for the Subject entity.
 *
 * Unlike EyeBehavior's locomotion (flee/drag away from the cursor), the
 * Subject eases toward a point derived from the current cursor position
 * each step (via homeFor), using the same spring-home + integrator
 * primitives eyes use for their home-seeking physics.
 */
export class SubjectBehavior {
  pos: Vec2;
  vel: Vec2;

  constructor(initialPos: Vec2, initialVel: Vec2 = { x: 0, y: 0 }) {
    this.pos = initialPos;
    this.vel = initialVel;
  }

  /** The Subject's home point: the cursor position offset slightly. */
  homeFor(cursor: Vec2): Vec2 {
    return {
      x: cursor.x + SUBJECT_BEHAVIOR.offsetX,
      y: cursor.y + SUBJECT_BEHAVIOR.offsetY,
    };
  }

  /** Advances position/velocity one step toward the cursor-derived home. */
  update(cursor: Vec2, dtSeconds: number): void {
    const home = this.homeFor(cursor);
    const spring = computeSpring({
      pos: this.pos,
      vel: this.vel,
      home,
      dtSeconds,
    });
    const next = integrate({
      pos: this.pos,
      vel: this.vel,
      acc: { x: spring.ax, y: spring.ay },
      dtSeconds,
      maxSpeed: MAX_SPEED,
    });
    this.pos = next.pos;
    this.vel = next.vel;
  }
}
