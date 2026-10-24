"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { newId, type MoneyResponse } from "@21jack/contracts";
import { useBalance } from "@/components/site/BalanceProvider";
import { Alert, BalancePill, Button, CoinIcon, Input, Panel, formatCredits } from "@/components/ui";
import { apiFetch, errorMessage } from "@/lib/api-client";

const QUICK_AMOUNTS = [50, 100, 500] as const;
const MAX_DEPOSIT = 1_000_000;

type Notice = { tone: "success" | "error"; text: string } | null;

export function DepositPanel({
  title = "Treasury chest",
  onDeposited,
  footer,
}: {
  title?: string;
  /** Called with the new balance after a successful deposit (e.g. to close a modal). */
  onDeposited?: (balance: number) => void;
  footer?: ReactNode;
} = {}) {
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
        body: JSON.stringify({ amount, idempotencyKey: newId() }),
      });
      setBalance(res.balance);
      onDeposited?.(res.balance);
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
    <Panel tone="wood" framed title={title}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-[rgb(20_10_4/0.45)] px-4 py-3 shadow-[inset_0_0_0_2px_var(--gh-ink)]">
        <span className="gh-field__label">Current purse</span>
        <BalancePill balance={balance} />
      </div>

      <h3 className="gh-field__label mb-2">Quick deposit</h3>
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            variant="primary"
            size="lg"
            className="gh-num px-2! text-sm! sm:text-base!"
            disabled={pending}
            onClick={() => void deposit(amount)}
            aria-label={`Deposit ${amount} credits`}
          >
            <CoinIcon className="hidden sm:block" />+{amount}
          </Button>
        ))}
      </div>

      <form onSubmit={submitCustom} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
        <Input
          className="flex-1"
          label="Custom amount"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder="1,000"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          hint={`Whole numbers 1 to ${formatCredits(MAX_DEPOSIT)}`}
          error={customError}
        />
        <Button type="submit" variant="wood" size="md" disabled={pending} className="sm:mt-[26px]">
          Deposit
        </Button>
      </form>

      <div className="mt-4 min-h-14" aria-live="polite">
        {pending ? (
          <p className="gh-label flex items-center gap-2 text-sm text-gold-light">
            <span className="gh-spinner" aria-hidden="true" />
            Counting coins…
          </p>
        ) : null}
        {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      </div>
      {footer}
    </Panel>
  );
}
