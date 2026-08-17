// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createPlacardCreature,
  getPlacardRotation,
  pickRandomPlacard,
  PLACARD_POOL,
  PLACARD_BASE_W,
  STICK_NAT_W,
  STICK_NAT_H,
  STICK_ANCHOR_PCT,
  STICK_SCALE_FACTOR,
  REF_ASPECT,
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

    it('has correct stick dimensions based on scale and STICK_SCALE_FACTOR', () => {
      const scale = 1.5;
      const placard = createPlacardCreature(0, 0, scale);

      expect(placard.w).toBe(STICK_NAT_W * scale * STICK_SCALE_FACTOR);
      expect(placard.h).toBe(STICK_NAT_H * scale * STICK_SCALE_FACTOR);
    });

    it('has correct stick dimensions at scale 1', () => {
      const placard = createPlacardCreature(0, 0, 1);

      expect(placard.w).toBe(STICK_NAT_W * STICK_SCALE_FACTOR);
      expect(placard.h).toBe(STICK_NAT_H * STICK_SCALE_FACTOR);
    });

    it('stick img has correct src', () => {
      const placard = createPlacardCreature(0, 0, 1);

      const imgs = placard.el.querySelectorAll('img');
      expect(imgs[0].src).toContain('/creatures/placard_stick.png');
    });

    it('placard img src is one of the pool entries', () => {
      const placard = createPlacardCreature(0, 0, 1);

      const imgs = placard.el.querySelectorAll('img');
      const placardSrc = imgs[1].src;
      const matches = PLACARD_POOL.some((entry) => placardSrc.endsWith(entry.src));
      expect(matches).toBe(true);
    });

    it('neither img is draggable', () => {
      const placard = createPlacardCreature(0, 0, 1);

      const imgs = placard.el.querySelectorAll('img');
      expect(imgs[0].draggable).toBe(false);
      expect(imgs[1].draggable).toBe(false);
    });

    it('placard layer is centered on stick anchor point with aspect-compensated sizing', () => {
      const scale = 1.0;
      const placard = createPlacardCreature(0, 0, scale);

      const imgs = placard.el.querySelectorAll('img');
      const placardImg = imgs[1] as HTMLImageElement;
      const placardSrc = placardImg.src;
      const asset = PLACARD_POOL.find((entry) => placardSrc.endsWith(entry.src))!;

      const stickW = STICK_NAT_W * scale * STICK_SCALE_FACTOR;
      const stickH = STICK_NAT_H * scale * STICK_SCALE_FACTOR;
      const anchorPx = {
        x: STICK_ANCHOR_PCT.x * stickW,
        y: STICK_ANCHOR_PCT.y * stickH,
      };

      const aspect = asset.w / asset.h;
      const aspectFactor = Math.sqrt(aspect / REF_ASPECT);
      const minExpectedW = PLACARD_BASE_W * scale * 0.88 * aspectFactor;
      const maxExpectedW = PLACARD_BASE_W * scale * 1.16 * aspectFactor;

      const actualW = parseFloat(placardImg.style.width);
      expect(actualW).toBeGreaterThanOrEqual(minExpectedW - 1e-4);
      expect(actualW).toBeLessThanOrEqual(maxExpectedW + 1e-4);

      const expectedH = actualW * (asset.h / asset.w);
      const expectedLeft = anchorPx.x - actualW / 2;
      const expectedTop = anchorPx.y - expectedH / 2;

      expect(parseFloat(placardImg.style.height)).toBeCloseTo(expectedH, 4);
      expect(parseFloat(placardImg.style.left)).toBeCloseTo(expectedLeft, 4);
      expect(parseFloat(placardImg.style.top)).toBeCloseTo(expectedTop, 4);
      expect(placardImg.style.position).toBe('absolute');
    });

    it('a distant creature at scale 0.20 still gets a readable placard width >= 60px', () => {
      const scale = 0.20;
      const placard = createPlacardCreature(0, 0, scale);

      const imgs = placard.el.querySelectorAll('img');
      const placardImg = imgs[1] as HTMLImageElement;
      const actualW = parseFloat(placardImg.style.width);

      expect(actualW).toBeGreaterThanOrEqual(60);
    });

    it('creates element with correct styles', () => {
      const scale = 2;
      const placard = createPlacardCreature(0, 0, scale);

      expect(placard.el.className).toBe('wrap');
      expect(placard.el.style.position).toBe('');
      expect(placard.el.style.pointerEvents).toBe('');
      expect(placard.el.style.willChange).toBe('');
      expect(parseFloat(placard.el.style.width)).toBeCloseTo(STICK_NAT_W * scale * STICK_SCALE_FACTOR);
      expect(parseFloat(placard.el.style.height)).toBeCloseTo(STICK_NAT_H * scale * STICK_SCALE_FACTOR);
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

  describe('pickRandomPlacard', () => {
    it('always returns an entry from PLACARD_POOL', () => {
      for (let i = 0; i < 20; i++) {
        const picked = pickRandomPlacard();
        expect(PLACARD_POOL).toContain(picked);
      }
    });
  });
});
