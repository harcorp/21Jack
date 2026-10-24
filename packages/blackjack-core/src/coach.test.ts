import { describe, expect, it } from "vitest";
import { applyAction, coachViewFor, explain, recordCoach, startRound } from "./index";
import { c, cards, rigged } from "./test-helpers";

describe("explain", () => {
  it("hard 16 vs 10 -> hit", () =>
    expect(explain(cards("10", "6"), c("K"), "hit")).toBe("Hard 16 against a 10: the King likely holds 20. Hit."));
  it("soft 18 vs 9 -> hit", () =>
    expect(explain(cards("A", "7"), c("9"), "hit")).toBe("Soft 18 against a 9 is weaker than it looks. Hit."));
  it("8s -> split", () =>
    expect(explain(cards("8", "8"), c("10"), "split")).toBe("Always split 8s: two chances beat one bad 16."));
  it("11 vs 6 -> double", () =>
    expect(explain(cards("5", "6"), c("6"), "double")).toBe("11 against a 6: double and strike while he is weak."));
  it("covers stand and aces", () => {
    expect(explain(cards("10", "3"), c("4"), "stand")).toBe("Hard 13 against a 4: let the King risk the bust. Stand.");
    expect(explain(cards("10", "6"), c("A"), "hit")).toContain("against an Ace");
    expect(explain(cards("A", "A"), c("6"), "split")).toMatch(/^Always split Aces/);
  });
});

describe("coach state", () => {
  it("is off by default and on when requested", () => {
    const base = { deck: rigged("10", "K", "6", "7"), bet: 10, roundId: "r", accountId: "a" };
    expect(coachViewFor(startRound(base))).toBeUndefined();
    const view = coachViewFor(startRound({ ...base, coach: true }));
    expect(view).toEqual({
      recommended: "hit",
      reason: "Hard 16 against a 10: the King likely holds 20. Hit.",
      history: [],
      score: { matched: 0, total: 0 },
    });
  });

  it("records moves before they are applied and clears the hint at settlement", () => {
    const s0 = startRound({ deck: rigged("10", "K", "6", "7"), bet: 10, roundId: "r", accountId: "a", coach: true });
    const s1 = applyAction(recordCoach(s0, 0, "stand"), 0, "stand");
    expect(coachViewFor(s1)).toEqual({
      recommended: null,
      reason: null,
      history: [{ action: "stand", recommended: "hit", matched: false }],
      score: { matched: 0, total: 1 },
    });
  });
});
