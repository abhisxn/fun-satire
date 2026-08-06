// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createPlacardCreature,
  getPlacardRotation,
  PLACARD_NAT_W,
  PLACARD_NAT_H,
} from '../../src/creatures/PlacardCreature';

describe('PlacardCreature', () => {
  describe('createPlacardCreature', () => {
    it('creates a creature with correct properties', () => {
      const scale = 2;
      const placard = createPlacardCreature(100, 200, scale);

      expect(placard.x).toBe(100);
      expect(placard.y).toBe(200);
      expect(placard.hx).toBe(100);
      expect(placard.hy).toBe(200);
      expect(placard.vx).toBe(0);
      expect(placard.vy).toBe(0);
      expect(placard.scale).toBe(scale);
    });

    it('has correct dimensions based on scale', () => {
      const scale = 1.5;
      const placard = createPlacardCreature(0, 0, scale);

      expect(placard.w).toBe(PLACARD_NAT_W * scale);
      expect(placard.h).toBe(PLACARD_NAT_H * scale);
    });

    it('has correct dimensions at scale 1', () => {
      const placard = createPlacardCreature(0, 0, 1);

      expect(placard.w).toBe(PLACARD_NAT_W);
      expect(placard.h).toBe(PLACARD_NAT_H);
    });

    it('element contains an img tag with correct src', () => {
      const placard = createPlacardCreature(0, 0, 1);

      const img = placard.el.querySelector('img');
      expect(img).not.toBeNull();
      expect(img!.src).toContain('/creatures/placard_stick.png');
    });

    it('img is not draggable', () => {
      const placard = createPlacardCreature(0, 0, 1);

      const img = placard.el.querySelector('img');
      expect(img!.draggable).toBe(false);
    });

    it('creates element with correct styles', () => {
      const scale = 2;
      const placard = createPlacardCreature(0, 0, scale);

      expect(placard.el.className).toBe('wrap');
      expect(placard.el.style.position).toBe('absolute');
      expect(placard.el.style.pointerEvents).toBe('none');
      expect(placard.el.style.willChange).toBe('transform');
      expect(placard.el.style.width).toBe(`${PLACARD_NAT_W * scale}px`);
      expect(placard.el.style.height).toBe(`${PLACARD_NAT_H * scale}px`);
    });
  });

  describe('getPlacardRotation', () => {
    it('points placard top at avatar (atan2 + 90)', () => {
      const placard = createPlacardCreature(0, 0, 1);

      const rotation = getPlacardRotation(placard, 100, 0);

      expect(rotation).toBe(90);
    });

    it('points placard at avatar when avatar is above', () => {
      const placard = createPlacardCreature(100, 100, 1);

      const rotation = getPlacardRotation(placard, 100, 0);

      expect(rotation).toBe(0);
    });

    it('points placard at avatar when avatar is below', () => {
      const placard = createPlacardCreature(100, 100, 1);

      const rotation = getPlacardRotation(placard, 100, 200);

      expect(rotation).toBe(180);
    });

    it('points placard at avatar when avatar is to the left', () => {
      const placard = createPlacardCreature(100, 100, 1);

      const rotation = getPlacardRotation(placard, 0, 100);

      expect(rotation).toBe(270);
    });
  });
});
