# Cockroach Mode Promotion & Bug Swarm Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote Cockroach mode into the primary HUD mode row (Eye/Cockroach/Point), and finish wiring the existing "Bug Mode" toggle so it overlays a swarm of crawling flat-SVG bugs on top of whichever mode is active.

**Architecture:** `Hud.ts` gains a fourth `MODE_BTNS` entry for cockroach (reusing the existing `.hud-btn--bug` cyan-gradient CSS and the `icn=bug.svg` antenna icon already in code as `SVG_COCKROACH`), and its old standalone utility button is removed. A new independent `BugSwarm` class owns a fixed set of ~20 wandering bug creatures (extending the existing `BugCreature.ts` with cockroach-style crawl physics), rendered into the same `#stage` container but never touched by `CreatureGrid`'s mode switching. `main.ts` wires the existing (previously dead) `onBugModeToggle` callback to `BugSwarm.setActive()`.

**Tech Stack:** TypeScript, Vite, vitest + happy-dom, no new dependencies.

---

### Task 1: Add crawl physics to `BugCreature.ts`

**Files:**
- Modify: `src/creatures/BugCreature.ts`
- Test: `tests/unit/bugCreature.test.ts`

- [ ] **Step 1: Replace the test file with crawl-based expectations**

Replace the full contents of `tests/unit/bugCreature.test.ts` with:

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createBugCreature,
  updateBug,
  getBugRotation,
  BUG_NAT_W,
  BUG_NAT_H,
} from '../../src/creatures/BugCreature';

