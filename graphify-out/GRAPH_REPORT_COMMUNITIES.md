## Communities (part 1 of 3)

> Continues in [GRAPH_REPORT_COMMUNITIES_2.md](GRAPH_REPORT_COMMUNITIES_2.md).


### Community 0 - "Premium Visual & Figma Overhaul Specs"
Cohesion: 0.04
Nodes (77): 11 Blocking Acceptance Gates, Component Architecture Closed Files List, Figma-First Experience Overhaul Design Spec, Source Frames Table (Figma Node IDs 0:1, 18:113, 44:287, 46:905, 103:3402, 103:2490, 103:3579, 103:3593, 109:3669), Explicit Supersession of subject-browser-premium-hud-design.md and premium-visual-collective-attack-design.md, Rationale: Why The Previous Overhaul Failed, ChargeSource Type ({kind: canvas|control}) + Canonical Attack Geometry, Figma-First Overhaul Phase 1: Foundation And Eyes Vertical Slice Plan (+69 more)

### Community 1 - "Raid Controller & Security Units"
Cohesion: 0.05
Nodes (25): EntityPool, PowerMeter, sampleGradient(), detectShake(), pickPulseKinds(), RaidController, rand(), triggerRaid() (+17 more)

### Community 2 - "HUD & Filter Panel"
Cohesion: 0.05
Nodes (5): FilterPanel, el(), Hud, loadPlacardSvg(), optimize_images()

### Community 3 - "Project Docs, Conventions & Audio Design"
Cohesion: 0.03
Nodes (62): Agent Instructions (AGENTS.md), Ambient textures and music bed, AudioControl HUD (mute and volume), AudioEngine (3 gain buses, single AudioContext), Synth toolkit and cue registry, CreatureMode (eyes|pointedFinger|cockroach|placard), ForceField and Engine (load-bearing core), Human testing in browser convention (+54 more)

### Community 4 - "Creature Grid & Eye Creatures"
Cohesion: 0.05
Nodes (33): createCockroachCreature(), getCockroachRotation(), triggerCockroachHoverTone(), canPlayHoverTone(), computeHoverEdge(), computeSpawnProgress(), CreatureGrid, dragSpeedPxPerMs() (+25 more)

### Community 5 - "Onboarding & Crowd-Fix Plans"
Cohesion: 0.04
Nodes (60): DEFAULT_CREATURE_QUANTITY Token (300), Face-Only Random Sticker Selection (hasFace flag), Placard HUD Icon Runtime SVG Fetch, Crowd Fixes Implementation Plan (2026-08-08), Creature Quantity Desync Root Cause, Single Write Path via FilterPanel.setQuantity, Rationale: Slider Ceiling Stays 500, 300 Is Only Default, Updated Narrative Beats (broken promises thread) (+52 more)

### Community 6 - "Core Engine, Input & Menu Button"
Cohesion: 0.05
Nodes (8): Clock, sanitize(), Engine, MenuButton, PointerTracker, toCanvas(), mulberry32(), Rng

### Community 7 - "Audio Manager & Widget"
Cohesion: 0.07
Nodes (7): AudioManager, clampVolume(), detectVolumeControlSupport(), resolveAudioContextConstructor(), AudioWidget, el(), ClickSound

### Community 8 - "Main Wiring & Gallery Preload"
Cohesion: 0.04
Nodes (7): preloadImages(), playDeflateTone(), getFaceStickerDefs(), playInflateTone(), main(), onTick(), start()

### Community 9 - "Security Raid Protest Fixes"
Cohesion: 0.05
Nodes (49): CreatureGrid.ts, creaturePhysics.ts (repulsor -> repulsors[]), Default crowd quantity 160; idle floor absolute 30, darkenHexColor helper, Delhi Police Constable Sticker Sheet Plan, Double DOM transform write perf bug in shared render path, EyeCreature.ts, Eye Iris + Pupil Plan (+41 more)

### Community 10 - "Sticker, Text & Avatar Overlays"
Cohesion: 0.06
Nodes (18): DraggableAvatar, attachDrag(), clampToViewport(), findNearestSnap(), getAxisCandidates(), getSnapLines(), snapToGrid(), clamp() (+10 more)

### Community 11 - "v2 Expansion & Audio Plans"
Cohesion: 0.07
Nodes (47): ambientBeds.ts (per-crowd-mode ambient loops), AudioEngine.ts (audio context + gain buses service), Autoplay unlock via first pointerdown, audioCueRegistry.ts (cue id → synth-fn registry), musicBed.ts (looping mp3 music bed), Fun Satire Audio/Effects Engineering — Design Spec, Volume/mute HUD placard control, Fun Satire Audio Engineering Implementation Plan (+39 more)

