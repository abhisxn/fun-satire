// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createEyeCreature } from '../../src/creatures/EyeCreature';
import { createFingerCreature } from '../../src/creatures/FingerCreature';
import { createCockroachCreature } from '../../src/creatures/CockroachCreature';
import { createPlacardCreature } from '../../src/creatures/PlacardCreature';

const TEST_SVG = `<svg viewBox="0 0 115 57"><circle cx="40.25" cy="28.75" r="10"/></svg>`;

describe('creature factories initialize spawn animation fields', () => {
  it('createEyeCreature defaults spawnPopAtMs to 0 and spawnDone to false', () => {
    const eye = createEyeCreature(10, 20, 1, TEST_SVG, 'uid');
    expect(eye.spawnPopAtMs).toBe(0);
    expect(eye.spawnDone).toBe(false);
  });

  it('createFingerCreature defaults spawnPopAtMs to 0 and spawnDone to false', () => {
    const finger = createFingerCreature(10, 20, 1);
    expect(finger.spawnPopAtMs).toBe(0);
    expect(finger.spawnDone).toBe(false);
  });

  it('createCockroachCreature defaults spawnPopAtMs to 0 and spawnDone to false', () => {
    const cockroach = createCockroachCreature(10, 20, 1);
    expect(cockroach.spawnPopAtMs).toBe(0);
    expect(cockroach.spawnDone).toBe(false);
  });

  it('createPlacardCreature defaults spawnPopAtMs to 0 and spawnDone to false', () => {
    const placard = createPlacardCreature(10, 20, 1);
    expect(placard.spawnPopAtMs).toBe(0);
    expect(placard.spawnDone).toBe(false);
  });
});
