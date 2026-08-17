# Sticker Loading & Asset Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate avatar sticker loading delays by compressing assets to WebP (~85-90% smaller), generating gallery thumbnails, preloading the randomly selected avatar (both grin and weird/drag states) during onboarding, and lazy-loading the gallery.

**Architecture:** A Python Pillow script converts all PNG avatars to optimized WebP and creates 240px thumbnails. A pure TypeScript `preloadImages()` helper caches images in the browser. `main.ts` selects the initial avatar at launch and immediately prefetches both its `src` and `dragSrc` during onboarding, while `GalleryPanel` renders lightweight thumbnails with lazy decoding.

**Tech Stack:** TypeScript, Vite, vitest, Python 3 + Pillow.

---

### Task 1: Asset Conversion & Thumbnail Generation Script

**Files:**
- Create: `scripts/optimize-stickers.py`
- Output Assets:
  - `public/avatars/grin/*.webp`
  - `public/avatars/normal/*.webp`
  - `public/avatars/text_stickers/*.webp`
  - `public/avatars/thumbs/*.webp`

- [x] **Step 1: Write `scripts/optimize-stickers.py`**

```python
import os
from pathlib import Path
from PIL import Image

AVATARS_DIR = Path(__file__).resolve().parent.parent / "public" / "avatars"
THUMBS_DIR = AVATARS_DIR / "thumbs"
THUMBS_DIR.mkdir(parents=True, exist_ok=True)

DIRS_TO_PROCESS = [
    AVATARS_DIR / "grin",
    AVATARS_DIR / "normal",
    AVATARS_DIR / "text_stickers"
]

def optimize_images():
    total_orig = 0
    total_webp = 0

    for d in DIRS_TO_PROCESS:
        if not d.exists():
            continue
        for png_file in sorted(d.glob("*.png")):
            webp_file = png_file.with_suffix(".webp")
            with Image.open(png_file) as img:
                # Save full-res optimized WebP
                img.save(webp_file, "WEBP", quality=88, method=6)
                
                # Generate thumbnail if it's grin or text_stickers (used in gallery)
                if d.name in ("grin", "text_stickers"):
                    thumb_file = THUMBS_DIR / f"{png_file.stem}.webp"
                    thumb = img.copy()
                    thumb.thumbnail((240, 240), Image.Resampling.LANCZOS)
                    thumb.save(thumb_file, "WEBP", quality=82, method=6)

            orig_size = png_file.stat().st_size
            webp_size = webp_file.stat().st_size
            total_orig += orig_size
            total_webp += webp_size
            print(f"Converted {png_file.name}: {orig_size//1024}KB -> {webp_size//1024}KB")

    print(f"\nTotal: {total_orig//1024}KB -> {total_webp//1024}KB ({(1 - total_webp/total_orig)*100:.1f}% reduction)")

if __name__ == "__main__":
    optimize_images()
```

- [x] **Step 2: Run script to convert all avatar assets to WebP**

Run: `python3 scripts/optimize-stickers.py`
Expected: Outputs list of converted files with ~85-90% overall file size reduction.

- [x] **Step 3: Commit WebP assets and optimization script**

```bash
git add scripts/optimize-stickers.py public/avatars/
git commit -m "perf: convert sticker assets to webp and generate gallery thumbnails"
```

---

### Task 2: Implement Asset Preloader Utility

**Files:**
- Create: `src/core/assetPreload.ts`
- Test: `tests/unit/assetPreload.test.ts`

- [ ] **Step 1: Write failing unit test for `preloadImages`**

```ts
import { describe, it, expect, vi } from "vitest";
import { preloadImages } from "../../src/core/assetPreload";

describe("preloadImages", () => {
  it("resolves immediately for empty url list", async () => {
    await expect(preloadImages([])).resolves.toBeUndefined();
  });

  it("preloads images using Image constructor and resolves when loaded", async () => {
    const urls = ["/avatars/grin/grin_kaleshi.webp", "/avatars/normal/kaleshi.webp"];
    const promise = preloadImages(urls);
    await expect(promise).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/assetPreload.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/core/assetPreload.ts`**

```ts
/**
 * Preloads an array of image URLs into the browser cache.
 * Returns a Promise that resolves when all images have completed loading
 * or errored (non-blocking).
 */
export function preloadImages(urls: readonly (string | undefined | null)[]): Promise<void> {
  const validUrls = urls.filter((url): url is string => typeof url === "string" && url.length > 0);
  if (validUrls.length === 0) return Promise.resolve();

  const promises = validUrls.map((url) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  });

  return Promise.all(promises).then(() => undefined);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/assetPreload.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/assetPreload.ts tests/unit/assetPreload.test.ts
git commit -m "feat(core): add asset preloader utility"
```

---

### Task 3: Update `GalleryPanel` to Use WebP & Thumbnails

