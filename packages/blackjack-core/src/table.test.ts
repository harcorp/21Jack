import { describe, expect, it } from "vitest";
import type { Rank } from "@21jack/contracts";
import {
  applyTableAction,
  createTable,
  joinTable,
  leaveTable,
  MULTI_BOSS_MAX_HP,
  placeTableBet,
  tableExtraStake,
  TableError,
  tickTable,
  toTableView,
  type TableState,
} from "./table";
import { rigged } from "./test-helpers";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const RA = "10000000-0000-4000-8000-00000000000a";
const RB = "10000000-0000-4000-8000-00000000000b";

/** Two seats; deal order: A, B, dealer up, A, B, dealer hole, then draws. */
function twoBet(...ranks: Rank[]): TableState {
  let s = joinTable(joinTable(createTable("t"), A, "alice"), B, "bob");
  s = placeTableBet(s, { accountId: A, bet: 10, seatRoundId: RA, now: 0 });
  s = placeTableBet(s, { accountId: B, bet: 20, seatRoundId: RB, now: 1 });
  return tickTable(s, 2, () => rigged(...ranks));
}

describe("shared table", () => {
  it("seats players in the lowest free seat, idempotently, and rejects a full table", () => {
    let s = createTable("t");
    s = joinTable(s, A, "alice");
    expect(joinTable(s, A, "alice")).toBe(s);
    for (let i = 1; i < 5; i++) s = joinTable(s, `00000000-0000-4000-8000-00000000000${i}`, `p${i}`);
    expect(() => joinTable(s, B, "bob")).toThrow(TableError);
    s = leaveTable(s, "00000000-0000-4000-8000-000000000002", 0);
    s = joinTable(s, B, "bob");
    expect(s.seats[2]?.accountId).toBe(B);
  });

  it("opens betting on the first bet and deals once everyone seated has bet", () => {
    let s = joinTable(joinTable(createTable("t"), A, "alice"), B, "bob");
    s = placeTableBet(s, { accountId: A, bet: 10, seatRoundId: RA, now: 0 });
    expect(s.phase).toBe("betting");
    expect(s.deadline).toBe(10_000);
    expect(tickTable(s, 5_000, () => rigged()).phase).toBe("betting");
    const dealt = tickTable(s, 10_000, () => rigged("9", "7", "5", "K"));
    expect(dealt.phase).toBe("playing");
    expect(dealt.seats[1]!.hands).toEqual([]);
    expect(twoBet("9", "8", "7", "5", "6", "K").turn).toEqual({ seat: 0, handIndex: 0 });
  });

  it("plays seats in order, rejects out-of-turn moves and settles against one dealer hand", () => {
    // A: 9+5=14, B: 8+6=14, dealer 7+K=17
    let s = twoBet("9", "8", "7", "5", "6", "K", "6", "3");
    const view = toTableView(s, { accountId: B, balance: null });
    expect(view.dealer.cards[1]).toEqual({ hidden: true });
    expect(view.you.allowedActions).toEqual([]);
    expect(() => tableExtraStake(s, B, 0, "hit")).toThrow(/not your turn/);
    s = applyTableAction(s, { accountId: A, handIndex: 0, action: "hit", now: 3 }); // 20
    s = applyTableAction(s, { accountId: A, handIndex: 0, action: "stand", now: 3 });
    expect(s.turn).toEqual({ seat: 1, handIndex: 0 });
    s = applyTableAction(s, { accountId: B, handIndex: 0, action: "hit", now: 4 }); // 17
    s = applyTableAction(s, { accountId: B, handIndex: 0, action: "stand", now: 4 });
    expect(s.phase).toBe("settled");
    const [a, b] = [s.seats[0]!.hands[0]!, s.seats[1]!.hands[0]!];
    expect([a.outcome, a.payout]).toEqual(["win", 20]);
    expect([b.outcome, b.payout]).toEqual(["push", 20]);
    expect(s.boss.hp).toBe(MULTI_BOSS_MAX_HP - 1);
    expect(toTableView(s, { accountId: A, balance: 5 }).dealer.total).toBe(17);
  });

  it("auto-stands on turn timeout and resets after results once paid", () => {
    let s = twoBet("9", "8", "7", "5", "6", "K");
    s = tickTable(s, 2 + 30_000, () => rigged());
    expect(s.turn).toEqual({ seat: 1, handIndex: 0 });
    s = tickTable(s, 2 + 60_000, () => rigged());
    expect(s.phase).toBe("settled");
    expect(tickTable(s, 2 + 70_000, () => rigged()).phase).toBe("settled");
    for (const seat of s.seats) for (const h of seat?.hands ?? []) h.paid = true;
    const next = tickTable(s, 2 + 70_000, () => rigged());
    expect(next.phase).toBe("waiting");
    expect(next.seats[0]!.bet).toBeNull();
  });

  it("dealer natural resolves every seat immediately", () => {
    const s = twoBet("A", "9", "A", "K", "7", "K");
    expect(s.phase).toBe("settled");
    expect(s.seats[0]!.hands[0]!.outcome).toBe("push");
    expect(s.seats[1]!.hands[0]!.outcome).toBe("loss");
  });

  it("supports split and double on a seat, and leaving mid-turn auto-stands", () => {
    // A: 8,8 ; B: 5,6 ; dealer 10,7
    let s = twoBet("8", "5", "10", "8", "6", "7", "3", "2", "K");
    expect(tableExtraStake(s, A, 0, "split")).toBe(10);
    s = applyTableAction(s, { accountId: A, handIndex: 0, action: "split", now: 3 });
    expect(s.seats[0]!.hands.map((h) => h.cards.length)).toEqual([2, 2]);
    s = applyTableAction(s, { accountId: A, handIndex: 0, action: "stand", now: 3 });
    expect(s.turn).toEqual({ seat: 0, handIndex: 1 });
    s = leaveTable(s, A, 4);
    expect(s.seats[0]).toBeNull();
    expect(s.departed[0]!.hands.every((h) => h.status === "stood")).toBe(true);
    expect(s.turn).toEqual({ seat: 1, handIndex: 0 });
    s = applyTableAction(s, { accountId: B, handIndex: 0, action: "double", now: 5 });
    expect(s.phase).toBe("settled");
    expect(s.departed[0]!.hands.every((h) => h.outcome)).toBe(true);
  });
});
