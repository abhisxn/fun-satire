## Communities (part 1 of 3)

> Full community membership detail, split from GRAPH_REPORT.md to stay under 500 lines. See also [GRAPH_REPORT_COMMUNITIES_2.md](GRAPH_REPORT_COMMUNITIES_2.md), [GRAPH_REPORT_COMMUNITIES_3.md](GRAPH_REPORT_COMMUNITIES_3.md).

### Community 0 - "CreatureGrid + main.ts (entry orchestration)"
Cohesion: 0.03
Nodes (82): ADR 001: Component-as-Data (Registry Pattern), ADR 003: Staged Effect System, ADR 004: DOM HUD, ADR 007: Canvas + Imperative TypeScript, ADR 010: Multi-Subject Targeting, ADR 011: DOM-First Creature Rendering, ADR 013: Consolidated HUD Component, Icon asset bug.svg (roach body) (+74 more)

### Community 1 - "Premium Visual & Collective Attack (PR1) Design Spec & related"
Cohesion: 0.04
Nodes (80): 11 Blocking Acceptance Gates, Component Architecture Closed Files List, Figma-First Experience Overhaul Design Spec, Source Frames Table (Figma Node IDs 0:1, 18:113, 44:287, 46:905, 103:3402, 103:2490, 103:3579, 103:3593, 109:3669), Explicit Supersession of subject-browser-premium-hud-design.md and premium-visual-collective-attack-design.md, Rationale: Why The Previous Overhaul Failed, ChargeSource Type ({kind: canvas|control}) + Canonical Attack Geometry, Figma-First Overhaul Phase 1: Foundation And Eyes Vertical Slice Plan (+72 more)

### Community 2 - "CreatureGrid + .update()"
Cohesion: 0.05
Nodes (31): Clock, sanitize(), createCockroachCreature(), getCockroachRotation(), triggerCockroachHoverTone(), canPlayHoverTone(), computeHoverEdge(), computeSpawnProgress() (+23 more)

### Community 3 - "PointerTracker & related"
Cohesion: 0.05
Nodes (15): DraggableAvatar, attachDrag(), attachPinchZoom(), PointerTracker, toCanvas(), clamp(), onMove(), pointerX() (+7 more)

### Community 4 - "AudioManager & related"
Cohesion: 0.06
Nodes (8): AudioManager, clampVolume(), detectVolumeControlSupport(), resolveAudioContextConstructor(), AudioWidget, el(), ClickSound, DragScratchSound

### Community 5 - "Crowd Fixes Implementation Plan (2026-08-08) & related"
Cohesion: 0.04
Nodes (60): DEFAULT_CREATURE_QUANTITY Token (300), Face-Only Random Sticker Selection (hasFace flag), Placard HUD Icon Runtime SVG Fetch, Crowd Fixes Implementation Plan (2026-08-08), Creature Quantity Desync Root Cause, Single Write Path via FilterPanel.setQuantity, Rationale: Slider Ceiling Stays 500, 300 Is Only Default, Updated Narrative Beats (broken promises thread) (+52 more)

### Community 6 - "Fun Satire v2 — Expansion — Design Spec & related"
Cohesion: 0.06
Nodes (55): ambientBeds.ts (per-crowd-mode ambient loops), AudioEngine.ts (audio context + gain buses service), Autoplay unlock via first pointerdown, audioCueRegistry.ts (cue id → synth-fn registry), musicBed.ts (looping mp3 music bed), Fun Satire Audio/Effects Engineering — Design Spec, Volume/mute HUD placard control, Fun Satire Audio Engineering Implementation Plan (+47 more)

### Community 7 - "CreatureGrid + Hud class (consolidated toolbar)"
Cohesion: 0.05
Nodes (49): ADR 002: Shared Physics Math, ADR 006: Pairwise Crowd Separation, ADR 012: Simplified Physics (repulsion+spring+damping), ForceField.ts/Integrator.ts closed-to-edits rule, BugSwarm (anime.js swarm), createCockroachCreature(), getCockroachRotation(), CreatureGrid class (+41 more)

### Community 8 - "export-figma-assets.mjs (orchestration entrypoint --write/--verify) & related"
Cohesion: 0.05
Nodes (48): Gutter Generation (project), ADR 005: Mode-Locked Power Pairing, ADR 008: Content Guardrail (flat-illustrated), ADR 009: Curated Avatar Guardrail, Gutter Generation Project Instructions (CLAUDE.md), system-architecture.md, delhi-police-constables.png, Delhi Police Constable Sticker Sheet Design (+40 more)

