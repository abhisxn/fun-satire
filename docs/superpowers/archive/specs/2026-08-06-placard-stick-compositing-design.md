# Placard/Stick Compositing — Design

## Problem

`PlacardCreature.ts` currently renders a single flattened `placard_stick.png` (a placard baked onto a stick at 405×171). We now have a standalone stick asset (`placard_stick.svg`, 36×444, portrait) and a pool of 18 separate placard PNGs of varying sizes and aspect ratios (`public/creatures/placards/Frame 67.png` … `Frame 84.png`). The placard needs to be composited onto the stick at runtime, centered on the `+` marker printed on the stick artwork, with a random placard chosen per creature spawn.

## Approach: runtime DOM overlay

Two `<img>` elements inside the existing `.wrap` div, instead of one:

```
.wrap (rotates as a unit — unchanged; getPlacardRotation still applies to the whole wrap)
 ├── stick <img>     — sized to fill the wrap, same pattern as today
 └── placard <img>   — position: absolute, sized independently, centered on the stick's anchor point
```

Both layers share the same rotating parent, so rotation requires no additional math.

Rejected alternatives:
- **Canvas compositing** — more control over pixel effects, but a bigger departure from this project's all-DOM creature rendering, and unnecessary for a straightforward layered overlay.
- **Build-time pre-baked images** — would multiply asset count (sizes × messages) and require a rebuild on every placard change; the DOM overlay achieves the same visual result without a build step.

## Anchor point

`placard_stick.svg` has viewBox `36×444`. The `+` mark (white cross inside the gray circle) sits at `(18, 135)` in that coordinate space — dead-center horizontally, ~30% down from the top.

```ts
const STICK_NAT_W = 36;
const STICK_NAT_H = 444;
const STICK_ANCHOR_PCT = { x: 0.5, y: 135 / 444 }; // ≈ 0.3041
```

These replace the old `PLACARD_NAT_W` / `PLACARD_NAT_H` (405×171, from the flattened image) — the stick is now its own thin, tall asset rendered at its native proportions.

The anchor was extracted once by hand from the provided SVG; it is not parsed at runtime. The stick continues to render as a PNG/raster `<img>` in the browser, matching how it's rendered today — only the anchor math is informed by the SVG.

## Placard sizing

The placard PNGs are Figma exports at a much higher raw pixel resolution than their intended display size (e.g. `1314×684` up to `1665×1020`) relative to the 36px-wide stick — rendering them at native pixel size would dwarf the stick. Instead, each placard's displayed width is normalized to a multiple of the stick's *rendered* width, and its displayed height derived from its own aspect ratio (so varying source aspect ratios are preserved):

```ts
const PLACARD_WIDTH_RATIO = 5.5; // tunable — verify visually via `npm run dev`, adjust as needed

const stickW = STICK_NAT_W * scale;
const stickH = STICK_NAT_H * scale;

const placardW = PLACARD_WIDTH_RATIO * stickW;
const placardH = placardW * (pool.h / pool.w); // pool.h/pool.w = chosen placard's natural aspect ratio
```

`PLACARD_WIDTH_RATIO` is a starting default to be tuned by eye after implementation — no fixed "correct" value is assumed up front.

## Positioning

The placard's own geometric center (bounding-box center of its PNG) is assumed to be its attach point — no per-asset anchor metadata needed.

```ts
const anchorPx = {
  x: STICK_ANCHOR_PCT.x * stickW,
  y: STICK_ANCHOR_PCT.y * stickH,
};

placardEl.style.left = `${anchorPx.x - placardW / 2}px`;
placardEl.style.top = `${anchorPx.y - placardH / 2}px`;
```

The `.wrap` element's own box stays sized to the stick only (`stickW × stickH`); the placard is allowed to visually overflow it (default `overflow: visible`), which is fine since `pointerEvents: none` already means the wrap has no hit-testing role.

## Placard selection

One placard is chosen at random from a fixed pool when a placard creature is spawned, and stays fixed for that creature's lifetime (mirrors how creature variety is generally seeded in this project via `Rng`).

```ts
const PLACARD_POOL: { src: string; w: number; h: number }[] = [
  { src: '/creatures/placards/Frame 67.png', w: 1314, h: 684 },
  { src: '/creatures/placards/Frame 68.png', w: 1341, h: 684 },
  { src: '/creatures/placards/Frame 69.png', w: 900, h: 684 },
  { src: '/creatures/placards/Frame 70.png', w: 1665, h: 588 },
  { src: '/creatures/placards/Frame 71.png', w: 1071, h: 588 },
  { src: '/creatures/placards/Frame 72.png', w: 1089, h: 588 },
  { src: '/creatures/placards/Frame 73.png', w: 1665, h: 732 },
  { src: '/creatures/placards/Frame 74.png', w: 1419, h: 588 },
  { src: '/creatures/placards/Frame 75.png', w: 1212, h: 588 },
  { src: '/creatures/placards/Frame 76.png', w: 1071, h: 588 },
  { src: '/creatures/placards/Frame 77.png', w: 1269, h: 732 },
  { src: '/creatures/placards/Frame 78.png', w: 1071, h: 1020 },
  { src: '/creatures/placards/Frame 79.png', w: 1071, h: 1020 },
  { src: '/creatures/placards/Frame 80.png', w: 819, h: 444 },
  { src: '/creatures/placards/Frame 81.png', w: 1401, h: 588 },
  { src: '/creatures/placards/Frame 82.png', w: 1071, h: 588 },
  { src: '/creatures/placards/Frame 83.png', w: 1071, h: 732 },
  { src: '/creatures/placards/Frame 84.png', w: 1416, h: 732 },
];
```

The `w`/`h` values are hardcoded (measured ahead of time) rather than read from `naturalWidth`/`naturalHeight` on image load, so layout doesn't need to wait on an async image-load event.

**Asset naming**: filenames are raw Figma export names (`Frame 67.png`, etc.) with spaces. Renaming to a consistent pattern (e.g. `placard-01.png` … `placard-18.png`, matching `finger.png`/`cockroach.png`/`eye.png`) is recommended during implementation but not required — either way the pool constant is the single source of truth for available placards.

## Testing

Extend `tests/unit/placardCreature.test.ts`:
- Assert the placard `<img>`'s computed `left`/`top` matches the anchor formula for a couple of `(scale, pool-entry)` combinations.
- Assert a random pick always returns an entry from `PLACARD_POOL`.

## Out of scope

- Per-placard custom anchor points (all placards use their geometric center).
- Clamping placard size to a max box — placards render at `PLACARD_WIDTH_RATIO × stickW`, uncapped.
- Content-driven/manifest-based placard selection — pool is a static in-code list for now.
- Runtime SVG parsing — the SVG is a one-time reference only.
