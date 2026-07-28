// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createEyeCreature,
  updateEyePupil,
  updateEyeBlink,
  EYE_NAT_W,
  EYE_NAT_H,
} from '../../src/creatures/EyeCreature';
import type { EyeCreature } from '../../src/creatures/EyeCreature';

const TEST_SVG = `<svg viewBox="0 0 115 57"><circle cx="40.25" cy="28.75" r="10"/></svg>`;

describe('EyeCreature', () => {
  describe('createEyeCreature', () => {
    it('creates a creature with correct dimensions', () => {
      const scale = 2;
      const eye = createEyeCreature(100, 200, scale, TEST_SVG, 'test1');

      expect(eye.w).toBe(EYE_NAT_W * scale);
      expect(eye.h).toBe(EYE_NAT_H * scale);
      expect(eye.x).toBe(100);
      expect(eye.y).toBe(200);
      expect(eye.hx).toBe(100);
      expect(eye.hy).toBe(200);
      expect(eye.scale).toBe(scale);
    });

    it('inserts SVG markup into element', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'test2');

      const svg = eye.el.querySelector('svg');
      expect(svg).not.toBeNull();

      const circle = svg!.querySelector('circle');
      expect(circle).not.toBeNull();
    });

    it('assigns random pupil color', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'test3');

      const fill = eye.pupil.getAttribute('fill');
      expect(fill).not.toBeNull();
      expect(fill).not.toBe('');
    });

    it('makes SVG IDs unique with uid', () => {
      const svgWithIds = `<svg><defs><clipPath id="clip0_18_102"><rect/></clipPath></defs><g clip-path="url(#clip0_18_102)"><circle cx="40.25" cy="28.75" r="10"/></g></svg>`;
      const eye = createEyeCreature(0, 0, 1, svgWithIds, 'unique123');

      const clipPath = eye.el.querySelector('clipPath');
      expect(clipPath!.id).toBe('clip_unique123');
    });

    it('initializes blink state', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'test4');

      expect(eye.blinking).toBe(false);
      expect(eye.blinkStart).toBe(0);
      expect(eye.nextBlink).toBeGreaterThan(Date.now());
    });

    it('sets rotFactor between 0.06 and 0.20', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'test5');

      expect(eye.rotFactor).toBeGreaterThanOrEqual(0.06);
      expect(eye.rotFactor).toBeLessThan(0.20);
    });

    it('creates element with correct styles', () => {
      const scale = 1.5;
      const eye = createEyeCreature(0, 0, scale, TEST_SVG, 'test6');

      expect(eye.el.className).toBe('wrap');
      expect(eye.el.style.position).toBe('absolute');
      expect(eye.el.style.pointerEvents).toBe('none');
      expect(eye.el.style.willChange).toBe('transform');
      expect(eye.el.style.width).toBe(`${EYE_NAT_W * scale}px`);
      expect(eye.el.style.height).toBe(`${EYE_NAT_H * scale}px`);
    });
  });

  describe('updateEyePupil', () => {
    it('moves pupil toward avatar', () => {
      const eye = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil1');
      const initialCx = parseFloat(eye.pupil.getAttribute('cx')!);
      const initialCy = parseFloat(eye.pupil.getAttribute('cy')!);

      updateEyePupil(eye, 200, 100);

      const newCx = parseFloat(eye.pupil.getAttribute('cx')!);
      const newCy = parseFloat(eye.pupil.getAttribute('cy')!);

      expect(newCx).not.toBe(initialCx);
    });

    it('handles avatar at same position', () => {
      const eye = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil2');

      expect(() => {
        updateEyePupil(eye, 100, 100);
      }).not.toThrow();
    });

    it('applies distance falloff', () => {
      const eye1 = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil3');
      const eye2 = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil4');

      updateEyePupil(eye1, 150, 100);
      updateEyePupil(eye2, 1000, 100);

      const cx1 = parseFloat(eye1.pupil.getAttribute('cx')!);
      const cx2 = parseFloat(eye2.pupil.getAttribute('cx')!);

      expect(Math.abs(cx2 - 40.25)).toBeGreaterThan(Math.abs(cx1 - 40.25));
    });
  });

  describe('updateEyeBlink', () => {
    it('returns scaleY of 1 when not blinking', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'blink1');
      eye.nextBlink = Date.now() + 10000;

      const scaleY = updateEyeBlink(eye);

      expect(scaleY).toBe(1);
      expect(eye.blinking).toBe(false);
    });

    it('triggers blink when nextBlink time passes', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'blink2');
      eye.nextBlink = Date.now() - 100;

      updateEyeBlink(eye);
      expect(eye.blinking).toBe(true);

      eye.blinkStart = Date.now() - 30;
      const scaleY = updateEyeBlink(eye);
      expect(scaleY).toBeLessThan(1);
    });

    it('completes blink cycle and schedules next', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'blink3');
      eye.blinking = true;
      eye.blinkStart = Date.now() - 200;

      const scaleY = updateEyeBlink(eye);

      expect(eye.blinking).toBe(false);
      expect(eye.nextBlink).toBeGreaterThan(Date.now());
      expect(scaleY).toBe(1);
    });

    it('blink animation has correct duration', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'blink4');
      eye.blinking = true;
      eye.blinkStart = Date.now() - 30;

      const scaleY1 = updateEyeBlink(eye);
      expect(scaleY1).toBeLessThan(1);

      eye.blinkStart = Date.now() - 60;
      const scaleY2 = updateEyeBlink(eye);
      expect(scaleY2).toBeLessThan(scaleY1);

      eye.blinkStart = Date.now() - 120;
      const scaleY3 = updateEyeBlink(eye);
      expect(scaleY3).toBe(1);
      expect(eye.blinking).toBe(false);
    });
  });
});
