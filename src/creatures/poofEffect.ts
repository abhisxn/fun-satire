const POP_COUNT = 6;
const SMOKE_COUNT = 6;
const PUFF_Z_INDEX = 600;

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

export function spawnPoof(cx: number, cy: number): void {
  const animateSupported = typeof document.createElement("div").animate === "function";

  // Layer 1: sharp, small, fast "pop" — the initial burst.
  for (let i = 0; i < POP_COUNT; i++) {
    const angle = (i / POP_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 22 + Math.random() * 20;
    const size = 14 + Math.random() * 14;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    const puff = makePuff(cx, cy, size);

    if (!animateSupported) {
      puff.remove();
      continue;
    }

    const anim = puff.animate(
      [
        { transform: "translate(0,0) scale(0.4)", opacity: 0.9 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.5)`, opacity: 0 },
      ],
      { duration: 380 + Math.random() * 120, easing: "ease-out" },
    );
    anim.onfinish = () => puff.remove();
  }

  // Layer 2: bigger, softer, slower "smoke" — drifts outward and up.
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

    if (!animateSupported) {
      puff.remove();
      continue;
    }

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
}