### Community 12 - "Menu Panel & Share Links"
Cohesion: 0.09
Nodes (9): buildYouTubeThumbnailUrl(), buildYouTubeWatchUrl(), shuffleVideos(), MenuPanel, buildFacebookShareUrl(), buildInstagramDeepLink(), buildInstagramWebUrl(), buildWhatsAppShareUrl() (+1 more)

### Community 13 - "Raid ADRs & Lifecycle Unification"
Cohesion: 0.06
Nodes (40): ADR 014 Security raid & protest as orthogonal overlay, ADR 015 EntityPool + raidRules lifecycle primitive, ADR 016 Repel control as pixel radius, ADR 017 Placard sizing aspect-compensated, ADR 018 Sticker asset pipeline WebP+preload, System data-flow diagram, Protest charge (core definition), Raid (core definition) (+32 more)

### Community 14 - "Hover Tone Styles"
Cohesion: 0.12
Nodes (15): DragScratchSound, createNoiseBuffer(), getHoverToneParams(), playClassicTone(), playHoverTone(), playKnockBurst(), playKnockTone(), playPluckTone() (+7 more)

### Community 15 - "v2 Feature Specs"
Cohesion: 0.07
Nodes (37): Audio accessibility, Ambient beds, Autoplay unlock, Audio cue catalog, Audio/Effects Engineering Spec, AudioEngine (buses, mute, volume), Adaptive mobile composition, Figma-First Experience Overhaul Spec (+29 more)

### Community 16 - "Protest Panel Content & Narrative"
Cohesion: 0.08
Nodes (33): ABOUT.md 'About this project' section, src/hud/onboarding/beats.ts, buildSubScreen(heading, contentEl) helper, CJP naming research (real movement nickname), Content Narrative Redesign Design, Figma frames fun-satire nodes 327:6254-327:6258, Figma mockup fun-satire node 327:6259, HERO_VIDEO concept (removed) (+25 more)

### Community 17 - "v1 Core Loop & Subject Mechanic"
Cohesion: 0.08
Nodes (29): Rationale: pop-and-dissolve burn chosen over char&crack/comic-zap for cathartic (not violent) tone, computeGazeLines() - eye-to-subject coral gaze lines, drawSubject.ts (colorByName palette guard, flat-illustrated), Engine injectable RAF/time sources; Rng.fromQueryString seeding; PowerController.cooldownMs/targetRadius export for Playwright, Forbidden-files gate: Engine.ts/ForceField.ts/StateMachine.ts/EntityStore.ts must stay untouched, Fun Satire Design Spec (v1/v2/v3 roadmap), Rationale: HTMX rejected for real-time canvas physics vs server-driven hypermedia, HUD placard torn-paper card, Fraunces-italic labels, own grain layer (+21 more)

### Community 18 - "Win Panel & Inflate/Deflate"
Cohesion: 0.12
Nodes (26): Delhi Police Constable Sticker Sheet Spec, 12 constable sticker sheet, top-down drone perspective, Panel content, Protest Impact Panel Spec, Protest button onAttackPress/Release, Panel trigger via Protest button, onCrowdSizeChanged continuous signal, Sticker Inflate/Deflate Plan (+18 more)

### Community 19 - "Figma Asset Export Pipeline"
Cohesion: 0.11
Nodes (22): export-figma-assets.mjs (orchestration entrypoint --write/--verify), src/assets/eyeAssetRegistry.ts (generated output), APPROVED_SOURCE_NODES (5 approved Figma node ids), assertSafeSvg() - SaxesParser-based SVG sanitizer, src/assets/figmaAssetRegistry.ts (generated output), Figma Dev Mode MCP Server (localhost:3845, JSON-RPC/SSE), eyeGeometryOf() - parses eye SVG socket/clip/iris/crop geometry, generateEyeRegistry() - emits src/assets/eyeAssetRegistry.ts (+14 more)

### Community 20 - "Gallery Panel"
Cohesion: 0.14
Nodes (1): GalleryPanel

### Community 21 - "Gallery, Thumbnails & HUD Bar"
Cohesion: 0.13
Nodes (20): HUD Control Bar Redesign Spec, Bug Mode to Filter panel toggle, Placard mode, Button states default/hover/pressed, anime.js crawl behavior, Gallery and anime.js Bug Mode Spec, Shared makeDraggable extraction, Sticker and text gallery (+12 more)

