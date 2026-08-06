// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createEyeCreature } from '../../src/creatures/EyeCreature';
import { createFingerCreature } from '../../src/creatures/FingerCreature';
import { createCockroachCreature } from '../../src/creatures/CockroachCreature';
import { createPlacardCreature } from '../../src/creatures/PlacardCreature';

const TEST_SVG = `<svg viewBox="0 0 115 57"><circle cx="40.25" cy="28.75" r="10"/></svg>`;

describe('creature factories keep static styles in global CSS', () => {
  it('uses the shared wrap class instead of inlining static presentational styles', () => {
    const creatures = [
      createEyeCreature(10, 20, 1, TEST_SVG, 'uid'),
      createFingerCreature(10, 20, 1),
      createCockroachCreature(10, 20, 1),
      createPlacardCreature(10, 20, 1),
    ];
    for (const c of creatures) {
      expect(c.el.className).toBe('wrap');
      expect(c.el.style.position).toBe('');
      expect(c.el.style.pointerEvents).toBe('');
      expect(c.el.style.willChange).toBe('');
      expect(c.el.style.width).not.toBe('');
      expect(c.el.style.height).not.toBe('');
    }
  });
});
