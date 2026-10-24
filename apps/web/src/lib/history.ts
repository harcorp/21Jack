import { BossPayoutMetadata, type Transaction } from "@21jack/contracts";

export type LedgerEntry =
  | { type: "deposit"; at: string; transaction: Transaction }
  | {
      type: "round";
      at: string;
      roundId: string;
      /** Chronological, oldest first, so a split/double reads top to bottom. */
      transactions: Transaction[];
      net: number;
      staked: number;
      balanceAfter: number;
      handCount: number;
      /** Sum of hp changes dealt to the King this round; null when no boss data was recorded. */
      bossDelta: number | null;
      kingslayer: boolean;
    };

/** Groups newest-first transactions into ledger entries (newest first). Deposits stay standalone. */
export function groupLedger(transactions: Transaction[]): LedgerEntry[] {
  const sorted = [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const entries: LedgerEntry[] = [];
  const rounds = new Map<string, Transaction[]>();

  for (const tx of sorted) {
    if (!tx.roundId) {
      entries.push({ type: "deposit", at: tx.createdAt, transaction: tx });
      continue;
    }
    const list = rounds.get(tx.roundId);
    if (list) {
      list.push(tx);
      continue;
    }
    const fresh = [tx];
    rounds.set(tx.roundId, fresh);
    entries.push({ type: "round", at: tx.createdAt, roundId: tx.roundId, transactions: fresh, net: 0, staked: 0, balanceAfter: 0, handCount: 0, bossDelta: null, kingslayer: false });
  }

  for (const entry of entries) {
    if (entry.type !== "round") continue;
    entry.transactions.reverse();
    entry.net = entry.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    entry.staked = entry.transactions.filter((tx) => tx.type === "bet").reduce((sum, tx) => sum - tx.amount, 0);
    entry.balanceAfter = entry.transactions.at(-1)?.balanceAfter ?? 0;
    const boss = entry.transactions.map(bossFor).filter((b): b is BossPayoutMetadata => b !== null);
    entry.bossDelta = boss.length ? boss.reduce((sum, b) => sum + b.damage, 0) : null;
    entry.kingslayer = boss.some((b) => b.defeated);
    entry.handCount = new Set(entry.transactions.map((tx) => tx.handId).filter(Boolean)).size;
  }
  return entries;
}

export const handLabel = (handId: string | undefined) => {
  const index = handId?.split(":")[1];
  return index === undefined ? "—" : `Hand ${Number(index) + 1}`;
};

export function describeTransaction(tx: Transaction) {
  if (tx.type === "deposit") return "Deposit";
  if (tx.type === "bet") {
    if (tx.kind === "split") return "Split stake";
    if (tx.kind === "double") return "Double stake";
    return "Initial stake";
  }
  return "Payout";
}

export function bossFor(tx: Transaction): BossPayoutMetadata | null {
  if (tx.type !== "payout") return null;
  const parsed = BossPayoutMetadata.safeParse(tx.metadata?.boss);
  return parsed.success ? parsed.data : null;
}
