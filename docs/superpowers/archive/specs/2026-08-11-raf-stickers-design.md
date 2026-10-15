# RAF Sticker Sheets Design Spec

## Overview
A collection of 5 separate sticker sheets, each featuring 12 unique Indian Rapid Action Force (RAF) personnel. The stickers use a bold marker caricature style from varied drone-shot perspectives, set against a dark grey background.

## Design Goals
- **Subject:** 60 **highly unique** RAF personnel (12 per sheet). Each character must have distinct facial features, ages, mustache styles, and gear.
- **Uniform:** Standard RAF blue camouflage uniform with blue helmets.
- **Expressions:** Varied intense expressions of angry disgust—scowling, yelling, sneering, frowning.
- **Poses & Gear:** Balanced mix of tactical poses including pointing, holding lathis, using walkie-talkies, arms crossed, and checking clipboards.
- **Perspective Mix:** Each sheet uses a unique drone altitude/angle:
  - Sheet 1: 70° (steep)
  - Sheet 2: 75°
  - Sheet 3: 80°
  - Sheet 4: 85°
  - Sheet 5: 90° (direct top-down)
- **Art Style:** Bold marker illustration, thick black outlines, vibrant marker colors, and a color halftone pattern for shading.
- **Composition:** Strict 3x4 grid layout per sheet. Each sticker has a thick white die-cut border with **no overlap**.
- **Background:** Uniform dark grey (#1a1a1a) for all sheets.

## Technical Requirements
- **Output:** 5 high-resolution PNG images.
- **File Paths:** 
  - `public/assets/stickers/raf-stickers-1.png`
  - `public/assets/stickers/raf-stickers-2.png`
  - `public/assets/stickers/raf-stickers-3.png`
  - `public/assets/stickers/raf-stickers-4.png`
  - `public/assets/stickers/raf-stickers-5.png`
- **Tooling:** Kilo `generate_image` tool.

## Success Criteria
- [ ] **Exactly 12 unique stickers** per sheet (no clones across the entire set of 60).
- [ ] **Perspective variation** is clearly visible across the 5 sheets.
- [ ] **Dark grey background** is consistent and clean.
- [ ] **Uniforms and helmets** are accurately represented as RAF blue camo.
- [ ] **Marker + Halftone** style is consistent across all images.
- [ ] **White borders** are clear and separate for every sticker.
