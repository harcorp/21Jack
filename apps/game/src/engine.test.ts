import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { idempotencyKeys } from "@21jack/contracts";
import { createHttpEngine } from "./engine";
import { EngineUnavailableError, GameError } from "./errors";

const roundId = randomUUID();
const bet = {
  accountId: randomUUID(),
  roundId,
  handId: `${roundId}:0`,
  kind: "initial" as const,
  amount: 10,
  idempotencyKey: idempotencyKeys.initialBet(roundId, `${roundId}:0`),
};
const reply = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });

describe("http engine client", () => {
  it("sends the service key and parses MoneyResponse", async () => {
    let seen: Request | undefined;
    const tx = {
      id: randomUUID(),
      accountId: bet.accountId,
      type: "bet",
      kind: "initial",
      amount: -10,
      balanceAfter: 90,
      createdAt: new Date().toISOString(),
    };
    const engine = createHttpEngine({
      url: "http://engine",
      serviceKey: "k",
      fetch: async (input, init) => {
        seen = new Request(input as URL, init);
        return new Response(JSON.stringify({ transaction: tx, balance: 90 }), { status: 200 });
      },
    });
    expect((await engine.placeBet(bet)).balance).toBe(90);
    expect(seen?.url).toBe("http://engine/bets");
    expect(seen?.headers.get("x-service-key")).toBe("k");
  });

  it("maps 402 to INSUFFICIENT_FUNDS", async () => {
    const engine = createHttpEngine({
      url: "http://engine",
      serviceKey: "k",
      fetch: reply(402, { error: { code: "INSUFFICIENT_FUNDS", message: "no" } }),
    });
    await expect(engine.placeBet(bet)).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
    await expect(engine.placeBet(bet)).rejects.toBeInstanceOf(GameError);
  });

  it("treats 5xx and network errors as unavailable", async () => {
    const down = createHttpEngine({ url: "http://engine", serviceKey: "k", fetch: reply(500, {}) });
    await expect(down.placeBet(bet)).rejects.toBeInstanceOf(EngineUnavailableError);
    const offline = createHttpEngine({
      url: "http://engine",
      serviceKey: "k",
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    await expect(offline.placeBet(bet)).rejects.toBeInstanceOf(EngineUnavailableError);
  });
});
