## Communities (part 3 of 3)

> Continued from [GRAPH_REPORT_COMMUNITIES_2.md](GRAPH_REPORT_COMMUNITIES_2.md).

### Community 166 - "beats.ts"
Cohesion: 1.0
Nodes (0): 

### Community 167 - "touchSupport.test.ts"
Cohesion: 1.0
Nodes (0): 

### Community 168 - "creatureGridIdleResurge.test.ts"
Cohesion: 1.0
Nodes (0): 

### Community 169 - "AudioManager class"
Cohesion: 1.0
Nodes (1): AudioManager class

### Community 170 - "setHoverToneStyle (devtools hook)"
Cohesion: 1.0
Nodes (1): setHoverToneStyle (devtools hook)

### Community 171 - "Jantar Mantar protest"
Cohesion: 1.0
Nodes (1): Jantar Mantar protest

### Community 172 - "Key Takeaways section"
Cohesion: 1.0
Nodes (1): Key Takeaways section

### Community 173 - "robots.txt"
Cohesion: 1.0
Nodes (0): 

## Ambiguous Edges - Review These
- `SubjectDrawer.ts + subjectDrawer.css <- Figma subject element` → `drawSubject.ts (colorByName palette guard, flat-illustrated)`  [AMBIGUOUS]
  DESIGN.md · relation: conceptually_related_to
- `Figma-First Experience Overhaul Design Spec` → `Premium Visual & Collective Attack (PR1) Design Spec`  [AMBIGUOUS]
  docs/superpowers/specs/2026-07-28-figma-first-experience-overhaul-design.md · relation: conceptually_related_to
- `Figma-First Experience Overhaul Design Spec` → `Multi-Subject Targeting (PR2) Design Spec`  [AMBIGUOUS]
  docs/superpowers/specs/2026-07-28-figma-first-experience-overhaul-design.md · relation: conceptually_related_to
- `Drag Handle Icon (Six-Dot Grip)` → `Eye Crowd Grid Mockup with Draggable Pink Target`  [AMBIGUOUS]
  docs/superpowers/assets/icons/eye pupil.png · relation: semantically_similar_to
- `Filter Panel Design Reference (Numbers Stepper + Repel Slider)` → `Control Icons Design Reference (Toolbar Icon Set)`  [AMBIGUOUS]
  public/assets/figma/references/reference-filter-panel.png · relation: conceptually_related_to
- `Crowd Bug (Right-Facing)` → `Crowd Bug (Left-Facing)`  [AMBIGUOUS]
  public/assets/figma/crowd/crowd-bug-right.svg · relation: has_identical_path_geometry_to
- `Crowd Bug (Right-Facing)` → `Crowd Bug (Upright)`  [AMBIGUOUS]
  public/assets/figma/crowd/crowd-bug-right.svg · relation: has_identical_path_geometry_to
- `Crowd Bug (Left-Facing)` → `Crowd Bug (Upright)`  [AMBIGUOUS]
  public/assets/figma/crowd/crowd-bug-left.svg · relation: has_identical_path_geometry_to
- `Subject: Elder Figure` → `Subject: Lotus`  [AMBIGUOUS]
  public/assets/figma/subjects/subject-elder-figure.png · relation: conceptually_related_to
- `Control: Eye Pupil Dot Icon` → `Scene Control: Neutral Well (empty ellipse placeholder)`  [AMBIGUOUS]
  public/assets/figma/icons/control-eye-pupil.svg · relation: semantically_similar_to
- `Effect: Attack Target Glow` → `Lotus Surrounded by Cockroach Swarm (Gemini Reference)`  [AMBIGUOUS]
  public/Reference/Gemini_Generated_Image_poul1opoul1opoul 1.png · relation: conceptually_related_to
- `Effect: Attack Target Glow` → `Lotus Attacked by Pointing Fingers with Lightning (Gemini Reference)`  [AMBIGUOUS]
  public/Reference/Gemini_Generated_Image_3e3c523e3c523e3c (1) 1.png · relation: conceptually_related_to
- `Giant Eye Variant 04` → `Compact Eye Variant 06`  [AMBIGUOUS]
  public/assets/figma/eyes/eye-giant-04.svg · relation: conceptually_related_to
- `Hud class (consolidated toolbar)` → `CreatureMode union type`  [AMBIGUOUS]
  tests/unit/creatureTypes.test.ts · relation: conceptually_related_to
- `CreatureMode union type` → `BugSwarm (anime.js swarm)`  [AMBIGUOUS]
  tests/unit/bugSwarm.test.ts · relation: conceptually_related_to
