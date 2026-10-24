/**
 * End-to-end smoke test through the browser-facing web API.
 * Requires `pnpm dev` running. Usage: pnpm smoke [baseUrl]
 */
import { randomUUID } from "node:crypto";
import type { Account, MoneyResponse, RoundView, Transaction } from "@21jack/contracts";

const base = process.argv[2] ?? "http://localhost:3000";
let cookie = "";
let failures = 0;

async function api<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0] ?? "";
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : null) as T };
}

function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === undefined ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

// Stored views come back from jsonb with reordered keys, so compare the meaningful fields only.
function handsKey(round: RoundView) {
  return JSON.stringify(round.hands.map((h) => [h.handId, h.cards.map((c) => c.rank + c.suit), h.stake, h.status]));
}

async function balance() {
  return (await api<Account>("GET", "/api/me")).data.balance;
}

async function main() {
  const username = `smoke_${Date.now().toString(36)}`;
  const session = await api<Account>("POST", "/api/session", { username });
  check("create account", session.status < 300 && session.data.balance === 0, session);

  const depositKey = randomUUID();
  await api<MoneyResponse>("POST", "/api/wallet/deposits", { amount: 100, idempotencyKey: depositKey });
  await api<MoneyResponse>("POST", "/api/wallet/deposits", { amount: 100, idempotencyKey: depositKey });
  check("duplicate deposit credits once", (await balance()) === 100);

  const tooBig = await api("POST", "/api/game/rounds", { bet: 1000, requestId: randomUUID() });
  check("bet above balance rejected with 402", tooBig.status === 402, tooBig);
  check("rejected bet leaves balance unchanged", (await balance()) === 100);

  let played = 0;
  for (let i = 0; i < 5; i++) {
    const requestId = randomUUID();
    const before = await balance();
    let round = (await api<RoundView>("POST", "/api/game/rounds", { bet: 10, requestId })).data;
    const retry = await api<RoundView>("POST", "/api/game/rounds", { bet: 10, requestId });
    check(`round ${i + 1}: retried start returns same round`, retry.data.roundId === round.roundId, retry);

    while (round.status !== "settled" && round.activeHandIndex !== null) {
      const actionId = randomUUID();
      const handIndex = round.activeHandIndex;
      const action = (round.hands[handIndex]?.total ?? 21) < 17 ? "hit" : "stand";
      round = (await api<RoundView>("POST", `/api/game/rounds/${round.roundId}/actions`, { action, handIndex, actionId })).data;
      const again = await api<RoundView>("POST", `/api/game/rounds/${round.roundId}/actions`, { action, handIndex, actionId });
      check(`round ${i + 1}: retried ${action} draws nothing new`, handsKey(again.data) === handsKey(round));
    }

    check(`round ${i + 1}: settled`, round.status === "settled", round);
    check(`round ${i + 1}: boss hearts reported`, typeof round.boss?.hp === "number" && round.boss.maxHp === 5, round.boss);
    check(`round ${i + 1}: dealer cards revealed`, round.dealer.cards.every((c) => !("hidden" in c)));
    const stakes = round.hands.reduce((sum, h) => sum + h.stake, 0);
    const payouts = round.hands.reduce((sum, h) => sum + (h.payout ?? 0), 0);
    const after = await balance();
    check(`round ${i + 1}: balance = before - stakes + payouts`, after === before - stakes + payouts, { before, stakes, payouts, after });
    played++;
  }

  const history = (await api<Transaction[]>("GET", "/api/wallet/transactions")).data;
  check("history has one deposit", history.filter((t) => t.type === "deposit").length === 1);
  check(`history has a payout per hand (${played} rounds)`, history.filter((t) => t.type === "payout").length >= played);
  check("history balanceAfter matches wallet", history[0]?.balanceAfter === (await balance()));

  console.log(failures ? `\n${failures} check(s) failed` : "\nAll smoke checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
