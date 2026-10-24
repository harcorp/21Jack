import type { HandOutcome } from "@21jack/contracts";
import { Amount, Badge, HeartDelta, Panel, Table, Td, Th, Tr, formatCredits, type BadgeTone } from "@/components/ui";
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
    <Panel as="article" tone="parchment" compact className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Badge tone="felt">Deposit</Badge>
        <time dateTime={tx.createdAt} className="font-pixel text-xs">
          {when(tx.createdAt)}
        </time>
      </div>
      <div className="flex items-center gap-4">
        <Amount value={tx.amount} onLight className="text-lg" />
        <span className="font-pixel text-xs">Balance {formatCredits(tx.balanceAfter)}</span>
      </div>
    </Panel>
  );
}

function RoundCard({ entry }: { entry: Extract<LedgerEntry, { type: "round" }> }) {
  const shortId = entry.roundId.slice(0, 8);
  return (
    <Panel as="article" tone="parchment">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-bold">Round {shortId}</h2>
          {entry.kingslayer ? <Badge tone="gold">Kingslayer</Badge> : null}
          {entry.handCount > 1 ? <Badge tone="stone">Split</Badge> : null}
          {entry.transactions.some((tx) => tx.kind === "double") ? <Badge tone="stone">Doubled</Badge> : null}
          <time dateTime={entry.at} className="font-pixel text-xs">
            {when(entry.at)}
          </time>
        </div>
        <div className="flex items-center gap-3">
          {entry.bossDelta !== null ? (
            <span className="flex items-center gap-1 font-pixel text-xs">
              King <HeartDelta value={entry.bossDelta} />
            </span>
          ) : null}
          <span className="font-pixel text-xs">Staked {formatCredits(entry.staked)}</span>
          <span className="font-pixel text-xs">Net</span>
          <Amount value={entry.net} onLight className="text-lg" />
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
              <Td className="font-pixel text-xs whitespace-nowrap">{handLabel(tx.handId)}</Td>
              <Td className="whitespace-nowrap">{describeTransaction(tx)}</Td>
              <Td>
                {tx.outcome ? <Badge tone={outcomeTone[tx.outcome]}>{outcomeLabel[tx.outcome]}</Badge> : <span aria-hidden="true">—</span>}
                {tx.type === "payout" && tx.finalStake ? (
                  <span className="ml-2 font-pixel text-xs whitespace-nowrap">on {formatCredits(tx.finalStake)}</span>
                ) : null}
              </Td>
              <Td>
                <BossCell tx={tx} />
              </Td>
              <Td className="text-right font-pixel text-sm tabular-nums">{tx.type === "payout" ? formatCredits(tx.amount) : "—"}</Td>
              <Td className="text-right">
                <Amount value={tx.amount} onLight />
              </Td>
              <Td className="text-right font-pixel text-sm tabular-nums">{formatCredits(tx.balanceAfter)}</Td>
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
      {boss.defeated ? <Badge tone="gold">Slain</Badge> : <span className="font-pixel text-xs opacity-70">{boss.hpAfter} left</span>}
    </span>
  );
}
