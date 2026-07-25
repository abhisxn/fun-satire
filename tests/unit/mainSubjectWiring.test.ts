// tests/unit/mainSubjectWiring.test.ts
// @vitest-environment happy-dom
import "./helpers/mainDomSetup";
import { describe, expect, it } from "vitest";
import { queryNearestEye, shouldSpawnSubject } from "../../src/main";
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

describe("main.ts subject wiring helpers (T36)", () => {
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

  it("shouldSpawnSubject is false before the cooldown timer elapses", () => {
    expect(shouldSpawnSubject({ subjectId: null, subjectRespawnAtMs: 5000, nowMs: 4000, cursorActive: true })).toBe(false);
  });

  it("shouldSpawnSubject is false while the cursor is inactive, even after cooldown elapses", () => {
    expect(shouldSpawnSubject({ subjectId: null, subjectRespawnAtMs: 5000, nowMs: 6000, cursorActive: false })).toBe(false);
  });

  it("shouldSpawnSubject is false while a subject already exists", () => {
    expect(shouldSpawnSubject({ subjectId: 7, subjectRespawnAtMs: 5000, nowMs: 6000, cursorActive: true })).toBe(false);
  });

  it("shouldSpawnSubject is true once cooldown has elapsed, cursor is active, and no subject exists", () => {
    expect(shouldSpawnSubject({ subjectId: null, subjectRespawnAtMs: 5000, nowMs: 6000, cursorActive: true })).toBe(true);
  });

  it("shouldSpawnSubject is false when there is no pending respawn timer", () => {
    expect(shouldSpawnSubject({ subjectId: null, subjectRespawnAtMs: null, nowMs: 6000, cursorActive: true })).toBe(false);
  });
});
