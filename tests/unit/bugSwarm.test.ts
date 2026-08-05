// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BugSwarm } from '../../src/creatures/BugSwarm';

vi.mock('animejs', () => {
  const makeInstance = () => ({ pause: vi.fn() });
  return {
    default: (_opts: Record<string, unknown>) => makeInstance(),
  };
});

describe('BugSwarm (anime.js)', () => {
  let container: HTMLElement;
  let swarm: BugSwarm;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
    swarm = new BugSwarm(container);
  });

  afterEach(() => {
    swarm.setActive(false);
    container.remove();
  });

  it('starts inactive with no bugs', () => {
    expect(swarm.isActive()).toBe(false);
    expect(swarm.getCount()).toBe(0);
    expect(container.children.length).toBe(0);
  });

  it('scatters a batch of bugs on setActive(true)', () => {
    swarm.setActive(true);

    expect(swarm.isActive()).toBe(true);
    expect(swarm.getCount()).toBeGreaterThanOrEqual(10);
    expect(swarm.getCount()).toBeLessThanOrEqual(16);
    expect(container.children.length).toBe(swarm.getCount());
    for (const child of Array.from(container.children)) {
      expect((child as HTMLElement).className).toBe('bug');
    }
  });

  it('is idempotent when activating twice', () => {
    swarm.setActive(true);
    const firstCount = swarm.getCount();
    swarm.setActive(true);
    expect(swarm.getCount()).toBe(firstCount);
  });

  it('removes all DOM and resets count on setActive(false)', () => {
    swarm.setActive(true);
    expect(swarm.getCount()).toBeGreaterThan(0);

    swarm.setActive(false);

    expect(swarm.isActive()).toBe(false);
    expect(swarm.getCount()).toBe(0);
    expect(container.children.length).toBe(0);
  });

  it('drops a new bug on click while active', () => {
    swarm.setActive(true);
    const before = swarm.getCount();

    container.dispatchEvent(new MouseEvent('click', { clientX: 200, clientY: 150, bubbles: true }));

    expect(swarm.getCount()).toBe(before + 1);
    expect(container.children.length).toBe(swarm.getCount());
  });

  it('ignores clicks while inactive', () => {
    container.dispatchEvent(new MouseEvent('click', { clientX: 200, clientY: 150, bubbles: true }));
    expect(swarm.getCount()).toBe(0);
    expect(container.children.length).toBe(0);
  });

  it('no longer accepts clicks after setActive(false)', () => {
    swarm.setActive(true);
    swarm.setActive(false);
    const before = swarm.getCount();

    container.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 50, bubbles: true }));

    expect(swarm.getCount()).toBe(before);
  });
});
