// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { BugSwarm } from '../../src/creatures/BugSwarm';

describe('BugSwarm', () => {
  let container: HTMLElement;
  let swarm: BugSwarm;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
    swarm = new BugSwarm(container);
  });

  describe('initial state', () => {
    it('starts inactive with no bugs spawned', () => {
      expect(swarm.isActive()).toBe(false);
      expect(swarm.getCount()).toBe(0);
      expect(container.children.length).toBe(0);
    });
  });

  describe('setActive(true)', () => {
    it('spawns a fixed swarm of bugs', () => {
      swarm.setActive(true);

      expect(swarm.isActive()).toBe(true);
      expect(swarm.getCount()).toBe(20);
      expect(container.children.length).toBe(20);
    });

    it('is idempotent when already active', () => {
      swarm.setActive(true);
      const firstEl = container.children[0];
      swarm.setActive(true);

      expect(swarm.getCount()).toBe(20);
      expect(container.children[0]).toBe(firstEl);
    });
  });

  describe('setActive(false)', () => {
    it('removes all spawned bugs', () => {
      swarm.setActive(true);
      swarm.setActive(false);

      expect(swarm.isActive()).toBe(false);
      expect(swarm.getCount()).toBe(0);
      expect(container.children.length).toBe(0);
    });
  });

  describe('update', () => {
    it('does nothing when inactive', () => {
      swarm.update(400, 300);
      expect(container.children.length).toBe(0);
    });

    it('moves bugs and sets a transform when active', () => {
      swarm.setActive(true);
      const bugEl = container.children[0] as HTMLElement;
      const before = bugEl.style.transform;

      swarm.update(400, 300);

      expect(bugEl.style.transform).not.toBe(before);
      expect(bugEl.style.transform).toContain('translate(');
      expect(bugEl.style.transform).toContain('rotate(');
    });
  });
});
