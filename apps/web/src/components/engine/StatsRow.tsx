import type { EngineStats } from "@21jack/contracts";
import { StatTile, formatCredits } from "@/components/ui";

export function StatsRow({ stats }: { stats: EngineStats | null }) {
  const n = (v: number | undefined) => (v === undefined ? "—" : formatCredits(v));
  const dupes = stats?.duplicatesBlocked ?? 0;
  const bad = stats?.inconsistentAccounts ?? 0;
  return (
    <section aria-label="Engine stats">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Accounts" value={n(stats?.accounts)} />
        <StatTile label="Transactions" value={n(stats?.transactions)} />
        <StatTile label="Deposited" value={n(stats?.totalDeposited)} hint={stats ? `${formatCredits(stats.deposits)} deposits` : undefined} />
        <StatTile label="Staked" value={n(stats?.totalStaked)} hint={stats ? `${formatCredits(stats.bets)} bets` : undefined} />
        <StatTile label="Paid out" value={n(stats?.totalPaid)} hint={stats ? `${formatCredits(stats.payouts)} payouts` : undefined} />
        <StatTile label="Duplicates blocked" value={n(stats?.duplicatesBlocked)} tone={dupes > 0 ? "gold" : "default"} />
        <StatTile
          className="col-span-2"
          label="Ledger integrity"
          tone={!stats ? "default" : bad === 0 ? "felt" : "carpet"}
          value={!stats ? "—" : bad === 0 ? "✓ All balanced" : `✗ ${formatCredits(bad)}`}
          hint={stats && bad > 0 ? `${bad === 1 ? "account" : "accounts"} out of balance` : undefined}
        />
      </dl>
    </section>
  );
}
