import "./hud/hudFonts.css";
import "./hud/hudGlass.css";
import { Engine } from "./core/Engine";
import { BugSwarm } from "./creatures/BugSwarm";
import { CreatureGrid } from "./creatures/CreatureGrid";
import { spawnPoof } from "./creatures/poofEffect";
import type { PoofHandle } from "./creatures/poofEffect";
import { RaidController, SECURITY_MAX_UNITS } from "./creatures/RaidController";
import { PowerMeter } from "./hud/PowerMeter";
import { StickerOverlay, DEFAULT_WIDTH } from "./creatures/StickerOverlay";
import { TextOverlay } from "./creatures/TextOverlay";
import { clampToViewport } from "./creatures/snapGrid";
import { Hud } from "./hud/Hud";
import { MenuButton } from "./hud/MenuButton";
import { FilterPanel } from "./hud/FilterPanel";
import { GalleryPanel, getStickerDefs, getFaceStickerDefs } from "./hud/GalleryPanel";
import { MenuPanel } from "./hud/MenuPanel";
import { WinPanel } from "./hud/WinPanel";
import { OnboardingCarousel } from "./hud/onboarding/OnboardingCarousel";
import { DEFAULT_CREATURE_QUANTITY } from "./config/tokens";
import { preloadImages } from "./core/assetPreload";
import { AudioManager } from "./audio/AudioManager";
import { AudioWidget } from "./audio/AudioWidget";
import { playPoofTone } from "./audio/poofTone";
import { playInflateTone } from "./audio/inflateTone";
import { playDeflateTone } from "./audio/deflateTone";
import { ClickSound } from "./audio/clickSound";
import { DragScratchSound } from "./audio/dragScratchSound";
import { initAnalytics } from "./analytics/ga";

const ONBOARDING_CREATURE_QUANTITY = 60;
const ONBOARDING_CARD_REPULSOR_RADIUS = 300;
/** The avatar-vs-creature repel radius at the sticker's default (1x, un-tiered, un-resized)
 * width — matches CreatureGrid's own internal default (see its physicsParams.repelRadius),
 * kept here as the reference point setAvatarRepelRadius() is scaled from every frame below,
 * so a bigger sticker always keeps the crowd proportionally further away and a smaller one
 * lets them approach closer — continuously, not just right after a win. */
const AVATAR_REPEL_RADIUS_BASE = 180;

