import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handIdFor, idempotencyKeys, type Account, type BetKind, type HandOutcome, type MoneyResponse } from "@21jack/contracts";
import { createEngineApp } from "./app";
import { createMemoryDb, type Db } from "./db";

const KEY = "test-key";
let db: Db;
let app: ReturnType<typeof createEngineApp>;

beforeEach(async () => {
  db = await createMemoryDb();
  app = createEngineApp(db, { serviceKey: KEY });
});
afterEach(() => db.close());

const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = { "x-service-key": KEY }) => {
  const res = await app.request(path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
};

const createAccount = async (username = "alice"): Promise<Account> => (await call("POST", "/accounts", { username })).json;
const balanceOf = async (id: string) => ((await call("GET", `/accounts/${id}`)).json as Account).balance;
const txCount = async (id: string) => (await call("GET", `/accounts/${id}/transactions`)).json.length as number;
const deposit = (id: string, amount: number, idempotencyKey = randomUUID()) =>
  call("POST", `/accounts/${id}/deposits`, { amount, idempotencyKey });

const bet = (accountId: string, roundId: string, amount: number, kind: BetKind = "initial", index: 0 | 1 = 0) => {
  const handId = handIdFor(roundId, index);
  return call("POST", "/bets", {
    accountId,
    roundId,
    handId,
    kind,
    amount,
    idempotencyKey: idempotencyKeys[`${kind}Bet`](roundId, handId),
  });
};

const payout = (accountId: string, roundId: string, outcome: HandOutcome, finalStake: number, amount: number) => {
  const handId = handIdFor(roundId, 0);
  return call("POST", "/payouts", {
    accountId,
    roundId,
    handId,
    outcome,
    finalStake,
    amount,
    idempotencyKey: idempotencyKeys.payout(roundId, handId),
  });
};

describe("accounts", () => {
  it("creates an account with balance 0 and looks it up", async () => {
    const acc = await createAccount();
    expect(acc.balance).toBe(0);
    expect((await call("GET", `/accounts/${acc.id}`)).json).toEqual(acc);
    expect((await call("GET", "/accounts?username=alice")).json).toEqual(acc);
    expect((await call("GET", "/accounts?username=bob")).status).toBe(404);
    expect((await call("GET", `/accounts/${randomUUID()}`)).status).toBe(404);
    expect((await call("GET", "/accounts/not-a-uuid")).status).toBe(404);
  });

  it("rejects duplicate usernames with 409", async () => {
    await createAccount();
    const res = await call("POST", "/accounts", { username: "alice" });
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe("CONFLICT");
  });

  it("requires the service key", async () => {
    expect((await call("GET", "/health", undefined, {})).status).toBe(200);
    const res = await call("POST", "/accounts", { username: "alice" }, {});
    expect(res.status).toBe(401);
    expect(res.json.error.code).toBe("UNAUTHORIZED");
    expect((await call("GET", "/accounts?username=alice", undefined, { "x-service-key": "wrong" })).status).toBe(401);
  });
});

describe("deposits", () => {
  it("credits the account", async () => {
    const acc = await createAccount();
    const res = await deposit(acc.id, 100);
    expect(res.status).toBe(200);
    expect(res.json.balance).toBe(100);
    expect(res.json.transaction).toMatchObject({ type: "deposit", amount: 100, balanceAfter: 100 });
  });

  it("credits once for a duplicate idempotency key", async () => {
    const acc = await createAccount();
    const key = randomUUID();
    const first = await deposit(acc.id, 100, key);
    const second = await deposit(acc.id, 100, key);
    expect(second.json.transaction.id).toBe(first.json.transaction.id);
    expect(await balanceOf(acc.id)).toBe(100);
    expect(await txCount(acc.id)).toBe(1);
  });

  it("rejects a reused key with a different payload", async () => {
    const acc = await createAccount();
    const key = randomUUID();
    await deposit(acc.id, 100, key);
    expect((await deposit(acc.id, 50, key)).status).toBe(409);
    expect(await balanceOf(acc.id)).toBe(100);
  });

  it("validates amounts", async () => {
    const acc = await createAccount();
    expect((await deposit(acc.id, 0)).status).toBe(400);
    expect((await deposit(acc.id, -5)).status).toBe(400);
    expect((await deposit(acc.id, 1.5)).status).toBe(400);
    expect((await deposit(randomUUID(), 10)).status).toBe(404);
  });

  it("handles concurrent duplicates", async () => {
    const acc = await createAccount();
    const key = randomUUID();
    const results = await Promise.all(Array.from({ length: 5 }, () => deposit(acc.id, 100, key)));
    expect(new Set(results.map((r) => r.json.transaction.id)).size).toBe(1);
    expect(await balanceOf(acc.id)).toBe(100);
  });
});

describe("bets", () => {
  it("debits the account", async () => {
    const acc = await createAccount();
    await deposit(acc.id, 100);
    const res = await bet(acc.id, randomUUID(), 10);
    expect(res.status).toBe(200);
    expect(res.json.balance).toBe(90);
    expect(res.json.transaction).toMatchObject({ type: "bet", kind: "initial", amount: -10, balanceAfter: 90 });
  });

  it("returns 402 on insufficient funds and changes nothing", async () => {
    const acc = await createAccount();
    await deposit(acc.id, 5);
    const res = await bet(acc.id, randomUUID(), 10);
    expect(res.status).toBe(402);
    expect(res.json.error.code).toBe("INSUFFICIENT_FUNDS");
    expect(await balanceOf(acc.id)).toBe(5);
    expect(await txCount(acc.id)).toBe(1);
  });

  it("debits once for the same key", async () => {
    const acc = await createAccount();
    await deposit(acc.id, 100);
    const roundId = randomUUID();
    const first = await bet(acc.id, roundId, 10);
    const second = await bet(acc.id, roundId, 10);
    expect(second.status).toBe(200);
    expect(second.json.transaction.id).toBe(first.json.transaction.id);
    expect(await balanceOf(acc.id)).toBe(90);
  });

  it("accepts split and double stakes for the same round", async () => {
    const acc = await createAccount();
    await deposit(acc.id, 100);
    const roundId = randomUUID();
    await bet(acc.id, roundId, 10);
    await bet(acc.id, roundId, 10, "split", 1);
    const res = await bet(acc.id, roundId, 10, "double");
    expect(res.json.balance).toBe(70);
  });

  it("rejects a key that does not match the contract format", async () => {
    const acc = await createAccount();
    await deposit(acc.id, 100);
    const roundId = randomUUID();
    const handId = handIdFor(roundId, 0);
    const res = await call("POST", "/bets", { accountId: acc.id, roundId, handId, kind: "initial", amount: 10, idempotencyKey: "whatever" });
    expect(res.status).toBe(400);
  });
});

describe("payouts", () => {
  const setup = async () => {
    const acc = await createAccount(`u_${randomUUID().slice(0, 8)}`);
    await deposit(acc.id, 100);
    const roundId = randomUUID();
    await bet(acc.id, roundId, 10);
    return { acc, roundId };
  };

  it("pays 2x on a win, 1x on a push and records a 0 loss", async () => {
    for (const [outcome, amount, expected] of [
      ["win", 20, 110],
      ["blackjack", 20, 110],
      ["push", 10, 100],
      ["loss", 0, 90],
    ] as const) {
      const { acc, roundId } = await setup();
      const res = await payout(acc.id, roundId, outcome, 10, amount);
      expect(res.status).toBe(200);
      expect(res.json.balance).toBe(expected);
      expect(res.json.transaction).toMatchObject({ type: "payout", outcome, amount, finalStake: 10, balanceAfter: expected });
      expect(await txCount(acc.id)).toBe(3);
    }
  });

  it("pays once for the same key", async () => {
    const { acc, roundId } = await setup();
    const first = await payout(acc.id, roundId, "win", 10, 20);
    const second = await payout(acc.id, roundId, "win", 10, 20);
    expect(second.json.transaction.id).toBe(first.json.transaction.id);
    expect(await balanceOf(acc.id)).toBe(110);
    expect(await txCount(acc.id)).toBe(3);
  });

  it("rejects a wrong amount with 400", async () => {
    const { acc, roundId } = await setup();
    const res = await payout(acc.id, roundId, "win", 10, 30);
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("VALIDATION_ERROR");
    expect(await balanceOf(acc.id)).toBe(90);
  });

  it("keeps metadata", async () => {
    const { acc, roundId } = await setup();
    const handId = handIdFor(roundId, 0);
    const res = await call("POST", "/payouts", {
      accountId: acc.id,
      roundId,
      handId,
      outcome: "loss",
      finalStake: 10,
      amount: 0,
      idempotencyKey: idempotencyKeys.payout(roundId, handId),
      metadata: { coach: { matched: 3, total: 4 } },
    });
    expect(res.json.transaction.metadata).toEqual({ coach: { matched: 3, total: 4 } });
  });
});

describe("transactions", () => {
  it("lists newest first and honours limit", async () => {
    const acc = await createAccount();
    await deposit(acc.id, 100);
    const roundId = randomUUID();
    await bet(acc.id, roundId, 10);
    await payout(acc.id, roundId, "win", 10, 20);
    const { json } = await call("GET", `/accounts/${acc.id}/transactions`);
    expect(json.map((t: MoneyResponse["transaction"]) => t.type)).toEqual(["payout", "bet", "deposit"]);
    expect((await call("GET", `/accounts/${acc.id}/transactions?limit=1`)).json).toHaveLength(1);
  });
});

describe("brief example", () => {
  it("100 credits, bet 10: 110 after win, 100 after push, 90 after loss", async () => {
    const acc = await createAccount();
    await deposit(acc.id, 100);
    const results: number[] = [];
    for (const [outcome, amount] of [
      ["win", 20],
      ["push", 10],
      ["loss", 0],
    ] as const) {
      const roundId = randomUUID();
      await bet(acc.id, roundId, 10);
      results.push((await payout(acc.id, roundId, outcome, 10, amount)).json.balance);
    }
    // Each round starts from the previous balance: 100 -> 110 -> 110 -> 100.
    expect(results).toEqual([110, 110, 100]);
  });

  it("each outcome from a fresh 100", async () => {
    for (const [outcome, amount, expected] of [
      ["win", 20, 110],
      ["push", 10, 100],
      ["loss", 0, 90],
    ] as const) {
      const acc = await createAccount(`player_${outcome}`);
      await deposit(acc.id, 100);
      const roundId = randomUUID();
      await bet(acc.id, roundId, 10);
      expect((await payout(acc.id, roundId, outcome, 10, amount)).json.balance).toBe(expected);
    }
  });
});
