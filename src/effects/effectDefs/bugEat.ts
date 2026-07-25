export type BugEatCtx = {
  particles: { spawn: (config: unknown) => void };
  audio: { play: (sound: string) => void };
};

export type Vec2 = {
  x: number;
  y: number;
};

export function bugEatEffect(ctx: BugEatCtx, position: Vec2): void {
  ctx.particles.spawn({
    x: position.x,
    y: position.y,
    vx: 0,
    vy: 0,
    lifeMs: 300,
    startSize: 4,
    endSize: 0,
    color: "#000000",
  });

  ctx.audio.play("eat");
}
