// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('animejs', () => {
  const makeInstance = () => ({ pause: vi.fn() });
  return {
    default: (_opts: Record<string, unknown>) => makeInstance(),
  };
});

import {
  SECURITY_WIDTH,
  SECURITY_Z_INDEX,
  SECURITY_ENTER_MS,
  SECURITY_SHRINK_MS,
  securityHeightFor,
  pickSecurityKind,
  createSecurityUnit,
  removeSecurityUnit,
  computeSecurityEnterProgress,
  computeSecurityShrinkFraction,
  burstWaypoint,
} from '../../src/creatures/SecurityCreature';

describe('SecurityCreature', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('pickSecurityKind', () => {
    it('returns "police" when rand() is below 0.5', () => {
      expect(pickSecurityKind(() => 0.1)).toBe('police');
    });

    it('returns "raf" when rand() is at or above 0.5', () => {
      expect(pickSecurityKind(() => 0.9)).toBe('raf');
    });
  });

  describe('securityHeightFor', () => {
    it('scales police height proportionally from its native aspect ratio', () => {
      expect(securityHeightFor('police')).toBe(45);
    });

    it('scales raf height proportionally from its native aspect ratio', () => {
      expect(securityHeightFor('raf')).toBe(49);
    });
  });

  describe('createSecurityUnit', () => {
    it('appends an <img> sized to SECURITY_WIDTH at the given position', () => {
      const unit = createSecurityUnit(container, 100, 200, 'police');

      expect(container.children.length).toBe(1);
      expect(unit.el.tagName).toBe('IMG');
      expect(unit.el.src).toContain('/creatures/security/police.png');
      expect(unit.w).toBe(SECURITY_WIDTH);
      expect(unit.x).toBe(100);
      expect(unit.y).toBe(200);
      expect(unit.el.style.transform).toContain('translate3d(');
    });

    it('picks a random kind when none is given', () => {
      const unit = createSecurityUnit(container, 0, 0);
      expect(['police', 'raf']).toContain(unit.kind);
    });
  });

  describe('removeSecurityUnit', () => {
    it('removes the element from the DOM and pauses any running animation', () => {
      const unit = createSecurityUnit(container, 0, 0, 'raf');
      const pauseSpy = vi.fn();
      unit.posAnim = { pause: pauseSpy } as unknown as ReturnType<typeof vi.fn> extends never ? never : { pause: () => void };

      removeSecurityUnit(unit);

      expect(container.children.length).toBe(0);
      expect(pauseSpy).toHaveBeenCalled();
    });
  });

  describe('createSecurityUnit — z-index, shadow, entrance', () => {
    it('renders below the avatar/sticker z-index (100)', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      expect(unit.el.style.zIndex).toBe(String(SECURITY_Z_INDEX));
      expect(SECURITY_Z_INDEX).toBeLessThan(100);
    });

    it('uses a flat, subtle drop-shadow', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      expect(unit.el.style.filter).toContain('rgba(0,0,0,0.12)');
    });

    it('spawns at scale 0 / opacity 0, mid-entrance', () => {
      const unit = createSecurityUnit(container, 100, 200, 'police');
      expect(unit.phase).toBe('entering');
      expect(unit.el.style.opacity).toBe('0');
      expect(unit.el.style.transform).toContain('scale(0.000)');
    });
  });

  describe('computeSecurityEnterProgress', () => {
    it('is fully hidden at the start of the phase', () => {
      expect(computeSecurityEnterProgress(1000, 1000)).toEqual({ scale: 0, opacity: 0, done: false });
    });

    it('is partway through at the midpoint', () => {
      const result = computeSecurityEnterProgress(1000, 1000 + SECURITY_ENTER_MS / 2);
      expect(result.scale).toBeCloseTo(0.5, 5);
      expect(result.opacity).toBeCloseTo(0.5, 5);
      expect(result.done).toBe(false);
    });

    it('is fully shown once the duration elapses', () => {
      expect(computeSecurityEnterProgress(1000, 1000 + SECURITY_ENTER_MS)).toEqual({ scale: 1, opacity: 1, done: true });
    });
  });

  describe('computeSecurityShrinkFraction', () => {
    it('is full strength (1) right as the shrink phase starts', () => {
      expect(computeSecurityShrinkFraction(1000, 1000)).toBe(1);
    });

    it('is half strength at the midpoint', () => {
      expect(computeSecurityShrinkFraction(1000, 1000 + SECURITY_SHRINK_MS / 2)).toBeCloseTo(0.5, 5);
    });

    it('is zero once the shrink duration elapses', () => {
      expect(computeSecurityShrinkFraction(1000, 1000 + SECURITY_SHRINK_MS)).toBe(0);
    });

    it('clamps to full strength (1) for a phaseStartMs still in the future', () => {
      expect(computeSecurityShrinkFraction(2000, 1000)).toBe(1);
    });
  });

  describe('burstWaypoint', () => {
    it('produces a point at a random angle 150-300px away, clamped to the viewport margins', () => {
      const state = { x: 400, y: 300 };
      const values = [0, 0]; // angle = 0 * 2π = 0 rad, dist = 150 + 0 * 150 = 150
      let i = 0;
      const fixedRand = () => values[i++]!;

      const p = burstWaypoint(state, 800, 600, fixedRand);

      expect(p.x).toBeCloseTo(550, 5); // 400 + cos(0) * 150
      expect(p.y).toBeCloseTo(300, 5); // 300 + sin(0) * 150
    });

    it('clamps the result to stay within the viewport margins', () => {
      const state = { x: 10, y: 10 };
      const values = [0.125, 1]; // angle = 45deg, dist = 300 (max)
      let i = 0;
      const fixedRand = () => values[i++]!;

      const p = burstWaypoint(state, 800, 600, fixedRand);

      expect(p.x).toBeGreaterThanOrEqual(40);
      expect(p.y).toBeGreaterThanOrEqual(40);
    });
  });
});
