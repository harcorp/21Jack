import type { HandOutcome } from "@21jack/contracts";
import { Amount, Badge, HeartDelta, Panel, PixelIcon, Table, Td, Th, Tr, formatCredits, type BadgeTone } from "@/components/ui";
import { bossFor, describeTransaction, handLabel, type LedgerEntry } from "@/lib/history";

const outcomeTone: Record<HandOutcome, BadgeTone> = { win: "gold", blackjack: "gold", push: "stone", loss: "carpet" };
const outcomeLabel: Record<HandOutcome, string> = { win: "Win", blackjack: "Natural", push: "Push", loss: "Loss" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const when = (iso: string) => `${dateFormat.format(new Date(iso))} UTC`;

export function Ledger({ entries }: { entries: LedgerEntry[] }) {
  return (
    <ol className="flex flex-col gap-4" aria-label="Ledger entries, newest first">
      {entries.map((entry) => (
        <li key={entry.type === "deposit" ? entry.transaction.id : entry.roundId}>
          {entry.type === "deposit" ? <DepositRow entry={entry} /> : <RoundCard entry={entry} />}
        </li>
      ))}
    </ol>
  );
}

function DepositRow({ entry }: { entry: Extract<LedgerEntry, { type: "deposit" }> }) {
  const tx = entry.transaction;
  return (
    <Panel as="article" tone="stone" compact className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <PixelIcon name="chest" size={20} className="text-gold" />
        <Badge tone="felt">Deposit</Badge>
        <time dateTime={tx.createdAt} className="text-xs text-cream-muted">
          {when(tx.createdAt)}
        </time>
      </div>
      <div className="flex items-center gap-4">
        <Amount value={tx.amount} className="text-sm" />
        <span className="flex items-center gap-2 text-xs text-cream-muted">
          Balance <span className="gh-num text-[10px] text-cream">{formatCredits(tx.balanceAfter)}</span>
        </span>
      </div>
    </Panel>
  );
}

function RoundCard({ entry }: { entry: Extract<LedgerEntry, { type: "round" }> }) {
  const shortId = entry.roundId.slice(0, 8);
  return (
    <Panel as="article" tone="stone" framed>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="gh-panel-title">Round {shortId}</h2>
          {entry.kingslayer ? <Badge tone="gold">Kingslayer</Badge> : null}
          {entry.handCount > 1 ? <Badge tone="stone">Split</Badge> : null}
          {entry.transactions.some((tx) => tx.kind === "double") ? <Badge tone="stone">Doubled</Badge> : null}
          <time dateTime={entry.at} className="text-xs text-cream-muted">
            {when(entry.at)}
          </time>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entry.bossDelta !== null ? (
            <span className="gh-plaque gap-2! px-2.5!">
              <span className="gh-label text-[11px] text-gold-light">King</span> <HeartDelta value={entry.bossDelta} />
            </span>
          ) : null}
          <span className="gh-plaque gap-2! px-2.5!">
            <span className="gh-label text-[11px] text-gold-light">Staked</span> {formatCredits(entry.staked)}
          </span>
          <span className="gh-plaque gap-2! px-2.5!">
            <span className="gh-label text-[11px] text-gold-light">Net</span> <Amount value={entry.net} className="text-[10px]" />
          </span>
        </div>
      </header>
      <Table caption={`Transactions for round ${shortId}`}>
        <thead>
          <Tr>
            <Th>Hand</Th>
            <Th>Entry</Th>
            <Th>Outcome</Th>
            <Th>King</Th>
            <Th className="text-right">Payout</Th>
            <Th className="text-right">Amount</Th>
            <Th className="text-right">Balance</Th>
          </Tr>
        </thead>
        <tbody>
          {entry.transactions.map((tx) => (
            <Tr key={tx.id}>
              <Td className="gh-label text-xs whitespace-nowrap text-cream-muted">{handLabel(tx.handId)}</Td>
              <Td className="whitespace-nowrap">{describeTransaction(tx)}</Td>
              <Td>
                {tx.outcome ? <Badge tone={outcomeTone[tx.outcome]}>{outcomeLabel[tx.outcome]}</Badge> : <span aria-hidden="true">—</span>}
                {tx.type === "payout" && tx.finalStake ? (
                  <span className="ml-2 text-xs whitespace-nowrap text-cream-muted">on <span className="gh-num text-[10px]">{formatCredits(tx.finalStake)}</span></span>
                ) : null}
              </Td>
              <Td>
                <BossCell tx={tx} />
              </Td>
              <Td className="gh-num text-right text-[10px]">{tx.type === "payout" ? formatCredits(tx.amount) : "—"}</Td>
              <Td className="text-right">
                <Amount value={tx.amount} className="text-[10px]" />
              </Td>
              <Td className="gh-num text-right text-[10px]">{formatCredits(tx.balanceAfter)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Panel>
  );
}

function BossCell({ tx }: { tx: Parameters<typeof bossFor>[0] }) {
  const boss = bossFor(tx);
  if (!boss) return <span aria-hidden="true">—</span>;
  return (
    <span className="flex flex-wrap items-center gap-1">
      <HeartDelta value={boss.damage} />
      {boss.defeated ? <Badge tone="gold">Slain</Badge> : <span className="text-xs text-cream-dim">{boss.hpAfter} left</span>}
    </span>
  );
}
