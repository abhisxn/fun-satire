import { createBugCreature, updateBug, getBugRotation } from "./BugCreature.js";
import type { BugCreature } from "./BugCreature.js";
import type { PhysicsParams } from "./creaturePhysics.js";

const BUG_COUNT = 20;
const MIN_SCALE = 0.3;
const MAX_SCALE = 0.7;

export class BugSwarm {
  private container: HTMLElement;
  private bugs: BugCreature[] = [];
  private active = false;
  private physicsParams: PhysicsParams = {
    repelRadius: 160,
    repelStrength: 100,
    springStrength: 0.02,
    damping: 0.88,
  };

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    if (active) {
      this.spawn();
    } else {
      this.clear();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  update(avatarX: number, avatarY: number): void {
    if (!this.active) return;

    const avatar = { x: avatarX, y: avatarY };
    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;

    for (const bug of this.bugs) {
      updateBug(bug, avatar, this.physicsParams, vw, vh);
      const angle = getBugRotation(bug);
      bug.el.style.transform = `translate(${bug.x - bug.w * bug.scale * 0.5}px,${bug.y - bug.h * bug.scale * 0.5}px) scale(${bug.scale}) rotate(${angle}deg)`;
    }
  }

  getCount(): number {
    return this.bugs.length;
  }

  private spawn(): void {
    this.clear();
    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;

    for (let i = 0; i < BUG_COUNT; i++) {
      const hx = Math.random() * vw;
      const hy = Math.random() * vh;
      const scale = MIN_SCALE + Math.random() * (MAX_SCALE - MIN_SCALE);
      const bug = createBugCreature(hx, hy, scale);
      this.bugs.push(bug);
      this.container.appendChild(bug.el);
    }
  }

  private clear(): void {
    for (const bug of this.bugs) {
      bug.el.remove();
    }
    this.bugs = [];
  }
}
