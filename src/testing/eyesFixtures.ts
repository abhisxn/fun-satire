import type { Entity } from "../entities/Entity";

export function applyEyesFixtureState(
  entities: readonly Entity[],
  pupilOffsets: Map<number, { x: number; y: number }>,
  viewport: Readonly<{ width: number; height: number }>,
): void {
  const sorted = [...entities].sort((a, b) => a.id - b.id);
  const columns = Math.max(1, Math.ceil(Math.sqrt(sorted.length * viewport.width / viewport.height)));
  const rows = Math.max(1, Math.ceil(sorted.length / columns));
  const insetX = Math.min(96, viewport.width * 0.12);
  const insetY = Math.min(96, viewport.height * 0.14);
  const availableWidth = Math.max(0, viewport.width - insetX * 2);
  const availableHeight = Math.max(0, viewport.height - insetY * 2);

  pupilOffsets.clear();
  sorted.forEach((entity, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const pos = {
      x: insetX + availableWidth * ((column + 0.5) / columns),
      y: insetY + availableHeight * ((row + 0.5) / rows),
    };
    entity.physics.pos = pos;
    entity.physics.home = { ...pos };
    entity.physics.vel = { x: 0, y: 0 };
    entity.physics.rotation = 0;
    pupilOffsets.set(entity.id, { x: 0, y: 0 });
  });
}
