import { describe, expect, it } from "vitest";
import {
  allowedActions,
  applyAction,
  extraStakeFor,
  InvalidActionError,
  startRound,
  toRoundView,
  type RoundState,
} from "./index";
import { rigged } from "./test-helpers";
import type { Rank } from "@21jack/contracts";

const roundId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const start = (bet: number, ...ranks: Rank[]) => startRound({ deck: rigged(...ranks), bet, roundId, accountId });
const play = (state: RoundState, ...moves: [number, Parameters<typeof applyAction>[2]][]) =>
  moves.reduce((s, [i, a]) => applyAction(s, i, a), state);
const returned = (s: RoundState) => s.hands.reduce((sum, h) => sum + (h.payout ?? 0), 0);

describe("deal and naturals", () => {
  it("deals player, dealer, player, dealer and waits for the player", () => {
    const s = start(10, "9", "7", "5", "K");
    expect(s.hands[0]!.cards.map((c) => c.rank)).toEqual(["9", "5"]);
    expect(s.dealer.map((c) => c.rank)).toEqual(["7", "K"]);
    expect(s.phase).toBe("player_turn");
    expect(allowedActions(s, 0)).toEqual(["hit", "stand", "double"]);
  });
  it("player natural settles immediately as blackjack paying 2x", () => {
    const s = start(10, "A", "9", "K", "7");
    expect(s.phase).toBe("settled");
    expect(s.hands[0]).toMatchObject({ status: "blackjack", outcome: "blackjack", payout: 20 });
    expect(s.dealer).toHaveLength(2);
  });
  it("both naturals push", () => {
    const s = start(10, "A", "A", "K", "Q");
    expect(s.hands[0]).toMatchObject({ outcome: "push", payout: 10 });
  });
  it("dealer natural loses before any split/double", () => {
    const s = start(10, "8", "A", "8", "K");
    expect(s.phase).toBe("settled");
    expect(s.hands[0]).toMatchObject({ outcome: "loss", payout: 0 });
    expect(allowedActions(s, 0)).toEqual([]);
  });
});

describe("hit / stand / dealer", () => {
  it("bust loses immediately and dealer does not draw", () => {
    const s = play(start(10, "K", "7", "6", "9", "Q"), [0, "hit"]);
    expect(s.hands[0]).toMatchObject({ status: "bust", outcome: "loss", payout: 0 });
    expect(s.dealer).toHaveLength(2);
  });
  it("21 auto-finishes the hand", () => {
    const s = play(start(10, "5", "10", "6", "7", "K"), [0, "hit"]);
    expect(s.hands[0]!.status).toBe("twentyone");
    expect(s.phase).toBe("settled");
    expect(s.hands[0]!.outcome).toBe("win");
  });
  it("dealer draws below 17", () => {
    const s = play(start(10, "K", "5", "9", "6", "4", "3"), [0, "stand"]);
    expect(s.dealer.map((c) => c.rank)).toEqual(["5", "6", "4", "3"]);
    expect(s.hands[0]!.outcome).toBe("win");
  });
  it("dealer stands on soft 17", () => {
    const s = play(start(10, "K", "A", "7", "6"), [0, "stand"]);
    expect(s.dealer).toHaveLength(2);
    expect(s.hands[0]).toMatchObject({ outcome: "push", payout: 10 });
  });
  it("dealer bust pays the player", () => {
    const s = play(start(10, "K", "6", "2", "K", "9"), [0, "stand"]);
    expect(s.hands[0]).toMatchObject({ outcome: "win", payout: 20 });
  });
  it("loss pays 0", () => {
    const s = play(start(10, "K", "K", "7", "9"), [0, "stand"]);
    expect(s.hands[0]).toMatchObject({ outcome: "loss", payout: 0 });
  });
  it("rejects actions on a settled round or wrong hand", () => {
    const s = play(start(10, "K", "K", "7", "9"), [0, "stand"]);
    expect(() => applyAction(s, 0, "hit")).toThrow(InvalidActionError);
    const open = start(10, "9", "7", "5", "K");
    expect(() => applyAction(open, 1, "hit")).toThrow(InvalidActionError);
    expect(() => applyAction(open, 0, "split")).toThrow(InvalidActionError);
  });
  it("applyAction does not mutate the input state", () => {
    const s = start(10, "9", "7", "5", "K");
    const copy = structuredClone(s);
    applyAction(s, 0, "hit");
    expect(s).toEqual(copy);
  });
});

