"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAccountList, AdminTransactionList, EngineStats, type AdminAccount, type AdminTransaction } from "@21jack/contracts";
import { Alert, Button, PageShell, PixelIcon } from "@/components/ui";
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
    <PageShell
      eyebrow="Counting house"
      title="Casino Engine"
      intro="The treasury's ledger keeper: accounts, balances, deposits, bets, payouts — every coin counted once."
      actions={
        <Button variant="stone" size="sm" onClick={() => void refresh()} busy={loading}>
          {loading ? null : <PixelIcon name="refresh" size={16} />}
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      }
    >

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
