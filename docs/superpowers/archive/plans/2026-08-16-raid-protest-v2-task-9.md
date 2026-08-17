# Raid/Protest v2 Implementation Plan — Task 9

> Part of [2026-08-16-raid-protest-v2.md](2026-08-16-raid-protest-v2.md) — see that file for the plan header, execution instructions, and the full task index. Continues from [Task 8](2026-08-16-raid-protest-v2-task-8.md).

## Task 9: Power meter component + gated despawn

**Files:**
- Create: `src/hud/PowerMeter.ts`
- Create: `src/hud/powerMeter.css`
- Test: `tests/unit/powerMeter.test.ts` (new)
- Modify: `src/creatures/RaidController.ts:90-92,290-303`
- Modify: `src/main.ts:216-235`
- Test: `tests/unit/raidController.test.ts`

- [ ] **Step 1: Write the failing PowerMeter tests**

Create `tests/unit/powerMeter.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { PowerMeter } from '../../src/hud/PowerMeter';

describe('PowerMeter', () => {
  it('renders Weak and High labels and a track with a marker', () => {
    const meter = new PowerMeter();
    const labels = meter.root.querySelectorAll('.power-meter__label');
    expect(labels).toHaveLength(2);
    expect(labels[0]!.textContent).toBe('Weak');
    expect(labels[1]!.textContent).toBe('High');
    expect(meter.root.querySelector('.power-meter__track')).not.toBeNull();
    expect(meter.root.querySelector('.power-meter__marker')).not.toBeNull();
  });

  it('attachTo appends its root to the given container', () => {
    const meter = new PowerMeter();
    const container = document.createElement('div');
    meter.attachTo(container);
    expect(container.contains(meter.root)).toBe(true);
  });

  it('setFraction(0) places the marker at the left edge', () => {
    const meter = new PowerMeter();
    meter.setFraction(0);
    const marker = meter.root.querySelector('.power-meter__marker') as HTMLElement;
    expect(marker.style.left).toBe('0%');
  });

  it('setFraction(1) places the marker at the right edge', () => {
    const meter = new PowerMeter();
    meter.setFraction(1);
    const marker = meter.root.querySelector('.power-meter__marker') as HTMLElement;
    expect(marker.style.left).toBe('100%');
  });

  it('setFraction(0.5) places the marker at the midpoint', () => {
    const meter = new PowerMeter();
    meter.setFraction(0.5);
    const marker = meter.root.querySelector('.power-meter__marker') as HTMLElement;
    expect(marker.style.left).toBe('50%');
  });

  it('clamps fraction to [0,1]', () => {
    const meter = new PowerMeter();
    meter.setFraction(1.5);
    expect(meter.getFraction()).toBe(1);
    meter.setFraction(-1);
    expect(meter.getFraction()).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- powerMeter`
Expected: FAIL — `src/hud/PowerMeter.ts` doesn't exist yet.

- [ ] **Step 3: Create `powerMeter.css`**

Create `src/hud/powerMeter.css`:

```css
/* ============================================
   Power Meter — Protest strength (Figma node 431:10191)
   Child of .premium-hud (see PowerMeter.ts) so it drags/scales with the HUD
   for free — no independent position-tracking or width-measurement code.
   ============================================ */
.power-meter {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: calc(10px + var(--hud-density) * 0.02232143);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(8px + var(--hud-density) * 0.01785714);
  padding: calc(6px + var(--hud-density) * 0.00892857) calc(14px + var(--hud-density) * 0.01785714);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid #fff;
  border-radius: calc(40px + var(--hud-density) * 0.09375);
  box-shadow: 0px 1px 0px #fff, 0px 24px 40px rgba(97, 86, 80, 0.25);
  pointer-events: none;
}

.power-meter__label {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: calc(9px + var(--hud-density) * 0.00223214);
  font-weight: 400;
  text-transform: uppercase;
  color: #38332f;
  white-space: nowrap;
  flex-shrink: 0;
}

.power-meter__track {
  position: relative;
  flex: 1;
  height: calc(5px + var(--hud-density) * 0.00223214);
  border-radius: 40px;
  background: linear-gradient(90deg, #d0bb33 0%, #2ebc24 50%, #bc4724 100%);
}

.power-meter__marker {
  position: absolute;
  top: 50%;
  width: calc(6px + var(--hud-density) * 0.00223214);
  height: calc(22px + var(--hud-density) * 0.01116071);
  transform: translate(-50%, -50%);
  background: #38332f;
  border-radius: 2px;
  transition: left 0.05s linear;
}
```

