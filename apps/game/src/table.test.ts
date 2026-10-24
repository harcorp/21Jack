import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { TableView, type Card, type Rank } from "@21jack/contracts";
import { createGameApp } from "./app";
import { createMockEngine, type MockEngine } from "./engine";
import { createMemoryStore } from "./store";

const KEY = "test-key";
const filler = Array.from({ length: 20 }, (): Card => ({ rank: "2", suit: "C" }));
const rig = (...ranks: Rank[]): Card[] => [...ranks.map((rank): Card => ({ rank, suit: "S" })), ...filler];
const T = "/tables/kings-hall";

describe("multiplayer table routes", () => {
  let engine: MockEngine;
  let app: ReturnType<typeof createGameApp>;
  let clock: number;
  let nextDeck: Card[];
  let A: string;
  let B: string;

  beforeEach(() => {
    engine = createMockEngine({ initialBalance: 100 });
    clock = 1_000_000;
    // A: 9+5, B: 8+6, dealer 7+K, then draws
    nextDeck = rig("9", "8", "7", "5", "6", "K", "6", "3");
    app = createGameApp({ engine, store: createMemoryStore(), serviceKey: KEY, shuffle: () => nextDeck, now: () => clock, log: () => {} });
    A = randomUUID();
    B = randomUUID();
  });

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await app.request(path, {
      method,
      headers: { "content-type": "application/json", "x-service-key": KEY },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = (await res.json()) as TableView & { error?: { code: string } };
    if (res.ok) TableView.parse(json);
    return { status: res.status, json };
  };
  const view = (id: string) => call("GET", `${T}?accountId=${id}`);
  const bet = (accountId: string, amount = 10, requestId: string = randomUUID()) => call("POST", `${T}/bet`, { accountId, bet: amount, requestId });
  const act = (accountId: string, action: string, handIndex = 0, actionId: string = randomUUID()) =>
    call("POST", `${T}/actions`, { accountId, action, handIndex, actionId });
  const seatBoth = async () => {
    await call("POST", `${T}/join`, { accountId: A, username: "alice" });
    await call("POST", `${T}/join`, { accountId: B, username: "bob" });
  };

  it("404s unknown tables and requires the service key", async () => {
    expect((await call("GET", "/tables/nope")).status).toBe(404);
    expect((await app.request(T)).status).toBe(401);
  });

  it("plays a two-player round in turn order and pays each hand exactly once", async () => {
    await seatBoth();
    expect((await view(B)).json.you.seat).toBe(1);
    const reqA = randomUUID();
    expect((await bet(A, 10, reqA)).json.phase).toBe("betting");
    await bet(A, 10, reqA); // retry: no second debit
    expect(engine.balances.get(A)).toBe(90);
    const dealt = await bet(B, 20);
    expect(dealt.json.phase).toBe("playing");
    expect(dealt.json.dealer.cards[1]).toEqual({ hidden: true });
    expect(dealt.json.you.allowedActions).toEqual([]);

    const out = await act(B, "hit");
    expect(out.status).toBe(409);
    expect(out.json.error?.code).toBe("INVALID_ACTION");

    const hitId = randomUUID();
    await act(A, "hit", 0, hitId); // 20
    await act(A, "hit", 0, hitId); // retry: no extra card
    expect((await view(A)).json.seats[0]!.hands[0]!.cards).toHaveLength(3);
    await act(A, "stand");
    expect((await view(B)).json.you.allowedActions).toContain("hit");
    await act(B, "hit"); // 17
    const settled = (await act(B, "stand")).json;
    expect(settled.phase).toBe("settled");
    expect(settled.dealer.total).toBe(17);
    expect(settled.seats[0]!.payout).toBe(20);
    expect(settled.seats[1]!.payout).toBe(20);
    expect(settled.boss).toMatchObject({ hp: 9, maxHp: 10, delta: -1 });

    await view(A);
    const payouts = engine.transactions.filter((t) => t.type === "payout");
    expect(payouts).toHaveLength(2);
    expect(payouts[0]!.metadata).toMatchObject({ multi: { tableId: "kings-hall", roundNumber: 1 } });
    expect(engine.balances.get(A)).toBe(110);
    expect(engine.balances.get(B)).toBe(100);
    expect((await view(A)).json.you.balance).toBe(110);

    clock += 6_000;
    const next = (await view(A)).json;
    expect(next.phase).toBe("waiting");
    expect(next.boss.hp).toBe(9);
    expect(next.seats[0]!.hands).toEqual([]);
  });

  it("closes the betting window on its deadline and auto-stands on turn timeout", async () => {
    await seatBoth();
    await bet(A);
    clock += 9_999;
    expect((await view(A)).json.phase).toBe("betting");
    clock += 1;
    const dealt = (await view(B)).json;
    expect(dealt.phase).toBe("playing");
    expect(dealt.seats[1]!.hands).toEqual([]);
    expect((await bet(B)).status).toBe(409);
    clock += 30_000;
    const after = (await view(A)).json;
    expect(after.phase).toBe("settled");
    expect(after.seats[0]!.hands[0]!.status).toBe("stood");
  });

  it("returns 402 without seating the bet when funds are short, and 409 when full", async () => {
    await seatBoth();
    const res = await bet(A, 500);
    expect(res.status).toBe(402);
    expect((await view(A)).json.phase).toBe("waiting");
    for (let i = 0; i < 3; i++) await call("POST", `${T}/join`, { accountId: randomUUID(), username: `p${i}` });
    expect((await call("POST", `${T}/join`, { accountId: randomUUID(), username: "late" })).status).toBe(409);
  });

  it("shares the King's damage across all hands", async () => {
    nextDeck = rig("A", "A", "9", "K", "K", "7");
    await seatBoth();
    await bet(A);
    const s = (await bet(B)).json;
    expect(s.phase).toBe("settled");
    expect(s.boss).toMatchObject({ hp: 6, delta: -4 });
  });
});
