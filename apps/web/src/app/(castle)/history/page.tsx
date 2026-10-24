import type { Metadata } from "next";
import { Ledger } from "@/components/history/Ledger";
import { Alert, ButtonLink, PageShell, Panel, PixelIcon } from "@/components/ui";
import { requireCurrentAccount } from "@/lib/current";
import { loadTransactions } from "@/lib/engine";
import { groupLedger } from "@/lib/history";

export const metadata: Metadata = { title: "Ledger · 21Jack" };

export default async function HistoryPage() {
  const account = await requireCurrentAccount();
  const loaded = await loadTransactions(account.id);

  return (
    <PageShell eyebrow="Kept by the royal scribes" title="Royal ledger" intro="Every coin in and out, newest first. Rounds show each hand's story.">
      {loaded.status !== "ok" ? (
        <Alert tone="error" title="The ledger is locked">
          We could not reach the treasury. Refresh in a moment.
        </Alert>
      ) : loaded.data.length === 0 ? (
        <Panel tone="stone" framed>
          <div className="flex flex-wrap items-center gap-5">
            <PixelIcon name="scroll" size={48} className="text-gold" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="gh-panel-title">No entries yet</h2>
              <p className="text-cream-muted">Deposits and bets will show here. Make a deposit to begin.</p>
            </div>
            <ButtonLink href="/wallet" variant="wood" size="sm">
              Deposit
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <Ledger entries={groupLedger(loaded.data)} />
      )}
    </PageShell>
  );
}
