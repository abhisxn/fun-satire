const PUFF_COUNT = 6;
const PUFF_Z_INDEX = 600;

export function spawnPoof(cx: number, cy: number): void {
  for (let i = 0; i < PUFF_COUNT; i++) {
    const angle = (i / PUFF_COUNT) * Math.PI * 2;
    const dist = 26 + Math.random() * 22;
    const size = 16 + Math.random() * 16;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

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

    if (typeof puff.animate !== "function") {
      puff.remove();
      continue;
    }

    const anim = puff.animate(
      [
        { transform: "translate(0,0) scale(0.4)", opacity: 0.9 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.5)`, opacity: 0 },
      ],
      { duration: 420 + Math.random() * 140, easing: "ease-out" },
    );
    anim.onfinish = () => puff.remove();
  }
}
