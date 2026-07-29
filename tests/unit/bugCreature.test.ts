// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createBugCreature,
  getBugRotation,
  BUG_NAT_W,
  BUG_NAT_H,
} from '../../src/creatures/BugCreature';

describe('BugCreature', () => {
  describe('createBugCreature', () => {
    it('creates a creature with correct properties', () => {
      const scale = 2;
      const bug = createBugCreature(100, 200, scale);

      expect(bug.x).toBe(100);
      expect(bug.y).toBe(200);
      expect(bug.hx).toBe(100);
      expect(bug.hy).toBe(200);
      expect(bug.vx).toBe(0);
      expect(bug.vy).toBe(0);
      expect(bug.scale).toBe(scale);
    });

    it('has correct dimensions based on scale', () => {
      const scale = 1.5;
      const bug = createBugCreature(0, 0, scale);

      expect(bug.w).toBe(BUG_NAT_W * scale);
      expect(bug.h).toBe(BUG_NAT_H * scale);
    });

    it('has correct dimensions at scale 1', () => {
      const bug = createBugCreature(0, 0, 1);

      expect(bug.w).toBe(BUG_NAT_W);
      expect(bug.h).toBe(BUG_NAT_H);
    });

    it('element contains an img tag with correct src', () => {
      const bug = createBugCreature(0, 0, 1);

      const img = bug.el.querySelector('img');
      expect(img).not.toBeNull();
      expect(img!.src).toContain('/creatures/bug.svg');
    });

    it('img is not draggable', () => {
      const bug = createBugCreature(0, 0, 1);

      const img = bug.el.querySelector('img');
      expect(img!.draggable).toBe(false);
    });

    it('creates element with correct styles', () => {
      const scale = 2;
      const bug = createBugCreature(0, 0, scale);

      expect(bug.el.className).toBe('wrap');
      expect(bug.el.style.position).toBe('absolute');
      expect(bug.el.style.pointerEvents).toBe('none');
      expect(bug.el.style.willChange).toBe('transform');
      expect(bug.el.style.width).toBe(`${BUG_NAT_W * scale}px`);
      expect(bug.el.style.height).toBe(`${BUG_NAT_H * scale}px`);
    });
  });

  describe('getBugRotation', () => {
    it('calculates correct angle (atan2 + 180)', () => {
      const bug = createBugCreature(0, 0, 1);

      const rotation = getBugRotation(bug, 100, 0);

      expect(rotation).toBe(180);
    });

    it('faces away from avatar when avatar is to the right', () => {
      const bug = createBugCreature(0, 0, 1);

      const rotation = getBugRotation(bug, 100, 0);

      expect(rotation).toBe(180);
    });

    it('faces away from avatar when avatar is above', () => {
      const bug = createBugCreature(100, 100, 1);

      const rotation = getBugRotation(bug, 100, 0);

      expect(rotation).toBe(90);
    });

    it('faces away from avatar when avatar is below', () => {
      const bug = createBugCreature(100, 100, 1);

      const rotation = getBugRotation(bug, 100, 200);

      expect(rotation).toBe(270);
    });

    it('faces away from avatar when avatar is to the left', () => {
      const bug = createBugCreature(100, 100, 1);

      const rotation = getBugRotation(bug, 0, 100);

      expect(rotation).toBe(360);
    });
  });
});