### Community 22 - "Cockroach & Bug Mode"
Cohesion: 0.12
Nodes (18): Icon asset bug.svg (roach body), Icon asset icn=bug.svg (antenna), BugCreature (flat-sprite bug, deleted), Bug Swarm Mode Overlay, Engine (RAF loop), Cockroach & Bug Mode Plan (2026-08-04), DOM-First Simplification Plan (2026-07-29), Gallery + anime.js Bug Mode Plan (2026-08-05) (+10 more)

### Community 23 - "Win Panel Sharing"
Cohesion: 0.16
Nodes (1): WinPanel

### Community 24 - "DOM-First Architecture ADRs"
Cohesion: 0.12
Nodes (16): ADR 001 Component-as-Data Registry (superseded), ADR 003 Staged Effect System (deferred), ADR 005 Mode-locked power pairing (deferred), ADR 007 Canvas + imperative TS over HTMX (superseded), ADR 008 styleGuardrail flat-illustrated (deferred), ADR 009 Curated avatar sticker guardrail (deferred), ADR 010 Multi-subject targeting (superseded), ADR 011 DOM-first creature rendering (+8 more)

### Community 25 - "Police & RAF Sticker Sheets"
Cohesion: 0.33
Nodes (11): Reference Frame 99 (RAF field photo collage), Reference Police Sticker Crop (Delhi Police baton pose), Reference RAF Sticker Crop (baton pose), Delhi Police Constables Sticker Sheet 4, Delhi Police Constables Sticker Sheet, RAF Sticker Sheet 1 (60-degree angle, light bg), RAF Sticker Sheet 2 (stop-sign, gray bg), RAF Sticker Sheet 3 (megaphone/baton, dark bg) (+3 more)

### Community 26 - "Mobile Pinch & Touch"
Cohesion: 0.24
Nodes (10): AudioManager crossfade rAF-freeze bug, HUD hide/show while text editor focused, makeDraggable.ts (attachDrag), Mobile Pinch-Scale, Audio Crossfade, Text-Edit HUD-Overlap Fixes Plan, pinchZoom.ts (attachPinchZoom), resolveCrossfadeImmediately(), StickerOverlay class, TextOverlay class (+2 more)

### Community 27 - "Eye Sticker Variants"
Cohesion: 0.2
Nodes (10): Eye Compact 08 (Compact tier, dark pupil, gaze up-right), Eye Compact 09 (Compact tier, dark pupil, gaze up-right), Eye Large 01 (Large tier, slate-blue pupil, gaze down-right), Eye Large 02 (Large tier, dark pupil, gaze down-right), Eye Large 03 (Large tier, olive pupil, gaze down-right), Eye Large 07 (Large tier, slate-blue pupil, gaze center/up), Eye Small 02 (Small tier, warm-brown pupil, gaze right), Eye Small 03 (Small tier, dark pupil, gaze right) (+2 more)

### Community 28 - "Scene Control Icons"
Cohesion: 0.32
Nodes (8): Control Icon - Bug Body (Small, Oval Head + Stem), Control Icon - Eye Outline (Small, Vertical Lens Shape), Control Icon - Hand Index Finger (Small, Curved Hook Segment), Scene Control Icon - Bug Body (Large, Oval Head + Stem), Scene Control Icon - Eye Outline (Large, Vertical Lens Shape), Scene Control Icon - Hand Palm/Finger (Large, Long Curved Stroke), Scene Control Icon - Hand Thumb (Large, Curved Hook Segment), Scene Control Icon - Text Subject (Crosshair in Corner-Bracketed Frame)

### Community 29 - "Idle Crowd Decay"
Cohesion: 0.36
Nodes (8): Fast-drag burst window, CreatureGrid class, dragSpeedPxPerMs(), Idle Crowd Decay & Quick-Drag Resurge Design, Idle Crowd Decay & Quick-Drag Resurge Plan, idleVisibleFraction(), QTY_MAX constant (900), Demand-driven re-pop logic

### Community 30 - "Community 30"
Cohesion: 0.32
Nodes (8): Eyes-mode vertical slice, Deterministic fixture runtime and Playwright gate, EYES_APPROVED_SHA entry gate, Phase 2 parallel lanes A-D, Overlay Coordinator, Immutable integration ledger and serial lane integration, Release audits, a11y and reduced-motion matrix, Figma-first overhaul branch topology (serial, parallel, serial)