### Community 9 - "Hud & related"
Cohesion: 0.07
Nodes (11): el(), Hud, loadPlacardSvg(), MenuButton, findNearestSnap(), getAxisCandidates(), getSnapLines(), snapToGrid() (+3 more)

### Community 10 - "Subject Mechanic & Visual Polish Implementation Plan & related"
Cohesion: 0.06
Nodes (43): Rationale: pop-and-dissolve burn chosen over char&crack/comic-zap for cathartic (not violent) tone, CLAUDE.md (project instructions), computeGazeLines() - eye-to-subject coral gaze lines, Content-as-Data principle (subjects live in JSON/TS manifests, never hardcoded), tokens.ts:EASE.spring + tokens.css:--ease-spring <- Figma motion spec, Hud.ts + hud.css <- Figma HUD element, Design-to-Code Mapping Table (Figma element -> implementation function), paperCut.ts:paperCutEdgePath()/withPaperCutShadow() <- Figma paper-cut edge element (+35 more)

### Community 11 - "main() & related"
Cohesion: 0.07
Nodes (5): FilterPanel, initAnalytics(), main(), OnboardingCarousel, onTick()

### Community 12 - "MenuPanel & related"
Cohesion: 0.09
Nodes (9): buildYouTubeThumbnailUrl(), buildYouTubeWatchUrl(), shuffleVideos(), MenuPanel, buildFacebookShareUrl(), buildInstagramDeepLink(), buildInstagramWebUrl(), buildWhatsAppShareUrl() (+1 more)

### Community 13 - "playHoverTone() & related"
Cohesion: 0.15
Nodes (15): createNoiseBuffer(), getHoverToneParams(), playClassicTone(), playHoverTone(), playKnockBurst(), playKnockTone(), playPluckTone(), playPopTone() (+7 more)

### Community 14 - "onboardingCarousel.test.ts & related"
Cohesion: 0.06
Nodes (0): 

### Community 15 - "Content Narrative Redesign Design & related"
Cohesion: 0.07
Nodes (34): ABOUT.md 'About this project' section, Responsible Citizen guidance, src/hud/onboarding/beats.ts, buildSubScreen(heading, contentEl) helper, CJP naming research (real movement nickname), Content Narrative Redesign Design, Figma frames fun-satire nodes 327:6254-327:6258, Figma mockup fun-satire node 327:6259 (+26 more)

### Community 16 - "main.ts & related"
Cohesion: 0.08
Nodes (21): Hud.ts (Hud class), AudioManager, AudioWidget, BEATS (onboarding copy), BugSwarm, ClickSound, CreatureGrid, DragScratchSound (+13 more)

### Community 17 - "GalleryPanel & related"
Cohesion: 0.12
Nodes (1): GalleryPanel

### Community 18 - "Mobile Pinch-Scale, Audio Crossfade, Text-Edit HUD-Overlap Fixes Plan & related"
Cohesion: 0.11
Nodes (23): AudioManager crossfade rAF-freeze bug, Fast-drag burst window, Coding Conventions, CreatureMode type, Engine.ts (RAF loop), ForceField.ts, Human Testing convention, CreatureGrid class (+15 more)

### Community 19 - "AGENTS.md conventions & related"
Cohesion: 0.12
Nodes (20): ADR 001: Component-as-Data (Registry Pattern), ADR 004: DOM HUD with paper-cut visual polish, ADR 006: Pairwise crowd separation as ForceField.ts exception (v2), AGENTS.md conventions, App Layout structure, Effect System & Power Pipeline Community, HUD Paper-Cut Visual Polish Community (ADR 004), Physics & Rendering Math Community (+12 more)

### Community 20 - "MenuPanel class & related"
Cohesion: 0.12
Nodes (19): BEATS (onboarding narrative beats), FilterPanel.updatePosition, initAnalytics, trackEvent, GalleryPanel class, STICKER_DEFS (avatar sticker set), TEXT_FONTS, MenuButton class (+11 more)

### Community 21 - "BugSwarm & related"
Cohesion: 0.22
Nodes (9): applyTransform(), BugSwarm, buildBugNode(), makeBug(), nextWaypoint(), rand(), shortestAngleTo(), startGait() (+1 more)

### Community 22 - "Placard stick handle sprite & related"
Cohesion: 0.14
Nodes (18): Petrol Epstein sticker text badge, Cockroach/bug creature SVG sprite, Cockroach PNG Sprite, Cockroach SVG Sprite, Eye SVG Sprite (Abstract Eye Shape), Finger (Pointing Hand) PNG Sprite, Finger (Pointing Hand) SVG Sprite, Placard: Education chali jaegi, minister reh jaega (+10 more)

