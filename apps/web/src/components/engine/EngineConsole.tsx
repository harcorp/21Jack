"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAccountList, AdminTransactionList, EngineStats, type AdminAccount, type AdminTransaction } from "@21jack/contracts";
import { Alert, Button, PageShell } from "@/components/ui";
import { errorMessage } from "@/lib/api-client";
import { AccountsTable } from "./AccountsTable";
import { fetchParsed } from "./fetch";
import { GlobalLedger } from "./GlobalLedger";
import { MoneyChecks } from "./MoneyChecks";
import { StatsRow } from "./StatsRow";

type Snapshot = { stats: EngineStats; accounts: AdminAccount[]; transactions: AdminTransaction[] };

export function EngineConsole() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, accounts, transactions] = await Promise.all([
        fetchParsed("/api/engine/stats", EngineStats),
        fetchParsed("/api/engine/accounts", AdminAccountList),
        fetchParsed("/api/engine/transactions?limit=100", AdminTransactionList),
      ]);
      setData({ stats, accounts, transactions });
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <PageShell>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold text-gold-light">Casino Engine</h1>
          <p className="mt-1 text-lg opacity-90">The treasury&apos;s ledger keeper: accounts, balances, deposits, bets, payouts — every coin counted once.</p>
        </div>
        <Button variant="wood" size="sm" onClick={() => void refresh()} busy={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {error ? (
        <Alert tone="error" title="The engine is not answering">
          {error}
        </Alert>
      ) : null}

      <StatsRow stats={data?.stats ?? null} />
      <MoneyChecks onDone={refresh} />
      <AccountsTable accounts={data?.accounts ?? null} />
      <GlobalLedger transactions={data?.transactions ?? null} />
    </PageShell>
  );
}