### Community 31 - "Community 31"
Cohesion: 0.48
Nodes (6): accumulateSeparation(), clampR(), ForceField.compute(), computeSeparation(), falloff(), sampleAlongRay()

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (7): accumulateSeparation() multi-member solver, clampR() helper function, compute() force field vector function, computeSeparation() pairwise push function, falloff() calculation function, sampleAlongRay() ray sampling function, SEPARATION configuration constant

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (7): initAnalytics, trackEvent, MenuButton class, GALLERY_ENTRIES (videos/sources), Informed Citizen tips, MenuPanel class, buildWhatsAppShareUrl

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (3): MixedImage, MockFailingImage, MockImage

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (7): Four harmonized hover tones per creature type, No-real-names constraint for onboarding narrative, Crowd Fixes Plan (quantity sync, face-only stickers, sound bed, hover SFX, placard icon), azaadi.mp3 background sound bed with mute/volume widget, ForceField.ts found dead/unimported; ADR 006 never implemented, Avatar hidden during onboarding; crowd keeps reacting to cursor, Onboarding Carousel Plan

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (6): Cockroach/bug creature SVG sprite, Cockroach PNG Sprite, Cockroach SVG Sprite, Eye SVG Sprite (Abstract Eye Shape), Finger (Pointing Hand) PNG Sprite, Finger (Pointing Hand) SVG Sprite

### Community 37 - "Community 37"
Cohesion: 0.4
Nodes (6): Detailed Bug/Insect Illustration (Cockroach-like, Legs and Antennae), Bug Icon (Simple Outline, Figma variant icn=bug), Drag Handle Icon (Six-Dot Grip), Eye Icon (Outline with Pupil, Figma variant icn=eye), Eye Crowd Grid Mockup with Draggable Pink Target, Hand Icon (Open Palm, Four Fingers, Figma variant icn=hand)

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (6): Effect: Attack Target Glow, Lotus Surrounded by Cockroach Swarm (Gemini Reference), Lotus Attacked by Crowd of Laser-Eyes (Gemini Reference), Lotus Attacked by Pointing Fingers with Lightning (Gemini Reference), Subject: Elder Figure, Subject: Lotus

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (6): Gradual Creature Pop-In, Gradual Creature Pop-In Plan (2026-08-07), Rationale: opacity ramps faster than scale overshoot, Rationale: run physics while invisible during pop-in, Rationale: random delays give randomized reveal order, Gradual Creature Pop-In Design (2026-08-07)

### Community 40 - "Community 40"
Cohesion: 0.4
Nodes (6): Domain/DNS layer, Security Hardening Spec, HTTP security headers in vercel.json, Vercel platform settings, robots.txt, Rationale: custom domain increases exposure

### Community 41 - "Community 41"
Cohesion: 0.6
Nodes (3): clampMag(), integrate(), sanitizeDt()

### Community 42 - "Community 42"
Cohesion: 0.5
Nodes (5): design-dummy/index.html scaffold merging 3 prototypes (9 tasks), Self-Review Notes confirming spec coverage, Merged-Eyes Design-Dummy Design Spec, Merged-Eyes Design-Dummy Implementation Plan, "Paper-Cut Protest" Visual Identity (palette/typography/grain/cursor)

### Community 43 - "Community 43"
Cohesion: 0.6
Nodes (5): Avatar Gallery Design Reference (Face/Lotus Grid), Control Icons Design Reference (Toolbar Icon Set), Eyes Grid Attack State Design Reference (Laser Burst), Eyes Grid Default State Design Reference, Filter Panel Design Reference (Numbers Stepper + Repel Slider)

### Community 44 - "Community 44"
Cohesion: 0.5
Nodes (5): Bug Outline Icon (Control, small), Hand/Wrist Curve Icon (Control), Bug Outline Icon (Scene Control, larger), Eye Pupil Icon (Scene Control, small circle), Gallery Tile Icon (Scene Control, tertiary)

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (5): Drag Handle Icon (Control, 6-dot grip), Filter Line Icon (Control variant), Filter Panel Divider Line (low-opacity separator), Drag Handle Icon (Scene Control, larger 6-dot grip), Filter Line Icon (Scene Control variant)

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (5): Eye Compact 04 (Taupe Iris), Eye Giant 01 (Taupe Iris), Eye Giant 02 (Dark Iris), Eye Giant 03 (Warm Brown Iris), Eye Medium 06 (Olive Iris)

