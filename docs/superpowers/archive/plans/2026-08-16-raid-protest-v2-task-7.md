# Raid/Protest v2 Implementation Plan — Task 7

> Part of [2026-08-16-raid-protest-v2.md](2026-08-16-raid-protest-v2.md) — see that file for the plan header, execution instructions, and the full task index. Continues from [Tasks 5-6](2026-08-16-raid-protest-v2-tasks-5-6.md).

## Task 7: Z-index parity via shared stacking context

**Files:**
- Modify: `src/creatures/SecurityCreature.ts:24-26`
- Modify: `src/creatures/RaidController.ts:94-98,135-139,159-180,236-241`
- Modify: `src/main.ts:65-101`
- Test: `tests/unit/securityCreature.test.ts:85-90`
- Test: `tests/unit/raidController.test.ts`

- [ ] **Step 1: Update the failing test in securityCreature.test.ts**

Replace the `'renders below the avatar/sticker z-index (100)'` test (lines 86-90) with:

```ts
    it('renders at the avatar/sticker z-index (100) — meaningful once units share its stacking context', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      expect(unit.el.style.zIndex).toBe(String(SECURITY_Z_INDEX));
      expect(SECURITY_Z_INDEX).toBe(100);
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- securityCreature -t "z-index"`
Expected: FAIL — `SECURITY_Z_INDEX` is currently `90`, not `100`.

- [ ] **Step 3: Update the z-index constant and its doc comment**

In `src/creatures/SecurityCreature.ts`, replace:

```ts
/** Strictly below the avatar/sticker's z-index (100, see StickerOverlay.STICKER_Z_INDEX)
 * so security can never render above the avatar, regardless of DOM append order. */
export const SECURITY_Z_INDEX = 90;
```

with:

```ts
/** Equal to the avatar/sticker's z-index (100, see StickerOverlay.STICKER_Z_INDEX). Security
 * units are appended into the avatar's own DOM parent (see RaidController's `avatarLayer`
 * config, not the `#stage` container used for viewport-size reads) so this comparison is
 * actually meaningful — `#stage` itself sits at z-index 500 in index.html, so anything
 * appended inside it would outrank the avatar regardless of its own z-index. With both in
 * the same stacking context and the same z-index, the avatar staying on top is guaranteed
 * by DOM order instead: main.ts re-appends the avatar element to the end of its parent
 * every frame a raid is active, so it's always the later — and therefore topmost — sibling
 * at this tie. */
export const SECURITY_Z_INDEX = 100;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- securityCreature -t "z-index"`
Expected: PASS

- [ ] **Step 5: Add `avatarLayer` to RaidController and use it as the append target**

In `src/creatures/RaidController.ts`, add `avatarLayer` to the config interface:

```ts
export interface RaidControllerConfig {
  container: HTMLElement;
  grid: CreatureGrid;
  onSecurityRemoved?: (x: number, y: number, w: number, h: number) => void;
}
```

becomes:

```ts
export interface RaidControllerConfig {
  container: HTMLElement;
  grid: CreatureGrid;
  /** DOM parent security units are appended into — must be the avatar's own parent (not
   * `#stage`, which establishes a higher-z-index stacking context) so SECURITY_Z_INDEX vs
   * StickerOverlay.STICKER_Z_INDEX comparisons are meaningful. `container` is still used,
   * unchanged, for viewport-size reads. */
  avatarLayer: HTMLElement;
  onSecurityRemoved?: (x: number, y: number, w: number, h: number) => void;
}
```

Add the field and constructor assignment:

```ts
  private readonly container: HTMLElement;
  private readonly grid: CreatureGrid;
  private readonly onSecurityRemoved: ((x: number, y: number, w: number, h: number) => void) | null;
```

becomes:

```ts
  private readonly container: HTMLElement;
  private readonly grid: CreatureGrid;
  private readonly avatarLayer: HTMLElement;
  private readonly onSecurityRemoved: ((x: number, y: number, w: number, h: number) => void) | null;
```

```ts
  constructor(config: RaidControllerConfig) {
    this.container = config.container;
    this.grid = config.grid;
    this.onSecurityRemoved = config.onSecurityRemoved ?? null;
  }
```

becomes:

```ts
  constructor(config: RaidControllerConfig) {
    this.container = config.container;
    this.grid = config.grid;
    this.avatarLayer = config.avatarLayer;
    this.onSecurityRemoved = config.onSecurityRemoved ?? null;
  }
```

In `spawnPulse()`, change the `createSecurityUnit` call from `this.container` to `this.avatarLayer`:

```ts
    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.container, x, y, kinds[i]);
