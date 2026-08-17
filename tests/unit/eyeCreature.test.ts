// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createEyeCreature,
  updateEyePupil,
  updateEyeBlink,
  darkenHexColor,
  lightenHexColor,
  derivePupilColor,
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

    it('stretches the injected SVG to fill the scaled wrapper (not its native size)', () => {
      const eye = createEyeCreature(0, 0, 2, TEST_SVG, 'test2b');

      const svg = eye.el.querySelector('svg');
      expect(svg!.style.width).toBe('100%');
      expect(svg!.style.height).toBe('100%');
    });

    it('assigns a random iris color', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'test3');

      const fill = eye.iris.getAttribute('fill');
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
      expect(eye.el.style.position).toBe('');
      expect(eye.el.style.pointerEvents).toBe('');
      expect(eye.el.style.willChange).toBe('');
      expect(eye.el.style.width).toBe(`${EYE_NAT_W * scale}px`);
      expect(eye.el.style.height).toBe(`${EYE_NAT_H * scale}px`);
    });
  });

  describe('pupil creation', () => {
    it('is concentric with the iris and sized as a fraction of its radius', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'pupilcreate1');

      expect(eye.pupil.getAttribute('cx')).toBe(eye.iris.getAttribute('cx'));
      expect(eye.pupil.getAttribute('cy')).toBe(eye.iris.getAttribute('cy'));

      const irisR = parseFloat(eye.iris.getAttribute('r')!);
      const pupilR = parseFloat(eye.pupil.getAttribute('r')!);
      expect(pupilR).toBeCloseTo(irisR * 0.35, 5);
    });

    it('is a derived shade of the iris\'s own color, distinct from the iris', () => {
      const eye = createEyeCreature(0, 0, 1, TEST_SVG, 'pupilcreate2');

      const irisFill = eye.iris.getAttribute('fill')!;
      const pupilFill = eye.pupil.getAttribute('fill')!;

      expect(pupilFill).toBe(derivePupilColor(irisFill, 0.2));
      expect(pupilFill).not.toBe(irisFill);
    });
  });

  describe('darkenHexColor', () => {
    it('scales each channel down by the given amount', () => {
      expect(darkenHexColor('#ffffff', 0.2)).toBe('#cccccc');
    });

    it('leaves black unchanged', () => {
      expect(darkenHexColor('#000000', 0.5)).toBe('#000000');
    });

    it('rounds and clamps correctly for an arbitrary color', () => {
      expect(darkenHexColor('#5b7b8a', 0.2)).toBe('#49626e');
    });
  });

  describe('lightenHexColor', () => {
    it('scales each channel up toward white by the given amount', () => {
      expect(lightenHexColor('#000000', 0.2)).toBe('#333333');
    });

    it('leaves white unchanged', () => {
      expect(lightenHexColor('#ffffff', 0.5)).toBe('#ffffff');
    });

    it('rounds and clamps correctly for an arbitrary dark color', () => {
      expect(lightenHexColor('#3d3229', 0.2)).toBe('#645b54');
    });
  });

  describe('derivePupilColor', () => {
    it('lightens a dark iris color (most of IRIS_COLORS is dark browns/greens)', () => {
      expect(derivePupilColor('#3d3229', 0.2)).toBe(lightenHexColor('#3d3229', 0.2));
      expect(derivePupilColor('#3d3229', 0.2)).not.toBe(darkenHexColor('#3d3229', 0.2));
    });

    it('darkens a light iris color', () => {
      expect(derivePupilColor('#cccccc', 0.2)).toBe(darkenHexColor('#cccccc', 0.2));
      expect(derivePupilColor('#cccccc', 0.2)).not.toBe(lightenHexColor('#cccccc', 0.2));
    });
  });

  describe('updateEyePupil', () => {
    it('moves the iris toward the avatar', () => {
      const eye = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil1');
      const initialCx = parseFloat(eye.iris.getAttribute('cx')!);

      updateEyePupil(eye, 200, 100);

      const newCx = parseFloat(eye.iris.getAttribute('cx')!);
      expect(newCx).not.toBe(initialCx);
    });

    it('moves the pupil in lockstep with the iris', () => {
      const eye = createEyeCreature(100, 100, 1, TEST_SVG, 'pupil1b');

      updateEyePupil(eye, 200, 100);

      expect(eye.pupil.getAttribute('cx')).toBe(eye.iris.getAttribute('cx'));
      expect(eye.pupil.getAttribute('cy')).toBe(eye.iris.getAttribute('cy'));
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

      const cx1 = parseFloat(eye1.iris.getAttribute('cx')!);
      const cx2 = parseFloat(eye2.iris.getAttribute('cx')!);

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
