# Delhi Police Constable Sticker Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and save a high-resolution sticker sheet of Delhi Police constables in a bold marker/halftone style from a top-down perspective.

**Architecture:** Use the `generate_image` tool with a highly structured prompt to ensure all design requirements (subject, angle, style, packaging) are met in a single generation.

**Tech Stack:** Kilo `generate_image` tool.

---

### Task 1: Generate Sticker Sheet Image

**Files:**
- Create: `public/assets/stickers/delhi-police-constables.png`

- [ ] **Step 1: Invoke image generation**

Use the following prompt:
"A sticker sheet containing 12 caricatured Delhi Police male constables in standard khaki uniforms, beige berets with red badges, tactical gear, and carrying lathis. Extreme top-down elevated drone-shot perspective, viewing directly from above. Arranged in a dynamic, slightly scattered layout. Style: bold marker illustration, thick black outlines, vibrant marker colors, color halftone shading. Each sticker has a thick white die-cut border. High resolution, clean composition."

Path: `public/assets/stickers/delhi-police-constables`

- [ ] **Step 2: Verify the generated image**

Check the image for:
1. 12 constables present.
2. Top-down perspective.
3. Correct Delhi Police uniform (khaki/beige).
4. Bold marker style with halftone.
5. White borders and sticker sheet layout.

- [ ] **Step 3: Commit the generated image**

```bash
git add public/assets/stickers/delhi-police-constables.png
git commit -m "feat: add Delhi Police constable sticker sheet"
```