describe('BugCreature', () => {
  describe('createBugCreature', () => {
    it('creates a creature with correct properties', () => {
      const scale = 2;
      const bug = createBugCreature(100, 200, scale);

      expect(bug.x).toBe(100);
      expect(bug.y).toBe(200);
      expect(bug.hx).toBe(100);
      expect(bug.hy).toBe(200);
      expect(bug.vx).toBe(0);
      expect(bug.vy).toBe(0);
      expect(bug.scale).toBe(scale);
    });

    it('has correct dimensions based on scale', () => {
      const scale = 1.5;
      const bug = createBugCreature(0, 0, scale);

      expect(bug.w).toBe(BUG_NAT_W * scale);
      expect(bug.h).toBe(BUG_NAT_H * scale);
    });

    it('has correct dimensions at scale 1', () => {
      const bug = createBugCreature(0, 0, 1);

      expect(bug.w).toBe(BUG_NAT_W);
      expect(bug.h).toBe(BUG_NAT_H);
    });

    it('element contains an img tag with correct src', () => {
      const bug = createBugCreature(0, 0, 1);

      const img = bug.el.querySelector('img');
      expect(img).not.toBeNull();
      expect(img!.src).toContain('/creatures/bug.svg');
    });

    it('img is not draggable', () => {
      const bug = createBugCreature(0, 0, 1);

      const img = bug.el.querySelector('img');
      expect(img!.draggable).toBe(false);
    });

    it('creates element with correct styles', () => {
      const scale = 2;
      const bug = createBugCreature(0, 0, scale);

      expect(bug.el.className).toBe('wrap');
      expect(bug.el.style.position).toBe('absolute');
      expect(bug.el.style.pointerEvents).toBe('none');
      expect(bug.el.style.willChange).toBe('transform');
      expect(bug.el.style.width).toBe(`${BUG_NAT_W * scale}px`);
      expect(bug.el.style.height).toBe(`${BUG_NAT_H * scale}px`);
    });

    it('initializes crawl fields', () => {
      const bug = createBugCreature(0, 0, 1);

      expect(typeof bug.crawlAngle).toBe('number');
      expect(bug.crawlSpeed).toBeGreaterThanOrEqual(0.5);
      expect(bug.crawlSpeed).toBeLessThanOrEqual(2);
      expect(bug.nextTurn).toBeGreaterThan(Date.now());
    });
  });

  describe('getBugRotation', () => {
    it('returns rotation based on crawl angle', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlAngle = Math.PI; // 180 degrees

      const rotation = getBugRotation(bug);

      expect(rotation).toBe(360); // crawlAngle * (180/PI) + 180
    });

    it('faces in crawling direction', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlAngle = 0; // facing right

      const rotation = getBugRotation(bug);

      expect(rotation).toBe(180); // 0 * (180/PI) + 180
    });

    it('handles different crawl angles', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlAngle = Math.PI / 2; // 90 degrees (facing down)

      const rotation = getBugRotation(bug);

      expect(rotation).toBe(270); // 90 * (180/PI) + 180
    });
  });

  describe('updateBug', () => {
    it('wraps around to the right edge when moving off the left edge', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlSpeed = 0; // isolate wrap behavior from crawl/repel/spring forces
      bug.x = -bug.w - 1;

      updateBug(bug, { x: 500, y: 500 }, { repelRadius: 0, repelStrength: 0, springStrength: 0, damping: 1 }, 800, 600);

      expect(bug.x).toBe(800);
    });

    it('wraps around to the top edge when moving off the bottom edge', () => {
      const bug = createBugCreature(0, 0, 1);
      bug.crawlSpeed = 0;
      bug.y = 600 + 1;

      updateBug(bug, { x: 500, y: 500 }, { repelRadius: 0, repelStrength: 0, springStrength: 0, damping: 1 }, 800, 600);

      expect(bug.y).toBe(-bug.h);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/bugCreature.test.ts`
Expected: FAIL — `updateBug` is not exported, `crawlAngle`/`crawlSpeed`/`nextTurn` don't exist on the returned object, `getBugRotation` has the wrong signature.

- [ ] **Step 3: Implement crawl physics in `BugCreature.ts`**

Replace the full contents of `src/creatures/BugCreature.ts` with:

```ts
import type { Creature } from "./creatureTypes.js";
import type { PhysicsParams } from "./creaturePhysics.js";

export const BUG_NAT_W = 100;
export const BUG_NAT_H = 80;

export interface BugCreature extends Creature {
  crawlAngle: number;
  crawlSpeed: number;
  nextTurn: number;
}

export function createBugCreature(
  hx: number,
  hy: number,
  scale: number,
): BugCreature {
  const w = BUG_NAT_W * scale;
  const h = BUG_NAT_H * scale;

  const el = document.createElement('div');
  el.className = 'wrap';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.position = 'absolute';
  el.style.pointerEvents = 'none';
  el.style.willChange = 'transform';

  const img = document.createElement('img');
  img.src = '/creatures/bug.svg';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.display = 'block';
  img.draggable = false;
  el.appendChild(img);

  return {
    el,
    hx,
    hy,
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    scale,
    w,
    h,
    crawlAngle: Math.random() * Math.PI * 2,
    crawlSpeed: 0.5 + Math.random() * 1.5,
    nextTurn: Date.now() + 1000 + Math.random() * 3000,
  };
}

export function updateBug(
  bug: BugCreature,
  avatar: { x: number; y: number },
  params: PhysicsParams,
  vw: number,
  vh: number,
): void {
  const now = Date.now();

  // Random crawling behavior
  if (now > bug.nextTurn) {
    bug.crawlAngle += (Math.random() - 0.5) * Math.PI;
    bug.nextTurn = now + 1000 + Math.random() * 3000;
  }

  // Add crawling velocity
  const crawlVx = Math.cos(bug.crawlAngle) * bug.crawlSpeed;
  const crawlVy = Math.sin(bug.crawlAngle) * bug.crawlSpeed;

  // Apply repulsion from avatar
  const dx = bug.x - avatar.x;
  const dy = bug.y - avatar.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  let fx = (bug.hx - bug.x) * params.springStrength;
  let fy = (bug.hy - bug.y) * params.springStrength;

  if (dist < params.repelRadius) {
    const f = (1 - dist / params.repelRadius) * params.repelStrength;
    fx += (dx / dist) * f;
    fy += (dy / dist) * f;
  }

  // Combine crawling with physics
  bug.vx = (bug.vx + fx + crawlVx) * params.damping;
  bug.vy = (bug.vy + fy + crawlVy) * params.damping;
  bug.x += bug.vx;
  bug.y += bug.vy;

  // Wrap around screen edges
  if (bug.x < -bug.w) bug.x = vw;
  if (bug.x > vw) bug.x = -bug.w;
  if (bug.y < -bug.h) bug.y = vh;
  if (bug.y > vh) bug.y = -bug.h;
}

export function getBugRotation(bug: BugCreature): number {
  // Rotate to face crawling direction
  return bug.crawlAngle * (180 / Math.PI) + 180;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/bugCreature.test.ts`
Expected: PASS (all tests green)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No new errors from `BugCreature.ts` (the pre-existing `Hud.ts` null-check errors are fixed in Task 4).

- [ ] **Step 6: Commit**

```bash
git add src/creatures/BugCreature.ts tests/unit/bugCreature.test.ts
git commit -m "feat: add crawl physics to BugCreature"
```

---

### Task 2: Create `BugSwarm` overlay

**Files:**
- Create: `src/creatures/BugSwarm.ts`
- Test: `tests/unit/bugSwarm.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/bugSwarm.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/bugSwarm.test.ts`
Expected: FAIL with "Failed to resolve import" / module not found for `../../src/creatures/BugSwarm`.

- [ ] **Step 3: Implement `BugSwarm.ts`**

Create `src/creatures/BugSwarm.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/bugSwarm.test.ts`
Expected: PASS (all tests green)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No new errors from `BugSwarm.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/creatures/BugSwarm.ts tests/unit/bugSwarm.test.ts
git commit -m "feat: add BugSwarm overlay for crawling bugs"
```

---

### Task 3: Promote Cockroach mode into the primary HUD row, fix null-check errors

**Files:**
- Modify: `src/hud/Hud.ts`
- Test: `tests/unit/hud.test.ts`

- [ ] **Step 1: Replace `tests/unit/hud.test.ts` with the target behavior**

Replace the full contents of `tests/unit/hud.test.ts` with:

```ts
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hud } from "../../src/hud/Hud";
import type { CreatureMode } from "../../src/creatures/creatureTypes";

describe("Hud", () => {
  let host: HTMLElement;
  let hud: Hud;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    hud = new Hud();
    hud.attachTo(host);
  });

  afterEach(() => {
    hud.destroy();
    host.remove();
  });

  describe("DOM structure", () => {
    it("creates root with correct attributes", () => {
      const root = host.querySelector(".premium-hud");
      expect(root).toBeTruthy();
      expect(root?.getAttribute("role")).toBe("toolbar");
      expect(root?.getAttribute("aria-label")).toBe("Game controls");
    });

    it("creates drag handle", () => {
      const handle = host.querySelector(".hud-drag-handle");
      expect(handle).toBeTruthy();
      expect(handle?.getAttribute("aria-label")).toBe("Drag to move");
      expect(handle?.querySelector("svg")).toBeTruthy();
    });

    it("creates mode buttons with correct classes", () => {
      const eyeBtn = host.querySelector(".hud-btn--eye");
      const cockroachBtn = host.querySelector(".hud-btn--bug");
      const handBtn = host.querySelector(".hud-btn--hand");

      expect(eyeBtn).toBeTruthy();
      expect(cockroachBtn).toBeTruthy();
      expect(handBtn).toBeTruthy();
    });

    it("creates attack button", () => {
      const attackBtn = host.querySelector(".hud-attack");
      expect(attackBtn).toBeTruthy();
      expect(attackBtn?.getAttribute("aria-label")).toBe("Attack");
      expect(attackBtn?.querySelector("span")?.textContent).toBe("Protest");
    });

    it("creates utility buttons", () => {
      const bugModeBtn = host.querySelector(".hud-btn--bug-mode");
      const settingsBtn = host.querySelector(".hud-btn--settings");
      const galleryBtn = host.querySelector(".hud-btn--gallery");

      expect(bugModeBtn).toBeTruthy();
      expect(settingsBtn).toBeTruthy();
      expect(galleryBtn).toBeTruthy();
    });
  });

  describe("mode buttons", () => {
    it("has eye mode active by default", () => {
      const eyeBtn = host.querySelector(".hud-btn--eye");
      expect(eyeBtn?.classList.contains("active")).toBe(true);
      expect(eyeBtn?.getAttribute("aria-pressed")).toBe("true");
    });

    it("toggles active state when clicked", () => {
      const cockroachBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug");
      cockroachBtn?.click();

      const eyeBtn = host.querySelector(".hud-btn--eye");
      const handBtn = host.querySelector(".hud-btn--hand");

      expect(cockroachBtn?.classList.contains("active")).toBe(true);
      expect(cockroachBtn?.getAttribute("aria-pressed")).toBe("true");
      expect(eyeBtn?.classList.contains("active")).toBe(false);
      expect(eyeBtn?.getAttribute("aria-pressed")).toBe("false");
      expect(handBtn?.classList.contains("active")).toBe(false);
      expect(handBtn?.getAttribute("aria-pressed")).toBe("false");
    });

    it("fires mode change event with correct mode", () => {
      let firedMode: CreatureMode | null = null;
      hud.onModeChange((mode) => {
        firedMode = mode;
      });

      const cockroachBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug");
      cockroachBtn?.click();

      expect(firedMode).toBe("cockroach");
    });

    it("setActiveMode updates UI correctly", () => {
      hud.setActiveMode("pointedFinger");

      const handBtn = host.querySelector(".hud-btn--hand");
      const eyeBtn = host.querySelector(".hud-btn--eye");

      expect(handBtn?.classList.contains("active")).toBe(true);
      expect(handBtn?.getAttribute("aria-pressed")).toBe("true");
      expect(eyeBtn?.classList.contains("active")).toBe(false);
      expect(eyeBtn?.getAttribute("aria-pressed")).toBe("false");
    });
  });

  describe("bug mode toggle", () => {
    it("is inactive by default", () => {
      expect(hud.isBugModeActive()).toBe(false);
      const bugModeBtn = host.querySelector(".hud-btn--bug-mode");
      expect(bugModeBtn?.classList.contains("active")).toBe(false);
      expect(bugModeBtn?.getAttribute("aria-pressed")).toBe("false");
    });

    it("toggles active state on click", () => {
      const bugModeBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug-mode");
      bugModeBtn?.click();

      expect(hud.isBugModeActive()).toBe(true);
      expect(bugModeBtn?.classList.contains("active")).toBe(true);
      expect(bugModeBtn?.getAttribute("aria-pressed")).toBe("true");

      bugModeBtn?.click();

      expect(hud.isBugModeActive()).toBe(false);
      expect(bugModeBtn?.classList.contains("active")).toBe(false);
      expect(bugModeBtn?.getAttribute("aria-pressed")).toBe("false");
    });

    it("fires the bug mode toggle callback with the new state", () => {
      const states: boolean[] = [];
      hud.onBugModeToggle((active) => states.push(active));

      const bugModeBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug-mode");
      bugModeBtn?.click();
      bugModeBtn?.click();

      expect(states).toEqual([true, false]);
    });

    it("does not change the active creature mode", () => {
      const bugModeBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug-mode");
      bugModeBtn?.click();

      expect(hud.getActiveMode()).toBe("eyes");
    });
  });

  describe("attack button", () => {
    it("fires attack press event on pointerdown", () => {
      let pressed = false;
      hud.onAttackPress(() => {
        pressed = true;
      });

      const attackBtn = host.querySelector<HTMLButtonElement>(".hud-attack");
      attackBtn?.dispatchEvent(new PointerEvent("pointerdown"));

      expect(pressed).toBe(true);
    });

    it("fires attack release event on pointerup", () => {
      let released = false;
      hud.onAttackRelease(() => {
        released = true;
      });

      const attackBtn = host.querySelector<HTMLButtonElement>(".hud-attack");
      attackBtn?.dispatchEvent(new PointerEvent("pointerup"));

      expect(released).toBe(true);
    });
  });

  describe("drag handle", () => {
    it("supports mouse drag", () => {
      const handle = host.querySelector<HTMLDivElement>(".hud-drag-handle");
      const root = host.querySelector<HTMLElement>(".premium-hud");

      handle?.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10 }));
      document.dispatchEvent(new PointerEvent("pointermove", { clientX: 50, clientY: 50 }));

      expect(root?.style.left).toBe("40px");
      expect(root?.style.top).toBe("40px");
      expect(root?.classList.contains("hud--dragging")).toBe(true);

      document.dispatchEvent(new PointerEvent("pointerup"));
      expect(root?.classList.contains("hud--dragging")).toBe(false);
    });

    it("cleans up drag listeners on destroy", () => {
      const handle = host.querySelector<HTMLDivElement>(".hud-drag-handle");
      const removeSpy = vi.spyOn(document, "removeEventListener");

      handle?.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10 }));
      hud.destroy();

      expect(removeSpy).toHaveBeenCalled();
      removeSpy.mockRestore();
    });
  });

  describe("tooltips", () => {
    it("has tooltips on all buttons", () => {
      const eyeBtn = host.querySelector(".hud-btn--eye");
      const cockroachBtn = host.querySelector(".hud-btn--bug");
      const handBtn = host.querySelector(".hud-btn--hand");
      const bugModeBtn = host.querySelector(".hud-btn--bug-mode");
      const settingsBtn = host.querySelector(".hud-btn--settings");
      const galleryBtn = host.querySelector(".hud-btn--gallery");

      expect(eyeBtn?.getAttribute("data-tooltip")).toBe("Eye Mode");
      expect(cockroachBtn?.getAttribute("data-tooltip")).toBe("Cockroach Mode");
      expect(handBtn?.getAttribute("data-tooltip")).toBe("Point Mode");
      expect(bugModeBtn?.getAttribute("data-tooltip")).toBe("Bug Mode");
      expect(settingsBtn?.getAttribute("data-tooltip")).toBe("Settings");
      expect(galleryBtn?.getAttribute("data-tooltip")).toBe("Grid View");
    });
  });

  describe("ARIA labels", () => {
    it("has correct aria-labels on all buttons", () => {
      const eyeBtn = host.querySelector(".hud-btn--eye");
      const cockroachBtn = host.querySelector(".hud-btn--bug");
      const handBtn = host.querySelector(".hud-btn--hand");
      const attackBtn = host.querySelector(".hud-attack");
      const bugModeBtn = host.querySelector(".hud-btn--bug-mode");
      const settingsBtn = host.querySelector(".hud-btn--settings");
      const galleryBtn = host.querySelector(".hud-btn--gallery");

      expect(eyeBtn?.getAttribute("aria-label")).toBe("Eye Mode");
      expect(cockroachBtn?.getAttribute("aria-label")).toBe("Cockroach Mode");
      expect(handBtn?.getAttribute("aria-label")).toBe("Point Mode");
      expect(attackBtn?.getAttribute("aria-label")).toBe("Attack");
      expect(bugModeBtn?.getAttribute("aria-label")).toBe("Bug Mode");
      expect(settingsBtn?.getAttribute("aria-label")).toBe("Settings");
      expect(galleryBtn?.getAttribute("aria-label")).toBe("Grid View");
    });
  });

  describe("SVG icons", () => {
    it("has SVG icons in all icon buttons", () => {
      const buttons = host.querySelectorAll(".hud-btn");
      buttons.forEach((btn) => {
        const svg = btn.querySelector("svg");
        expect(svg).toBeTruthy();
      });
    });

    it("has text content in attack button", () => {
      const attackBtn = host.querySelector(".hud-attack");
      const span = attackBtn?.querySelector("span");
      expect(span?.textContent).toBe("Protest");
    });
  });

  describe("getActiveMode", () => {
    it("returns current active mode", () => {
      expect(hud.getActiveMode()).toBe("eyes");

      hud.setActiveMode("cockroach");
      expect(hud.getActiveMode()).toBe("cockroach");

      hud.setActiveMode("pointedFinger");
      expect(hud.getActiveMode()).toBe("pointedFinger");
    });
  });

  describe("destroy", () => {
    it("removes HUD from DOM", () => {
      expect(host.querySelector(".premium-hud")).toBeTruthy();
      hud.destroy();
      expect(host.querySelector(".premium-hud")).toBeFalsy();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify the expected failures**

Run: `npx vitest run tests/unit/hud.test.ts`
Expected: FAIL — `.hud-btn--bug` doesn't exist yet as a mode button, `.hud-btn--cockroach` still exists as the old utility button so "creates utility buttons" and toggle/tooltip/aria tests fail.

- [ ] **Step 3: Update `MODE_BTNS` and remove the standalone cockroach button**

In `src/hud/Hud.ts`, replace:

```ts
const MODE_BTNS: readonly ModeBtnDef[] = [
  { mode: "eyes", cssClass: "hud-btn--eye", tooltip: "Eye Mode", ariaLabel: "Eye Mode", svg: SVG_EYE },
  { mode: "pointedFinger", cssClass: "hud-btn--hand", tooltip: "Point Mode", ariaLabel: "Point Mode", svg: SVG_HAND },
];
```

with:

```ts
const MODE_BTNS: readonly ModeBtnDef[] = [
  { mode: "eyes", cssClass: "hud-btn--eye", tooltip: "Eye Mode", ariaLabel: "Eye Mode", svg: SVG_EYE },
  { mode: "cockroach", cssClass: "hud-btn--bug", tooltip: "Cockroach Mode", ariaLabel: "Cockroach Mode", svg: SVG_COCKROACH },
  { mode: "pointedFinger", cssClass: "hud-btn--hand", tooltip: "Point Mode", ariaLabel: "Point Mode", svg: SVG_HAND },
];
```

- [ ] **Step 4: Remove the `cockroachBtn` field**

Replace:

```ts
  private cockroachBtn: HTMLButtonElement | null = null;
  private bugModeBtn: HTMLButtonElement | null = null;
```

with:

```ts
  private bugModeBtn: HTMLButtonElement | null = null;
```

- [ ] **Step 5: Replace the constructor's cockroach/bug-mode button block**

Replace:

```ts
    root.appendChild(this.buildAttackBtn());
    this.cockroachBtn = this.buildUtilityBtn("hud-btn--cockroach", "Cockroach Mode", SVG_COCKROACH);
    this.cockroachBtn.addEventListener("click", () => {
      this.activeMode = "cockroach";
      this.setActiveMode("cockroach");
      this.modeChangeCb?.("cockroach");
    });
    root.appendChild(this.cockroachBtn);
    this.bugModeBtn = this.buildUtilityBtn("hud-btn--bug-mode", "Bug Mode", SVG_BUG);
    this.bugModeBtn.addEventListener("click", () => {
      this.bugModeActive = !this.bugModeActive;
      this.bugModeBtn.classList.toggle("active", this.bugModeActive);
      this.bugModeBtn.setAttribute("aria-pressed", String(this.bugModeActive));
      this.bugModeToggleCb?.(this.bugModeActive);
    });
    root.appendChild(this.bugModeBtn);
```

with:

```ts
    root.appendChild(this.buildAttackBtn());
    this.bugModeBtn = this.buildUtilityBtn("hud-btn--bug-mode", "Bug Mode", SVG_BUG);
    const bugModeBtn = this.bugModeBtn;
    bugModeBtn.setAttribute("aria-pressed", "false");
    bugModeBtn.addEventListener("click", () => {
      this.bugModeActive = !this.bugModeActive;
      bugModeBtn.classList.toggle("active", this.bugModeActive);
      bugModeBtn.setAttribute("aria-pressed", String(this.bugModeActive));
      this.bugModeToggleCb?.(this.bugModeActive);
    });
    root.appendChild(this.bugModeBtn);
```

This also fixes the pre-existing `TS2531: Object is possibly 'null'` errors, since the closure now captures the non-null local `bugModeBtn` instead of `this.bugModeBtn`.

- [ ] **Step 6: Simplify `setActiveMode`**

Replace:

```ts
  setActiveMode(mode: CreatureMode): void {
    this.activeMode = mode;
    for (const [m, btn] of this.modeBtnEls) {
      btn.classList.toggle("active", m === mode);
      btn.setAttribute("aria-pressed", String(m === mode));
    }
    if (this.cockroachBtn) {
      this.cockroachBtn.classList.toggle("active", mode === "cockroach");
      this.cockroachBtn.setAttribute("aria-pressed", String(mode === "cockroach"));
    }
  }
```

with:

```ts
  setActiveMode(mode: CreatureMode): void {
    this.activeMode = mode;
    for (const [m, btn] of this.modeBtnEls) {
      btn.classList.toggle("active", m === mode);
      btn.setAttribute("aria-pressed", String(m === mode));
    }
  }
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/unit/hud.test.ts`
Expected: PASS (all tests green)

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/hud/Hud.ts tests/unit/hud.test.ts
git commit -m "feat: promote cockroach into primary HUD mode row"
```

---

### Task 4: Style the Bug Mode toggle's active state, clean up dead CSS

**Files:**
- Modify: `src/hud/hud.css`

- [ ] **Step 1: Remove the now-unused `.hud-btn--cockroach` selector**

In `src/hud/hud.css`, replace:

```css
.hud-btn--cockroach,
.hud-btn--gallery,
.hud-btn--settings {
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 70%);
  border-radius: 50%;
}
```

with:

```css
.hud-btn--gallery,
.hud-btn--settings,
.hud-btn--bug-mode {
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 70%);
  border-radius: 50%;
}

/* Bug Mode toggle — subtle highlight, distinct from the bold mode-button gradients */
.hud-btn--bug-mode.active {
  background: radial-gradient(ellipse at center, rgba(116, 212, 231, 0.45) 0%, rgba(116, 212, 231, 0.12) 70%);
  box-shadow: 0 0 0 2px rgba(58, 133, 186, 0.35);
}
```

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`

Open the app and confirm:
- Cockroach mode button sits between Eye and Point in the main row, and turns cyan when active (like Eye/Point).
- Bug Mode toggle button (next to Settings/Gallery) shows a light cyan ring/tint when toggled on, and reverts when toggled off — visibly different from the mode buttons' bold gradient.

- [ ] **Step 3: Commit**

```bash
git add src/hud/hud.css
git commit -m "style: subtle active state for Bug Mode toggle, remove dead cockroach utility CSS"
```

---

### Task 5: Wire `BugSwarm` into `main.ts`

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Import `BugSwarm` and instantiate it**

In `src/main.ts`, replace:

```ts
import { Engine } from "./core/Engine";
import { CreatureGrid } from "./creatures/CreatureGrid";
import { DraggableAvatar } from "./creatures/DraggableAvatar";
import { Hud } from "./hud/Hud";
import { FilterPanel } from "./hud/FilterPanel";
import { GalleryPanel } from "./hud/GalleryPanel";
```

with:

```ts
import { Engine } from "./core/Engine";
import { CreatureGrid } from "./creatures/CreatureGrid";
import { BugSwarm } from "./creatures/BugSwarm";
import { DraggableAvatar } from "./creatures/DraggableAvatar";
import { Hud } from "./hud/Hud";
import { FilterPanel } from "./hud/FilterPanel";
import { GalleryPanel } from "./hud/GalleryPanel";
```

- [ ] **Step 2: Create the swarm and wire the toggle callback**

Replace:

```ts
  const grid = new CreatureGrid({
    container,
    mode: "eyes",
  });
  await grid.init();

  const hud = new Hud();
```

with:

```ts
  const grid = new CreatureGrid({
    container,
    mode: "eyes",
  });
  await grid.init();

  const bugSwarm = new BugSwarm(container);

  const hud = new Hud();
```

Then replace:

```ts
  hud.onModeChange((mode) => {
    grid.switchMode(mode);
  });
```

with:

```ts
  hud.onModeChange((mode) => {
    grid.switchMode(mode);
  });

  hud.onBugModeToggle((active) => {
    bugSwarm.setActive(active);
  });
```

- [ ] **Step 3: Tick the swarm alongside the grid**

Replace:

```ts
  const engine = new Engine();
  engine.onTick(() => {
    const center = avatar.getCenter();
    grid.update(center.x, center.y);
  });
  engine.start();
```

with:

```ts
  const engine = new Engine();
  engine.onTick(() => {
    const center = avatar.getCenter();
    grid.update(center.x, center.y);
    bugSwarm.update(center.x, center.y);
  });
  engine.start();
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`

Open the app and confirm:
- Toggling Bug Mode on spawns ~20 small flat bugs crawling and wandering across the screen, fleeing the draggable avatar, in Eye mode.
- Switching to Point mode and then Cockroach mode while Bug Mode stays on keeps the swarm visible and unaffected by the mode switch.
- Toggling Bug Mode off removes the swarm; toggling it back on respawns a fresh batch.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire BugSwarm toggle into main"
```

---

### Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All test files pass, including `tests/unit/hud.test.ts`, `tests/unit/bugCreature.test.ts`, `tests/unit/bugSwarm.test.ts`, and every previously-passing file (`creatureGrid.test.ts`, `cockroachCreature.test.ts`, etc. — unaffected by this change).

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: Typecheck and Vite build both succeed with no errors.

- [ ] **Step 3: Final manual smoke test**

Run: `npm run dev` and confirm, in one pass:
- Eye, Cockroach, Point mode buttons all sit in the primary row and switch modes correctly.
- Bug Mode toggle works independently of the active primary mode.
- No console errors during mode switches or toggle clicks.
