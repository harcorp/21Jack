import { describe, expect, it } from "vitest";
import { createDeck, shuffle } from "./index";

const key = (c: { rank: string; suit: string }) => `${c.rank}${c.suit}`;

describe("deck", () => {
  it("creates 52 unique cards", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(key)).size).toBe(52);
  });
  it("shuffles without losing or duplicating cards", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled.map(key))).toEqual(new Set(deck.map(key)));
    expect(deck).toEqual(createDeck());
  });
  it("uses the injected rng (Fisher-Yates)", () => {
    const calls: number[] = [];
    const out = shuffle(createDeck(), (max) => {
      calls.push(max);
      return max - 1;
    });
    expect(calls[0]).toBe(52);
    expect(calls.at(-1)).toBe(2);
    expect(out).toEqual(createDeck());
    const reversedFirst = shuffle(createDeck(), () => 0);
    expect(key(reversedFirst[51]!)).toBe(key(createDeck()[0]!));
  });
});