### Community 23 - "effects/EffectSystem.ts (module) & related"
Cohesion: 0.24
Nodes (12): config/tokens.ts (locked-palette leaf module), effects/EffectSystem.ts (module), core/Engine.ts (module), entities/EntityStore.ts (module), entities/behaviors/EyeBehavior.ts (module), physics/ForceField.ts (module), effects/effectDefs/laserBurn.ts (module), main.ts (module) (+4 more)

### Community 24 - "CreatureGrid.update (main tick) & related"
Cohesion: 0.2
Nodes (11): AudioManager.getAudioContext, canPlayHoverTone (voice-cap cooldown), computeHoverEdge, idleVisibleFraction (idle decay), CreatureGrid.triggerHoverTone, CreatureGrid.update (main tick), HOVER_TONE_PARAMS table, getHoverToneParams (+3 more)

### Community 25 - "RAF Sticker Sheet 1 (60-degree angle, light bg) & related"
Cohesion: 0.33
Nodes (11): Reference Frame 99 (RAF field photo collage), Reference Police Sticker Crop (Delhi Police baton pose), Reference RAF Sticker Crop (baton pose), Delhi Police Constables Sticker Sheet 4, Delhi Police Constables Sticker Sheet, RAF Sticker Sheet 1 (60-degree angle, light bg), RAF Sticker Sheet 2 (stop-sign, gray bg), RAF Sticker Sheet 3 (megaphone/baton, dark bg) (+3 more)

### Community 26 - "Eye Large 02 (Large tier, dark pupil, gaze down-right) & related"
Cohesion: 0.2
Nodes (10): Eye Compact 08 (Compact tier, dark pupil, gaze up-right), Eye Compact 09 (Compact tier, dark pupil, gaze up-right), Eye Large 01 (Large tier, slate-blue pupil, gaze down-right), Eye Large 02 (Large tier, dark pupil, gaze down-right), Eye Large 03 (Large tier, olive pupil, gaze down-right), Eye Large 07 (Large tier, slate-blue pupil, gaze center/up), Eye Small 02 (Small tier, warm-brown pupil, gaze right), Eye Small 03 (Small tier, dark pupil, gaze right) (+2 more)

### Community 27 - "Republic Gooswamy Caricature & related"
Cohesion: 0.2
Nodes (10): Adalat Sharma Caricature, Naya Leak Joshi Caricature, Petroleum Paaji Caricature, Reel Minister Caricature, Republic Gooswamy Caricature, Republic Gooswamy Sticker Text, Ethanol Kaka Sticker Text, Naya Leak Joshi Sticker Text (+2 more)

### Community 28 - "Rng & related"
Cohesion: 0.33
Nodes (2): mulberry32(), Rng

### Community 29 - "Scene Control Icon - Bug Body (Large, Oval Head + Stem) & related"
Cohesion: 0.32
Nodes (8): Control Icon - Bug Body (Small, Oval Head + Stem), Control Icon - Eye Outline (Small, Vertical Lens Shape), Control Icon - Hand Index Finger (Small, Curved Hook Segment), Scene Control Icon - Bug Body (Large, Oval Head + Stem), Scene Control Icon - Eye Outline (Large, Vertical Lens Shape), Scene Control Icon - Hand Palm/Finger (Large, Long Curved Stroke), Scene Control Icon - Hand Thumb (Large, Curved Hook Segment), Scene Control Icon - Text Subject (Crosshair in Corner-Bracketed Frame)

### Community 30 - "Eye Icon (Outline with Pupil, Figma variant icn=eye) & related"
Cohesion: 0.4
Nodes (6): Detailed Bug/Insect Illustration (Cockroach-like, Legs and Antennae), Bug Icon (Simple Outline, Figma variant icn=bug), Drag Handle Icon (Six-Dot Grip), Eye Icon (Outline with Pupil, Figma variant icn=eye), Eye Crowd Grid Mockup with Draggable Pink Target, Hand Icon (Open Palm, Four Fingers, Figma variant icn=hand)

### Community 31 - "Lotus Surrounded by Cockroach Swarm (Gemini Reference) & related"
Cohesion: 0.67
Nodes (6): Effect: Attack Target Glow, Lotus Surrounded by Cockroach Swarm (Gemini Reference), Lotus Attacked by Crowd of Laser-Eyes (Gemini Reference), Lotus Attacked by Pointing Fingers with Lightning (Gemini Reference), Subject: Elder Figure, Subject: Lotus

