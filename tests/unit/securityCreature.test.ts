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
  securityHeightFor,
  pickSecurityKind,
  createSecurityUnit,
  removeSecurityUnit,
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
});
