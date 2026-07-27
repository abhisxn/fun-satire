import { describe, it, expect } from "vitest";
import {
  selectCollectiveContributors,
  type CollectiveCrowdMember,
} from "../../src/effects/collectiveContributors";

const m = (id: number, x: number, y: number): CollectiveCrowdMember => ({ id, pos: { x, y } });

describe("effects/collectiveContributors", () => {
  describe("archetype: beam", () => {
    it("selects from the entire crowd with no distance filter", () => {
      const crowd = [
        m(1, 0, 0),
        m(2, 1000, 1000),
        m(3, 5000, 5000),
        m(4, -200, -200),
      ];
      const result = selectCollectiveContributors({
        crowd,
        targetPos: { x: 0, y: 0 },
        archetype: "beam",
        maxContributors: 10,
      });
      expect(result.map((c) => c.id)).toEqual([1, 2, 3, 4]);
    });

    it("returns every member regardless of distance from target", () => {
      const crowd = [m(1, 99999, 99999), m(2, -99999, -99999)];
      const result = selectCollectiveContributors({
        crowd,
        targetPos: { x: 0, y: 0 },
        archetype: "beam",
        maxContributors: 50,
      });
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe(1);
      expect(result[1]!.id).toBe(2);
    });

    it("respects the maxContributors cap", () => {
      const crowd = Array.from({ length: 100 }, (_, i) => m(i + 1, i * 10, 0));
      const result = selectCollectiveContributors({
        crowd,
        targetPos: { x: 0, y: 0 },
        archetype: "beam",
        maxContributors: 7,
      });
      expect(result).toHaveLength(7);
      expect(result.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe("archetype: arc", () => {
    it("filters by isWithinBurnAssistRange (radius=100)", () => {
      const crowd = [
        m(1, 0, 0),
        m(2, 50, 0),
        m(3, 100, 0),
        m(4, 101, 0),
        m(5, 0, 200),
      ];
      const result = selectCollectiveContributors({
        crowd,
        targetPos: { x: 0, y: 0 },
        archetype: "arc",
        maxContributors: 10,
        assistRadiusPx: 100,
      });
      const ids = result.map((c) => c.id);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
      expect(ids).toContain(3);
      expect(ids).not.toContain(4);
      expect(ids).not.toContain(5);
    });

    it("boundary is inclusive at the assist radius", () => {
      const crowd = [m(1, 100, 0)];
      const result = selectCollectiveContributors({
        crowd,
        targetPos: { x: 0, y: 0 },
        archetype: "arc",
        maxContributors: 10,
        assistRadiusPx: 100,
      });
      expect(result.map((c) => c.id)).toEqual([1]);
    });

    it("respects the maxContributors cap after filtering", () => {
      const crowd = Array.from({ length: 20 }, (_, i) => m(i + 1, i, 0));
      const result = selectCollectiveContributors({
        crowd,
        targetPos: { x: 0, y: 0 },
        archetype: "arc",
        maxContributors: 5,
        assistRadiusPx: 100,
      });
      expect(result).toHaveLength(5);
    });
  });

  describe("archetype: bite", () => {
    it("also filters by isWithinBurnAssistRange", () => {
      const crowd = [m(1, 0, 0), m(2, 200, 200)];
      const result = selectCollectiveContributors({
        crowd,
        targetPos: { x: 0, y: 0 },
        archetype: "bite",
        maxContributors: 10,
        assistRadiusPx: 100,
      });
      expect(result.map((c) => c.id)).toEqual([1]);
    });
  });

  describe("edge cases", () => {
    it("returns an empty array when maxContributors <= 0", () => {
      const crowd = [m(1, 0, 0), m(2, 50, 0)];
      expect(
        selectCollectiveContributors({
          crowd,
          targetPos: { x: 0, y: 0 },
          archetype: "beam",
          maxContributors: 0,
        }),
      ).toEqual([]);
      expect(
        selectCollectiveContributors({
          crowd,
          targetPos: { x: 0, y: 0 },
          archetype: "beam",
          maxContributors: -1,
        }),
      ).toEqual([]);
    });

    it("returns an empty array when the crowd is empty", () => {
      expect(
        selectCollectiveContributors({
          crowd: [],
          targetPos: { x: 0, y: 0 },
          archetype: "beam",
          maxContributors: 10,
        }),
      ).toEqual([]);
    });

    it("Contributor rows expose the original id and a position", () => {
      const crowd = [m(42, 7, 8)];
      const [first] = selectCollectiveContributors({
        crowd,
        targetPos: { x: 0, y: 0 },
        archetype: "beam",
        maxContributors: 1,
      });
      expect(first).toEqual({ id: 42, pos: { x: 7, y: 8 } });
    });
  });
});