**Files:**
- Modify: `src/hud/GalleryPanel.ts`
- Modify: `tests/unit/galleryPanel.test.ts`

- [ ] **Step 1: Update `StickerDef` interface and STICKER_DEFS in `src/hud/GalleryPanel.ts`**

Update `StickerDef`:
```ts
export interface StickerDef {
  readonly src: string;
  readonly dragSrc?: string;
  readonly thumbSrc: string;
  readonly label: string;
  readonly hasFace: boolean;
}
```

Update definitions to use `.webp` extensions and assign `thumbSrc`:
```ts
const STICKER_DEFS: readonly StickerDef[] = [
  { src: "/avatars/grin/grin_adalat_sharma.webp", dragSrc: "/avatars/normal/adalat_sharma.webp", thumbSrc: "/avatars/thumbs/grin_adalat_sharma.webp", label: "Adalat Sharma", hasFace: true },
  { src: "/avatars/grin/grin_chronology.webp", dragSrc: "/avatars/normal/chronology.webp", thumbSrc: "/avatars/thumbs/grin_chronology.webp", label: "Chronology", hasFace: true },
  { src: "/avatars/grin/grin_DNA-tihari.webp", dragSrc: "/avatars/normal/DNA-tihari.webp", thumbSrc: "/avatars/thumbs/grin_DNA-tihari.webp", label: "DNA Tihari", hasFace: true },
  { src: "/avatars/grin/grin_ethanol.webp", dragSrc: "/avatars/normal/ethanol.webp", thumbSrc: "/avatars/thumbs/grin_ethanol.webp", label: "Ethanol", hasFace: true },
  { src: "/avatars/grin/grin_gutter.webp", dragSrc: "/avatars/normal/gutter.webp", thumbSrc: "/avatars/thumbs/grin_gutter.webp", label: "Gutter", hasFace: true },
  { src: "/avatars/grin/grin_kaleshi.webp", dragSrc: "/avatars/normal/kaleshi.webp", thumbSrc: "/avatars/thumbs/grin_kaleshi.webp", label: "Kaleshi", hasFace: true },
  { src: "/avatars/grin/grin_leak-pradhan.webp", dragSrc: "/avatars/normal/leak-pradhan.webp", thumbSrc: "/avatars/thumbs/grin_leak-pradhan.webp", label: "Leak Pradhan", hasFace: true },
  { src: "/avatars/grin/grin_mananiya-sadasya.webp", dragSrc: "/avatars/normal/mananiya-sadasya.webp", thumbSrc: "/avatars/thumbs/grin_mananiya-sadasya.webp", label: "Mananiya Sadasya", hasFace: true },
  { src: "/avatars/grin/grin_naya_leak.webp", dragSrc: "/avatars/normal/naya_leak.webp", thumbSrc: "/avatars/thumbs/grin_naya_leak.webp", label: "Naya Leak", hasFace: true },
  { src: "/avatars/grin/grin_petroleum.webp", dragSrc: "/avatars/normal/petroleum.webp", thumbSrc: "/avatars/thumbs/grin_petroleum.webp", label: "Petroleum", hasFace: true },
  { src: "/avatars/grin/grin_reel-minister.webp", dragSrc: "/avatars/normal/reel-minister.webp", thumbSrc: "/avatars/thumbs/grin_reel-minister.webp", label: "Reel Minister", hasFace: true },
  { src: "/avatars/grin/grin_republic.webp", dragSrc: "/avatars/normal/republic.webp", thumbSrc: "/avatars/thumbs/grin_republic.webp", label: "Republic", hasFace: true },
  { src: "/avatars/grin/grin_tax-tai.webp", dragSrc: "/avatars/normal/tax-tai.webp", thumbSrc: "/avatars/thumbs/grin_tax-tai.webp", label: "Tax Tai", hasFace: true },
  { src: "/avatars/grin/grin_vishwaguru.webp", dragSrc: "/avatars/normal/vishwaguru.webp", thumbSrc: "/avatars/thumbs/grin_vishwaguru.webp", label: "Vishwaguru", hasFace: true },
  { src: "/avatars/text_stickers/sticker_38.webp", thumbSrc: "/avatars/thumbs/sticker_38.webp", label: "Sticker 38", hasFace: false },
  { src: "/avatars/text_stickers/sticker_39.webp", thumbSrc: "/avatars/thumbs/sticker_39.webp", label: "Sticker 39", hasFace: false },
  { src: "/avatars/text_stickers/sticker_40.webp", thumbSrc: "/avatars/thumbs/sticker_40.webp", label: "Sticker 40", hasFace: false },
  { src: "/avatars/text_stickers/sticker_41.webp", thumbSrc: "/avatars/thumbs/sticker_41.webp", label: "Sticker 41", hasFace: false },
  { src: "/avatars/text_stickers/sticker_42.webp", thumbSrc: "/avatars/thumbs/sticker_42.webp", label: "Sticker 42", hasFace: false },
  { src: "/avatars/text_stickers/sticker_43.webp", thumbSrc: "/avatars/thumbs/sticker_43.webp", label: "Sticker 43", hasFace: false },
  { src: "/avatars/text_stickers/sticker_44.webp", thumbSrc: "/avatars/thumbs/sticker_44.webp", label: "Sticker 44", hasFace: false },
  { src: "/avatars/text_stickers/sticker_45.webp", thumbSrc: "/avatars/thumbs/sticker_45.webp", label: "Sticker 45", hasFace: false },
  { src: "/avatars/text_stickers/sticker_46.webp", thumbSrc: "/avatars/thumbs/sticker_46.webp", label: "Sticker 46", hasFace: false },
  { src: "/avatars/text_stickers/sticker_47.webp", thumbSrc: "/avatars/thumbs/sticker_47.webp", label: "Sticker 47", hasFace: false },
  { src: "/avatars/text_stickers/sticker_48.webp", thumbSrc: "/avatars/thumbs/sticker_48.webp", label: "Sticker 48", hasFace: false },
];
```