- `Placard HUD Icon Runtime SVG Fetch` → `Rationale: Static Client-Only App Keeps Attack Surface Small`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-08-crowd-fixes-plan.md · relation: conceptually_related_to
- `Beat 4 Attack-Gradient Dot and Begin Button` → `Hud.getAttackButton() Getter`  [AMBIGUOUS]
  docs/superpowers/plans/2026-08-08-protest-impact-panel.md · relation: conceptually_related_to
- `hud.test.ts` → `onboardingCarousel.test.ts`  [AMBIGUOUS]
  tests/unit/onboardingCarousel.test.ts · relation: shares_data_with
- `trackEvent` → `MenuPanel class`  [AMBIGUOUS]
  src/hud/MenuPanel.ts · relation: conceptually_related_to
- `Delhi Police Constable Sticker Sheet Design` → `delhi-police-constables sticker design goals`  [AMBIGUOUS]
  docs/superpowers/specs/2026-08-11-delhi-police-stickers-design.md · relation: conceptually_related_to
- `Share Image SVG` → `Favicon Icon`  [AMBIGUOUS]
  public/share-image.svg · relation: conceptually_related_to
- `Placard: Jai Hind` → `Placard: Vasteguna Huiyan`  [AMBIGUOUS]
  public/creatures/placards/placard_14.png · relation: semantically_similar_to

