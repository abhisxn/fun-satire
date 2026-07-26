# Merged Eyes Design Dummy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one self-contained `design-dummy/index.html` that merges deep-index.html's eye shape, glm-index.html's visual style + pupil dilation, and design-dummy.html's physics/blink/drag engine, with a real OS cursor (default / grab / grabbing) and a restyled glass-pill HUD (eye-count stepper + repel slider + static mode label).

**Architecture:** Single-file HTML5 Canvas app, vanilla JS, no framework, no build step. One `<canvas>` fills the viewport; eyes are plain-object entities updated each animation frame (position, rotation, pupil offset/dilation, blink phase) and drawn with 2D canvas paths. A small HUD (DOM elements, not canvas) sits on top and mutates two pieces of state (`targetCount`, `repelStrength`) that the simulation reads every frame.

**Tech Stack:** HTML5 Canvas 2D, vanilla JS (ES2017+), CSS custom properties, Google Fonts (Fraunces, Space Grotesk). No test framework — this is a static visual/interaction prototype, not application logic, so each task is verified by opening the file directly in a browser (`open "design-dummy/index.html"` on macOS, or any local static server) and checking the specific visual/interactive behavior called out in that task's verification step.

---

## File Structure

- Create: `design-dummy/index.html` — the entire deliverable. Built up incrementally across the tasks below; every task edits this one file.

No other files are created or modified. This is intentionally a single self-contained artifact (per spec: no wiring into `src/`).

---

### Task 1: HTML/CSS scaffold + fonts + grain + empty canvas

**Files:**
- Create: `design-dummy/index.html`

- [ ] **Step 1: Create the file with the full page shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>Fun Satire — Eyes Field (Merged Dummy)</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root {
    --cream: #EBE9E0;
    --ink: #2A2723;
    --slate: #5B737E;
    --sage: #586452;
    --brown: #5F5046;
    --taupe: #907E72;
    --line: rgba(42,39,35,.12);
    --ease: cubic-bezier(.32,.72,0,1);
    --serif: 'Fraunces', Georgia, 'Times New Roman', serif;
    --sans: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
  }
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    background: var(--cream);
    overflow: hidden;
    font-family: var(--sans);
    cursor: default;
    -webkit-font-smoothing: antialiased;
  }
  body.grab-hover { cursor: grab; }
  body.grabbing, body.grabbing * { cursor: grabbing !important; }

  #stage { position: fixed; inset: 0; display: block; touch-action: none; }

  .grain {
    position: fixed;
    inset: -10%;
    z-index: 40;
    pointer-events: none;
    opacity: .035;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 260px 260px;
  }

  .caption {
    position: fixed;
    top: 1.75rem;
    left: 1.75rem;
    z-index: 30;
    pointer-events: none;
    opacity: 0;
    transform: translateY(.6rem);
    transition: opacity 1s var(--ease) .2s, transform 1s var(--ease) .2s;
  }
  .caption.in { opacity: 1; transform: translateY(0); }
  .caption h1 {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 500;
    font-size: 1.35rem;
    color: var(--ink);
    line-height: 1.15;
  }
  .caption p {
    margin-top: .35rem;
    font-size: .65rem;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: rgba(42,39,35,.5);
  }

  .hud {
    position: fixed;
    left: 50%;
    bottom: 1.75rem;
    transform: translateX(-50%);
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: .6rem .6rem .6rem 1.1rem;
    border-radius: 999px;
    background: rgba(42,39,35,.055);
    border: 1px solid var(--line);
    box-shadow: 0 1px 1px rgba(255,255,255,.5) inset, 0 24px 50px -30px rgba(42,39,35,.45);
    opacity: 0;
    translate: 0 1rem;
    transition: opacity .8s var(--ease), translate .8s var(--ease);
  }
  .hud.in { opacity: 1; translate: 0 0; }
  .badge-mode { font-family: var(--serif); font-style: italic; font-weight: 500; font-size: .85rem; color: var(--ink); }
  .sep { width: 1px; height: 1.1rem; background: var(--line); }
  .ctrl { display: flex; align-items: center; gap: .6rem; }
  .lab { font-size: .6rem; letter-spacing: .18em; text-transform: uppercase; color: rgba(42,39,35,.55); }
  .stepper { display: flex; align-items: center; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; background: rgba(255,255,255,.4); }
  .stepper button {
    appearance: none; border: 0; background: transparent; cursor: pointer;
    width: 1.7rem; height: 1.7rem; display: grid; place-items: center;
    font-family: var(--sans); font-size: .95rem; color: var(--ink);
    transition: background .3s var(--ease);
  }
  .stepper button:hover { background: rgba(42,39,35,.08); }
  .stepper .val {
    min-width: 2.4rem; text-align: center; font-size: .72rem; color: var(--ink);
    border-left: 1px solid var(--line); border-right: 1px solid var(--line); padding: .3rem .2rem;
  }
  input[type=range] {
    -webkit-appearance: none; appearance: none; width: 6.5rem; height: 2px;
    background: var(--line); border-radius: 2px; outline: none; cursor: pointer;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: .85rem; height: .85rem; border-radius: 50%;
    background: var(--slate); border: 2px solid var(--cream); box-shadow: 0 0 0 1px var(--line); cursor: pointer;
  }
  input[type=range]::-moz-range-thumb {
    width: .85rem; height: .85rem; border-radius: 50%;
    background: var(--slate); border: 2px solid var(--cream); box-shadow: 0 0 0 1px var(--line); cursor: pointer;
  }

  @media (max-width: 640px) {
    .hud { gap: .6rem; padding: .5rem; }
    .lab { display: none; }
  }
