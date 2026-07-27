// tests/unit/mainSubjectCollection.test.ts
// @vitest-environment happy-dom
import "./helpers/mainDomSetup";
import { describe, expect, it, beforeEach } from "vitest";
import {
  spawnSubjectForCollection,
  removeSubjectFromCollection,
  getSubjectRecord,
  getLockedSubjectId,
  listSubjectRecords,
  lockSubject,
  unlockSubject,
  clearLockedSubjectIf,
  __resetSubjectCollectionForTests,
  type SubjectRecord,
} from "../../src/main";
import type { SubjectSkin } from "../../src/hud/subjectSkinRegistry";

const SKIN_A: SubjectSkin = { kind: "illustrated", id: "figure" };
const SKIN_B: SubjectSkin = { kind: "illustrated", id: "jester" };

beforeEach(() => {
  __resetSubjectCollectionForTests();
});

describe("main.ts subject collection (PR2 Task 1)", () => {
  it("spawnSubjectForCollection adds a record keyed by entity id", () => {
    const record = spawnSubjectForCollection({ id: 101, skin: SKIN_A, nowMs: 1000 });
    expect(record.id).toBe(101);
    expect(record.skin).toEqual(SKIN_A);
    expect(record.spawnedAtMs).toBe(1000);
    expect(record.locked).toBe(false);
    expect(getSubjectRecord(101)).toEqual(record);
  });

  it("two subjects can be spawned and tracked independently", () => {
    const a = spawnSubjectForCollection({ id: 1, skin: SKIN_A, nowMs: 500 });
    const b = spawnSubjectForCollection({ id: 2, skin: SKIN_B, nowMs: 600 });
    expect(listSubjectRecords().size).toBe(2);
    expect(getSubjectRecord(1)?.skin).toEqual(SKIN_A);
    expect(getSubjectRecord(2)?.skin).toEqual(SKIN_B);
    expect(getSubjectRecord(1)?.spawnedAtMs).toBe(500);
    expect(getSubjectRecord(2)?.spawnedAtMs).toBe(600);
    expect(a.id).not.toBe(b.id);
  });

  it("removing one subject does not affect the other", () => {
    spawnSubjectForCollection({ id: 1, skin: SKIN_A, nowMs: 500 });
    spawnSubjectForCollection({ id: 2, skin: SKIN_B, nowMs: 600 });
    expect(listSubjectRecords().size).toBe(2);

    const removed = removeSubjectFromCollection(1);
    expect(removed).toBe(true);
    expect(listSubjectRecords().size).toBe(1);
    expect(getSubjectRecord(1)).toBeUndefined();
    expect(getSubjectRecord(2)?.skin).toEqual(SKIN_B);
    expect(getSubjectRecord(2)?.spawnedAtMs).toBe(600);
  });

  it("lockSubject sets the lockedSubjectId and the record.locked flag", () => {
    spawnSubjectForCollection({ id: 7, skin: SKIN_A, nowMs: 100 });
    lockSubject(7);
    const rec = getSubjectRecord(7) as SubjectRecord;
    expect(rec.locked).toBe(true);
    expect(getLockedSubjectId()).toBe(7);
  });

  it("lockSubject is a no-op for unknown ids (no exception, no lock change)", () => {
    spawnSubjectForCollection({ id: 7, skin: SKIN_A, nowMs: 100 });
    lockSubject(7);
    lockSubject(999);
    expect(getLockedSubjectId()).toBe(7);
  });

  it("unlockSubject clears the lock and the record.locked flag", () => {
    spawnSubjectForCollection({ id: 7, skin: SKIN_A, nowMs: 100 });
    lockSubject(7);
    unlockSubject();
    expect(getLockedSubjectId()).toBeNull();
    expect(getSubjectRecord(7)?.locked).toBe(false);
  });

  it("removeSubjectFromCollection clears the lock if the removed subject was locked", () => {
    spawnSubjectForCollection({ id: 7, skin: SKIN_A, nowMs: 100 });
    lockSubject(7);
    expect(getLockedSubjectId()).toBe(7);
    removeSubjectFromCollection(7);
    expect(getLockedSubjectId()).toBeNull();
  });

  it("removeSubjectFromCollection does not change the lock when a different subject is removed", () => {
    spawnSubjectForCollection({ id: 1, skin: SKIN_A, nowMs: 100 });
    spawnSubjectForCollection({ id: 2, skin: SKIN_B, nowMs: 200 });
    lockSubject(2);
    removeSubjectFromCollection(1);
    expect(getLockedSubjectId()).toBe(2);
    expect(getSubjectRecord(2)?.locked).toBe(true);
  });

  it("clearLockedSubjectIf clears the lock when the predicate matches", () => {
    spawnSubjectForCollection({ id: 5, skin: SKIN_A, nowMs: 1 });
    lockSubject(5);
    clearLockedSubjectIf((id) => id === 5);
    expect(getLockedSubjectId()).toBeNull();
    expect(getSubjectRecord(5)?.locked).toBe(false);
  });

  it("__resetSubjectCollectionForTests clears the entire state", () => {
    spawnSubjectForCollection({ id: 1, skin: SKIN_A, nowMs: 1 });
    spawnSubjectForCollection({ id: 2, skin: SKIN_B, nowMs: 2 });
    lockSubject(2);
    __resetSubjectCollectionForTests();
    expect(listSubjectRecords().size).toBe(0);
    expect(getLockedSubjectId()).toBeNull();
  });
});