### Community 32 - "Integrator.ts & related"
Cohesion: 0.6
Nodes (3): clampMag(), integrate(), sanitizeDt()

### Community 33 - "Control Icons Design Reference (Toolbar Icon Set) & related"
Cohesion: 0.6
Nodes (5): Avatar Gallery Design Reference (Face/Lotus Grid), Control Icons Design Reference (Toolbar Icon Set), Eyes Grid Attack State Design Reference (Laser Burst), Eyes Grid Default State Design Reference, Filter Panel Design Reference (Numbers Stepper + Repel Slider)

### Community 34 - "Filter Line Icon (Control variant) & related"
Cohesion: 0.5
Nodes (5): Drag Handle Icon (Control, 6-dot grip), Filter Line Icon (Control variant), Filter Panel Divider Line (low-opacity separator), Drag Handle Icon (Scene Control, larger 6-dot grip), Filter Line Icon (Scene Control variant)

### Community 35 - "Bug Outline Icon (Control, small) & related"
Cohesion: 0.5
Nodes (5): Bug Outline Icon (Control, small), Hand/Wrist Curve Icon (Control), Bug Outline Icon (Scene Control, larger), Eye Pupil Icon (Scene Control, small circle), Gallery Tile Icon (Scene Control, tertiary)

### Community 36 - "Eye Giant 01 (Taupe Iris) & related"
Cohesion: 0.5
Nodes (5): Eye Compact 04 (Taupe Iris), Eye Giant 01 (Taupe Iris), Eye Giant 02 (Dark Iris), Eye Giant 03 (Warm Brown Iris), Eye Medium 06 (Olive Iris)

### Community 37 - "Cockroach Creature Sprite & related"
Cohesion: 1.0
Nodes (4): Cockroach Creature Sprite, Crowd Bug (Left-Facing), Crowd Bug (Right-Facing), Crowd Bug (Upright)

### Community 38 - "Control: Hand Finger Curve Icon (small) & related"
Cohesion: 0.67
Nodes (4): Control: Hand Finger Curve Icon (small), Control: Hand Thumb Curve Icon (small), Scene Control: Hand Finger Curve Icon (large), Scene Control: Hand Index Finger Curve Icon

### Community 39 - "Clock (frame dt + clamp) & related"
Cohesion: 0.5
Nodes (4): Clock (frame dt + clamp), MAX_DT_MS clamp constant, Max-dt clamp rationale (tab-blur spikes), Engine (RAF loop)

### Community 40 - "AudioManager + Sound Bed Widget (azaadi.mp3) & related"
Cohesion: 0.5
Nodes (4): AudioManager + Sound Bed Widget (azaadi.mp3), Per-Creature Hover Feedback Tones, Rationale: One Shared AudioContext, Synthesized Tones, No New Assets, Rationale: Mute/Volume Widget Doubles as Autoplay-Policy Strategy

### Community 41 - "attachDrag & related"
Cohesion: 0.5
Nodes (2): attachDrag, attachPinchZoom

### Community 42 - "Chronology Chacha (Amit Shah caricature) & related"
Cohesion: 0.67
Nodes (4): Chronology Chacha (Amit Shah caricature), Ethanol Kaka (Nitin Gadkari caricature), Leak Pradhan (Dharmendra Pradhan caricature), Mananiya Sadasya (generic mustached MP caricature)

### Community 43 - "Placard: Sab Yaad Rakha Jaega & related"
Cohesion: 0.5
Nodes (4): Placard: Sab Yaad Rakha Jaega, Placard: Fix It Face Us, Placard: Kuchu Puchu Resign De Do Na Tum, Placard: Accountability to Basic Hai

### Community 44 - "pointerTracker.test.ts"
Cohesion: 0.67
Nodes (0): 

### Community 45 - "Grain Texture (grain.png)"
Cohesion: 0.67
Nodes (3): build-grain.py script, Grain Texture (grain.png), Post-processing / Visual Overlay Effect

### Community 46 - "makePuff()"
Cohesion: 1.0
Nodes (2): makePuff(), spawnPoof()

### Community 47 - "Eye Compact 01 (Dark Iris)"
Cohesion: 1.0
Nodes (3): Eye Compact 01 (Dark Iris), Eye Compact 03 (Dark Iris), Eye Compact 05 (Dark Iris)

### Community 48 - "Compact Eye Variant 06"
Cohesion: 1.0
Nodes (3): Compact Eye Variant 06, Compact Eye Variant 07, Giant Eye Variant 04

