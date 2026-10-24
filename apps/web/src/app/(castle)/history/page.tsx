import type { Metadata } from "next";
import { Ledger } from "@/components/history/Ledger";
import { Alert, ButtonLink, PageShell, Panel } from "@/components/ui";
import { requireCurrentAccount } from "@/lib/current";
import { loadTransactions } from "@/lib/engine";
import { groupLedger } from "@/lib/history";

export const metadata: Metadata = { title: "Ledger · 21Jack" };

export default async function HistoryPage() {
  const account = await requireCurrentAccount();
  const loaded = await loadTransactions(account.id);

  return (
    <PageShell title="Royal ledger" intro="Every coin in and out, newest first. Rounds show each hand's story.">
      {loaded.status !== "ok" ? (
        <Alert tone="error" title="The ledger is locked">
          We could not reach the treasury. Refresh in a moment.
        </Alert>
      ) : loaded.data.length === 0 ? (
        <Panel tone="parchment">
          <p className="mb-4">No entries yet. Make a deposit to begin.</p>
          <ButtonLink href="/wallet">Open the treasury</ButtonLink>
        </Panel>
      ) : (
        <Ledger entries={groupLedger(loaded.data)} />
      )}
    </PageShell>
  );
}
