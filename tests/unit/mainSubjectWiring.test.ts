// tests/unit/mainSubjectWiring.test.ts
// @vitest-environment happy-dom
import "./helpers/mainDomSetup";
import { describe, expect, it } from "vitest";
import { queryNearestEye } from "../../src/main";
import { EntityStore } from "../../src/entities/EntityStore";
import type { Entity } from "../../src/entities/Entity";

function makeEntity(id: number, renderType: "eye" | "subject", x: number, y: number): Entity {
  return {
    id,
    content: { manifestId: `${renderType}-${id}`, rig: renderType, renderType },
    physics: { pos: { x, y }, vel: { x: 0, y: 0 }, home: { x, y }, scale: 1, rotation: 0 },
    behavior: { data: {} },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("main.ts subject wiring helpers", () => {
  it("queryNearestEye ignores the subject entity and returns the nearest eye within range", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, "subject", 5, 5));
    store.insert(makeEntity(2, "eye", 100, 100));
    const result = queryNearestEye(store, { x: 98, y: 98 }, 70);
    expect(result?.id).toBe(2);
  });

  it("queryNearestEye returns null when only a subject is in range", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, "subject", 10, 10));
    const result = queryNearestEye(store, { x: 12, y: 12 }, 70);
    expect(result).toBeNull();
  });
});
