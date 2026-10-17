// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { CreatureGrid } from '../../src/creatures/CreatureGrid';

type Internal = { creatures: Array<{ x: number; y: number; w: number; h: number; waitingRespawn: boolean }> };

describe('CreatureGrid unity inputs', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
  });

  it('collectCreatureCenters fills the buffer with creature centres and returns the live count', () => {
    const grid = new CreatureGrid({ container, mode: 'cockroach', initialQuantity: 12 });
    grid.spawn('cockroach');
    const creatures = (grid as unknown as Internal).creatures;
    const out: Array<{ x: number; y: number }> = [];

    const n = grid.collectCreatureCenters(out);

    expect(n).toBe(creatures.length);
    expect(out.length).toBe(n);
    expect(out[0]!.x).toBeCloseTo(creatures[0]!.x + creatures[0]!.w / 2);
    expect(out[0]!.y).toBeCloseTo(creatures[0]!.y + creatures[0]!.h / 2);
  });

  it('skips creatures waiting to respawn', () => {
    const grid = new CreatureGrid({ container, mode: 'cockroach', initialQuantity: 12 });
    grid.spawn('cockroach');
    const creatures = (grid as unknown as Internal).creatures;
    creatures[0]!.waitingRespawn = true;
    creatures[1]!.waitingRespawn = true;
    const out: Array<{ x: number; y: number }> = [];

    const n = grid.collectCreatureCenters(out);

    expect(n).toBe(creatures.length - 2);
    expect(out.length).toBe(n);
  });

  it('reuses the buffer objects across calls and shrinks it when the crowd shrinks', () => {
    const grid = new CreatureGrid({ container, mode: 'cockroach', initialQuantity: 12 });
    grid.spawn('cockroach');
    const out: Array<{ x: number; y: number }> = [];
    grid.collectCreatureCenters(out);
    const first = out[0];

    grid.collectCreatureCenters(out);
    expect(out[0]).toBe(first);

    (grid as unknown as Internal).creatures.length = 3;
    grid.collectCreatureCenters(out);
    expect(out.length).toBe(3);
  });

  it('reports the number of distinct creature kinds present (one until the mixed crowd ships)', () => {
    const grid = new CreatureGrid({ container, mode: 'cockroach', initialQuantity: 12 });
    grid.spawn('cockroach');
    expect(grid.getKindCount()).toBe(1);
  });
});
