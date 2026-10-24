import { randomUUID } from "node:crypto";
import {
  ApiError,
  MoneyResponse,
  SERVICE_KEY_HEADER,
  type BetRequest,
  type PayoutRequest,
  type Transaction,
} from "@21jack/contracts";
import { EngineUnavailableError, GameError } from "./errors";

/** The only two engine calls the game makes. Both are idempotent on `idempotencyKey`. */
export interface EngineClient {
  placeBet(req: BetRequest): Promise<MoneyResponse>;
  payout(req: PayoutRequest): Promise<MoneyResponse>;
}

export function createHttpEngine(opts: { url: string; serviceKey: string; fetch?: typeof fetch }): EngineClient {
  const doFetch = opts.fetch ?? fetch;
  async function post(path: string, body: unknown): Promise<MoneyResponse> {
    let res: Response;
    try {
      res = await doFetch(new URL(path, opts.url), {
        method: "POST",
        headers: { "content-type": "application/json", [SERVICE_KEY_HEADER]: opts.serviceKey },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new EngineUnavailableError(`Engine unreachable: ${(err as Error).message}`);
    }
    const json: unknown = await res.json().catch(() => undefined);
    if (res.ok) {
      const parsed = MoneyResponse.safeParse(json);
      if (!parsed.success) throw new EngineUnavailableError(`Unexpected engine response from ${path}`);
      return parsed.data;
    }
    const error = ApiError.safeParse(json);
    if (error.success && res.status < 500) throw new GameError(error.data.error.code, error.data.error.message);
    throw new EngineUnavailableError(`Engine ${path} failed with HTTP ${res.status}`);
  }
  return {
    placeBet: (req) => post("/bets", req),
    payout: (req) => post("/payouts", req),
  };
}

export type MockEngine = EngineClient & {
  balances: Map<string, number>;
  transactions: Transaction[];
};

/** In-memory wallet for tests and solo dev. Unknown accounts start with `initialBalance`. */
export function createMockEngine(opts: { initialBalance?: number } = {}): MockEngine {
  const balances = new Map<string, number>();
  const byKey = new Map<string, MoneyResponse>();
  const transactions: Transaction[] = [];
  const balanceOf = (id: string) => balances.get(id) ?? opts.initialBalance ?? 1000;

  function record(key: string, accountId: string, delta: number, tx: Omit<Transaction, "id" | "accountId" | "amount" | "balanceAfter" | "createdAt">): MoneyResponse {
    const balance = balanceOf(accountId) + delta;
    balances.set(accountId, balance);
    const transaction: Transaction = {
      id: randomUUID(),
      accountId,
      amount: delta,
      balanceAfter: balance,
      createdAt: new Date().toISOString(),
      ...tx,
    };
    transactions.push(transaction);
    const res = { transaction, balance };
    byKey.set(key, res);
    return res;
  }

  return {
    balances,
    transactions,
    async placeBet(req) {
      const prior = byKey.get(req.idempotencyKey);
      if (prior) return prior;
      if (balanceOf(req.accountId) < req.amount) throw new GameError("INSUFFICIENT_FUNDS", "Not enough credits");
      return record(req.idempotencyKey, req.accountId, -req.amount, {
        type: "bet",
        kind: req.kind,
        roundId: req.roundId,
        handId: req.handId,
      });
    },
    async payout(req) {
      const prior = byKey.get(req.idempotencyKey);
      if (prior) return prior;
      return record(req.idempotencyKey, req.accountId, req.amount, {
        type: "payout",
        roundId: req.roundId,
        handId: req.handId,
        outcome: req.outcome,
        finalStake: req.finalStake,
        ...(req.metadata ? { metadata: req.metadata } : {}),
      });
    },
  };
}

export function createEngineFromEnv(env: NodeJS.ProcessEnv, serviceKey: string): EngineClient {
  if (env.ENGINE_MODE === "mock") return createMockEngine();
  return createHttpEngine({ url: env.ENGINE_URL ?? "http://localhost:3002", serviceKey });
}