async function main(): Promise<void> {
  initAnalytics();

  const faceDefs = getFaceStickerDefs();
  const initialFaceDef = faceDefs[Math.floor(Math.random() * faceDefs.length)]!;
  void preloadImages([initialFaceDef.src, initialFaceDef.dragSrc]);

  const container = document.getElementById("stage");
  if (!container) throw new Error("Missing #stage container");

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const filterPanel = new FilterPanel();

  const grid = new CreatureGrid({
    container,
    mode: "cockroach",
    initialQuantity: ONBOARDING_CREATURE_QUANTITY,
  });
  await grid.init();
  grid.setRepulsor(vw / 2, vh / 2, ONBOARDING_CARD_REPULSOR_RADIUS);

  // --- Sound bed (isolated init: owns its own AudioManager + widget. No
  // other init block touches this one.) ---
  const audioManager = new AudioManager({ volume: 0.16 });
  const audioWidget = new AudioWidget(audioManager);
  audioWidget.attachTo(document.body);
  void audioWidget.attemptAutoplay();
  // Task 6's hover tones fire through the grid using this same shared
  // AudioContext, so eyes/finger/cockroach/placard hovers share one voice.
  grid.setAudioContext(audioManager.getAudioContext());

  let activeOverlay: StickerOverlay | TextOverlay | null = null;
  let replaceToken = 0;
  const winPanel = new WinPanel();

  const raidController = new RaidController({
    container,
    grid,
    avatarLayer: document.body,
    onSecurityRemoved: (x, y, w, h) => {
      const audioContext = audioManager.getAudioContext();
      if (audioContext) playPoofTone(audioContext);
      void spawnPoof(x, y, w, h);
    },
    // Fires once a protest win's despawn visuals have actually finished on screen —
    // never immediately on button release (see the callback's doc comment in
    // RaidController.ts for why).
    onProtestWin: () => {
      if (activeOverlay instanceof StickerOverlay) {
        activeOverlay.lockSqueeze();
        // The avatar-vs-creature repel radius isn't touched here — the engine's
        // per-frame update (see engine.onTick below) already recomputes it from the
        // sticker's live getWidth() every frame, so the very next frame after
        // lockSqueeze() shrinks it naturally picks up the new, smaller radius.
        // The win-lock's snap to the floor scale is always a downward step, whatever
        // tier the sticker was at before — no direction check needed, unlike the
        // tiered onCrowdSizeChanged case below.
        const audioContext = audioManager.getAudioContext();
        if (audioContext) playDeflateTone(audioContext);
      }
      // Short victory beat before the panel appears, so the player sees the crowd
      // settle around the shrunk sticker first. If a new raid has already started
      // by the time this fires (state left 'idle'), skip showing the panel — it
      // would otherwise pop up over an already-restarted raid.
      window.setTimeout(() => {
        if (raidController.getState() === "idle") {
          winPanel.show();
        }
      }, 1500);
    },
    // Fires the moment a fresh raid actually starts — releases the win-lock so the
    // sticker's scale can track the new raid's live size again.
    onRaidStart: () => {
      if (activeOverlay instanceof StickerOverlay) {
        activeOverlay.unlock();
      }
    },
    // Fires continuously as the raid's live security-unit count changes (spawns,
    // backfire respawn trickle-in, despawn sweep) — a no-op on the sticker's side
    // while a win's lock is still in effect. setScaleForRaidSize reports whether
    // this call actually moved the sticker up or down a tier, so the inflate/
    // deflate cue plays once per visible size-step rather than once per tick.
    onCrowdSizeChanged: (securityUnitCount, tierBump) => {
      if (activeOverlay instanceof StickerOverlay) {
        const direction = activeOverlay.setScaleForRaidSize(securityUnitCount, SECURITY_MAX_UNITS, tierBump);
        if (direction === "none") return;
        const audioContext = audioManager.getAudioContext();
        if (!audioContext) return;
        if (direction === "up") playInflateTone(audioContext);
        else playDeflateTone(audioContext);
      }
    },
  });

  const bugSwarm = new BugSwarm(container);

  type Attractor = { getCenter(): { x: number; y: number } };
  const staticAttractor = (x: number, y: number): Attractor => ({
    getCenter: () => ({ x, y }),
  });

  const pointerPos = { x: vw / 2, y: vh / 2 };
  const onPointerMove = (e: PointerEvent): void => {
    pointerPos.x = e.clientX;
    pointerPos.y = e.clientY;
  };
  window.addEventListener("pointermove", onPointerMove);

  let currentAttractor: Attractor = {
    getCenter: () => ({ x: pointerPos.x, y: pointerPos.y }),
  };

  const engine = new Engine();
  engine.onTick(() => {
    const center = currentAttractor.getCenter();
    if (activeOverlay instanceof StickerOverlay) {
      const avatarCenter = activeOverlay.getCenter();
      raidController.syncAvatarCenter(avatarCenter.x, avatarCenter.y);
      raidController.setAvatarWidth(activeOverlay.getWidth());
    }
    raidController.tick(Date.now());
    // Recomputed *after* tick(), not alongside setAvatarWidth() above — tick() is where
    // a same-frame win's lockSqueeze() actually shrinks the sticker, and reading
    // getWidth() only here (not the frame-delayed avatarWidth RaidController itself
    // tracks) means the radius reflects that shrink at the instant it happens, not one
    // frame later. No sticker (TextOverlay/onboarding) restores the physics default.
    grid.setAvatarRepelRadius(
      activeOverlay instanceof StickerOverlay ? AVATAR_REPEL_RADIUS_BASE * (activeOverlay.getWidth() / DEFAULT_WIDTH) : null,
    );
    if (activeOverlay && raidController.getState() !== "idle") {
      // Keep the avatar as the last body child while security units (also
      // now z-index:100, see SecurityCreature.SECURITY_Z_INDEX) are being
      // appended, so equal-z-index ties always resolve avatar-on-top.
      document.body.appendChild(activeOverlay.el);
    }
    grid.update(center.x, center.y, raidController.getSecurityUnits(), raidController.getRaidFloor());
  });
  engine.start();

  let resizeTimeout: number;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    if (activeOverlay) {
      clampToViewport(activeOverlay.el);
    }
    resizeTimeout = window.setTimeout(() => {
      grid.respawn();
    }, 200);
  });

  const poofElement = (el: HTMLElement): PoofHandle => {
    const rect = el.getBoundingClientRect();
    const audioContext = audioManager.getAudioContext();
    if (audioContext) playPoofTone(audioContext);
    return spawnPoof(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      rect.width,
      rect.height,
    );
  };

  const replaceOverlay = async (
    next: StickerOverlay | TextOverlay,
  ): Promise<void> => {
    const token = ++replaceToken;

    const center = currentAttractor.getCenter();
    currentAttractor = staticAttractor(center.x, center.y);

    let poofDone: Promise<void>;
    if (activeOverlay) {
      const overlay = activeOverlay;
      activeOverlay = null;
      const poof = poofElement(overlay.el);
      await poof.covered;
      if (token !== replaceToken) return;
      overlay.destroy();
      poofDone = poof.done;
    } else {
      poofDone = Promise.resolve();
    }

    await poofDone;
    if (token !== replaceToken) return;

    document.body.appendChild(next.el);
    activeOverlay = next;
    currentAttractor = next;
  };

  const mountPostOnboarding = (): void => {
    const hud = new Hud();
    const hudRoot = document.getElementById("hud-root");
    if (!hudRoot) throw new Error("Missing #hud-root container");
    hud.attachTo(hudRoot);
    hud.setAudioContext(audioManager.getAudioContext());

    const menuButton = new MenuButton();
    menuButton.attachTo(hudRoot);
    menuButton.setAudioContext(audioManager.getAudioContext());

    const galleryPanel = new GalleryPanel();
    const menuPanel = new MenuPanel();
    winPanel.attachTo(hudRoot);

    filterPanel.attachTo(hud.getSettingsButton());
    galleryPanel.attachTo(hud.getGalleryButton());
    menuPanel.attachTo(menuButton.getButton());

    const syncMenuButtonVisibility = (): void => {
      const anyPanelOpen =
        galleryPanel.isPanelOpen() || menuPanel.isPanelOpen() || winPanel.isPanelOpen();
      if (anyPanelOpen) {
        menuButton.hide();
      } else {
        menuButton.show();
      }
    };
    galleryPanel.onOpenChange(syncMenuButtonVisibility);
    menuPanel.onOpenChange(syncMenuButtonVisibility);
    winPanel.onOpenChange(syncMenuButtonVisibility);

    filterPanel.onQuantityChange((qty) => {
      grid.setUserQuantity(qty);
    });

    grid.onQuantityChange((count) => {
      filterPanel.syncQuantity(count);
    });

    filterPanel.onRepelChange((radius) => {
      grid.setRepelRadius(radius);
    });

    filterPanel.onBugModeToggle((active) => {
      bugSwarm.setActive(active);
    });

    hud.onModeChange((mode) => {
      grid.switchMode(mode);
    });

    hud.getSettingsButton().addEventListener("click", () => {
      galleryPanel.close();
      menuPanel.close();
      filterPanel.toggle();
    });

    hud.getGalleryButton().addEventListener("click", () => {
      filterPanel.close();
      menuPanel.close();
      galleryPanel.toggle();
    });

    menuButton.getButton().addEventListener("click", () => {
      filterPanel.close();
      galleryPanel.close();
      menuPanel.toggle();
    });

    const powerMeter = new PowerMeter();
    powerMeter.attachTo(document.body);

    const protestBtn = hud.getProtestButton();
    protestBtn.addEventListener("pointerdown", () => {
      const state = raidController.getState();
      if (state === "raiding" || state === "idle") {
        raidController.startCharging();
        powerMeter.show();
      }
    });
    const endProtestCharge = (): void => {
      if (raidController.getState() === "charging") {
        raidController.releaseCharge();
      }
      powerMeter.hide();
    };
    protestBtn.addEventListener("pointerup", endProtestCharge);
    protestBtn.addEventListener("pointerleave", endProtestCharge);
    protestBtn.addEventListener("pointercancel", endProtestCharge);

    engine.onTick(() => {
      powerMeter.setFraction(raidController.getChargeFraction());
    });

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

    winPanel.onNextSticker(() => {
      const defs = getFaceStickerDefs();
      const def = defs[Math.floor(Math.random() * defs.length)]!;
      void preloadImages([def.src, def.dragSrc]);
      const sticker = new StickerOverlay(
        def.src,
        undefined,
        undefined,
        onOverlayDragStart,
        onOverlayDragEnd,
        onOverlayDragMove,
        false,
        def.dragSrc,
      );
      void replaceOverlay(sticker);
      // Treat this like a fresh post-onboarding session (same reset carousel.onComplete
      // does below) — full crowd restored regardless of how much a prior raid's attrition
      // had drained it, no leftover onboarding repulsor. Deliberately does NOT re-run
      // mountPostOnboarding() (HUD/panels are already mounted) and does NOT touch
      // grid.switchMode() — quantity/repulsor resets never touch the active creature
      // mode, so whatever mode the player was in (eyes/finger/cockroach/placard) is
      // left exactly as-is.
      grid.clearRepulsor();
      filterPanel.setQuantity(DEFAULT_CREATURE_QUANTITY);
    });

    galleryPanel.onTextSelect((font) => {
      if (activeOverlay instanceof TextOverlay) {
        const overlay = activeOverlay;
        const poof = poofElement(overlay.el);
        void poof.covered.then(() => {
          overlay.el.style.visibility = "hidden";
        });
        void poof.done.then(() => {
          overlay.setFont(font);
          overlay.el.style.visibility = "visible";
        });
        return;
      }
      const text = new TextOverlay(
        font,
        undefined,
        undefined,
        onOverlayDragStart,
        onOverlayDragEnd,
        onOverlayDragMove,
      );
      const editor = text.getEditor();
      editor.addEventListener("focus", () => {
        hud.hide();
        menuButton.hide();
      });
      editor.addEventListener("blur", () => {
        hud.show();
        syncMenuButtonVisibility();
      });
      void replaceOverlay(text);
    });
  };

  // Stickers/text play a pickup click when grabbed, and a "writing" scratch
  // sound scrubbed like a play slider — only sounding while pixels are
  // actively shifting, pausing the moment movement stops (even mid-drag)
  // and stopping outright the instant the drag ends.
  const pickupClickSound = new ClickSound();
  const dragScratchSound = new DragScratchSound();
  const onOverlayDragStart = (): void => {
    pickupClickSound.play();
  };
  const onOverlayDragMove = (_x: number, _y: number): void => {
    dragScratchSound.onMove();
    if (activeOverlay instanceof StickerOverlay) {
      const center = activeOverlay.getCenter();
      raidController.onAvatarMove(center.x, center.y);
    }
  };
  const onOverlayDragEnd = (): void => {
    dragScratchSound.stop();
  };

  const carousel = new OnboardingCarousel();
  carousel.attachTo(document.body);
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
      ? (cb: () => void) => window.requestIdleCallback(cb)
      : (cb: () => void) => window.setTimeout(cb, 1000);

    scheduleIdle(() => {
      const allUrls = getStickerDefs().flatMap((d) => [d.src, d.dragSrc, d.thumbSrc]);
      void preloadImages(allUrls);
    });
  });
}

main().catch(console.error);
