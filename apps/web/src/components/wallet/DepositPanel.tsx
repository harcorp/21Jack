"use client";

import { useState, type FormEvent } from "react";
import type { MoneyResponse } from "@21jack/contracts";
import { useBalance } from "@/components/site/BalanceProvider";
import { Alert, BalancePill, Button, CoinIcon, Input, Panel, formatCredits } from "@/components/ui";
import { apiFetch, errorMessage } from "@/lib/api-client";

const QUICK_AMOUNTS = [50, 100, 500] as const;
const MAX_DEPOSIT = 1_000_000;

type Notice = { tone: "success" | "error"; text: string } | null;

export function DepositPanel() {
  const { balance, setBalance } = useBalance();
  const [pending, setPending] = useState(false);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const deposit = async (amount: number) => {
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      const res = await apiFetch<MoneyResponse>("/api/wallet/deposits", {
        method: "POST",
        body: JSON.stringify({ amount, idempotencyKey: crypto.randomUUID() }),
      });
      setBalance(res.balance);
      setNotice({ tone: "success", text: `${formatCredits(amount)} credits added to your treasury.` });
      return true;
    } catch (e) {
      setNotice({ tone: "error", text: errorMessage(e) });
      return false;
    } finally {
      setPending(false);
    }
  };

  const submitCustom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(custom);
    if (!/^\d+$/.test(custom.trim()) || !Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_DEPOSIT) {
      setCustomError(`Enter a whole number between 1 and ${formatCredits(MAX_DEPOSIT)}.`);
      return;
    }
    setCustomError(null);
    if (await deposit(amount)) setCustom("");
  };

  return (
    <Panel tone="wood" framed title="Treasury chest">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="font-pixel text-sm">Current purse</span>
        <BalancePill balance={balance} />
      </div>

      <h3 className="mb-2 font-pixel text-sm">Quick deposit</h3>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            variant="primary"
            size="lg"
            disabled={pending}
            onClick={() => void deposit(amount)}
            aria-label={`Deposit ${amount} credits`}
          >
            <CoinIcon />+{amount}
          </Button>
        ))}
      </div>

      <form onSubmit={submitCustom} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
        <Input
          className="flex-1"
          label="Custom amount"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          error={customError}
        />
        <Button type="submit" variant="wood" size="md" disabled={pending}>
          Deposit
        </Button>
      </form>

      <div className="mt-4 min-h-14">
        {pending ? <p className="font-pixel text-sm">Counting coins…</p> : null}
        {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      </div>
    </Panel>
  );
}
