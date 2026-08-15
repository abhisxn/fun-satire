import "./hud/hudFonts.css";
import "./hud/hudGlass.css";
import { Engine } from "./core/Engine";
import { BugSwarm } from "./creatures/BugSwarm";
import { CreatureGrid } from "./creatures/CreatureGrid";
import { spawnPoof } from "./creatures/poofEffect";
import type { PoofHandle } from "./creatures/poofEffect";
import { RaidController } from "./creatures/RaidController";
import { StickerOverlay } from "./creatures/StickerOverlay";
import { TextOverlay } from "./creatures/TextOverlay";
import { Hud } from "./hud/Hud";
import { MenuButton } from "./hud/MenuButton";
import { FilterPanel } from "./hud/FilterPanel";
import { GalleryPanel, getFaceStickerDefs } from "./hud/GalleryPanel";
import { MenuPanel } from "./hud/MenuPanel";
import { OnboardingCarousel } from "./hud/onboarding/OnboardingCarousel";
import { DEFAULT_CREATURE_QUANTITY } from "./config/tokens";
import { AudioManager } from "./audio/AudioManager";
import { AudioWidget } from "./audio/AudioWidget";
import { playPoofTone } from "./audio/poofTone";
import { ClickSound } from "./audio/clickSound";
import { DragScratchSound } from "./audio/dragScratchSound";
import { initAnalytics } from "./analytics/ga";

const ONBOARDING_CREATURE_QUANTITY = 60;
const ONBOARDING_CARD_REPULSOR_RADIUS = 300;

async function main(): Promise<void> {
  initAnalytics();

  const container = document.getElementById("stage");
  if (!container) throw new Error("Missing #stage container");

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const filterPanel = new FilterPanel();

  let audioManagerRef: AudioManager | null = null;

  const grid = new CreatureGrid({
    container,
    mode: "cockroach",
    initialQuantity: ONBOARDING_CREATURE_QUANTITY,
    onCreatureTerminated: (x, y, w, h) => {
      const audioContext = audioManagerRef?.getAudioContext();
      if (audioContext) playPoofTone(audioContext);
      void spawnPoof(x, y, w, h);
    },
  });
  await grid.init();
  grid.setRepulsor(vw / 2, vh / 2, ONBOARDING_CARD_REPULSOR_RADIUS);

  // --- Sound bed (isolated init: owns its own AudioManager + widget. No
  // other init block touches this one.) ---
  const audioManager = new AudioManager({ volume: 0.16 });
  audioManagerRef = audioManager;
  const audioWidget = new AudioWidget(audioManager);
  audioWidget.attachTo(document.body);
  void audioWidget.attemptAutoplay();
  // Task 6's hover tones fire through the grid using this same shared
  // AudioContext, so eyes/finger/cockroach/placard hovers share one voice.
  grid.setAudioContext(audioManager.getAudioContext());

  const raidController = new RaidController({
    container,
    grid,
    onSecurityRemoved: (x, y, w, h) => {
      const audioContext = audioManager.getAudioContext();
      if (audioContext) playPoofTone(audioContext);
      void spawnPoof(x, y, w, h);
    },
  });

  const bugSwarm = new BugSwarm(container);

  type Attractor = { getCenter(): { x: number; y: number } };
  const staticAttractor = (x: number, y: number): Attractor => ({
    getCenter: () => ({ x, y }),
  });

  let activeOverlay: StickerOverlay | TextOverlay | null = null;
  let replaceToken = 0;

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
    grid.update(center.x, center.y, raidController.getSecurityUnits(), raidController.getRaidFloor());
  });
  engine.start();

  let resizeTimeout: number;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
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

    filterPanel.attachTo(hud.getSettingsButton());
    galleryPanel.attachTo(hud.getGalleryButton());
    menuPanel.attachTo(menuButton.getButton());

    const syncMenuButtonVisibility = (): void => {
      const anyPanelOpen = galleryPanel.isPanelOpen() || menuPanel.isPanelOpen();
      if (anyPanelOpen) {
        menuButton.hide();
      } else {
        menuButton.show();
      }
    };
    galleryPanel.onOpenChange(syncMenuButtonVisibility);
    menuPanel.onOpenChange(syncMenuButtonVisibility);

    filterPanel.onQuantityChange((qty) => {
      grid.setQuantity(qty);
    });

    filterPanel.onRepelChange((value) => {
      grid.setRepelMultiplier(value);
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

    hud.getProtestButton().addEventListener("click", () => {
      raidController.startRecovery();
    });

    galleryPanel.onStickerSelect((src) => {
      const sticker = new StickerOverlay(
        src,
        undefined,
        undefined,
        onOverlayDragStart,
        onOverlayDragEnd,
        onOverlayDragMove,
      );
      void replaceOverlay(sticker);
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
  const onOverlayDragMove = (x: number, y: number): void => {
    dragScratchSound.onMove();
    if (activeOverlay instanceof StickerOverlay) {
      raidController.onAvatarMove(x, y);
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
    const defs = getFaceStickerDefs();
    const def = defs[Math.floor(Math.random() * defs.length)];
    const sticker = new StickerOverlay(
      def.src,
      center.x - 80,
      center.y - 80,
      onOverlayDragStart,
      onOverlayDragEnd,
      onOverlayDragMove,
      true,
    );
    document.body.appendChild(sticker.el);
    activeOverlay = sticker;
    currentAttractor = sticker;
    mountPostOnboarding();
    grid.clearRepulsor();
    filterPanel.setQuantity(DEFAULT_CREATURE_QUANTITY);
  });
}

main().catch(console.error);
