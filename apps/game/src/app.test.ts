import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Card, Rank, RoundView } from "@21jack/contracts";
import { createGameApp } from "./app";
import { createMockEngine, type MockEngine } from "./engine";
import { createMemoryStore, createPgliteStore, type RoundStore } from "./store";

const KEY = "test-key";
const filler = Array.from({ length: 20 }, (): Card => ({ rank: "2", suit: "C" }));
const rig = (...ranks: Rank[]): Card[] => [...ranks.map((rank): Card => ({ rank, suit: "S" })), ...filler];

const stores: [string, () => Promise<RoundStore>][] = [
  ["memory store", async () => createMemoryStore()],
  ["pglite store", () => createPgliteStore()],
];

describe.each(stores)("game service (%s)", (_name, makeStore) => {
  let store: RoundStore;
  let engine: MockEngine;
  let nextDeck: Card[];
  let app: ReturnType<typeof createGameApp>;
  let accountId: string;
  const opened: RoundStore[] = [];

  beforeEach(async () => {
    store = await makeStore();
    opened.push(store);
    engine = createMockEngine({ initialBalance: 100 });
    nextDeck = rig("9", "7", "5", "K");
    app = createGameApp({ engine, store, serviceKey: KEY, shuffle: () => nextDeck, log: () => {} });
    accountId = randomUUID();
  });
  afterAll(async () => {
    await Promise.all(opened.map((s) => s.close()));
  });

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await app.request(path, {
      method,
      headers: { "content-type": "application/json", "x-service-key": KEY },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, json: (await res.json()) as RoundView & { error?: { code: string } } };
  };
  const startRound = (bet = 10, requestId: string = randomUUID()) =>
    call("POST", "/rounds", { accountId, bet, requestId });
  const act = (roundId: string, action: string, handIndex = 0, actionId: string = randomUUID()) =>
    call("POST", `/rounds/${roundId}/actions`, { action, handIndex, actionId });
  const balance = () => engine.balances.get(accountId);

  it("rejects calls without the service key and validates bodies", async () => {
    expect((await app.request("/rounds/active?accountId=" + accountId)).status).toBe(401);
    const bad = await call("POST", "/rounds", { accountId, bet: -1, requestId: "x" });
    expect(bad.status).toBe(400);
    expect(bad.json.error?.code).toBe("VALIDATION_ERROR");
    expect((await call("GET", `/rounds/${randomUUID()}`)).status).toBe(404);
  });

  it("plays a full hit/stand round, hides the hole card and pays exactly once", async () => {
    nextDeck = rig("9", "7", "5", "K", "4");
    const started = await startRound(10);
    expect(started.status).toBe(200);
    expect(started.json.dealer).toEqual({ cards: [{ rank: "7", suit: "S" }, { hidden: true }], total: null });
    expect(JSON.stringify(started.json)).not.toContain('"K"');
    expect(started.json.balance).toBe(90);

    const id = started.json.roundId;
    expect((await call("GET", `/rounds/active?accountId=${accountId}`)).json.roundId).toBe(id);
    const hit = await act(id, "hit");
    expect(hit.json.hands[0]!.total).toBe(18);
    const stood = await act(id, "stand");
    expect(stood.json.status).toBe("settled");
    expect(stood.json.dealer.total).toBe(17);
    expect(stood.json.hands[0]).toMatchObject({ outcome: "win", payout: 20 });
    expect(stood.json.balance).toBe(110);
    expect(balance()).toBe(110);

    await call("GET", `/rounds/${id}`);
    const again = await act(id, "hit");
    expect(again.status).toBe(409);
    expect(again.json.error?.code).toBe("ROUND_SETTLED");
    expect(engine.transactions.filter((t) => t.type === "payout")).toHaveLength(1);
    expect((await call("GET", `/rounds/active?accountId=${accountId}`)).status).toBe(404);
  });

  it("same requestId twice deals once and debits once; a second open round conflicts", async () => {
    const requestId = randomUUID();
    const placeBet = vi.spyOn(engine, "placeBet");
    const a = await startRound(10, requestId);
    nextDeck = rig("2", "3", "4", "5");
    const b = await startRound(10, requestId);
    expect(b.json).toEqual(a.json);
    expect(balance()).toBe(90);
    expect(placeBet).toHaveBeenCalledTimes(1);
    const other = await startRound(10);
    expect(other.status).toBe(409);
    expect(other.json.error?.code).toBe("CONFLICT");
  });

  it("insufficient funds on start persists nothing", async () => {
    const res = await startRound(500);
    expect(res.status).toBe(402);
    expect(res.json.error?.code).toBe("INSUFFICIENT_FUNDS");
    expect((await call("GET", `/rounds/active?accountId=${accountId}`)).status).toBe(404);
  });

  it("same actionId twice draws no extra card and debits once", async () => {
    nextDeck = rig("5", "9", "6", "7", "2", "K");
    const id = (await startRound(10)).json.roundId;
    const actionId = randomUUID();
    const first = await act(id, "hit", 0, actionId);
    const second = await act(id, "hit", 0, actionId);
    expect(second.json).toEqual(first.json);
    expect(second.json.hands[0]!.cards).toHaveLength(3);

    const doubleId = randomUUID();
    nextDeck = rig();
    const d1 = await call("POST", "/rounds", { accountId: randomUUID(), bet: 10, requestId: randomUUID() });
    const d2 = await act(d1.json.roundId, "double", 0, doubleId);
    const d3 = await act(d1.json.roundId, "double", 0, doubleId);
    expect(d3.json).toEqual(d2.json);
    expect(engine.transactions.filter((t) => t.kind === "double")).toHaveLength(1);
    expect(engine.transactions.filter((t) => t.type === "payout" && t.roundId === d1.json.roundId)).toHaveLength(1);
  });

  it("insufficient funds on double or split leaves the round unchanged", async () => {
    engine.balances.set(accountId, 15);
    nextDeck = rig("8", "9", "8", "7", "3", "K");
    const start = await startRound(10);
    const id = start.json.roundId;
    expect(start.json.hands[0]!.allowedActions).toEqual(["hit", "stand", "double", "split"]);
    for (const action of ["double", "split"]) {
      const res = await act(id, action);
      expect(res.status).toBe(402);
      expect(res.json.error?.code).toBe("INSUFFICIENT_FUNDS");
    }
    expect((await call("GET", `/rounds/${id}`)).json).toEqual(start.json);
    expect(balance()).toBe(5);
    expect((await store.getRound(id))!.version).toBe(1);
    const stand = await act(id, "stand");
    expect(stand.json.hands[0]!.outcome).toBe("loss");
  });

  it("split then double debits the right hands with the right keys", async () => {
    nextDeck = rig("8", "10", "8", "7", "3", "K", "9");
    const id = (await startRound(10)).json.roundId;
    const split = await act(id, "split");
    expect(split.json.hands).toHaveLength(2);
    expect(split.json.activeHandIndex).toBe(0);
    expect((await act(id, "hit", 1)).status).toBe(409);
    await act(id, "double", 0);
    const done = await act(id, "stand", 1);
    expect(done.json.hands.map((h) => h.stake)).toEqual([20, 10]);
    expect(done.json.hands.map((h) => h.outcome)).toEqual(["win", "win"]);
    const bets = engine.transactions.filter((t) => t.type === "bet");
    expect(bets.map((t) => [t.kind, t.handId])).toEqual([
      ["initial", `${id}:0`],
      ["split", `${id}:1`],
      ["double", `${id}:0`],
    ]);
    expect(balance()).toBe(100 - 30 + 60);
  });

  it("split aces get one card each and settle at once", async () => {
    nextDeck = rig("A", "9", "A", "8", "K", "5");
    const id = (await startRound(10)).json.roundId;
    const res = await act(id, "split");
    expect(res.json.status).toBe("settled");
    expect(res.json.hands.map((h) => [h.splitAces, h.cards.length, h.total, h.outcome])).toEqual([
      [true, 2, 21, "win"],
      [true, 2, 16, "loss"],
    ]);
    expect(engine.transactions.filter((t) => t.type === "payout").map((t) => t.amount)).toEqual([20, 0]);
    expect(balance()).toBe(100);
  });

  it("natural blackjack settles at start and pays 2x", async () => {
    nextDeck = rig("A", "9", "K", "7");
    const res = await startRound(10);
    expect(res.json.status).toBe("settled");
    expect(res.json.hands[0]).toMatchObject({ status: "blackjack", outcome: "blackjack", payout: 20 });
    expect(res.json.dealer.cards).toHaveLength(2);
    expect(res.json.balance).toBe(110);
    expect((await call("GET", `/rounds/active?accountId=${accountId}`)).status).toBe(404);
  });

  it("failed payouts are retried later without paying twice", async () => {
    nextDeck = rig("K", "7", "Q", "9");
    const id = (await startRound(10)).json.roundId;
    const payout = vi.spyOn(engine, "payout").mockRejectedValueOnce(new Error("engine down"));
    const stood = await act(id, "stand");
    expect(stood.json.status).toBe("settled");
    expect((await store.getRound(id))!.closed).toBe(false);
    expect((await startRound(10)).status).toBe(200);
    expect((await store.getRound(id))!.closed).toBe(true);
    expect(payout).toHaveBeenCalledTimes(2);
    expect(engine.transactions.filter((t) => t.type === "payout" && t.roundId === id)).toHaveLength(1);
  });

  describe("coach mode", () => {
    const startCoached = (coach?: boolean) =>
      call("POST", "/rounds", { accountId, bet: 10, requestId: randomUUID(), ...(coach !== undefined ? { coach } : {}) });

    it("is off by default and when coach is false", async () => {
      expect((await startCoached()).json).not.toHaveProperty("coach");
      const other = await call("POST", "/rounds", { accountId: randomUUID(), bet: 10, requestId: randomUUID(), coach: false });
      expect(other.json).not.toHaveProperty("coach");
      const hit = await act(other.json.roundId, "hit");
      expect(hit.json).not.toHaveProperty("coach");
      expect((await store.getRound(other.json.roundId))!.state.coachHistory).toBeUndefined();
    });

    it("advises on start, records each move once and scores at settlement", async () => {
      nextDeck = rig("10", "K", "6", "7", "2", "K");
      const started = await startCoached(true);
      expect(started.json.coach).toEqual({
        recommended: "hit",
        reason: "Hard 16 against a 10: the King likely holds 20. Hit.",
        history: [],
        score: { matched: 0, total: 0 },
      });

      const id = started.json.roundId;
      const actionId = randomUUID();
      const hit = await act(id, "hit", 0, actionId);
      expect(hit.json.hands[0]!.total).toBe(18);
      expect(hit.json.coach).toMatchObject({
        recommended: "stand",
        history: [{ action: "hit", recommended: "hit", matched: true }],
        score: { matched: 1, total: 1 },
      });
      expect((await act(id, "hit", 0, actionId)).json).toEqual(hit.json);

      const done = await act(id, "hit");
      expect(done.json.status).toBe("settled");
      expect(done.json.coach).toEqual({
        recommended: null,
        reason: null,
        history: [
          { action: "hit", recommended: "hit", matched: true },
          { action: "hit", recommended: "stand", matched: false },
        ],
        score: { matched: 1, total: 2 },
      });
      expect((await call("GET", `/rounds/${id}`)).json.coach).toEqual(done.json.coach);
    });

    it("rounds stored without the flag read as coach off", async () => {
      const id = (await startCoached(true)).json.roundId;
      const round = (await store.getRound(id))!;
      const { coach: _c, coachHistory: _h, ...legacy } = round.state;
      await store.updateRound({ ...round, state: legacy, version: round.version + 1 }, round.version);
      expect((await call("GET", `/rounds/${id}`)).json).not.toHaveProperty("coach");
    });
  });

  describe("boss fight", () => {
    const boss = async () => (await call("GET", `/boss?accountId=${accountId}`)).json as unknown as Record<string, unknown>;
    const natural = () => {
      nextDeck = rig("A", "9", "K", "7");
      return startRound(10);
    };

    it("starts at max hp and shows it on open rounds", async () => {
      expect(await boss()).toEqual({ hp: 5, maxHp: 5, delta: 0, defeated: false, defeats: 0 });
      const open = await startRound(10);
      expect(open.json.boss).toEqual({ hp: 5, maxHp: 5, delta: 0, defeated: false, defeats: 0 });
      expect((await call("GET", "/boss?accountId=nope")).status).toBe(400);
    });

    it("win damages 1 and sends boss metadata on the payout", async () => {
      nextDeck = rig("K", "7", "Q", "9");
      const id = (await startRound(10)).json.roundId;
      const res = await act(id, "stand");
      expect(res.json.boss).toEqual({ hp: 4, maxHp: 5, delta: -1, defeated: false, defeats: 0 });
      const payout = engine.transactions.find((t) => t.type === "payout" && t.roundId === id);
      expect(payout?.metadata).toEqual({ boss: { damage: -1, hpAfter: 4, defeated: false } });
      expect((await boss()).hp).toBe(4);
    });

    it("blackjack damages 2 and loss heals 1 capped at max", async () => {
      expect((await natural()).json.boss).toMatchObject({ hp: 3, delta: -2 });
      nextDeck = rig("K", "K", "7", "9");
      const id = (await startRound(10)).json.roundId;
      expect((await act(id, "stand")).json.boss).toMatchObject({ hp: 4, delta: 1 });
      nextDeck = rig("K", "K", "7", "9");
      const id2 = (await startRound(10)).json.roundId;
      expect((await act(id2, "stand")).json.boss).toMatchObject({ hp: 5, delta: 1 });
      nextDeck = rig("K", "K", "7", "9");
      const id3 = (await startRound(10)).json.roundId;
      expect((await act(id3, "stand")).json.boss).toMatchObject({ hp: 5, delta: 0 });
    });

    it("defeat shows hp 0 on that round, counts a defeat and resets to max", async () => {
      await natural();
      await natural();
      const final = await natural();
      expect(final.json.boss).toEqual({ hp: 0, maxHp: 5, delta: -1, defeated: true, defeats: 1 });
      const payout = engine.transactions.find((t) => t.type === "payout" && t.roundId === final.json.roundId);
      expect(payout?.metadata).toEqual({ boss: { damage: -1, hpAfter: 0, defeated: true } });
      expect(await boss()).toEqual({ hp: 5, maxHp: 5, delta: 0, defeated: false, defeats: 1 });
      expect((await call("GET", `/rounds/${final.json.roundId}`)).json.boss).toMatchObject({ hp: 0, defeated: true });
    });

    it("retries and payout failures never apply damage twice", async () => {
      nextDeck = rig("K", "7", "Q", "9");
      const id = (await startRound(10)).json.roundId;
      vi.spyOn(engine, "payout").mockRejectedValueOnce(new Error("engine down"));
      const actionId = randomUUID();
      await act(id, "stand", 0, actionId);
      await call("GET", `/rounds/${id}`);
      const retried = await act(id, "stand", 0, actionId);
      expect(retried.json.boss).toMatchObject({ hp: 4, delta: -1 });
      await act(id, "stand");
      await call("GET", `/rounds/${id}`);
      expect((await boss()).hp).toBe(4);
      const payouts = engine.transactions.filter((t) => t.type === "payout" && t.roundId === id);
      expect(payouts).toHaveLength(1);
    });
  });
});
