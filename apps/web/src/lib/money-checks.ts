import "server-only";
import { randomUUID } from "node:crypto";
import {
  Account,
  handIdFor,
  idempotencyKeys,
  payoutFor,
  TransactionList,
  type BetKind,
  type MoneyCheckReport,
  type MoneyCheckStep,
} from "@21jack/contracts";
import { callService } from "./services";

type Reply = { status: number; code: string | null };

async function send(path: string, body?: unknown): Promise<Reply> {
  const res = await callService("engine", path, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
  return { status: res.status, code: json?.error?.code ?? null };
}

const describe = (r: Reply) => (r.code ? `${r.status} ${r.code}` : `${r.status}`);

/** Runs the money-safety script against the live engine with a fresh demo account. */
export async function runMoneyChecks(): Promise<MoneyCheckReport> {
  const username = `audit_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const steps: MoneyCheckStep[] = [];

  const created = await callService("engine", "/accounts", { method: "POST", body: JSON.stringify({ username }) });
  const account = Account.parse(await created.json());
  const balance = async () => Account.parse(await (await callService("engine", `/accounts/${account.id}`)).json()).balance;

  const check = async (name: string, request: string, expectStatus: number, expectBalance: number, run: () => Promise<Reply>) => {
    const reply = await run();
    const after = await balance();
    steps.push({
      name,
      request,
      expected: `${expectStatus} · balance ${expectBalance}`,
      actual: `${describe(reply)} · balance ${after}`,
      status: reply.status,
      balance: after,
      pass: reply.status === expectStatus && after === expectBalance,
    });
  };

  const after = await balance();
  steps.push({
    name: "Create account",
    request: `POST /accounts { username: ${username} }`,
    expected: "201 · balance 0",
    actual: `${created.status} · balance ${after}`,
    status: created.status,
    balance: after,
    pass: created.status === 201 && after === 0,
  });

  const depositKey = randomUUID();
  const deposit = () => send(`/accounts/${account.id}/deposits`, { amount: 100, idempotencyKey: depositKey });
  await check("Deposit 100", `POST /deposits 100 key ${depositKey.slice(0, 8)}`, 200, 100, deposit);
  await check("Duplicate deposit blocked", `POST /deposits 100 same key ${depositKey.slice(0, 8)}`, 200, 100, deposit);

  const round1 = randomUUID();
  const round2 = randomUUID();
  const bet = (roundId: string, kind: BetKind, amount: number, index: 0 | 1 = 0) => () => {
    const handId = handIdFor(roundId, index);
    return send("/bets", {
      accountId: account.id,
      roundId,
      handId,
      kind,
      amount,
      idempotencyKey: idempotencyKeys[`${kind}Bet`](roundId, handId),
    });
  };
  const short = (id: string) => id.slice(0, 8);

  await check("Initial bet 60", `POST /bets initial 60 round ${short(round1)}`, 200, 40, bet(round1, "initial", 60));
  await check("Duplicate bet blocked", `POST /bets initial 60 same key`, 200, 40, bet(round1, "initial", 60));
  await check("Double without funds rejected", `POST /bets double 60 (balance 40)`, 402, 40, bet(round1, "double", 60));
  await check("Split without funds rejected", `POST /bets split 60 (balance 40)`, 402, 40, bet(round1, "split", 60, 1));
  await check("Double accepted with funds", `POST /bets initial 20 + double 20 round ${short(round2)}`, 200, 0, async () => {
    const initial = await bet(round2, "initial", 20)();
    return initial.status === 200 ? bet(round2, "double", 20)() : initial;
  });

  const handId = handIdFor(round2, 0);
  const payout = (amount: number) => () =>
    send("/payouts", {
      accountId: account.id,
      roundId: round2,
      handId,
      outcome: "win",
      finalStake: 40,
      amount,
      idempotencyKey: idempotencyKeys.payout(round2, handId),
    });
  const winAmount = payoutFor("win", 40);
  await check("Payout win 80", `POST /payouts win stake 40 amount ${winAmount}`, 200, 80, payout(winAmount));
  await check("Duplicate payout blocked", `POST /payouts win same key`, 200, 80, payout(winAmount));
  await check("Wrong payout amount rejected", `POST /payouts win stake 40 amount 120`, 400, 80, payout(120));

  const txRes = await callService("engine", `/accounts/${account.id}/transactions?limit=200`);
  const transactions = TransactionList.parse(await txRes.json());
  const sum = transactions.reduce((total, tx) => total + tx.amount, 0);
  const final = await balance();
  steps.push({
    name: "Ledger matches balance",
    request: `GET /accounts/:id/transactions (${transactions.length} entries)`,
    expected: `sum of transactions = balance ${final}`,
    actual: `sum ${sum} · balance ${final}`,
    status: txRes.status,
    balance: final,
    pass: txRes.ok && sum === final,
  });

  return { username, passed: steps.filter((s) => s.pass).length, total: steps.length, steps };
}
