import { describe, expect, it } from "vitest";
import type { Entity, Vec2 } from "../../src/entities/Entity";
import { EntityStore } from "../../src/entities/EntityStore";
import {
  isSubject,
  queryAllSubjects,
  queryNearestSubject,
} from "../../src/entities/subjectQueries";

const makeEntity = (id: number, renderType: string, pos: Vec2): Entity => ({
  id,
  content: {
    manifestId: `m${id}`,
    rig: renderType,
    renderType,
  },
  physics: {
    pos: { x: pos.x, y: pos.y },
    vel: { x: 0, y: 0 },
    home: { x: pos.x, y: pos.y },
    scale: 1,
    rotation: 0,
  },
  behavior: { data: {} },
  lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
});

describe("subjectQueries", () => {
  describe("isSubject", () => {
    it("returns true for entities with renderType 'subject'", () => {
      const e = makeEntity(1, "subject", { x: 0, y: 0 });
      expect(isSubject(e)).toBe(true);
    });

    it("returns false for entities with other renderTypes", () => {
      expect(isSubject(makeEntity(1, "eye", { x: 0, y: 0 }))).toBe(false);
      expect(isSubject(makeEntity(2, "bug", { x: 0, y: 0 }))).toBe(false);
      expect(isSubject(makeEntity(3, "pointedFinger", { x: 0, y: 0 }))).toBe(false);
    });
  });

  describe("queryAllSubjects", () => {
    it("returns an empty array when the store has no entities", () => {
      const store = new EntityStore();
      expect(queryAllSubjects(store)).toEqual([]);
    });

    it("returns an empty array when there are no subjects", () => {
      const store = new EntityStore();
      store.insert(makeEntity(1, "eye", { x: 0, y: 0 }));
      store.insert(makeEntity(2, "bug", { x: 10, y: 10 }));
      expect(queryAllSubjects(store)).toEqual([]);
    });

    it("returns only subject entities, preserving insertion order", () => {
      const store = new EntityStore();
      const a = makeEntity(1, "eye", { x: 0, y: 0 });
      const s1 = makeEntity(2, "subject", { x: 10, y: 10 });
      const b = makeEntity(3, "bug", { x: 20, y: 20 });
      const s2 = makeEntity(4, "subject", { x: 30, y: 30 });
      store.insert(a);
      store.insert(s1);
      store.insert(b);
      store.insert(s2);
      const result = queryAllSubjects(store);
      expect(result.map((e) => e.id)).toEqual([2, 4]);
    });
  });

  describe("queryNearestSubject", () => {
    it("returns null when the store has no entities", () => {
      const store = new EntityStore();
      expect(queryNearestSubject(store, { x: 0, y: 0 })).toBeNull();
    });

    it("returns null when no subjects exist (only non-subjects)", () => {
      const store = new EntityStore();
      store.insert(makeEntity(1, "eye", { x: 0, y: 0 }));
      store.insert(makeEntity(2, "bug", { x: 5, y: 5 }));
      expect(queryNearestSubject(store, { x: 0, y: 0 })).toBeNull();
    });

    it("returns the only subject when one exists", () => {
      const store = new EntityStore();
      const s = makeEntity(1, "subject", { x: 50, y: 50 });
      store.insert(makeEntity(2, "eye", { x: 0, y: 0 }));
      store.insert(s);
      expect(queryNearestSubject(store, { x: 0, y: 0 })).toBe(s);
    });

    it("returns the nearest subject when multiple exist (ignores non-subjects)", () => {
      const store = new EntityStore();
      const near = makeEntity(1, "subject", { x: 5, y: 5 });
      const far = makeEntity(2, "subject", { x: 100, y: 100 });
      store.insert(far);
      store.insert(makeEntity(3, "eye", { x: 1, y: 1 }));
      store.insert(near);
      expect(queryNearestSubject(store, { x: 0, y: 0 })).toBe(near);
    });

    it("uses squared distance for ranking (no Math.sqrt required)", () => {
      const store = new EntityStore();
      const a = makeEntity(1, "subject", { x: 3, y: 4 });
      const b = makeEntity(2, "subject", { x: 6, y: 8 });
      store.insert(a);
      store.insert(b);
      expect(queryNearestSubject(store, { x: 0, y: 0 })).toBe(a);
    });
  });
});