</style>
</head>
<body>
<canvas id="stage"></canvas>
<div class="grain" aria-hidden="true"></div>

<div class="caption" id="caption">
  <h1>The establishment<br>is always watching.</h1>
  <p>Merged design dummy · drag the subject</p>
</div>

<div class="hud" id="hud">
  <span class="badge-mode">Eyes mode</span>
  <span class="sep"></span>
  <div class="ctrl">
    <span class="lab">Eyes</span>
    <div class="stepper">
      <button id="dec" type="button" aria-label="fewer eyes">−</button>
      <span class="val" id="count">60</span>
      <button id="inc" type="button" aria-label="more eyes">+</button>
    </div>
  </div>
  <span class="sep"></span>
  <div class="ctrl">
    <span class="lab">Repel</span>
    <input type="range" id="repel" min="0" max="100" value="55" />
  </div>
</div>

<script>
  requestAnimationFrame(() => {
    document.getElementById('caption').classList.add('in');
    document.getElementById('hud').classList.add('in');
  });
</script>
</body>
</html>
```

- [ ] **Step 2: Verify in browser**

Run: `open "design-dummy/index.html"` (macOS) — or open the file directly in any browser.

Expected: cream (`#EBE9E0`) full-viewport background, no scrollbars, faint grain texture, a serif italic caption fading in top-left after ~0.2s, and a pill-shaped HUD fading in at the bottom-center with a stepper (showing "60"), a repel slider, and an "Eyes mode" label. No eyes yet (canvas is empty) — that's expected at this stage.

- [ ] **Step 3: Commit**

```bash
git add design-dummy/index.html
git commit -m "scaffold merged eyes design dummy: page shell, fonts, HUD, grain"
```

---

### Task 2: Eye data model + procedural placement + static draw

**Files:**
- Modify: `design-dummy/index.html` (add `<script>` body before the closing `requestAnimationFrame` fade-in call added in Task 1)

- [ ] **Step 1: Replace the Task 1 script block with the simulation bootstrap + eye placement + static draw**

Replace:
```html
<script>
  requestAnimationFrame(() => {
    document.getElementById('caption').classList.add('in');
    document.getElementById('hud').classList.add('in');
  });
</script>
```

