import { describe, it, expect, beforeEach } from "vitest";
import type { Creature } from "../../src/creatures/creatureTypes";
import { updateCreature, updateAllCreatures } from "../../src/creatures/creaturePhysics";
import type { PhysicsParams, AvatarPos } from "../../src/creatures/creaturePhysics";

function createCreature(overrides: Partial<Creature> = {}): Creature {
  const el = { style: { transform: "" } } as unknown as HTMLElement;
  return {
    el,
    hx: 100,
    hy: 100,
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    scale: 1,
    w: 64,
    h: 64,
    ...overrides,
  };
}

const DEFAULT_PARAMS: PhysicsParams = {
  repelRadius: 180,
  repelStrength: 120,
  springStrength: 0.02,
  damping: 0.88,
};

describe("creaturePhysics", () => {
  let creature: Creature;

  beforeEach(() => {
    creature = createCreature();
  });

  describe("updateCreature", () => {
    it("repels creature when avatar is within repelRadius", () => {
      const avatar: AvatarPos = { x: 150, y: 100 };

      updateCreature(creature, avatar, DEFAULT_PARAMS);

      expect(creature.vx).not.toBe(0);
      expect(creature.x).not.toBe(100);
    });

    it("does not repel when avatar is outside repelRadius", () => {
      const avatar: AvatarPos = { x: 500, y: 500 };
      const vxBefore = creature.vx;
      const vyBefore = creature.vy;

      updateCreature(creature, avatar, DEFAULT_PARAMS);

      const repulsionVx = creature.vx - vxBefore;
      const repulsionVy = creature.vy - vyBefore;

      expect(Math.abs(repulsionVx)).toBeLessThan(1);
      expect(Math.abs(repulsionVy)).toBeLessThan(1);
    });

    it("springs creature back toward home position", () => {
      creature.x = 200;
      creature.y = 200;
      creature.vx = 0;
      creature.vy = 0;

      const farAvatar: AvatarPos = { x: 1000, y: 1000 };

      updateCreature(creature, farAvatar, DEFAULT_PARAMS);

      expect(creature.vx).toBeLessThan(0);
      expect(creature.vy).toBeLessThan(0);
    });

    it("damping reduces velocity over time", () => {
      creature.vx = 10;
      creature.vy = 10;

      const farAvatar: AvatarPos = { x: 1000, y: 1000 };
      const noSpringParams: PhysicsParams = { ...DEFAULT_PARAMS, springStrength: 0 };

      updateCreature(creature, farAvatar, noSpringParams);

      expect(Math.abs(creature.vx)).toBeLessThan(10);
      expect(Math.abs(creature.vy)).toBeLessThan(10);
    });

    it("rotation faces away from avatar", () => {
      const avatar: AvatarPos = { x: 50, y: 100 };

      updateCreature(creature, avatar, DEFAULT_PARAMS);

      const transform = creature.el.style.transform;
      const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/);
      expect(rotateMatch).not.toBeNull();

      const angle = parseFloat(rotateMatch![1]!);
      const expectedAngle = Math.atan2(avatar.y - creature.y, avatar.x - creature.x) * (180 / Math.PI) + 180;
      expect(angle).toBeCloseTo(expectedAngle, 3);
    });

    it("handles creature at exact avatar position without error", () => {
      const avatar: AvatarPos = { x: 100, y: 100 };

      expect(() => {
        updateCreature(creature, avatar, DEFAULT_PARAMS);
      }).not.toThrow();
    });

    it("repulsor with its own radius repels beyond the default repelRadius", () => {
      const repulsor = { x: 380, y: 100, radius: 300 };
      const farAvatar: AvatarPos = { x: 1000, y: 1000 };

      updateCreature(creature, farAvatar, DEFAULT_PARAMS, [repulsor]);

      expect(creature.x).toBeLessThan(100);
    });

    it("repulsor without a radius uses the default repelRadius", () => {
      const repulsor = { x: 380, y: 100 };
      const farAvatar: AvatarPos = { x: 1000, y: 1000 };

      updateCreature(creature, farAvatar, DEFAULT_PARAMS, [repulsor]);

      expect(creature.x).toBe(100);
    });

    it("applies repulsion from multiple repulsors in the same call", () => {
      const repulsorA = { x: 380, y: 100, radius: 300 };
      const repulsorB = { x: 100, y: 380, radius: 300 };
      const farAvatar: AvatarPos = { x: 1000, y: 1000 };

      updateCreature(creature, farAvatar, DEFAULT_PARAMS, [repulsorA, repulsorB]);

      // Pushed away from A (leftward, x decreases) AND away from B (upward, y decreases)
      expect(creature.x).toBeLessThan(100);
      expect(creature.y).toBeLessThan(100);
    });

    it("updates DOM transform with position, scale, and rotation", () => {
      creature.x = 150;
      creature.y = 200;
      creature.scale = 1.5;

      const avatar: AvatarPos = { x: 100, y: 100 };

      updateCreature(creature, avatar, DEFAULT_PARAMS);

      const transform = creature.el.style.transform;
      expect(transform).toMatch(/translate\(/);
      expect(transform).toMatch(/scale\(1\.5\)/);
      expect(transform).toMatch(/rotate\(/);
    });
  });

  describe("updateAllCreatures", () => {
    it("updates multiple creatures", () => {
      const c1 = createCreature({ x: 100, y: 100 });
      const c2 = createCreature({ x: 200, y: 200, hx: 200, hy: 200 });
      const creatures = [c1, c2];
      const avatar: AvatarPos = { x: 120, y: 100 };

      updateAllCreatures(creatures, avatar, DEFAULT_PARAMS);

      expect(c1.x).not.toBe(100);
      expect(c2.x).not.toBe(200);
      expect(c1.el.style.transform).toBeDefined();
      expect(c2.el.style.transform).toBeDefined();
    });
  });
});