In `buildStickerCard(def: StickerDef)`:
```ts
    const img = document.createElement("img");
    img.className = "sticker-thumb";
    img.src = def.thumbSrc;
    img.alt = def.label;
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    card.appendChild(img);
```

- [ ] **Step 2: Update `tests/unit/galleryPanel.test.ts` and run tests**

Verify all sticker definition tests expect `.webp` and `thumbSrc`.
Run: `npx vitest run tests/unit/galleryPanel.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hud/GalleryPanel.ts tests/unit/galleryPanel.test.ts
git commit -m "refactor(gallery): switch sticker defs to webp with thumbnails and lazy loading"
```

---

### Task 4: Integrate Early Preloading & Idle Prefetch in `main.ts`

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update `src/main.ts` to pick initial avatar upfront and preload during onboarding**

1. Import `preloadImages` from `./core/assetPreload`.
2. At the top of `main()`:
```ts
  const faceDefs = getFaceStickerDefs();
  const initialFaceDef = faceDefs[Math.floor(Math.random() * faceDefs.length)]!;
  void preloadImages([initialFaceDef.src, initialFaceDef.dragSrc]);
```
3. In `carousel.onComplete`:
Use the already selected `initialFaceDef`:
```ts
  carousel.onComplete(async (center) => {
    window.removeEventListener("pointermove", onPointerMove);
    const audioContext = audioManager.getAudioContext();
    if (audioContext) playPoofTone(audioContext);
    await spawnPoof(center.x, center.y).done;
    const sticker = new StickerOverlay(
      initialFaceDef.src,
      center.x - 80,
      center.y - 80,
      onOverlayDragStart,
      onOverlayDragEnd,
      onOverlayDragMove,
      true,
      initialFaceDef.dragSrc,
    );
    document.body.appendChild(sticker.el);
    activeOverlay = sticker;
    currentAttractor = sticker;
    mountPostOnboarding();
    grid.clearRepulsor();
    filterPanel.setQuantity(DEFAULT_CREATURE_QUANTITY);

    // Schedule background prefetch for remaining face stickers and gallery
    const scheduleIdle = typeof window.requestIdleCallback === "function" 
      ? window.requestIdleCallback 
      : (cb: () => void) => window.setTimeout(cb, 1000);

    scheduleIdle(() => {
      const allUrls = getStickerDefs().flatMap((d) => [d.src, d.dragSrc, d.thumbSrc]);
      void preloadImages(allUrls);
    });
  });
```
4. In `galleryPanel.onStickerSelect`:
```ts
    galleryPanel.onStickerSelect((src, dragSrc) => {
      void preloadImages([src, dragSrc]);
      const sticker = new StickerOverlay(
        src,
        undefined,
        undefined,
        onOverlayDragStart,
        onOverlayDragEnd,
        onOverlayDragMove,
        false,
        dragSrc,
      );
      void replaceOverlay(sticker);
    });
```

- [ ] **Step 2: Run test suite**

Run: `npx vitest run`
Expected: Passes without errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "perf(main): early avatar selection and onboarding preloading"
```

---

### Task 5: End-to-End Build & Visual Verification

**Files:**
- Check: `src/`
- Build: `npm run build`

- [ ] **Step 1: Run TypeScript typecheck and Vite build**

Run: `npm run build`
Expected: Build succeeds with 0 type errors.

- [ ] **Step 2: Run all unit tests**

Run: `npm test`
Expected: Tests pass.

- [ ] **Step 3: Verification**

Inspect file sizes and confirm total avatar payload reduction from ~38 MB to <3 MB.
