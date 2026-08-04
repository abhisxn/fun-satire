// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createBugCreature,
  updateBug,
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

    it('initializes crawl fields', () => {
      const bug = createBugCreature(0, 0, 1);

      expect(typeof bug.crawlAngle).toBe('number');
      expect(bug.crawlSpeed).toBeGreaterThanOrEqual(0.5);
      expect(bug.crawlSpeed).toBeLessThanOrEqual(2);
      expect(bug.nextTurn).toBeGreaterThan(Date.now());
    });
  });

  describe('getBugRotation', () => {
    it('returns rotation based on crawl angle', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlAngle = Math.PI; // 180 degrees

      const rotation = getBugRotation(bug);

      expect(rotation).toBe(360); // crawlAngle * (180/PI) + 180
    });

    it('faces in crawling direction', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlAngle = 0; // facing right

      const rotation = getBugRotation(bug);

      expect(rotation).toBe(180); // 0 * (180/PI) + 180
    });

    it('handles different crawl angles', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlAngle = Math.PI / 2; // 90 degrees (facing down)

      const rotation = getBugRotation(bug);

      expect(rotation).toBe(270); // 90 * (180/PI) + 180
    });
  });

  describe('updateBug', () => {
    it('wraps around to the right edge when moving off the left edge', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlSpeed = 0; // isolate wrap behavior from crawl/repel/spring forces
      bug.x = -bug.w - 1;

      updateBug(bug, { x: 500, y: 500 }, { repelRadius: 0, repelStrength: 0, springStrength: 0, damping: 1 }, 800, 600);

      expect(bug.x).toBe(800);
    });

    it('wraps around to the top edge when moving off the bottom edge', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlSpeed = 0;
      bug.y = 600 + 1;

      updateBug(bug, { x: 500, y: 500 }, { repelRadius: 0, repelStrength: 0, springStrength: 0, damping: 1 }, 800, 600);

      expect(bug.y).toBe(-bug.h);
    });
  });
});