- [ ] **Step 4: Create `PowerMeter.ts`**

Create `src/hud/PowerMeter.ts`:

```ts
import "./powerMeter.css";

export class PowerMeter {
  readonly root: HTMLElement;
  private readonly marker: HTMLElement;
  private fraction = 0;

  constructor() {
    const root = document.createElement("div");
    root.className = "power-meter";
    root.setAttribute("role", "meter");
    root.setAttribute("aria-label", "Protest strength");
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", "100");
    this.root = root;

    const weakLabel = document.createElement("span");
    weakLabel.className = "power-meter__label";
    weakLabel.textContent = "Weak";
    root.appendChild(weakLabel);

    const track = document.createElement("div");
    track.className = "power-meter__track";
    root.appendChild(track);

    const marker = document.createElement("div");
    marker.className = "power-meter__marker";
    track.appendChild(marker);
    this.marker = marker;

    const highLabel = document.createElement("span");
    highLabel.className = "power-meter__label";
    highLabel.textContent = "High";
    root.appendChild(highLabel);

    this.setFraction(0);
  }

  attachTo(container: HTMLElement): void {
    container.appendChild(this.root);
  }

  setFraction(fraction: number): void {
    this.fraction = Math.max(0, Math.min(1, fraction));
    const pct = this.fraction * 100;
    this.marker.style.left = `${pct}%`;
    this.root.setAttribute("aria-valuenow", String(Math.round(pct)));
  }

  getFraction(): number {
    return this.fraction;
  }

  destroy(): void {
    this.root.remove();
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- powerMeter`
Expected: PASS

- [ ] **Step 6: Write a failing test for the gated-despawn threshold**

In `tests/unit/raidController.test.ts`, add this test inside `describe('charge/release protest mechanic', ...)`, after the throttle test added in Task 6:

```ts
    it('holds security steady in the WEAK/MEDIUM zone and only starts clearing past CHARGE_HIGH_THRESHOLD', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;

      raid.startCharging();

      // 900ms of 1800 = fraction 0.5, below CHARGE_HIGH_THRESHOLD (0.66).
      tRef.t += 900;
      raid.tick(tRef.t);
      expect(raid.getChargeFraction()).toBeCloseTo(0.5, 1);
      expect(raid.getSecurityUnits().length).toBe(spawned);

      // Cross into the high zone (fraction ~0.83) and let the shrink sweep
      // run — units are marked 'shrinking' the instant the threshold is
      // crossed, but getSecurityUnits() still reports them until a later
      // tick's sweep actually removes them (same pattern as the existing
      // full-charge-completion test above).
      tRef.t += 600;
      raid.tick(tRef.t);
      expect(raid.getChargeFraction()).toBeGreaterThan(0.66);
      tRef.t += SECURITY_SHRINK_MS;
      raid.tick(tRef.t);
      expect(raid.getSecurityUnits().length).toBeLessThan(spawned);

      now.mockRestore();
    });
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm test -- raidController -t "holds security steady"`
Expected: FAIL — the current implementation starts shrinking security units immediately as charge progresses, so `getSecurityUnits().length` is already less than `spawned` at fraction 0.5.

- [ ] **Step 8: Implement the gated threshold**

In `src/creatures/RaidController.ts`, add a new constant after `CHARGE_DURATION_MS`:

```ts
/** Security only starts clearing once charge crosses this fraction (the Figma power
 * meter's HIGH zone) — holding in WEAK/MEDIUM visibly fills the meter but doesn't yet
 * shrink security. The separate crowd-rebuild (`rebuilt`, below) is NOT gated by this —
 * it keeps progressing continuously across the whole 0-1 hold. */
export const CHARGE_HIGH_THRESHOLD = 0.66;
```

