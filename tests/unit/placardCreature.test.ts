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

      expect(placard.w).toBe(STICK_NAT_W * scale);
      expect(placard.h).toBe(STICK_NAT_H * scale);
    });

    it('has correct dimensions at scale 1', () => {
      const placard = createPlacardCreature(0, 0, 1);

      expect(placard.w).toBe(STICK_NAT_W);
      expect(placard.h).toBe(STICK_NAT_H);
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

    it('placard layer is centered on the stick anchor point, sized as a scale-relative ratio', () => {
      const scale = 2;
      const placard = createPlacardCreature(0, 0, scale);

      const imgs = placard.el.querySelectorAll('img');
      const placardImg = imgs[1] as HTMLImageElement;
      const placardSrc = placardImg.src;
      const asset = PLACARD_POOL.find((entry) => placardSrc.endsWith(entry.src))!;

      const stickW = STICK_NAT_W * scale;
      const stickH = STICK_NAT_H * scale;
      const anchorPx = {
        x: STICK_ANCHOR_PCT.x * stickW,
        y: STICK_ANCHOR_PCT.y * stickH,
      };

      // Sign width is now PLACARD_BASE_W * creature scale * a randomized
      // ratio in [0.5, 1.4] — tied to the creature's own depth-scale instead
      // of being a fully independent absolute size, so bounds-check the
      // ratio range rather than asserting an exact value.
      const actualW = parseFloat(placardImg.style.width);
      expect(actualW).toBeGreaterThanOrEqual(PLACARD_BASE_W * scale * 0.5 - 1e-6);
      expect(actualW).toBeLessThanOrEqual(PLACARD_BASE_W * scale * 1.4 + 1e-6);

      const expectedH = actualW * (asset.h / asset.w);
      const expectedLeft = anchorPx.x - actualW / 2;
      const expectedTop = anchorPx.y - expectedH / 2;

      // happy-dom's CSSOM serializes style values with limited decimal
      // precision, so compare parsed floats rather than exact strings.
      expect(parseFloat(placardImg.style.height)).toBeCloseTo(expectedH, 5);
      expect(parseFloat(placardImg.style.left)).toBeCloseTo(expectedLeft, 5);
      expect(parseFloat(placardImg.style.top)).toBeCloseTo(expectedTop, 5);
      expect(placardImg.style.position).toBe('absolute');
    });

    it('a small/distant creature (low scale) always gets a proportionally small placard', () => {
      const scale = 0.2;
      const placard = createPlacardCreature(0, 0, scale);

      const imgs = placard.el.querySelectorAll('img');
      const placardImg = imgs[1] as HTMLImageElement;
      const actualW = parseFloat(placardImg.style.width);

      // At the old, scale-independent sizing this could have been as large
      // as PLACARD_BASE_W * 0.8 (120px) even at a tiny creature scale. Now
      // it must stay proportional to scale.
      expect(actualW).toBeLessThanOrEqual(PLACARD_BASE_W * scale * 1.4 + 1e-6);
    });

    it('creates element with correct styles', () => {
      const scale = 2;
      const placard = createPlacardCreature(0, 0, scale);

      expect(placard.el.className).toBe('wrap');
      expect(placard.el.style.position).toBe('');
      expect(placard.el.style.pointerEvents).toBe('');
      expect(placard.el.style.willChange).toBe('');
      expect(placard.el.style.width).toBe(`${STICK_NAT_W * scale}px`);
      expect(placard.el.style.height).toBe(`${STICK_NAT_H * scale}px`);
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