### Community 49 - "Security Hardening Design Spec"
Cohesion: 0.67
Nodes (3): Security Hardening Implementation Plan, Custom-Domain Cutover Raises Exposure, Security Hardening Design Spec

### Community 50 - "attachPinchZoom"
Cohesion: 0.67
Nodes (3): attachDrag, attachPinchZoom, TextOverlay corner-resize handler

### Community 51 - "Favicon Icon"
Cohesion: 0.67
Nodes (3): Favicon Icon, Gutter Generation Share Image, Share Image SVG

### Community 52 - "readText()"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "ADR 004: DOM HUD vs Canvas HUD"
Cohesion: 1.0
Nodes (2): ADR 004: DOM HUD vs Canvas HUD, Hud.ts (DOM HUD implementation)

### Community 54 - "AGENTS.md"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "createMockElement()"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "makeInstance()"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "createCreature()"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Add/Plus Icon (Cross of Two Lines)"
Cohesion: 1.0
Nodes (2): Add/Plus Icon (Cross of Two Lines), Reduce/Minus Icon (Horizontal Line)

### Community 59 - "Gallery/Grid View Icon (2x2 Rounded Squares)"
Cohesion: 1.0
Nodes (2): Gallery/Grid View Icon (2x2 Rounded Squares), Text Tool Icon (T Glyph with Frame Corner Brackets)

### Community 60 - "Control: Eye Pupil Dot Icon"
Cohesion: 1.0
Nodes (2): Control: Eye Pupil Dot Icon, Scene Control: Neutral Well (empty ellipse placeholder)

### Community 61 - "Control: Gallery Tile Tertiary Corner Bracket"
Cohesion: 1.0
Nodes (2): Control: Gallery Tile Tertiary Corner Bracket, Scene Control: Gallery Tile Secondary Corner Bracket

### Community 62 - "Filter Panel: Repel/Track Divider Line"
Cohesion: 1.0
Nodes (2): Filter Panel: Repel/Track Divider Line, Scene Control: Subtle Divider Line

### Community 63 - "Control Icon - Gallery Tile (Primary, Rounded Square)"
Cohesion: 1.0
Nodes (2): Control Icon - Gallery Tile (Primary, Rounded Square), Control Icon - Quantity Plus (Single Bar Segment)

### Community 64 - "Eye Compact 02 (Dark Iris, Default State)"
Cohesion: 1.0
Nodes (2): Eye Compact 02 (Dark Iris, Default State), Eye Compact 02 Attack Variant

### Community 65 - "filterPanel.test.ts suite"
Cohesion: 1.0
Nodes (2): filterPanel.test.ts suite, galleryPanel.test.ts suite

### Community 66 - "draggableAvatar.test.ts suite"
Cohesion: 1.0
Nodes (2): draggableAvatar.test.ts suite, makeDraggable.test.ts suite

### Community 67 - "createFakeAudioContext()"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "FakeAudioContext"
Cohesion: 1.0
Nodes (1): FakeAudioContext

### Community 69 - "createFakeControl()"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Post-Deploy curl Header Verification"
Cohesion: 1.0
Nodes (2): Post-Deploy curl Header Verification, Rationale: Config-Only, So curl Not vitest

### Community 71 - "byId()"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "clickQuickLink()"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "touch()"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "playKnockBurst"
Cohesion: 1.0
Nodes (2): playKnockBurst, playHudSelectTone

### Community 75 - "isTouchDevice"
Cohesion: 1.0
Nodes (1): isTouchDevice

### Community 76 - "hud/shareLinks"
Cohesion: 1.0
Nodes (1): hud/shareLinks

### Community 77 - "Bed crossfade scheduler"
Cohesion: 1.0
Nodes (2): Bed crossfade scheduler, detectVolumeControlSupport (iOS volume quirk)

### Community 78 - "MenuPanel.handleInstagramShare"
Cohesion: 1.0
Nodes (2): MenuPanel.handleInstagramShare, isMobileUserAgent

### Community 79 - "shuffleVideos"
Cohesion: 1.0
Nodes (2): shuffleVideos, MenuPanel.buildMediaScreen

### Community 80 - "Aajtak Wali Didi Sticker Text"
Cohesion: 1.0
Nodes (2): Aajtak Wali Didi Sticker Text, Tax Wali Tai Sticker Text

### Community 81 - "Badbola Patra Sticker Text"
Cohesion: 1.0
Nodes (2): Badbola Patra Sticker Text, Chronology Mota Bhai Sticker Text

### Community 82 - "DNA Tihari Sticker Text"
Cohesion: 1.0
Nodes (2): DNA Tihari Sticker Text, Leak Pradhan Sticker Text