In `tick()`, change the shrink logic from:

```ts
    const keepCount = Math.round(this.chargeBaselineUnitCount * (1 - fraction));
    let excess = this.units.filter((u) => u.phase !== "shrinking").length - keepCount;
    for (const unit of this.units) {
      if (excess <= 0) break;
      if (unit.phase === "shrinking") continue;
      unit.phase = "shrinking";
      unit.phaseStartMs = nowMs;
      excess--;
    }
```

to:

```ts
    if (fraction >= CHARGE_HIGH_THRESHOLD) {
      const highProgress = (fraction - CHARGE_HIGH_THRESHOLD) / (1 - CHARGE_HIGH_THRESHOLD);
      const keepCount = Math.round(this.chargeBaselineUnitCount * (1 - highProgress));
      let excess = this.units.filter((u) => u.phase !== "shrinking").length - keepCount;
      for (const unit of this.units) {
        if (excess <= 0) break;
        if (unit.phase === "shrinking") continue;
        unit.phase = "shrinking";
        unit.phaseStartMs = nowMs;
        excess--;
      }
    }
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- raidController`
Expected: PASS — including the existing `'charges progressively while held, rebuilding the crowd, and completes at full charge'` test, since `highProgress` still reaches exactly 1 (and `keepCount` exactly 0) at `fraction = 1`.

- [ ] **Step 10: Wire PowerMeter into main.ts**

In `src/main.ts`, add the import:

```ts
import { RaidController } from "./creatures/RaidController";
```

becomes:

```ts
import { RaidController } from "./creatures/RaidController";
import { PowerMeter } from "./hud/PowerMeter";
```

In `mountPostOnboarding`, after the HUD is built and before the Protest button listeners (around the existing `const protestBtn = hud.getProtestButton();` line), add:

```ts
    const powerMeter = new PowerMeter();
    powerMeter.attachTo(hud.getRoot());
```

Then in the same function's `engine.onTick` callback (the one syncing `--charge`), add the meter sync:

```ts
    let prevRaidState = raidController.getState();
    engine.onTick(() => {
      protestBtn.style.setProperty("--charge", String(raidController.getChargeFraction()));
      const raidState = raidController.getState();
      if (raidState === "idle" && prevRaidState !== "idle") {
        filterPanel.setQuantity(grid.getCreatureCount());
      }
      prevRaidState = raidState;
    });
```

becomes:

```ts
    let prevRaidState = raidController.getState();
    engine.onTick(() => {
      protestBtn.style.setProperty("--charge", String(raidController.getChargeFraction()));
      powerMeter.setFraction(raidController.getChargeFraction());
      const raidState = raidController.getState();
      if (raidState === "idle" && prevRaidState !== "idle") {
        filterPanel.setQuantity(grid.getCreatureCount());
      }
      prevRaidState = raidState;
    });
```

- [ ] **Step 11: Run the full suite and build**

Run: `npm test && npm run build`
Expected: Both succeed; no new failures beyond the known baseline.

- [ ] **Step 12: Commit**

```bash
git add src/hud/PowerMeter.ts src/hud/powerMeter.css tests/unit/powerMeter.test.ts src/creatures/RaidController.ts src/main.ts tests/unit/raidController.test.ts
git commit -m "feat: add Figma-matched power meter; gate security despawn behind the HIGH zone"
```

- [ ] **Step 13: Manual verification (human testing)**

Run `npm run dev`, trigger a raid, and hold the Protest button. Confirm: the power meter appears above the HUD, matches its width, and its marker slides from WEAK to HIGH as you hold. Security should visibly hold steady through WEAK/MEDIUM and only start clearing once the marker crosses into HIGH. Release early and confirm the full snap-back still happens. Drag the HUD to a new position and confirm the meter moves with it.

---


---

Continued in [2026-08-16-raid-protest-v2-tasks-10-11.md](2026-08-16-raid-protest-v2-tasks-10-11.md).
