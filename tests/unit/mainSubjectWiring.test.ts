// tests/unit/mainSubjectWiring.test.ts
// @vitest-environment happy-dom
import "./helpers/mainDomSetup";
import { describe, expect, it, beforeEach } from "vitest";
import {
  applySubjectDrop,
  applyCanvasPress,
  listSubjectRecords,
  getLockedSubjectId,
  __resetSubjectCollectionForTests,
} from "../../src/main";
import type { SubjectSkin } from "../../src/hud/subjectSkinRegistry";
import type { Vec2 } from "../../src/entities/Entity";

const SKIN: SubjectSkin = { kind: "illustrated", id: "figure" };

beforeEach(() => {
  __resetSubjectCollectionForTests();
});

describe("main.ts subject drop + lock wiring (PR2 Task 5)", () => {
  it("applySubjectDrop with a canvasPos spawns a subject in the subjects Map", () => {
    const pos: Vec2 = { x: 200, y: 150 };
    const id = applySubjectDrop({ skin: SKIN, canvasPos: pos, nowMs: 1000 });
    expect(id).not.toBeNull();
    const records = listSubjectRecords();
    expect(records.size).toBe(1);
    const rec = records.get(id as number);
    expect(rec).toBeDefined();
    expect(rec?.skin).toEqual(SKIN);
    expect(rec?.locked).toBe(false);
  });

  it("applySubjectDrop with canvasPos: null (touch tap on card) spawns at canvas center per Gate 2 Option A", () => {
    const id = applySubjectDrop({ skin: SKIN, canvasPos: null, nowMs: 1000 });
    expect(id).not.toBeNull();
    expect(listSubjectRecords().size).toBe(1);
  });

  it("two successive drops spawn two distinct subjects in the Map", () => {
    const id1 = applySubjectDrop({ skin: SKIN, canvasPos: { x: 50, y: 50 }, nowMs: 1 });
    const id2 = applySubjectDrop({ skin: SKIN, canvasPos: { x: 80, y: 80 }, nowMs: 2 });
    expect(id1).not.toBeNull();
    expect(id2).not.toBeNull();
    expect(id1).not.toBe(id2);
    expect(listSubjectRecords().size).toBe(2);
  });

  it("applyCanvasPress on a subject's position locks it (sets lockedSubjectId)", () => {
    const id = applySubjectDrop({ skin: SKIN, canvasPos: { x: 300, y: 200 }, nowMs: 1 });
    expect(getLockedSubjectId()).toBeNull();

    applyCanvasPress(300, 200, id as number);

    expect(getLockedSubjectId()).toBe(id);
  });

  it("applyCanvasPress on the locked subject again toggles the lock off", () => {
    const id = applySubjectDrop({ skin: SKIN, canvasPos: { x: 300, y: 200 }, nowMs: 1 });
    applyCanvasPress(300, 200, id as number);
    expect(getLockedSubjectId()).toBe(id);

    applyCanvasPress(300, 200, id as number);

    expect(getLockedSubjectId()).toBeNull();
  });

  it("applyCanvasPress on empty canvas space does not change the lock", () => {
    const id = applySubjectDrop({ skin: SKIN, canvasPos: { x: 300, y: 200 }, nowMs: 1 });
    applyCanvasPress(300, 200, id as number);
    expect(getLockedSubjectId()).toBe(id);

    applyCanvasPress(9999, 9999, null);

    expect(getLockedSubjectId()).toBe(id);
  });

  it("applyCanvasPress switches the lock when tapping a different subject", () => {
    const id1 = applySubjectDrop({ skin: SKIN, canvasPos: { x: 100, y: 100 }, nowMs: 1 });
    const id2 = applySubjectDrop({ skin: SKIN, canvasPos: { x: 200, y: 200 }, nowMs: 2 });
    applyCanvasPress(100, 100, id1 as number);
    expect(getLockedSubjectId()).toBe(id1);

    applyCanvasPress(200, 200, id2 as number);

    expect(getLockedSubjectId()).toBe(id2);
  });
});
