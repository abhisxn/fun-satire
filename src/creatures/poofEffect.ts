const CLOUD_COUNT = 7;
const SMOKE_COUNT = 6;
const PUFF_Z_INDEX = 600;

// Fraction of the animation spent growing the cloud to full coverage before
// it starts dissipating — this is also roughly when callers should swap out
// the covered content, so the swap reads as "hidden by smoke" not "vanished".
const COVER_FRACTION = 0.18;
const CLOUD_DURATION = 560;

export interface PoofHandle {
  /** Resolves once the cloud has grown to fully cover the source element. */
  covered: Promise<void>;
  /** Resolves once the whole burst (cloud + trailing smoke) has finished. */
  done: Promise<void>;
}

function makePuff(cx: number, cy: number, size: number): HTMLDivElement {
  const puff = document.createElement("div");
  puff.style.cssText = [
    "position:fixed",
    `left:${cx - size / 2}px`,
    `top:${cy - size / 2}px`,
    `width:${size}px`,
    `height:${size}px`,
    "border-radius:50%",
    "background:radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(190,190,190,0.55) 60%, rgba(190,190,190,0) 100%)",
    "pointer-events:none",
    `z-index:${PUFF_Z_INDEX}`,
  ].join(";");
  document.body.appendChild(puff);
  return puff;
}

/**
 * Spawns a cartoon-style poof burst over the element's footprint: a cloud
 * layer grows to fully cover the source content first (see `covered`), then
 * dissipates outward alongside a softer trailing "smoke" layer.
 */
export function spawnPoof(
  cx: number,
  cy: number,
  width = 40,
  height = 40,
): PoofHandle {
  const animateSupported = typeof document.createElement("div").animate === "function";

  if (!animateSupported) {
    return { covered: Promise.resolve(), done: Promise.resolve() };
  }

  const cloudFinished: Promise<void>[] = [];
  const coverSize = Math.max(width, height) * 0.75;
  const spreadX = width * 0.3;
  const spreadY = height * 0.3;

  // Layer 1: "cloud" — grows to fully cover the element, holds briefly
  // opaque, then dissipates outward. Covers the swap so it reads as smoke
  // hiding the content rather than the content abruptly vanishing.
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const angle = (i / CLOUD_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const originX = cx + (Math.random() * 2 - 1) * spreadX;
    const originY = cy + (Math.random() * 2 - 1) * spreadY;
    const dist = 26 + Math.random() * 24;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const size = coverSize * (0.75 + Math.random() * 0.5);

    const puff = makePuff(originX, originY, size);
    const duration = CLOUD_DURATION + Math.random() * 100;

    const anim = puff.animate(
      [
        { transform: "translate(0,0) scale(0.3)", opacity: 0 },
        { offset: COVER_FRACTION, transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.6)`, opacity: 0 },
      ],
      { duration, easing: "ease-out" },
    );
    anim.onfinish = () => puff.remove();
    cloudFinished.push(anim.finished.then(() => undefined).catch(() => undefined));
  }

  // Layer 2: bigger, softer, slower "smoke" — trails outward and up behind
  // the cloud layer; purely decorative, not awaited by either promise.
  for (let i = 0; i < SMOKE_COUNT; i++) {
    const angle = (i / SMOKE_COUNT) * Math.PI * 2 + Math.random() * 0.6;
    const midDist = 18 + Math.random() * 20;
    const farDist = 46 + Math.random() * 40;
    const size = 24 + Math.random() * 30;
    const midDx = Math.cos(angle) * midDist;
    const midDy = Math.sin(angle) * midDist - (8 + Math.random() * 10);
    const farDx = Math.cos(angle) * farDist;
    const farDy = Math.sin(angle) * farDist - (20 + Math.random() * 22);

    const puff = makePuff(cx, cy, size);
    puff.style.opacity = "0";

    const anim = puff.animate(
      [
        { transform: "translate(0,0) scale(0.3)", opacity: 0 },
        { transform: `translate(${midDx}px, ${midDy}px) scale(1)`, opacity: 0.55 },
        { transform: `translate(${farDx}px, ${farDy}px) scale(1.8)`, opacity: 0 },
      ],
      {
        duration: 520 + Math.random() * 260,
        delay: Math.random() * 120,
        easing: "ease-out",
      },
    );
    anim.onfinish = () => puff.remove();
  }

  const covered = new Promise<void>((resolve) => {
    setTimeout(resolve, CLOUD_DURATION * COVER_FRACTION);
  });
  const done =
    cloudFinished.length === 0
      ? Promise.resolve()
      : Promise.all(cloudFinished).then(() => undefined);

  return { covered, done };
}