With:
```html
<script>
(() => {
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  const INK = '#2A2723', SLATE = '#5B737E', SAGE = '#586452', BROWN = '#5F5046', TAUPE = '#907E72';
  const PUPIL_COLORS = [INK, SLATE, SAGE, BROWN, TAUPE];
  const SUBJECT_COLOR = '#EBA2A2';
  const SIZES = [52, 74, 100, 134];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const subject = { x: 0, y: 0, r: 44 };

  let eyes = [];
  let targetCount = 60;
  let repelStrength = 0.55;

  function eyeShapePath(w, h) {
    const rx = w * 0.42, ry = h * 0.35;
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx * 0.5, -ry * 1.1, rx * 0.5, -ry * 1.1, rx, 0);
    ctx.bezierCurveTo(rx * 0.5, ry * 1.1, -rx * 0.5, ry * 1.1, -rx, 0);
    ctx.closePath();
  }

  function makeEye(x, y, w) {
    const h = w * 0.56;
    return {
      x, y, w, h,
      hx: x, hy: y,
      vx: 0, vy: 0,
      rot: rand(-0.15, 0.15), rotCur: 0,
      pupilColor: pick(PUPIL_COLORS),
      pupilR: h * 0.34,
      px: 0, py: 0,
      dilate: 0,
      blink: 1, blinkT: rand(1, 6), blinkPhase: 0,
      ph: Math.random() * Math.PI * 2, sp: 0.0006 + Math.random() * 0.0006,
    };
  }

  function farEnough(x, y, w) {
    for (const e of eyes) {
      const dx = e.x - x, dy = e.y - y;
      const minD = (e.w + w) * 0.5 * 0.92;
      if (dx * dx + dy * dy < minD * minD) return false;
    }
    return true;
  }

  function placeEye() {
    let guard = 0;
    while (guard++ < 200) {
      const w = pick(SIZES);
      const x = rand(w * 0.4, W - w * 0.4);
      const y = rand(w * 0.3, H - w * 0.3);
      const dx = x - subject.x, dy = y - subject.y;
      if (dx * dx + dy * dy < (subject.r + 90) * (subject.r + 90)) continue;
      if (!farEnough(x, y, w)) continue;
      eyes.push(makeEye(x, y, w));
      return;
    }
  }

  function setEyeCount(n) {
    targetCount = clamp(n, 6, 220);
    document.getElementById('count').textContent = targetCount;
    while (eyes.length < targetCount) placeEye();
    if (eyes.length > targetCount) eyes.length = targetCount;
  }

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    subject.x = W * 0.5; subject.y = H * 0.46;
    eyes = [];
    setEyeCount(targetCount);
  }
  addEventListener('resize', resize);

  function drawEye(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rotCur);
    eyeShapePath(e.w, e.h);
    ctx.fillStyle = '#FBF8F2';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.arc(e.px, e.py, e.pupilR, 0, Math.PI * 2);
    ctx.fillStyle = e.pupilColor;
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawSubject() {
    ctx.save();
    ctx.translate(subject.x, subject.y);
    ctx.beginPath();
    ctx.arc(0, 0, subject.r, 0, Math.PI * 2);
    ctx.fillStyle = SUBJECT_COLOR;
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    for (const e of eyes) drawEye(e);
    drawSubject();
  }

  resize();
  render();

  requestAnimationFrame(() => {
    document.getElementById('caption').classList.add('in');
    document.getElementById('hud').classList.add('in');
  });
})();
</script>
```

- [ ] **Step 2: Verify in browser**

Reload `design-dummy/index.html`.

Expected: ~60 almond-shaped eyes scattered across the viewport, each with a solid flat-colored pupil (one of the 5 palette hues), no overlapping eyes, a clear empty ring around the center where a plain blush-pink circle (the subject) sits. Resizing the window re-scatters the eyes without errors in the console.

- [ ] **Step 3: Commit**

```bash
git add design-dummy/index.html
git commit -m "add eye data model, overlap-avoiding placement, and static render"
```

---

### Task 3: Physics — subject-repulsion, spring-home, damping, rotation tilt

**Files:**
- Modify: `design-dummy/index.html`

- [ ] **Step 1: Add a `stepEyes` physics function and switch `render()` to a `requestAnimationFrame` loop**

Insert this function right before `function render() {`:

