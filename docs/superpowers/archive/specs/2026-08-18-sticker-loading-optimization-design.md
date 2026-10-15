# Sticker Loading & Asset Optimization Design Spec

## 1. Executive Summary

This document specifies the optimization of sticker and avatar asset loading in Gutter Generation. Currently, avatar image downloads cause noticeable delays:
1. Avatar face selection happens late (only after onboarding carousel completion).
2. The "weird/normal" drag state expression (`dragSrc`) is downloaded on-the-fly when the sticker is first moved.
3. Assets are uncompressed high-resolution PNGs (~1.0 MB–1.9 MB each, totalling ~38 MB).
4. `GalleryPanel` mounts 25 full-resolution image tags immediately upon completing onboarding.

This design implements a comprehensive optimization pipeline:
- **Format Modernization & Compression**: Converting sticker assets to high-quality WebP (~85–90% reduction).
- **Dedicated Gallery Thumbnails**: Generating lightweight 240px WebP thumbnails (~15 KB each) for gallery cards.
- **Early Selection & Upfront Preloading**: Selecting the random initial avatar at app launch and preloading both its normal/grin and weird/drag states in parallel during the onboarding carousel.
- **Lazy Gallery Loading**: Deferring gallery image decoding and loading with `loading="lazy"` and `decoding="async"`.
- **Proactive Prefetching**: Background prefetching of candidate sticker pairs on idle for seamless "Next Sticker" transitions.

---

## 2. Asset Conversion & Thumbnail Architecture

### 2.1 Asset Directory Structure

```text
public/avatars/
  ├── grin/             # High-quality full-res WebP avatar face images (grin state)
  │   ├── grin_adalat_sharma.webp
  │   └── ...
  ├── normal/           # High-quality full-res WebP avatar face images (weird/drag state)
  │   ├── adalat_sharma.webp
  │   └── ...
  ├── text_stickers/    # High-quality full-res WebP text badges
  │   ├── sticker_38.webp
  │   └── ...
  └── thumbs/           # 240px downscaled WebP thumbnails for GalleryPanel cards
      ├── grin_adalat_sharma.webp
      ├── sticker_38.webp
      └── ...
```

### 2.2 Optimization Script (`scripts/optimize-stickers.py`)

A standalone, idempotent Python script using Pillow (`PIL.Image`) converts all PNG assets in `public/avatars/` to WebP:
- Full-resolution stickers: WebP format, quality 88, lossless alpha preservation, maximum compression effort (`method=6`).
- Thumbnails: WebP format, max dimension 240px (using Lanczos resampling), quality 82.
- Clean-up: Original PNG references in code updated to `.webp`.

---

## 3. Preloader & Lifecycle Architecture

### 3.1 Preload Utility (`src/core/assetPreload.ts`)

A lightweight helper for preloading image assets into the browser cache:

```ts
/** Preloads an array of image URLs, returning a Promise that resolves when all load or error. */
export function preloadImages(urls: readonly string[]): Promise<void> {
  const promises = urls.map((url) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Non-blocking failure
      img.src = url;
    });
  });
  return Promise.all(promises).then(() => undefined);
}
```

### 3.2 Main Lifecycle Integration (`src/main.ts`)

1. **Immediate Initial Selection**:
   - At the beginning of `main()`, pick the initial random face definition `initialFaceDef = selectRandomFace()`.
   - Fire `void preloadImages([initialFaceDef.src, initialFaceDef.dragSrc])` immediately without awaiting.
2. **Onboarding Duration Utilization**:
   - The user spends 4–10 seconds viewing onboarding carousel beats.
   - During this window, the browser downloads and caches both the primary (`src`) and drag (`dragSrc`) WebP images in parallel.
3. **Instant Poof-to-Avatar Transition**:
   - When the user clicks "Get Started", `initialFaceDef` is passed to `new StickerOverlay(...)`.
   - Because the image is cached, the sticker appears immediately after the poof effect without any pop-in or layout jump.
   - When the user grabs or shakes the sticker, `dragSrc` swaps with 0 latency.
4. **Idle Prefetching**:
   - After onboarding completes, schedule `requestIdleCallback` (or `setTimeout` fallback) to preload remaining face sticker pairs and gallery thumbnails in the background.

---

## 4. GalleryPanel Optimization

### 4.1 Schema Update (`StickerDef`)

Update `StickerDef` in `src/hud/GalleryPanel.ts`:

```ts
export interface StickerDef {
  readonly src: string;
  readonly dragSrc?: string;
  readonly thumbSrc: string;
  readonly label: string;
  readonly hasFace: boolean;
}
```

### 4.2 Card Rendering

- Card thumbnail `<img>` elements point to `def.thumbSrc`.
- Set `img.loading = "lazy"` and `img.decoding = "async"`.
- When a user selects a sticker card from `GalleryPanel`:
  1. Emit `src` and `dragSrc` to the selection listener.
  2. Proactively trigger `preloadImages([src, dragSrc])` if not already cached.

---

## 5. Win Flow Optimization

When `winPanel.onNextSticker` is triggered:
- The prefetch queue ensures next candidate face stickers have already been requested during idle time.
- The random selection retrieves a pre-cached face sticker pair, ensuring the next avatar transition is instant.

---

## 6. Verification & Testing

1. **Unit Tests**:
   - Verify `preloadImages` handles empty arrays, single URLs, multiple URLs, and network error resilience.
   - Verify `getStickerDefs()` and `getFaceStickerDefs()` have valid `.webp` extensions and populated `thumbSrc` fields.
   - Verify `GalleryPanel` renders `thumbSrc` on thumbnail `<img>` elements with `loading="lazy"`.
2. **Performance Verification**:
   - Total avatar bundle size reduced by >85%.
   - Zero network delay / blank frames upon onboarding exit and first drag interaction.