describe("double", () => {
  it("bet 10, 5+6 double and win returns 40", () => {
    const s0 = start(10, "5", "9", "6", "8", "K");
    expect(extraStakeFor(s0, 0, "double")).toBe(10);
    const s = play(s0, [0, "double"]);
    expect(s.hands[0]).toMatchObject({ stake: 20, status: "doubled", outcome: "win", payout: 40 });
    expect(s.hands[0]!.cards).toHaveLength(3);
  });
  it("doubled push returns 20 and doubled loss returns 0", () => {
    expect(play(start(10, "5", "10", "6", "8", "7"), [0, "double"]).hands[0]).toMatchObject({ outcome: "push", payout: 20 });
    expect(play(start(10, "5", "10", "6", "9", "2"), [0, "double"]).hands[0]).toMatchObject({ outcome: "loss", payout: 0 });
  });
  it("is not allowed after a hit", () => {
    const s = play(start(10, "2", "9", "3", "8", "4"), [0, "hit"]);
    expect(allowedActions(s, 0)).toEqual(["hit", "stand"]);
    expect(() => extraStakeFor(s, 0, "double")).toThrow(InvalidActionError);
  });
});

describe("split", () => {
  it("8+8 split: left plays first, one win one loss returns 20", () => {
    const s0 = start(10, "8", "10", "8", "7", "3", "K");
    expect(allowedActions(s0, 0)).toContain("split");
    expect(extraStakeFor(s0, 0, "split")).toBe(10);
    const s1 = play(s0, [0, "split"]);
    expect(s1.hands.map((h) => h.cards.map((c) => c.rank))).toEqual([["8", "3"], ["8", "K"]]);
    expect(s1.activeHandIndex).toBe(0);
    expect(allowedActions(s1, 1)).toEqual([]);
    expect(allowedActions(s1, 0)).toEqual(["hit", "stand", "double"]);
    const s = play(s1, [0, "stand"], [1, "stand"]);
    expect(s.hands.map((h) => h.outcome)).toEqual(["loss", "win"]);
    expect(returned(s)).toBe(20);
  });
  it("K+Q cannot split and no re-split is allowed", () => {
    expect(allowedActions(start(10, "K", "9", "Q", "8"), 0)).not.toContain("split");
    const s = play(start(10, "8", "10", "8", "8", "8", "K"), [0, "split"]);
    expect(allowedActions(s, 0)).toEqual(["hit", "stand", "double"]);
  });
  it("double after split: left stake 20, right stays 10", () => {
    const s = play(start(10, "8", "10", "8", "7", "3", "K", "9"), [0, "split"], [0, "double"], [1, "stand"]);
    expect(s.hands.map((h) => h.stake)).toEqual([20, 10]);
    expect(s.hands.map((h) => h.status)).toEqual(["doubled", "stood"]);
    expect(s.hands.map((h) => h.outcome)).toEqual(["win", "win"]);
    expect(returned(s)).toBe(60);
  });
  it("split aces get one card each, auto-stand, A+10 is 21 not blackjack", () => {
    const s = play(start(10, "A", "9", "A", "8", "K", "5"), [0, "split"]);
    expect(s.phase).toBe("settled");
    expect(s.hands[0]).toMatchObject({ splitAces: true, status: "twentyone", outcome: "win", payout: 20 });
    expect(s.hands[1]).toMatchObject({ splitAces: true, status: "stood", outcome: "loss", payout: 0 });
    expect(s.hands.every((h) => h.cards.length === 2)).toBe(true);
  });
  it("a 21 on the left after split moves play to the right hand", () => {
    const s = play(start(10, "K", "9", "K", "8", "A", "5"), [0, "split"]);
    expect(s.hands[0]!.status).toBe("twentyone");
    expect(s.activeHandIndex).toBe(1);
  });
  it("dealer does not draw when every hand busted, and settles each hand vs the same dealer", () => {
    const s = play(start(10, "8", "6", "8", "5", "6", "6", "K", "K"), [0, "split"], [0, "hit"], [1, "hit"]);
    expect(s.hands.map((h) => h.status)).toEqual(["bust", "bust"]);
    expect(s.dealer).toHaveLength(2);
    expect(returned(s)).toBe(0);
  });
});

describe("toRoundView", () => {
  it("hides the hole card and dealer total until settled and never exposes the deck", () => {
    const s = start(10, "9", "7", "5", "K");
    const v = toRoundView(s, 90);
    expect(v.dealer).toEqual({ cards: [{ rank: "7", suit: "S" }, { hidden: true }], total: null });
    expect(JSON.stringify(v)).not.toContain("deck");
    expect(v.hands[0]).toMatchObject({ handId: `${roundId}:0`, total: 14, allowedActions: ["hit", "stand", "double"] });
    expect(v.activeHandIndex).toBe(0);
    expect(v.balance).toBe(90);
  });
  it("reveals everything once settled", () => {
    const v = toRoundView(play(start(10, "K", "K", "7", "9"), [0, "stand"]), 90);
    expect(v.status).toBe("settled");
    expect(v.dealer.total).toBe(19);
    expect(v.dealer.cards).toHaveLength(2);
    expect(v.hands[0]).toMatchObject({ outcome: "loss", payout: 0, allowedActions: [] });
  });
});