```javascript
  function angleLerp(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  function stepEyes(dt) {
    const R = Math.min(W, H);
    const fieldR = R * 0.55;
    for (const e of eyes) {
      const dx = e.x - subject.x, dy = e.y - subject.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist, ny = dy / dist;

      const influence = clamp(1 - dist / fieldR, 0, 1);
      const dragBoost = dragging ? 2.2 : 1.0;
      const repel = influence * influence * repelStrength * 2600 * dragBoost;
      e.vx += nx * repel * dt;
      e.vy += ny * repel * dt;

      const hx = e.hx - e.x, hy = e.hy - e.y;
      e.vx += hx * 2.2 * dt;
      e.vy += hy * 2.2 * dt;

      const damp = Math.pow(0.12, dt);
      e.vx *= damp; e.vy *= damp;

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      const fieldAng = Math.atan2(dy, dx);
      const tilt = Math.sin(fieldAng) * 0.35 * influence;
      e.rotCur = angleLerp(e.rotCur, e.rot + tilt, 1 - Math.pow(0.01, dt));
    }
  }
```

Replace:
```javascript
  function render() {
    ctx.clearRect(0, 0, W, H);
    for (const e of eyes) drawEye(e);
    drawSubject();
  }

  resize();
  render();
```

With:
```javascript
  let dragging = false;
  let last = performance.now();

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, W, H);
    stepEyes(dt);
    for (const e of eyes) drawEye(e);
    drawSubject();
    requestAnimationFrame(tick);
  }

  resize();
  requestAnimationFrame(tick);
```

- [ ] **Step 2: Verify in browser**

Reload. Expected: the field renders continuously (no visible change yet since nothing moves the subject or cursor). Open the browser console and run `subject === undefined` — should print `false`, confirming the script still initializes without errors. No console errors on load or resize.

- [ ] **Step 3: Commit**

```bash
git add design-dummy/index.html
git commit -m "add spring/repel/damping physics loop driven by requestAnimationFrame"
```

---

### Task 4: Pupil tracking, dilation, and idle orbit

**Files:**
- Modify: `design-dummy/index.html`

- [ ] **Step 1: Add pointer tracking state and wire it into `stepEyes`**

Insert after the `const subject = { x: 0, y: 0, r: 44 };` line:

```javascript
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
  let lastMove = performance.now();

  addEventListener('pointermove', e => {
    pointer.tx = e.clientX;
    pointer.ty = e.clientY;
    lastMove = performance.now();
  });
```

Modify `stepEyes(dt)` to accept `now` and add pupil tracking + dilation + idle orbit at the end of the per-eye loop (right after the `e.rotCur = angleLerp(...)` line, still inside the `for (const e of eyes)` block):

Replace:
```javascript
  function stepEyes(dt) {
```
With:
```javascript
  function stepEyes(dt, now) {
```

