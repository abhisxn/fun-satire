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
  pickSecuritySprite,
  SPRITE_VARIANTS,
  createSecurityUnit,
  removeSecurityUnit,
  computeSecurityEnterProgress,
  computeSecurityShrinkFraction,
  burstWaypoint,
  pickSecurityFlip,
  applyTransform,
  SECURITY_ESCORT_MIN_RADIUS,
  SECURITY_ESCORT_MAX_RADIUS,
  SECURITY_ESCORT_EASE,
  SECURITY_ESCORT_WOBBLE_RAD,
  SECURITY_ESCORT_WOBBLE_PERIOD_MS,
  SECURITY_COLLISION_RADIUS,
  assignEscortFormation,
  applyEscortStep,
  applySecurityCollisions,
  applyEscortRangeConstraint,
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
    it('scales height proportionally from a sprite\'s own aspect ratio', () => {
      expect(securityHeightFor({ src: '', aspect: 245 / 298 })).toBe(45);
    });

    it('scales height proportionally for a different aspect ratio', () => {
      expect(securityHeightFor({ src: '', aspect: 232 / 260 })).toBe(49);
    });
  });

  describe('pickSecuritySprite', () => {
    it('returns a police-family sprite for kind "police"', () => {
      const sprite = pickSecuritySprite('police', () => 0);
      expect(sprite.src).toContain('police');
    });

    it('returns a raf-family sprite for kind "raf"', () => {
      const sprite = pickSecuritySprite('raf', () => 0);
      expect(sprite.src).toContain('raf');
    });

    it('picks different variants for different rand() outputs', () => {
      const first = pickSecuritySprite('police', () => 0);
      const second = pickSecuritySprite('police', () => 0.99);
      expect(first).toBe(SPRITE_VARIANTS.police[0]);
      expect(second).toBe(SPRITE_VARIANTS.police[1]);
    });
  });

  describe('createSecurityUnit', () => {
    it('appends an <img> sized to SECURITY_WIDTH at the given position', () => {
      const unit = createSecurityUnit(container, 100, 200, 'police');

      expect(container.children.length).toBe(1);
      expect(unit.el.tagName).toBe('IMG');
      expect(unit.el.src).toMatch(/\/creatures\/security\/police(-2)?\.png$/);
      expect(unit.w).toBe(SECURITY_WIDTH);
      expect(unit.x).toBe(100);
      expect(unit.y).toBe(200);
      expect(unit.el.style.transform).toContain('translate3d(');
    });

    it('picks a random kind when none is given', () => {
      const unit = createSecurityUnit(container, 0, 0);
      expect(['police', 'raf']).toContain(unit.kind);
    });

    it('includes scaleX(-1) in the transform when the unit is flipped', () => {
      const unit = createSecurityUnit(container, 100, 200, 'police');
      unit.flipped = true;
      applyTransform(unit);
      expect(unit.el.style.transform).toContain('scaleX(-1)');
    });

    it('omits scaleX(-1) from the transform when the unit is not flipped', () => {
      const unit = createSecurityUnit(container, 100, 200, 'police');
      unit.flipped = false;
      applyTransform(unit);
      expect(unit.el.style.transform).not.toContain('scaleX(-1)');
    });
  });

  describe('pickSecurityFlip', () => {
    it('returns false when rand() is below 0.5', () => {
      expect(pickSecurityFlip(() => 0.1)).toBe(false);
    });

    it('returns true when rand() is at or above 0.5', () => {
      expect(pickSecurityFlip(() => 0.9)).toBe(true);
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
    it('renders at the avatar/sticker z-index (100) — meaningful once units share its stacking context', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      expect(unit.el.style.zIndex).toBe(String(SECURITY_Z_INDEX));
      expect(SECURITY_Z_INDEX).toBe(100);
    });

    it('has no drop-shadow filter', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      expect(unit.el.style.filter).toBe('');
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

  describe('assignEscortFormation', () => {
    it('spreads N units evenly across a full circle', () => {
      const units = [
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
      ];

      assignEscortFormation(units, () => 0.5);

      expect(units[0]!.escortAngle).toBeCloseTo(0, 5);
      expect(units[1]!.escortAngle).toBeCloseTo(Math.PI / 2, 5);
      expect(units[2]!.escortAngle).toBeCloseTo(Math.PI, 5);
      expect(units[3]!.escortAngle).toBeCloseTo((3 * Math.PI) / 2, 5);
    });

    it('assigns each unit an escort radius within [MIN_RADIUS, MAX_RADIUS], not one shared constant', () => {
      const units = [
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
      ];

      assignEscortFormation(units, () => 1); // maxes out: should land exactly at MAX_RADIUS

      for (const unit of units) {
        expect(unit.escortRadius).toBeCloseTo(SECURITY_ESCORT_MAX_RADIUS, 5);
      }
    });

    it('assigns the minimum radius when rand() returns 0', () => {
      const units = [createSecurityUnit(container, 0, 0, 'police')];

      assignEscortFormation(units, () => 0);

      expect(units[0]!.escortRadius).toBeCloseTo(SECURITY_ESCORT_MIN_RADIUS, 5);
    });

    it('assigns each unit a phase offset so their wobble is desynced', () => {
      const units = [createSecurityUnit(container, 0, 0, 'police')];

      assignEscortFormation(units, () => 0.5);

      expect(units[0]!.escortPhaseOffsetMs).toBeCloseTo(5000, 5);
    });
  });

  describe('applyEscortStep', () => {
    it('eases the unit toward avatar position + its escort offset', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      unit.phase = 'wandering';
      unit.escortAngle = 0; // offset purely on +x
      unit.escortRadius = SECURITY_ESCORT_MIN_RADIUS;
      unit.escortPhaseOffsetMs = 0; // wobble = sin(0) = 0 at nowMs = 0, no wobble this instant

      applyEscortStep(unit, 200, 200, 0, SECURITY_ESCORT_EASE);

      const targetX = 200 + SECURITY_ESCORT_MIN_RADIUS;
      const targetY = 200;
      expect(unit.x).toBeCloseTo((targetX - 0) * SECURITY_ESCORT_EASE, 5);
      expect(unit.y).toBeCloseTo((targetY - 0) * SECURITY_ESCORT_EASE, 5);
    });

    it('does nothing while the unit is still in its entrance burst', () => {
      const unit = createSecurityUnit(container, 10, 10, 'police');
      expect(unit.phase).toBe('entering');

      applyEscortStep(unit, 999, 999, 0, SECURITY_ESCORT_EASE);

      expect(unit.x).toBe(10);
      expect(unit.y).toBe(10);
    });

    it('wobbles the effective angle around escortAngle as nowMs advances', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      unit.phase = 'wandering';
      unit.escortAngle = 0;
      unit.escortRadius = SECURITY_ESCORT_MIN_RADIUS;
      unit.escortPhaseOffsetMs = 0;

      // A quarter period in, sin() peaks at 1 — maximum wobble offset.
      const quarterPeriod = SECURITY_ESCORT_WOBBLE_PERIOD_MS / 4;
      applyEscortStep(unit, 0, 0, quarterPeriod, 1); // ease=1 snaps straight to target

      const expectedAngle = SECURITY_ESCORT_WOBBLE_RAD;
      expect(unit.x).toBeCloseTo(Math.cos(expectedAngle) * SECURITY_ESCORT_MIN_RADIUS, 3);
      expect(unit.y).toBeCloseTo(Math.sin(expectedAngle) * SECURITY_ESCORT_MIN_RADIUS, 3);
    });
  });

  describe('applySecurityCollisions', () => {
    it('pushes two overlapping units apart', () => {
      const a = createSecurityUnit(container, 100, 100, 'police');
      const b = createSecurityUnit(container, 110, 100, 'police'); // 10px apart, well inside SECURITY_COLLISION_RADIUS
      a.phase = 'wandering';
      b.phase = 'wandering';

      applySecurityCollisions([a, b]);

      const distAfter = Math.hypot(b.x - a.x, b.y - a.y);
      expect(distAfter).toBeGreaterThan(10);
    });

    it('does not move units that are already farther apart than SECURITY_COLLISION_RADIUS', () => {
      const a = createSecurityUnit(container, 0, 0, 'police');
      const b = createSecurityUnit(container, 500, 500, 'police');
      a.phase = 'wandering';
      b.phase = 'wandering';

      applySecurityCollisions([a, b]);

      expect(a.x).toBe(0);
      expect(a.y).toBe(0);
      expect(b.x).toBe(500);
      expect(b.y).toBe(500);
    });

    it('ignores units still in their entrance burst', () => {
      const a = createSecurityUnit(container, 100, 100, 'police'); // still 'entering'
      const b = createSecurityUnit(container, 105, 100, 'police'); // still 'entering'

      applySecurityCollisions([a, b]);

      expect(a.x).toBe(100);
      expect(b.x).toBe(105);
    });
  });

  describe('applyEscortRangeConstraint', () => {
    it('pushes a unit outward if closer than SECURITY_ESCORT_MIN_RADIUS', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      unit.phase = 'wandering';
      unit.x = 50; // inside the 100px min radius
      unit.y = 0;

      applyEscortRangeConstraint(unit, 0, 0);

      expect(unit.x).toBeGreaterThan(50);
    });

    it('pulls a unit inward if farther than SECURITY_ESCORT_MAX_RADIUS', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      unit.phase = 'wandering';
      unit.x = 300; // outside the 160px max radius
      unit.y = 0;

      applyEscortRangeConstraint(unit, 0, 0);

      expect(unit.x).toBeLessThan(300);
    });

    it('does not move a unit already within [MIN_RADIUS, MAX_RADIUS]', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      unit.phase = 'wandering';
      unit.x = 130; // squarely inside [100, 160]
      unit.y = 0;

      applyEscortRangeConstraint(unit, 0, 0);

      expect(unit.x).toBe(130);
    });

    it('ignores a unit still in its entrance burst', () => {
      const unit = createSecurityUnit(container, 50, 0, 'police'); // still 'entering'

      applyEscortRangeConstraint(unit, 0, 0);

      expect(unit.x).toBe(50);
    });
  });
});
