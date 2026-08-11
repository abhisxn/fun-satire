# Delhi Police Constable Sticker Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and save a high-resolution sticker sheet of Delhi Police constables in a bold marker/halftone style from an extremely elevated perspective with **maximum character diversity, an exact 3x4 grid layout, and a dark grey background**.

**Architecture:** Use the `generate_image` tool with a highly descriptive prompt that specifies individual character differences and background requirements to prevent the model from generating clones and to meet aesthetic goals.

**Tech Stack:** Kilo `generate_image` tool.

---

### Task 1: Generate Sticker Sheet Image

**Files:**
- Create: `public/assets/stickers/delhi-police-constables.png`

- [ ] **Step 1: Invoke image generation**

Use the following prompt:
"A high-quality sticker sheet containing **exactly 12 unique and diverse** caricatured Delhi Police male constables, arranged in a **strict 3x4 grid**. **Every character is a completely different individual**—varying ages, different facial structures, different mustache styles, and some with spectacles. **All 12 must be wearing beige berets with red badges.** Poses are highly varied: one yells into a walkie-talkie, one points aggressively, one has arms crossed, one holds a lathi, one looks at a clipboard, one blows a whistle. They all show **unique and varied expressions of intense angry disgust**. Perspective: steep overhead drone-shot angle showing faces. Style: bold marker illustration, thick black outlines, vibrant marker colors, color halftone shading. Each sticker has a thick white die-cut border. **No overlap, 12 stickers total, clean composition, solid dark grey background.**"

Path: `public/assets/stickers/delhi-police-constables`

- [ ] **Step 2: Verify the generated image**

Check the image for:
1. **Exactly 12 unique** constables (verify no clones or twins).
2. **High diversity** in faces (ages, glasses, mustaches).
3. **Varied poses and gear** (walkie-talkies, clipboards, whistles, lathis).
4. Uniform **3x4 grid layout** with **no overlaps**.
5. Extremely elevated perspective showing faces.
6. **Diverse** expressions of angry disgust.
7. Correct Delhi Police uniform (khaki/beige berets).
8. Bold marker style with halftone and white borders.
9. **Solid dark grey background.**

- [ ] **Step 3: Commit the generated image**

```bash
git add public/assets/stickers/delhi-police-constables.png
git commit -m "feat: update Delhi Police sticker sheet with dark grey background and high diversity"
```

### Task 2: Cleanup Reference Assets

**Files:**
- Delete: `public/Reference/Frame 87.png`

- [ ] **Step 1: Delete reference image**

Run: `rm "public/Reference/Frame 87.png"`

- [ ] **Step 2: Commit cleanup**

```bash
git add public/Reference/Frame 87.png
git commit -m "chore: remove untracked reference asset"
```