Add immediately after `e.rotCur = angleLerp(e.rotCur, e.rot + tilt, 1 - Math.pow(0.01, dt));` (still inside the loop, before the loop's closing `}`):

```javascript

      const idle = now - lastMove > 1400;
      let tx, ty;
      if (idle) {
        const a = e.ph + now * e.sp;
        tx = subject.x + Math.cos(a) * 26;
        ty = subject.y + Math.sin(a) * 22;
      } else {
        tx = pointer.x;
        ty = pointer.y;
      }
      const cdx = tx - e.x, cdy = ty - e.y;
      const cdist = Math.hypot(cdx, cdy) || 1;
      const reach = clamp(cdist / 240, 0, 1);
      const maxX = Math.max(0, (e.w / 2 - e.pupilR) * 0.7) * reach;
      const maxY = Math.max(0, (e.h * 0.85 - e.pupilR) * 0.45) * reach;
      const pk = 1 - Math.pow(0.001, dt);
      e.px = lerp(e.px, (cdx / cdist) * maxX, pk);
      e.py = lerp(e.py, (cdy / cdist) * maxY, pk);
      e.dilate = lerp(e.dilate, clamp(1 - cdist / 220, 0, 1), 1 - Math.pow(0.02, dt));
```

- [ ] **Step 2: Use `e.px`/`e.py`/`e.dilate` in `drawEye` (dilated pupil)**

Replace, inside `drawEye(e)`:
```javascript
    ctx.beginPath();
    ctx.arc(e.px, e.py, e.pupilR, 0, Math.PI * 2);
    ctx.fillStyle = e.pupilColor;
    ctx.fill();
```
With:
```javascript
    const pr = e.pupilR * (1 + e.dilate * 0.4);
    ctx.beginPath();
    ctx.arc(e.px, e.py, pr, 0, Math.PI * 2);
    ctx.fillStyle = e.pupilColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.px - pr * 0.32, e.py - pr * 0.36, pr * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251,248,242,0.85)';
    ctx.fill();
```

- [ ] **Step 3: Pass `now` from `tick` into `stepEyes`**

Replace:
```javascript
    stepEyes(dt);
```
With:
```javascript
    stepEyes(dt, now);
```

- [ ] **Step 4: Verify in browser**

Reload. Move the mouse across the screen: every eye's pupil should turn to follow the cursor, with a small white catch-light. Move the cursor close to an individual eye (within ~220px) and watch its pupil visibly grow (dilate) compared to eyes farther away. Stop moving the mouse for ~1.5s: pupils should drift into a slow, gentle wander near the center subject instead of freezing on the last cursor position.

- [ ] **Step 5: Commit**

```bash
git add design-dummy/index.html
git commit -m "add cursor-tracking, proximity-based pupil dilation, and idle gaze orbit"
```

---

### Task 5: Independent per-eye blink cycles

**Files:**
- Modify: `design-dummy/index.html`

- [ ] **Step 1: Add blink-phase update at the end of the per-eye loop in `stepEyes`**

Add immediately after the `e.dilate = lerp(...)` line added in Task 4 (still inside the `for (const e of eyes)` loop, before its closing `}`):

```javascript

      e.blinkT -= dt;
      if (e.blinkT <= 0 && e.blinkPhase === 0) e.blinkPhase = 1;
      if (e.blinkPhase === 1) {
        e.blink = Math.max(0, e.blink - dt * 9);
        if (e.blink === 0) e.blinkPhase = 2;
      } else if (e.blinkPhase === 2) {
        e.blink = Math.min(1, e.blink + dt * 7);
        if (e.blink === 1) { e.blinkPhase = 0; e.blinkT = rand(2.5, 8); }
      }
```

- [ ] **Step 2: Draw the closing eyelid in `drawEye`**

Add at the end of `drawEye(e)`, just before its final `ctx.restore();`:

```javascript
    if (e.blink < 1) {
      ctx.save();
      eyeShapePath(e.w, e.h);
      ctx.clip();
      const h2 = e.h / 2, w2 = e.w / 2;
      const lidY = -h2 * 1.8 + (1 - e.blink) * (h2 * 3.6);
      ctx.beginPath();
      ctx.rect(-w2 - 2, -h2 * 1.9, w2 * 2 + 4, lidY + h2 * 1.9);
      ctx.fillStyle = '#FBF8F2';
      ctx.fill();
      ctx.restore();
    }
```

Note: `drawEye` currently has two nested `ctx.save()`/`ctx.restore()` pairs (outer for translate/rotate, inner for the pupil clip). Add the blink block after the inner pair's `ctx.restore()` but before the outer one's `ctx.restore()`.

- [ ] **Step 3: Verify in browser**

Reload and watch for ~15 seconds. Expected: eyes blink independently and irregularly (not synchronized) — each closes and reopens quickly (roughly 100-150ms), on its own random schedule every few seconds.

- [ ] **Step 4: Commit**

```bash
git add design-dummy/index.html
git commit -m "add independent per-eye blink cycles"
```

---

### Task 6: Draggable subject + real cursor states (default / grab / grabbing)

**Files:**
- Modify: `design-dummy/index.html`

- [ ] **Step 1: Add drag state, cursor-class toggling, and pointer handlers**

Replace:
```javascript
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
  let lastMove = performance.now();

  addEventListener('pointermove', e => {
    pointer.tx = e.clientX;
    pointer.ty = e.clientY;
    lastMove = performance.now();
  });
```
With:
```javascript
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
  let lastMove = performance.now();
  let dragging = false, dragDX = 0, dragDY = 0;

  function updateCursor() {
    if (dragging) {
      document.body.classList.add('grabbing');
      document.body.classList.remove('grab-hover');
      return;
    }
    document.body.classList.remove('grabbing');
    const dx = pointer.x - subject.x, dy = pointer.y - subject.y;
    const hovering = Math.hypot(dx, dy) < subject.r + 16;
    document.body.classList.toggle('grab-hover', hovering);
  }

  addEventListener('pointermove', e => {
    pointer.tx = e.clientX;
    pointer.ty = e.clientY;
    lastMove = performance.now();
    updateCursor();
  });
  addEventListener('pointerdown', e => {
    const dx = e.clientX - subject.x, dy = e.clientY - subject.y;
    if (dx * dx + dy * dy < (subject.r + 16) * (subject.r + 16)) {
      dragging = true;
      dragDX = dx;
      dragDY = dy;
    }
    updateCursor();
  });
  addEventListener('pointerup', () => {
    dragging = false;
    updateCursor();
  });
```

- [ ] **Step 2: Remove the duplicate `let dragging = false;` from Task 3's `tick` setup**

Replace:
```javascript
  let dragging = false;
  let last = performance.now();
```
With:
```javascript
  let last = performance.now();
```

- [ ] **Step 3: Move the subject when dragging, inside `tick`**

Replace:
```javascript
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, W, H);
    stepEyes(dt, now);
    for (const e of eyes) drawEye(e);
    drawSubject();
    requestAnimationFrame(tick);
  }
```
With:
```javascript
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    pointer.x = lerp(pointer.x, pointer.tx, 1 - Math.pow(0.0001, dt));
    pointer.y = lerp(pointer.y, pointer.ty, 1 - Math.pow(0.0001, dt));
    if (dragging) {
      subject.x = lerp(subject.x, pointer.x - dragDX, 1 - Math.pow(0.00001, dt));
      subject.y = lerp(subject.y, pointer.y - dragDY, 1 - Math.pow(0.00001, dt));
      subject.x = clamp(subject.x, 50, W - 50);
      subject.y = clamp(subject.y, 60, H - 50);
    }
    ctx.clearRect(0, 0, W, H);
    stepEyes(dt, now);
    for (const e of eyes) drawEye(e);
    drawSubject(now);
    requestAnimationFrame(tick);
  }
```

- [ ] **Step 4: Add a subtle "breathing" scale to the subject while idle, and a stronger shadow while dragging**

Replace `function drawSubject() {` and its body with:
```javascript
  function drawSubject(now) {
    const breathe = 1 + Math.sin(now * 0.0016) * 0.035;
    ctx.save();
    ctx.translate(subject.x, subject.y);
    ctx.scale(breathe, breathe);
    ctx.beginPath();
    ctx.ellipse(0, subject.r * 1.05, subject.r * 0.85, subject.r * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(42,39,35,${dragging ? 0.12 : 0.06})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, subject.r, 0, Math.PI * 2);
    ctx.fillStyle = SUBJECT_COLOR;
    ctx.fill();
    ctx.restore();
  }
```

Replace the `drawSubject();` call left over from Task 2's `render()`/Task 3 (there should be only one call site now, inside `tick`) — confirm it now reads `drawSubject(now);` (already updated in Step 3 above).

- [ ] **Step 5: Verify in browser**

Reload. Move the cursor around empty space: it stays the plain default OS arrow. Hover directly over the pink subject circle: the cursor changes to an open hand (`grab`). Click and hold on the subject and drag: cursor becomes a closed hand (`grabbing`), the subject follows the pointer, and nearby eyes flee from it more strongly than before (drag boost) while others spring back home. Release: cursor returns to default (or `grab` if still hovering).

- [ ] **Step 6: Commit**

```bash
git add design-dummy/index.html
git commit -m "add draggable subject with default/grab/grabbing cursor states"
```

---

### Task 7: Wire HUD controls (stepper + repel slider) to simulation state

**Files:**
- Modify: `design-dummy/index.html`

- [ ] **Step 1: Add event listeners at the end of the IIFE, after `requestAnimationFrame(tick);`**

Replace:
```javascript
  resize();
  requestAnimationFrame(tick);

  requestAnimationFrame(() => {
    document.getElementById('caption').classList.add('in');
    document.getElementById('hud').classList.add('in');
  });
})();
```
With:
```javascript
  resize();
  requestAnimationFrame(tick);

  document.getElementById('inc').addEventListener('click', () => setEyeCount(targetCount + 10));
  document.getElementById('dec').addEventListener('click', () => setEyeCount(targetCount - 10));
  document.getElementById('repel').addEventListener('input', e => {
    repelStrength = e.target.value / 100;
  });

  requestAnimationFrame(() => {
    document.getElementById('caption').classList.add('in');
    document.getElementById('hud').classList.add('in');
  });
})();
```

- [ ] **Step 2: Verify in browser**

Reload. Click the `+` stepper button several times: the count label increases by 10 each click (clamped at 220) and new eyes appear scattered in the empty gaps. Click `−`: count decreases by 10 (clamped at 6) and eyes are removed. Drag the repel slider to 0: dragging the subject barely pushes nearby eyes. Drag it to 100: dragging the subject pushes eyes away forcefully. Hovering over the stepper buttons and slider shows the normal browser pointer/grab affordance for those controls (not the canvas's default/grab logic) — confirm the body-level cursor classes from Task 6 don't visually fight with these controls.

- [ ] **Step 3: Commit**

```bash
git add design-dummy/index.html
git commit -m "wire HUD stepper and repel slider to simulation state"
```

---

### Task 8: Ambient wandering bugs (decorative detail from design-dummy.html)

**Files:**
- Modify: `design-dummy/index.html`

- [ ] **Step 1: Add bug state, spawn, update, and draw functions**

Insert after the `addEventListener('resize', resize);` line:

```javascript
  const bugs = [];
  function spawnBugs() {
    bugs.length = 0;
    const n = Math.max(3, Math.round(W / 560));
    for (let i = 0; i < n; i++) {
      bugs.push({
        x: rand(40, W - 40), y: rand(60, H - 60),
        a: rand(0, Math.PI * 2), sp: rand(18, 42),
        turn: 0, turnT: rand(0.4, 1.6), s: rand(0.8, 1.15), legT: rand(0, 10),
      });
    }
  }

  function stepBugs(dt) {
    for (const b of bugs) {
      b.turnT -= dt;
      if (b.turnT <= 0) { b.turn = rand(-2.2, 2.2); b.turnT = rand(0.3, 1.4); }
      const dx = b.x - pointer.x, dy = b.y - pointer.y, d2 = dx * dx + dy * dy;
      if (d2 < 120 * 120) b.turn += (Math.atan2(dy, dx) - b.a > 0) ? 0.12 : -0.12;
      b.a += b.turn * dt;
      b.x += Math.cos(b.a) * b.sp * dt;
      b.y += Math.sin(b.a) * b.sp * dt;
      b.legT += dt;
      if (b.x < 12) { b.x = 12; b.a = Math.PI - b.a; }
      if (b.x > W - 12) { b.x = W - 12; b.a = Math.PI - b.a; }
      if (b.y < 12) { b.y = 12; b.a = -b.a; }
      if (b.y > H - 12) { b.y = H - 12; b.a = -b.a; }
    }
  }

  function drawBug(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a + Math.PI / 2);
    ctx.scale(b.s, b.s);
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1.1;
    const wiggle = Math.sin(b.legT * 18) * 1.6;
    for (let i = -1; i <= 1; i++) {
      const ly = i * 3;
      ctx.beginPath(); ctx.moveTo(-2, ly); ctx.lineTo(-6, ly + wiggle * (i || 1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, ly); ctx.lineTo(6, ly - wiggle * (i || 1)); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-1.4, -5); ctx.quadraticCurveTo(-4, -9, -5.5, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.4, -5); ctx.quadraticCurveTo(4, -9, 5.5, -10); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 3.1, 5.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -5.4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
```

- [ ] **Step 2: Spawn bugs on resize**

Replace, in `resize()`:
```javascript
    eyes = [];
    setEyeCount(targetCount);
  }
```
With:
```javascript
    eyes = [];
    setEyeCount(targetCount);
    spawnBugs();
  }
```

- [ ] **Step 3: Step and draw bugs each frame**

Replace, in `tick(now)`:
```javascript
    ctx.clearRect(0, 0, W, H);
    stepEyes(dt, now);
    for (const e of eyes) drawEye(e);
    drawSubject(now);
    requestAnimationFrame(tick);
```
With:
```javascript
    ctx.clearRect(0, 0, W, H);
    stepEyes(dt, now);
    for (const e of eyes) drawEye(e);
    stepBugs(dt);
    for (const b of bugs) drawBug(b);
    drawSubject(now);
    requestAnimationFrame(tick);
```

- [ ] **Step 4: Verify in browser**

Reload. Expected: a handful (3+, scaling with viewport width) of tiny six-legged ink-colored bugs wander the page independently, changing direction periodically, gently steering away when the cursor gets close (~120px), and bouncing off the viewport edges instead of leaving the screen.

- [ ] **Step 5: Commit**

```bash
git add design-dummy/index.html
git commit -m "add ambient wandering bugs as decorative detail"
```

---

### Task 9: Final pass against the Figma reference

**Files:**
- Modify: `design-dummy/index.html` (only if the comparison below surfaces a mismatch)

- [ ] **Step 1: Side-by-side visual comparison**

Open `design-dummy/index.html` in a browser at a 1280×832 window size (matching the Figma artboard) alongside the Figma reference (file `oPAdd7oWLQVMTP1v6pJOW0`, node `1:2`). Compare:
- Background tone (cream, not off-white or beige)
- Eye shape proportions (almond, not too round or too angular)
- Pupil colors (flat fills only — no gradients or specular rings should look glossy/3D)
- Overall density and spacing of eyes across the field

- [ ] **Step 2: Fix any mismatch found**

If a mismatch is found, make the smallest possible edit to the relevant constant (e.g. adjust a color in `PUPIL_COLORS`/`SUBJECT_COLOR`, or the `0.42`/`0.35` shape ratios in `eyeShapePath`) and re-compare. If no mismatch is found, skip to Step 3.

- [ ] **Step 3: Full interaction smoke test**

With the file open, run through: move cursor slowly across the whole viewport (pupils track, nearby ones dilate) → stop moving for 2s (pupils drift into idle orbit near the subject) → hover the subject (cursor → grab) → drag the subject to a corner and release (eyes flee then spring back, cursor → grabbing → grab/default) → click `+`/`−` on the stepper (count changes, eyes added/removed) → drag the repel slider (drag force visibly changes) → resize the browser window (field re-scatters cleanly, no errors in console).

- [ ] **Step 4: Commit (only if Step 2 made changes)**

```bash
git add design-dummy/index.html
git commit -m "tune palette/shape constants to match Figma reference"
```

---

## Self-Review Notes

- **Spec coverage:** eye asset from deep-index (Task 2's `eyeShapePath`) ✓; glm's visual palette/fonts/grain (Task 1) ✓; glm's pupil dilation (Task 4) ✓; design-dummy's physics/blink/drag/HUD/bugs (Tasks 3, 5, 6, 7, 8) ✓; cursor fix (Task 6) ✓; static "Eyes mode" label, no toggle (Task 1, untouched afterward) ✓; Figma fidelity check (Task 9) ✓; single self-contained file, no `src/` wiring (all tasks target only `design-dummy/index.html`) ✓.
- **Placeholder scan:** no TBD/TODO markers; every step contains complete, runnable code.
- **Type/name consistency:** `stepEyes(dt, now)` signature introduced in Task 4 and used consistently from Task 4 onward; `dragging`/`dragDX`/`dragDY` declared once in Task 6 (Task 3's placeholder `let dragging = false;` is explicitly removed in Task 6 Step 2 to avoid a duplicate declaration); `drawSubject(now)` signature finalized in Task 6 and used consistently after.
