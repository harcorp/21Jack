import { describe, expect, it } from "vitest";
import { recommend } from "./index";
import { c, cards } from "./test-helpers";

const all = ["hit", "stand", "double", "split"] as const;
const noSplit = ["hit", "stand", "double"] as const;

describe("recommend (S17 basic strategy)", () => {
  it("hard 16 vs 10 -> hit", () => expect(recommend(cards("10", "6"), c("K"), [...noSplit])).toBe("hit"));
  it("11 vs 6 -> double", () => expect(recommend(cards("5", "6"), c("6"), [...noSplit])).toBe("double"));
  it("8,8 -> split", () => expect(recommend(cards("8", "8"), c("10"), [...all])).toBe("split"));
  it("soft 18 vs 9 -> hit", () => expect(recommend(cards("A", "7"), c("9"), [...noSplit])).toBe("hit"));
  it("hard 13 vs 4 -> stand", () => expect(recommend(cards("10", "3"), c("4"), [...noSplit])).toBe("stand"));
  it("falls back when double is not allowed", () => {
    expect(recommend(cards("5", "3", "3"), c("6"), ["hit", "stand"])).toBe("hit");
    expect(recommend(cards("A", "7"), c("4"), ["hit", "stand"])).toBe("stand");
  });
  it("falls back when split is not allowed (8,8 after split -> hard 16)", () => {
    expect(recommend(cards("8", "8"), c("10"), [...noSplit])).toBe("hit");
    expect(recommend(cards("8", "8"), c("5"), [...noSplit])).toBe("stand");
  });
  it("K+Q is hard 20 -> stand", () => expect(recommend(cards("K", "Q"), c("6"), [...noSplit])).toBe("stand"));
  it("returns null when no action is available", () => expect(recommend(cards("A", "K"), c("6"), [])).toBeNull());
});