```

becomes:

```ts
    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.avatarLayer, x, y, kinds[i]);
```

In `releaseCharge()`, same change:

```ts
      for (let i = 0; i < missing; i++) {
        const unit = createSecurityUnit(this.container, this.lastAvatarX, this.lastAvatarY, kinds[i]);
```

becomes:

```ts
      for (let i = 0; i < missing; i++) {
        const unit = createSecurityUnit(this.avatarLayer, this.lastAvatarX, this.lastAvatarY, kinds[i]);
```

- [ ] **Step 6: Update raidController.test.ts's RaidController construction**

In `tests/unit/raidController.test.ts`, the `beforeEach` currently constructs:

```ts
    raid = new RaidController({ container, grid });
```

Change to:

```ts
    raid = new RaidController({ container, grid, avatarLayer: container });
```

(Tests don't need to distinguish the avatar's real parent from `#stage` — using the same `container` for both is sufficient for every existing assertion, which only checks unit count/state, not DOM parentage.)

- [ ] **Step 7: Add a test proving units go to avatarLayer, not container**

Add this test inside `describe('RaidController', ...)`, after the `'transitions to raiding and spawns 2-3 units...'` test:

```ts
  it('appends security units into avatarLayer, not the #stage container', () => {
    const avatarLayer = document.createElement('div');
    document.body.appendChild(avatarLayer);
    const raidWithLayer = new RaidController({ container, grid, avatarLayer });

    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);
    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raidWithLayer.onAvatarMove(x, 0);
      t += 20;
    }
    now.mockRestore();

    expect(avatarLayer.querySelectorAll('img').length).toBe(raidWithLayer.getSecurityUnits().length);
    avatarLayer.remove();
  });
```

- [ ] **Step 8: Run the RaidController tests to verify they pass**

Run: `npm test -- raidController`
Expected: PASS

- [ ] **Step 9: Wire `avatarLayer` and the avatar-on-top DOM-order guarantee in main.ts**

In `src/main.ts`, change the `RaidController` construction:

```ts
  const raidController = new RaidController({
    container,
    grid,
    onSecurityRemoved: (x, y, w, h) => {
      const audioContext = audioManager.getAudioContext();
      if (audioContext) playPoofTone(audioContext);
      void spawnPoof(x, y, w, h);
    },
  });
```

becomes:

```ts
  const raidController = new RaidController({
    container,
    grid,
    avatarLayer: document.body,
    onSecurityRemoved: (x, y, w, h) => {
      const audioContext = audioManager.getAudioContext();
      if (audioContext) playPoofTone(audioContext);
      void spawnPoof(x, y, w, h);
    },
  });
```

Then update the top-level `engine.onTick` to keep the avatar as the last `document.body` child while a raid is active, guaranteeing it wins the z-index tie against security units:

```ts
  const engine = new Engine();
  engine.onTick(() => {
    const center = currentAttractor.getCenter();
    raidController.tick(Date.now());
    grid.update(center.x, center.y, raidController.getSecurityUnits(), raidController.getRaidFloor());
  });
  engine.start();
```

becomes:

```ts
  const engine = new Engine();
  engine.onTick(() => {
    const center = currentAttractor.getCenter();
    raidController.tick(Date.now());
    if (activeOverlay && raidController.getState() !== "idle") {
      // Keep the avatar as the last body child while security units (also
      // now z-index:100, see SecurityCreature.SECURITY_Z_INDEX) are being
      // appended, so equal-z-index ties always resolve avatar-on-top.
      document.body.appendChild(activeOverlay.el);
    }
    grid.update(center.x, center.y, raidController.getSecurityUnits(), raidController.getRaidFloor());
  });
  engine.start();
```

- [ ] **Step 10: Run the full suite and build**

Run: `npm test && npm run build`
Expected: Both succeed; no new test failures beyond the known pre-existing baseline.

- [ ] **Step 11: Commit**

```bash
git add src/creatures/SecurityCreature.ts src/creatures/RaidController.ts src/main.ts tests/unit/securityCreature.test.ts tests/unit/raidController.test.ts
git commit -m "fix: give security units the avatar's own stacking context so z-index parity is real"
```

- [ ] **Step 12: Manual verification (human testing)**

Run `npm run dev`, trigger a raid, and drag the avatar around while security units are on screen. Confirm the avatar sticker is always visibly on top of every security sprite, never behind one, at every position.

---


---

Continued in [2026-08-16-raid-protest-v2-task-8.md](2026-08-16-raid-protest-v2-task-8.md).