## Knowledge Gaps
- **335 isolated node(s):** `helpers/mainDomSetup.ts (stub canvas + DOM bootstrap)`, `build-grain.py script`, `queryNearestEye`, `shouldSpawnSubject`, `Hud (hud-placard grain/CSS tokens)` (+330 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `readText()`** (2 nodes): `readText()`, `hud.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ADR 004: DOM HUD vs Canvas HUD`** (2 nodes): `ADR 004: DOM HUD vs Canvas HUD`, `Hud.ts (DOM HUD implementation)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AGENTS.md`** (2 nodes): `AGENTS.md`, `CLAUDE.md`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `createMockElement()`** (2 nodes): `createMockElement()`, `creatureTypes.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `makeInstance()`** (2 nodes): `makeInstance()`, `bugSwarm.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `createCreature()`** (2 nodes): `createCreature()`, `creaturePhysics.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Add/Plus Icon (Cross of Two Lines)`** (2 nodes): `Add/Plus Icon (Cross of Two Lines)`, `Reduce/Minus Icon (Horizontal Line)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gallery/Grid View Icon (2x2 Rounded Squares)`** (2 nodes): `Gallery/Grid View Icon (2x2 Rounded Squares)`, `Text Tool Icon (T Glyph with Frame Corner Brackets)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Control: Eye Pupil Dot Icon`** (2 nodes): `Control: Eye Pupil Dot Icon`, `Scene Control: Neutral Well (empty ellipse placeholder)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Control: Gallery Tile Tertiary Corner Bracket`** (2 nodes): `Control: Gallery Tile Tertiary Corner Bracket`, `Scene Control: Gallery Tile Secondary Corner Bracket`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Filter Panel: Repel/Track Divider Line`** (2 nodes): `Filter Panel: Repel/Track Divider Line`, `Scene Control: Subtle Divider Line`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Control Icon - Gallery Tile (Primary, Rounded Square)`** (2 nodes): `Control Icon - Gallery Tile (Primary, Rounded Square)`, `Control Icon - Quantity Plus (Single Bar Segment)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye Compact 02 (Dark Iris, Default State)`** (2 nodes): `Eye Compact 02 (Dark Iris, Default State)`, `Eye Compact 02 Attack Variant`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `filterPanel.test.ts suite`** (2 nodes): `filterPanel.test.ts suite`, `galleryPanel.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `draggableAvatar.test.ts suite`** (2 nodes): `draggableAvatar.test.ts suite`, `makeDraggable.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `createFakeAudioContext()`** (2 nodes): `createFakeAudioContext()`, `hoverTones.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `FakeAudioContext`** (2 nodes): `FakeAudioContext`, `audioManager.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `createFakeControl()`** (2 nodes): `createFakeControl()`, `audioWidget.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Post-Deploy curl Header Verification`** (2 nodes): `Post-Deploy curl Header Verification`, `Rationale: Config-Only, So curl Not vitest`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `byId()`** (2 nodes): `byId()`, `menuContent.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `clickQuickLink()`** (2 nodes): `clickQuickLink()`, `menuPanel.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `touch()`** (2 nodes): `touch()`, `pinchZoom.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `playKnockBurst`** (2 nodes): `playKnockBurst`, `playHudSelectTone`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `isTouchDevice`** (2 nodes): `isTouchDevice`, `touchSupport.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `hud/shareLinks`** (2 nodes): `hud/shareLinks`, `shareLinks.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bed crossfade scheduler`** (2 nodes): `Bed crossfade scheduler`, `detectVolumeControlSupport (iOS volume quirk)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `MenuPanel.handleInstagramShare`** (2 nodes): `MenuPanel.handleInstagramShare`, `isMobileUserAgent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `shuffleVideos`** (2 nodes): `shuffleVideos`, `MenuPanel.buildMediaScreen`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Aajtak Wali Didi Sticker Text`** (2 nodes): `Aajtak Wali Didi Sticker Text`, `Tax Wali Tai Sticker Text`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Badbola Patra Sticker Text`** (2 nodes): `Badbola Patra Sticker Text`, `Chronology Mota Bhai Sticker Text`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DNA Tihari Sticker Text`** (2 nodes): `DNA Tihari Sticker Text`, `Leak Pradhan Sticker Text`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gutter Didi (Mamata Banerjee caricature)`** (2 nodes): `Gutter Didi (Mamata Banerjee caricature)`, `Kaleshi Aajtak Kaki (female news-anchor caricature)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Placard: Jai Hind`** (2 nodes): `Placard: Jai Hind`, `Placard: Vasteguna Huiyan`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Placard: Chai Bna Ch*tiya Nahi`** (2 nodes): `Placard: Chai Bna Ch*tiya Nahi`, `Placard: Gutter Bhi Cockroach Bhi`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `vite.config.ts`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `integrator.test.ts`** (1 nodes): `integrator.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `core.test.ts`** (1 nodes): `core.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `helpers/mainDomSetup.ts (stub canvas + DOM bootstrap)`** (1 nodes): `helpers/mainDomSetup.ts (stub canvas + DOM bootstrap)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `queryNearestEye`** (1 nodes): `queryNearestEye`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `shouldSpawnSubject`** (1 nodes): `shouldSpawnSubject`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hud (hud-placard grain/CSS tokens)`** (1 nodes): `Hud (hud-placard grain/CSS tokens)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Merged Eyes Design Dummy Implementation Plan`** (1 nodes): `Merged Eyes Design Dummy Implementation Plan`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Open design questions for v2 §6`** (1 nodes): `Open design questions for v2 §6`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auto-extracted dependency graph (madge)`** (1 nodes): `Auto-extracted dependency graph (madge)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Site Favicon (Solid Pink Circle)`** (1 nodes): `Site Favicon (Solid Pink Circle)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `FORCEFIELD configuration constant`** (1 nodes): `FORCEFIELD configuration constant`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ADR 005: Mode-locked power pairing (v2)`** (1 nodes): `ADR 005: Mode-locked power pairing (v2)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `filterPanel.test.ts`** (1 nodes): `filterPanel.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `cockroachCreature.test.ts`** (1 nodes): `cockroachCreature.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `galleryPanel.test.ts`** (1 nodes): `galleryPanel.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `fingerCreature.test.ts`** (1 nodes): `fingerCreature.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `draggableAvatar.test.ts`** (1 nodes): `draggableAvatar.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `stickerOverlay.test.ts`** (1 nodes): `stickerOverlay.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `eyeCreature.test.ts`** (1 nodes): `eyeCreature.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `creatureGrid.test.ts`** (1 nodes): `creatureGrid.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `creatureFactorySpawnFields.test.ts`** (1 nodes): `creatureFactorySpawnFields.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `placardCreature.test.ts`** (1 nodes): `placardCreature.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `creatureGridPopIn.test.ts`** (1 nodes): `creatureGridPopIn.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `creatureCssHygiene.test.ts`** (1 nodes): `creatureCssHygiene.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `computeSpawnProgress.test.ts`** (1 nodes): `computeSpawnProgress.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `makeDraggable.test.ts`** (1 nodes): `makeDraggable.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `textOverlay.test.ts`** (1 nodes): `textOverlay.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `vite-env.d.ts`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `figma-asset-audit.mjs (validation/geometry/safety module)`** (1 nodes): `figma-asset-audit.mjs (validation/geometry/safety module)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `resampleRgbaSrgb() - linear-light bilinear resample w/ premultiplied alpha`** (1 nodes): `resampleRgbaSrgb() - linear-light bilinear resample w/ premultiplied alpha`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fun Satire v2 Expansion Design Spec (external, cited by ADR 005/006)`** (1 nodes): `Fun Satire v2 Expansion Design Spec (external, cited by ADR 005/006)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Viewport 768×1024 (Tablet Portrait) — full HUD toolbar row at bottom; eye entity appears to peek from behind top-right volume panel (possible z-order/clipping issue)`** (1 nodes): `Viewport 768×1024 (Tablet Portrait) — full HUD toolbar row at bottom; eye entity appears to peek from behind top-right volume panel (possible z-order/clipping issue)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Viewport 1440×900 (Desktop Landscape) — HUD toolbar shows 'LASER BURN' label with a hand-cursor icon overlapping the text; volume slider docked bottom-right`** (1 nodes): `Viewport 1440×900 (Desktop Landscape) — HUD toolbar shows 'LASER BURN' label with a hand-cursor icon overlapping the text; volume slider docked bottom-right`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Viewport 1024×768 (Tablet Landscape) — HUD toolbar shows only ATTACK (no 'LASER BURN' label rendered); volume slider docked top-right`** (1 nodes): `Viewport 1024×768 (Tablet Landscape) — HUD toolbar shows only ATTACK (no 'LASER BURN' label rendered); volume slider docked top-right`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Viewport 1280×832 (Laptop Landscape) — HUD toolbar shows 'LASER BURN' label with the same hand-cursor icon overlapping the text as seen at 1440×900; volume slider docked bottom-right`** (1 nodes): `Viewport 1280×832 (Laptop Landscape) — HUD toolbar shows 'LASER BURN' label with the same hand-cursor icon overlapping the text as seen at 1440×900; volume slider docked bottom-right`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Viewport 390×844 (Mobile Portrait) — toolbar overflow bug: a stray hand icon wraps onto a second row below the main toolbar, and the -/20/+ counter is clipped at the right edge; volume panel also clipped at top-right edge`** (1 nodes): `Viewport 390×844 (Mobile Portrait) — toolbar overflow bug: a stray hand icon wraps onto a second row below the main toolbar, and the -/20/+ counter is clipped at the right edge; volume panel also clipped at top-right edge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Viewport 844×390 (Mobile Landscape) — HUD toolbar fits cleanly on a single row, volume panel fully visible top-right, no layout issues observed`** (1 nodes): `Viewport 844×390 (Mobile Landscape) — HUD toolbar fits cleanly on a single row, volume panel fully visible top-right, no layout issues observed`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Controls Icon (Equalizer/Sliders Glyph)`** (1 nodes): `Controls Icon (Equalizer/Sliders Glyph)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Finger Creature Sprite`** (1 nodes): `Finger Creature Sprite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye Creature Sprite`** (1 nodes): `Eye Creature Sprite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Selected Well Indicator (Green Glow Circle)`** (1 nodes): `Selected Well Indicator (Green Glow Circle)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Horizontal Stroke / Divider Line`** (1 nodes): `Horizontal Stroke / Divider Line`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Filter Repel Slider Thumb`** (1 nodes): `Filter Repel Slider Thumb`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hand Cursor - Wrist/Arm Curve`** (1 nodes): `Hand Cursor - Wrist/Arm Curve`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Subject/Viewfinder Frame Icon with Crosshair`** (1 nodes): `Subject/Viewfinder Frame Icon with Crosshair`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Filter Knob (Small)`** (1 nodes): `Filter Knob (Small)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gallery Tile Icon - Primary (Rounded Corner Card)`** (1 nodes): `Gallery Tile Icon - Primary (Rounded Corner Card)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hand Cursor - Finger/Palm Stroke`** (1 nodes): `Hand Cursor - Finger/Palm Stroke`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Filter Knob (Scene Control, Larger)`** (1 nodes): `Filter Knob (Scene Control, Larger)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gallery Tile Icon - Secondary (Rounded Corner Card)`** (1 nodes): `Gallery Tile Icon - Secondary (Rounded Corner Card)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Large 06 (slate blue-gray iris, gaze right)`** (1 nodes): `Eye - Large 06 (slate blue-gray iris, gaze right)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Large 04 (near-black iris, gaze right-down)`** (1 nodes): `Eye - Large 04 (near-black iris, gaze right-down)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Small 01 (near-black iris, gaze right-up, smallest of set)`** (1 nodes): `Eye - Small 01 (near-black iris, gaze right-up, smallest of set)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Large 05 (near-black iris, gaze right, near-centered vertically)`** (1 nodes): `Eye - Large 05 (near-black iris, gaze right, near-centered vertically)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Medium 03 (warm brown iris, gaze right-down)`** (1 nodes): `Eye - Medium 03 (warm brown iris, gaze right-down)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Large 08 (near-black iris, gaze right-down; geometrically identical to Large 04)`** (1 nodes): `Eye - Large 08 (near-black iris, gaze right-down; geometrically identical to Large 04)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Medium 02 (warm brown iris, gaze right-up, oversized dimensions vs other mediums)`** (1 nodes): `Eye - Medium 02 (warm brown iris, gaze right-up, oversized dimensions vs other mediums)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Medium 01 (olive green iris, gaze right-up)`** (1 nodes): `Eye - Medium 01 (olive green iris, gaze right-up)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Medium 05 (near-black iris, gaze right, near-centered vertically)`** (1 nodes): `Eye - Medium 05 (near-black iris, gaze right, near-centered vertically)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eye - Medium 04 (near-black iris, gaze right-down; shares iris geometry with Medium 03)`** (1 nodes): `Eye - Medium 04 (near-black iris, gaze right-down; shares iris geometry with Medium 03)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ADR 005: Mode-Locked Power Pairing`** (1 nodes): `ADR 005: Mode-Locked Power Pairing`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ADR 008: Content Guardrail (flat-illustrated)`** (1 nodes): `ADR 008: Content Guardrail (flat-illustrated)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ADR 009: Curated Avatar Guardrail`** (1 nodes): `ADR 009: Curated Avatar Guardrail`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `spawnPoof`** (1 nodes): `spawnPoof`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `updateEyePupil()`** (1 nodes): `updateEyePupil()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `updateEyeBlink()`** (1 nodes): `updateEyeBlink()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PLACARD_POOL sign pool`** (1 nodes): `PLACARD_POOL sign pool`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `bugSwarm.test.ts suite`** (1 nodes): `bugSwarm.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `cockroachCreature.test.ts suite`** (1 nodes): `cockroachCreature.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `computeSpawnProgress.test.ts suite`** (1 nodes): `computeSpawnProgress.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `core.test.ts suite`** (1 nodes): `core.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `creatureTypes.test.ts suite`** (1 nodes): `creatureTypes.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `fingerCreature.test.ts suite`** (1 nodes): `fingerCreature.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `hud.test.ts suite`** (1 nodes): `hud.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `placardCreature.test.ts suite`** (1 nodes): `placardCreature.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `stickerOverlay.test.ts suite`** (1 nodes): `stickerOverlay.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `textOverlay.test.ts suite`** (1 nodes): `textOverlay.test.ts suite`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `shareLinks.test.ts`** (1 nodes): `shareLinks.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `creatureGridHoverTones.test.ts`** (1 nodes): `creatureGridHoverTones.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `beats.ts`** (1 nodes): `beats.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `touchSupport.test.ts`** (1 nodes): `touchSupport.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `creatureGridIdleResurge.test.ts`** (1 nodes): `creatureGridIdleResurge.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AudioManager class`** (1 nodes): `AudioManager class`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `setHoverToneStyle (devtools hook)`** (1 nodes): `setHoverToneStyle (devtools hook)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Jantar Mantar protest`** (1 nodes): `Jantar Mantar protest`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Key Takeaways section`** (1 nodes): `Key Takeaways section`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `robots.txt`** (1 nodes): `robots.txt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `SubjectDrawer.ts + subjectDrawer.css <- Figma subject element` and `drawSubject.ts (colorByName palette guard, flat-illustrated)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Figma-First Experience Overhaul Design Spec` and `Premium Visual & Collective Attack (PR1) Design Spec`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Figma-First Experience Overhaul Design Spec` and `Multi-Subject Targeting (PR2) Design Spec`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Drag Handle Icon (Six-Dot Grip)` and `Eye Crowd Grid Mockup with Draggable Pink Target`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Filter Panel Design Reference (Numbers Stepper + Repel Slider)` and `Control Icons Design Reference (Toolbar Icon Set)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Crowd Bug (Right-Facing)` and `Crowd Bug (Left-Facing)`?**
  _Edge tagged AMBIGUOUS (relation: has_identical_path_geometry_to) - confidence is low._
- **What is the exact relationship between `Crowd Bug (Right-Facing)` and `Crowd Bug (Upright)`?**
  _Edge tagged AMBIGUOUS (relation: has_identical_path_geometry_to) - confidence is low._