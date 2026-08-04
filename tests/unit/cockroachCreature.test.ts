// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createCockroachCreature,
  getCockroachRotation,
  COCKROACH_NAT_W,
  COCKROACH_NAT_H,
} from '../../src/creatures/CockroachCreature';

describe('CockroachCreature', () => {
  describe('createCockroachCreature', () => {
    it('creates a creature with correct properties', () => {
      const scale = 2;
      const cockroach = createCockroachCreature(100, 200, scale);

      expect(cockroach.x).toBe(100);
      expect(cockroach.y).toBe(200);
      expect(cockroach.hx).toBe(100);
      expect(cockroach.hy).toBe(200);
      expect(cockroach.vx).toBe(0);
      expect(cockroach.vy).toBe(0);
      expect(cockroach.scale).toBe(scale);
    });

    it('has correct dimensions based on scale', () => {
      const scale = 1.5;
      const cockroach = createCockroachCreature(0, 0, scale);

      expect(cockroach.w).toBe(COCKROACH_NAT_W * scale);
      expect(cockroach.h).toBe(COCKROACH_NAT_H * scale);
    });

    it('has correct dimensions at scale 1', () => {
      const cockroach = createCockroachCreature(0, 0, 1);

      expect(cockroach.w).toBe(COCKROACH_NAT_W);
      expect(cockroach.h).toBe(COCKROACH_NAT_H);
    });

    it('element contains an img tag with correct src', () => {
      const cockroach = createCockroachCreature(0, 0, 1);

      const img = cockroach.el.querySelector('img');
      expect(img).not.toBeNull();
      expect(img!.src).toContain('/creatures/cockroach.png');
    });

    it('img is not draggable', () => {
      const cockroach = createCockroachCreature(0, 0, 1);

      const img = cockroach.el.querySelector('img');
      expect(img!.draggable).toBe(false);
    });

    it('creates element with correct styles', () => {
      const scale = 2;
      const cockroach = createCockroachCreature(0, 0, scale);

      expect(cockroach.el.className).toBe('wrap');
      expect(cockroach.el.style.position).toBe('absolute');
      expect(cockroach.el.style.pointerEvents).toBe('none');
      expect(cockroach.el.style.willChange).toBe('transform');
      expect(cockroach.el.style.width).toBe(`${COCKROACH_NAT_W * scale}px`);
      expect(cockroach.el.style.height).toBe(`${COCKROACH_NAT_H * scale}px`);
    });
  });

  describe('getCockroachRotation', () => {
    it('calculates correct angle (atan2 + 180)', () => {
      const cockroach = createCockroachCreature(0, 0, 1);

      const rotation = getCockroachRotation(cockroach, 100, 0);

      expect(rotation).toBe(180);
    });

    it('faces away from avatar when avatar is to the right', () => {
      const cockroach = createCockroachCreature(0, 0, 1);

      const rotation = getCockroachRotation(cockroach, 100, 0);

      expect(rotation).toBe(180);
    });

    it('faces away from avatar when avatar is above', () => {
      const cockroach = createCockroachCreature(100, 100, 1);

      const rotation = getCockroachRotation(cockroach, 100, 0);

      expect(rotation).toBe(90);
    });

    it('faces away from avatar when avatar is below', () => {
      const cockroach = createCockroachCreature(100, 100, 1);

      const rotation = getCockroachRotation(cockroach, 100, 200);

      expect(rotation).toBe(270);
    });

    it('faces away from avatar when avatar is to the left', () => {
      const cockroach = createCockroachCreature(100, 100, 1);

      const rotation = getCockroachRotation(cockroach, 0, 100);

      expect(rotation).toBe(360);
    });
  });
});
