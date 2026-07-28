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
  __getSubjectEntityForTests,
  __stepSubjectUpdateForTests,
  pickUnlockedSubjectTarget,
} from "../../src/main";
import { DURATION } from "../../src/config/tokens";
import { computeGazeLines } from "../../src/render/drawers/drawGazeLines";
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

  it("applySubjectDrop with canvasPos: null is a no-op (outside drop / touch tap)", () => {
    const id = applySubjectDrop({ skin: SKIN, canvasPos: null, nowMs: 1000 });
    expect(id).toBeNull();
    expect(listSubjectRecords().size).toBe(0);
  });

  it("a newly dropped unlocked subject reaches visible scale after spawn easing", () => {
    const id = applySubjectDrop({ skin: SKIN, canvasPos: { x: 100, y: 100 }, nowMs: 0 });
    expect(id).not.toBeNull();

    const e0 = __getSubjectEntityForTests(id as number);
    expect(e0?.physics.scale).toBe(0);

    __stepSubjectUpdateForTests({ x: 0, y: 0, active: false }, 1 / 60, DURATION.slow);

    const e1 = __getSubjectEntityForTests(id as number);
    expect(e1?.physics.scale).toBe(1);
  });

  it("a placed subject that gets locked stays at its drop point instead of following the cursor", () => {
    const dropPos: Vec2 = { x: 120, y: 80 };
    const id = applySubjectDrop({ skin: SKIN, canvasPos: dropPos, nowMs: 0 });
    expect(id).not.toBeNull();

    applyCanvasPress(dropPos.x, dropPos.y, id as number);
    expect(getLockedSubjectId()).toBe(id);

    const cursorFar = { x: 900, y: 700, active: true };
    for (let i = 0; i < 120; i++) {
      __stepSubjectUpdateForTests(cursorFar, 1 / 60, i * (1000 / 60));
    }

    const e = __getSubjectEntityForTests(id as number);
    expect(e?.physics.home.x).toBeCloseTo(dropPos.x, 0);
    expect(e?.physics.home.y).toBeCloseTo(dropPos.y, 0);
    expect(e?.physics.pos.x).toBeCloseTo(dropPos.x, 0);
    expect(e?.physics.pos.y).toBeCloseTo(dropPos.y, 0);
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

describe("main.ts identity-aware formatting handlers (PR2 Lane 3)", () => {
  it("a font change for a specific subjectId updates only that subject's skin in the Map", async () => {
    const id1 = applySubjectDrop({
      skin: { kind: "text", value: "A", scale: 1 },
      canvasPos: { x: 50, y: 50 },
      nowMs: 1,
    });
    const id2 = applySubjectDrop({
      skin: { kind: "text", value: "B", scale: 1 },
      canvasPos: { x: 150, y: 150 },
      nowMs: 2,
    });
    expect(id1).not.toBeNull();
    expect(id2).not.toBeNull();

    const { applySubjectFontChange, __resetSubjectSkinForTests } = await import("../../src/main");
    __resetSubjectSkinForTests?.();
    applySubjectFontChange(id1 as number, "fraunces");

    const rec1 = listSubjectRecords().get(id1 as number);
    const rec2 = listSubjectRecords().get(id2 as number);
    expect(rec1?.skin).toEqual({ kind: "text", value: "A", scale: 1, fontId: "fraunces" });
    expect(rec2?.skin).toEqual({ kind: "text", value: "B", scale: 1 });
  });

  it("a resize change for a specific subjectId updates only that subject's scale", async () => {
    const id1 = applySubjectDrop({
      skin: { kind: "text", value: "A", scale: 1 },
      canvasPos: { x: 50, y: 50 },
      nowMs: 1,
    });
    const id2 = applySubjectDrop({
      skin: { kind: "text", value: "B", scale: 1 },
      canvasPos: { x: 150, y: 150 },
      nowMs: 2,
    });

    const { applySubjectResizeChange, __resetSubjectSkinForTests } = await import("../../src/main");
    __resetSubjectSkinForTests?.();
    applySubjectResizeChange(id1 as number, 1.35);

    expect(listSubjectRecords().get(id1 as number)?.skin).toEqual({
      kind: "text", value: "A", scale: 1.35,
    });
    expect(listSubjectRecords().get(id2 as number)?.skin).toEqual({
      kind: "text", value: "B", scale: 1,
    });
  });

  it("an align change for a specific subjectId updates only that subject's align", async () => {
    const id1 = applySubjectDrop({
      skin: { kind: "text", value: "A", scale: 1, align: "center" },
      canvasPos: { x: 50, y: 50 },
      nowMs: 1,
    });

    const { applySubjectAlignChange } = await import("../../src/main");
    applySubjectAlignChange(id1 as number, "left");
    expect(listSubjectRecords().get(id1 as number)?.skin).toMatchObject({ align: "left" });
  });

  it("a formatting change for an unknown subjectId is a no-op", async () => {
    const id1 = applySubjectDrop({
      skin: { kind: "text", value: "A", scale: 1 },
      canvasPos: { x: 50, y: 50 },
      nowMs: 1,
    });
    const before = listSubjectRecords().get(id1 as number)?.skin;

    const { applySubjectFontChange } = await import("../../src/main");
    applySubjectFontChange(9999, "fraunces");

    expect(listSubjectRecords().get(id1 as number)?.skin).toEqual(before);
  });
});

describe("main.ts unlocked eye rotation targets the same subject as gaze lines", () => {
  it("pickUnlockedSubjectTarget matches the target selected by computeGazeLines for each eye", () => {
    const eyePos = { x: 50, y: 50 };
    const nearSubject = { id: 1, pos: { x: 60, y: 60 } };
    const farSubject = { id: 2, pos: { x: 500, y: 500 } };
    const subjects = [nearSubject, farSubject];
    const assistRadiusPx = 140;

    const gazeLines = computeGazeLines({
      eyes: [{ id: 7, pos: eyePos }],
      subjects,
      lockedSubjectId: null,
      assistRadiusPx,
      chargeT: 0,
    });
    expect(gazeLines.length).toBe(1);
    expect(gazeLines[0]!.x2).toBe(nearSubject.pos.x);
    expect(gazeLines[0]!.y2).toBe(nearSubject.pos.y);

    const target = pickUnlockedSubjectTarget(eyePos, subjects, assistRadiusPx);
    expect(target).not.toBeNull();
    expect(target?.id).toBe(nearSubject.id);
  });

  it("pickUnlockedSubjectTarget returns null when the nearest subject is outside assist radius", () => {
    const eyePos = { x: 50, y: 50 };
    const farSubject = { id: 2, pos: { x: 500, y: 500 } };
    const target = pickUnlockedSubjectTarget(eyePos, [farSubject], 140);
    expect(target).toBeNull();
  });
});
