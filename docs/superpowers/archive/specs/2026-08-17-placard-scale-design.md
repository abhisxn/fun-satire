# Placard Sizing & Stick Ratio Design Spec

## Overview
Rebalances the placard creature rendering and scale math so that placard signs are visually dominant over their sticks, and the satirical protest slogans are crisp, prominent, and legible across the crowd.

## Background & Problem
Currently, `PLACARD_BASE_W` is set to 150px while sticks are rendered at full natural height (`444px * scale`). Additionally, `pickSignScale()` allows ratios as low as 0.5. At standard creature scales (0.18–0.40), placard signs render between 13px and 84px wide (and only 6px to 40px tall), whereas sticks render 80px to 178px tall. The sign board represents only 17% to 47% of stick height, making the stick look like an oversized pole and rendering the protest text illegible.

## Goals & Requirements
1. **Hero Placard Dominance**: Placards must be visibly larger and wider than the stick length (ratio of sign width to stick height $\approx 1.5$–$2.0$).
2. **Text Readability**: Slogans on all 19 placard assets must remain clearly readable across screen depths.
3. **Aspect-Compensated Sizing**: Adjust sign width based on the asset's aspect ratio so wide banner placards and compact signs maintain consistent font heights.
4. **Organic Depth & Variety**: Preserve organic crowd depth variation without producing tiny, unreadable signs.
5. **DOM & Physics Compatibility**: Maintain compatibility with the existing semi-implicit Euler physics loop, rotation targeting toward the avatar, and hover interactions.

## Detailed Math & Sizing Specification

### 1. Stick Dimensions & Proportions
- **Natural Stick Dimensions**: `STICK_NAT_W = 36`, `STICK_NAT_H = 444`.
- **Anchor Point**: `STICK_ANCHOR_PCT = { x: 0.5, y: 135 / 444 }`.
- **Stick Scale Factor**: `STICK_SCALE_FACTOR = 0.65`.
- **Rendered Stick Dimensions**:
  $$\text{stickW} = \text{STICK\_NAT\_W} \times \text{scale} \times \text{STICK\_SCALE\_FACTOR}$$
  $$\text{stickH} = \text{STICK\_NAT\_H} \times \text{scale} \times \text{STICK\_SCALE\_FACTOR}$$
  At scale 0.25: stick width is $\approx 5.85\text{px}$, stick height is $\approx 72.15\text{px}$.

### 2. Placard Board Sizing (Aspect-Aware)
- **Base Width**: `PLACARD_BASE_W = 460`.
- **Reference Aspect Ratio**: $R_{\text{ref}} = 2.0$.
- **Aspect Ratio Compensation**:
  $$\text{aspectRatio} = \frac{\text{asset.w}}{\text{asset.h}}$$
  $$\text{aspectFactor} = \sqrt{\frac{\text{aspectRatio}}{2.0}}$$
- **Sign Scale Randomization**:
  $$\text{signScale} = 0.88 + \text{Math.random}() \times 0.28 \quad (\text{range: } [0.88, 1.16])$$
- **Calculated Dimensions**:
  $$\text{placardW} = \text{PLACARD\_BASE\_W} \times \text{scale} \times \text{signScale} \times \text{aspectFactor}$$
  $$\text{placardH} = \text{placardW} \times \frac{\text{asset.h}}{\text{asset.w}}$$
- **Centering on Anchor**:
  $$\text{anchorX} = \text{STICK\_ANCHOR\_PCT.x} \times \text{stickW}$$
  $$\text{anchorY} = \text{STICK\_ANCHOR\_PCT.y} \times \text{stickH}$$
  $$\text{left} = \text{anchorX} - \frac{\text{placardW}}{2}$$
  $$\text{top} = \text{anchorY} - \frac{\text{placardH}}{2}$$

### 3. Grid Creature Scale
- **`scaleFn` in `CreatureGrid.ts`**:
  $$\text{scale} = 0.20 + (\text{Math.random}())^{1.4} \times 0.20 \quad (\text{range: } [0.20, 0.40])$$

### 4. Dimension Examples Across Aspect Ratios
At average scale ($\text{scale} = 0.25, \text{signScale} = 1.0$):
- **Compact Sign (`placard_15.png`, 546x432, aspect 1.26)**:
  - $\text{aspectFactor} = \sqrt{1.26 / 2.0} \approx 0.794$
  - $\text{placardW} \approx 91.3\text{px}$, $\text{placardH} \approx 72.2\text{px}$
- **Standard Sign (`placard_02.png`, 868x432, aspect 2.01)**:
  - $\text{aspectFactor} = \sqrt{2.01 / 2.0} \approx 1.002$
  - $\text{placardW} \approx 115.3\text{px}$, $\text{placardH} \approx 57.4\text{px}$
- **Wide Banner (`placard_18.png`, 1330x432, aspect 3.08)**:
  - $\text{aspectFactor} = \sqrt{3.08 / 2.0} \approx 1.241$
  - $\text{placardW} \approx 142.7\text{px}$, $\text{placardH} \approx 46.4\text{px}$

Stick height at scale 0.25 is $72.15\text{px}$. The sign width is $1.3\times$ to $2.0\times$ the stick height, ensuring text is bold and readable while the stick forms a clean bottom handle.

## Affected Files
1. `src/creatures/PlacardCreature.ts`: Update `PLACARD_BASE_W`, add `STICK_SCALE_FACTOR`, update `pickSignScale()`, and apply aspect-compensated sizing in `createPlacardCreature()`.
2. `src/creatures/CreatureGrid.ts`: Update `MODE_CONFIGS.placard.scaleFn`.
3. `tests/unit/placardCreature.test.ts`: Update unit tests for dimensions, ratio ranges, and aspect compensation.

## Success Criteria
- [ ] Placards are visibly larger and wider than the stick length across all scales.
- [ ] Text slogans on all 19 placard designs are legible and crisp.
- [ ] Randomization bounds prevent tiny outlier signs (`placardW >= 60px` at minimum scale).
- [ ] Unit tests pass in `tests/unit/placardCreature.test.ts`.
- [ ] Visual verification in browser confirms balanced protest crowd aesthetic.
