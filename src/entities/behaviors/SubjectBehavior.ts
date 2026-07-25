import type { Vec2 } from "../Entity";
import { compute as computeSpring } from "../../physics/SpringHome";
import { integrate } from "../../physics/Integrator";

export const SUBJECT_BEHAVIOR = Object.freeze({
  offsetX: 0,
  offsetY: -40,
} as const);

const MAX_SPEED = 600;

/** The Subject's home point: the cursor position offset slightly. */
export function homeFor(cursor: Vec2): Vec2 {
  return {
    x: cursor.x + SUBJECT_BEHAVIOR.offsetX,
    y: cursor.y + SUBJECT_BEHAVIOR.offsetY,
  };
}

/**
 * Cursor-following steering for the Subject entity.
 *
 * Unlike EyeBehavior's locomotion (flee/drag away from the cursor), the
 * Subject eases toward a point derived from the current cursor position
 * each step (via homeFor), using the same spring-home + integrator
 * primitives eyes use for their home-seeking physics (see main.ts's
 * eye tick loop for the matching stateless call pattern).
 *
 * Stateless: mutates the given physics struct in place, mirroring how
 * entity.physics.pos/vel/home on the shared Entity struct is the single
 * source of truth for eyes.
 */
export function stepSubjectPhysics(
  physics: { pos: Vec2; vel: Vec2; home: Vec2 },
  cursor: Vec2,
  dtSeconds: number,
): void {
  physics.home = homeFor(cursor);
  const spring = computeSpring({
    pos: physics.pos,
    vel: physics.vel,
    home: physics.home,
    dtSeconds,
  });
  const next = integrate({
    pos: physics.pos,
    vel: physics.vel,
    acc: { x: spring.ax, y: spring.ay },
    dtSeconds,
    maxSpeed: MAX_SPEED,
  });
  physics.pos = next.pos;
  physics.vel = next.vel;
}