### Community 47 - "Community 47"
Cohesion: 0.5
Nodes (5): AudioManager.getAudioContext, HOVER_TONE_PARAMS table, playHoverTone, playKnockBurst, playPoofTone

### Community 48 - "Community 48"
Cohesion: 0.5
Nodes (5): Placard: Save the future, Placard: Anti-national hum nahi andhbakt hain, Placard: Genz comeback we got the wrong guy again, Placard: My ex and this government both are heartless, Placard stick handle sprite

### Community 49 - "Community 49"
Cohesion: 0.6
Nodes (5): Narrative beats carousel, Onboarding Screen Spec, Exit sequence to game, Clear fictional parallel reference level, Story pillars

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (2): ensureGuides(), updateSnapGuides()

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (4): Cockroach Creature Sprite, Crowd Bug (Left-Facing), Crowd Bug (Right-Facing), Crowd Bug (Upright)

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (4): Control: Hand Finger Curve Icon (small), Control: Hand Thumb Curve Icon (small), Scene Control: Hand Finger Curve Icon (large), Scene Control: Hand Index Finger Curve Icon

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (4): Clock (frame dt + clamp), MAX_DT_MS clamp constant, Max-dt clamp rationale (tab-blur spikes), Engine (RAF loop)

### Community 54 - "Community 54"
Cohesion: 0.5
Nodes (4): AudioManager + Sound Bed Widget (azaadi.mp3), Per-Creature Hover Feedback Tones, Rationale: One Shared AudioContext, Synthesized Tones, No New Assets, Rationale: Mute/Volume Widget Doubles as Autoplay-Policy Strategy

### Community 55 - "Community 55"
Cohesion: 0.5
Nodes (2): hud/menuContent (buildYouTubeThumbnailUrl, shuffleVideos, GALLERY_ENTRIES), MenuPanel

### Community 56 - "Community 56"
Cohesion: 0.83
Nodes (4): Per-frame pop-in animation, Gradual Creature Pop-In Spec, Interrupt behavior, Pop-in scheduling

### Community 57 - "Community 57"
Cohesion: 0.67
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (3): build-grain.py script, Grain Texture (grain.png), Post-processing / Visual Overlay Effect

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (3): Eye Compact 01 (Dark Iris), Eye Compact 03 (Dark Iris), Eye Compact 05 (Dark Iris)

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (3): Compact Eye Variant 06, Compact Eye Variant 07, Giant Eye Variant 04

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (3): Security Hardening Implementation Plan, Custom-Domain Cutover Raises Exposure, Security Hardening Design Spec

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 0.67
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 0.67
Nodes (2): AudioWidget, SoundBedControl interface

### Community 65 - "Community 65"
Cohesion: 0.67
Nodes (3): BEATS (onboarding narrative beats), MENU_COPY / MENU_TITLE copy, About This Project screen copy

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (3): Favicon Icon, Gutter Generation Share Image, Share Image SVG

### Community 67 - "Community 67"
Cohesion: 0.67
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 0.67
Nodes (3): public/robots.txt, Security Hardening Plan (headers + robots.txt), HTTP security headers in vercel.json

### Community 69 - "Community 69"
Cohesion: 0.67
Nodes (3): ADR 002 Shared Physics Math, ADR 006 Pairwise crowd separation (deferred), ADR 012 Simplified physics (repulsion+spring+damping)

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (2): Gallery/Grid View Icon (2x2 Rounded Squares), Text Tool Icon (T Glyph with Frame Corner Brackets)

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (2): Add/Plus Icon (Cross of Two Lines), Reduce/Minus Icon (Horizontal Line)

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (2): Filter Panel: Repel/Track Divider Line, Scene Control: Subtle Divider Line

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (2): Control: Eye Pupil Dot Icon, Scene Control: Neutral Well (empty ellipse placeholder)

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (2): Control: Gallery Tile Tertiary Corner Bracket, Scene Control: Gallery Tile Secondary Corner Bracket

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (2): Control Icon - Gallery Tile (Primary, Rounded Square), Control Icon - Quantity Plus (Single Bar Segment)

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (2): Eye Compact 02 (Dark Iris, Default State), Eye Compact 02 Attack Variant

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (2): Single-Slot Sticker/Text Gallery Overlay, Rationale: single live overlay slot (replaces)

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): FakeAudioContext

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (2): Post-Deploy curl Header Verification, Rationale: Config-Only, So curl Not vitest

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): isTouchDevice

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): hud/shareLinks

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): AudioManager

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (2): ClickSound, DragScratchSound

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (2): playKnockBurst, playHudSelectTone
