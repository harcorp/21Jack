import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  apiError,
  BetRequest,
  CreateAccountRequest,
  DepositRequest,
  errorStatus,
  idempotencyKeys,
  payoutFor,
  PayoutRequest,
  SERVICE_KEY_HEADER,
} from "@21jack/contracts";
import type { Db } from "./db";
import { createLedger, EngineError } from "./ledger";

/** Owner: P3 (Casino Engine). */
export function createEngineApp(db: Db, opts: { serviceKey?: string } = {}) {
  const serviceKey = opts.serviceKey ?? process.env.SERVICE_KEY;
  const ledger = createLedger(db);
  const app = new Hono();

  const body = async <S extends z.ZodType>(c: Context, schema: S): Promise<z.infer<S>> => {
    const raw = await c.req.json().catch(() => {
      throw new EngineError("VALIDATION_ERROR", "Body must be valid JSON");
    });
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new EngineError("VALIDATION_ERROR", z.prettifyError(parsed.error));
    return parsed.data;
  };

  app.onError((err, c) => {
    if (err instanceof EngineError) return c.json(apiError(err.code, err.message), errorStatus[err.code] as 400);
    console.error(err);
    return c.json({ error: { code: "INTERNAL", message: "Internal error" } }, 500);
  });

  app.get("/health", (c) => c.json({ service: "engine", ok: true }));

  // Only trusted services (web, game) may call this API.
  app.use("*", async (c, next) => {
    if (!serviceKey || c.req.header(SERVICE_KEY_HEADER) !== serviceKey) {
      return c.json(apiError("UNAUTHORIZED", "Missing or invalid service key"), 401);
    }
    await next();
  });

  app.post("/accounts", async (c) => {
    const { username } = await body(c, CreateAccountRequest);
    return c.json(await ledger.createAccount(username), 201);
  });

  app.get("/accounts", async (c) => {
    const username = c.req.query("username");
    if (!username) throw new EngineError("VALIDATION_ERROR", "username query parameter is required");
    return c.json(await ledger.findAccountByUsername(username.trim()));
  });

  app.get("/accounts/:id", async (c) => c.json(await ledger.getAccount(c.req.param("id"))));

  app.get("/accounts/:id/transactions", async (c) => {
    const limit = z.coerce.number().int().min(1).max(200).catch(50).parse(c.req.query("limit") ?? 50);
    return c.json(await ledger.listTransactions(c.req.param("id"), limit));
  });

  app.post("/accounts/:id/deposits", async (c) => {
    const { amount, idempotencyKey } = await body(c, DepositRequest);
    return c.json(await ledger.apply({ accountId: c.req.param("id"), type: "deposit", amount, idempotencyKey }));
  });

  app.post("/bets", async (c) => {
    const b = await body(c, BetRequest);
    const expectedKey = idempotencyKeys[`${b.kind}Bet`](b.roundId, b.handId);
    if (b.idempotencyKey !== expectedKey) {
      throw new EngineError("VALIDATION_ERROR", `idempotencyKey must be ${expectedKey}`);
    }
    if (!b.handId.startsWith(`${b.roundId}:`)) throw new EngineError("VALIDATION_ERROR", "handId does not belong to roundId");
    return c.json(
      await ledger.apply({
        accountId: b.accountId,
        type: "bet",
        kind: b.kind,
        amount: -b.amount,
        roundId: b.roundId,
        handId: b.handId,
        idempotencyKey: b.idempotencyKey,
      }),
    );
  });

  app.post("/payouts", async (c) => {
    const p = await body(c, PayoutRequest);
    const expected = payoutFor(p.outcome, p.finalStake);
    if (p.amount !== expected) {
      throw new EngineError("VALIDATION_ERROR", `amount must be ${expected} for ${p.outcome} with stake ${p.finalStake}`);
    }
    const expectedKey = idempotencyKeys.payout(p.roundId, p.handId);
    if (p.idempotencyKey !== expectedKey) throw new EngineError("VALIDATION_ERROR", `idempotencyKey must be ${expectedKey}`);
    if (!p.handId.startsWith(`${p.roundId}:`)) throw new EngineError("VALIDATION_ERROR", "handId does not belong to roundId");
    return c.json(
      await ledger.apply({
        accountId: p.accountId,
        type: "payout",
        amount: p.amount,
        roundId: p.roundId,
        handId: p.handId,
        outcome: p.outcome,
        finalStake: p.finalStake,
        metadata: p.metadata,
        idempotencyKey: p.idempotencyKey,
      }),
    );
  });

  return app;
}
