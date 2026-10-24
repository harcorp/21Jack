import { describe, expect, it } from "vitest";
import { handValue, isBlackjack, isPair } from "./index";
import { cards } from "./test-helpers";

describe("handValue", () => {
  it("counts ace + 6 as soft 17", () => {
    expect(handValue(cards("A", "6"))).toEqual({ total: 17, soft: true });
  });
  it("turns soft 17 + 10 into hard 17", () => {
    expect(handValue(cards("A", "6", "K"))).toEqual({ total: 17, soft: false });
  });
  it("counts multiple aces flexibly", () => {
    expect(handValue(cards("A", "A"))).toEqual({ total: 12, soft: true });
    expect(handValue(cards("A", "A", "9"))).toEqual({ total: 21, soft: true });
    expect(handValue(cards("A", "A", "K", "9"))).toEqual({ total: 21, soft: false });
  });
  it("detects bust totals", () => {
    expect(handValue(cards("K", "Q", "5")).total).toBe(25);
  });
});

describe("isBlackjack / isPair", () => {
  it("is a natural only with two cards and not from split", () => {
    expect(isBlackjack(cards("A", "K"))).toBe(true);
    expect(isBlackjack(cards("A", "K"), true)).toBe(false);
    expect(isBlackjack(cards("7", "7", "7"))).toBe(false);
  });
  it("pairs need the same rank (K+Q is not a pair)", () => {
    expect(isPair(cards("8", "8"))).toBe(true);
    expect(isPair(cards("K", "Q"))).toBe(false);
    expect(isPair(cards("8", "8", "8"))).toBe(false);
  });
});
