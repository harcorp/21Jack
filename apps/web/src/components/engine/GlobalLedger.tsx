import type { AdminTransaction, HandOutcome } from "@21jack/contracts";
import { Amount, Badge, Panel, Table, Td, Th, Tr, formatCredits, type BadgeTone } from "@/components/ui";
import { shortDate } from "./time";

const typeTone: Record<AdminTransaction["type"], BadgeTone> = { deposit: "felt", bet: "stone", payout: "gold" };
const outcomeTone: Record<HandOutcome, BadgeTone> = { win: "gold", blackjack: "gold", push: "stone", loss: "carpet" };

const handNumber = (handId: string | undefined) => {
  const index = handId?.split(":").at(-1);
  return index === undefined || Number.isNaN(Number(index)) ? null : Number(index) + 1;
};

const dash = <span aria-hidden="true">—</span>;

export function GlobalLedger({ transactions }: { transactions: AdminTransaction[] | null }) {
  return (
    <Panel title="Global ledger" tone="stone" framed>
      <p className="-mt-2 mb-3 text-sm text-cream-muted">Latest 100 entries across all accounts, newest first.</p>
      {transactions === null ? (
        <p className="text-cream-muted">Loading ledger…</p>
      ) : transactions.length === 0 ? (
        <p className="text-cream-muted">The ledger is empty.</p>
      ) : (
        <Table caption="Global ledger, newest first">
          <thead>
            <Tr>
              <Th>Time</Th>
              <Th>User</Th>
              <Th>Type</Th>
              <Th>Kind</Th>
              <Th>Round</Th>
              <Th>Hand</Th>
              <Th>Outcome</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">Balance</Th>
              <Th>Replays</Th>
            </Tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const hand = handNumber(tx.handId);
              return (
                <Tr key={tx.id}>
                  <Td className="text-xs whitespace-nowrap text-cream-muted">
                    <time dateTime={tx.createdAt}>{shortDate(tx.createdAt)}</time>
                  </Td>
                  <Td className="font-semibold whitespace-nowrap">{tx.username}</Td>
                  <Td>
                    <Badge tone={typeTone[tx.type]}>{tx.type}</Badge>
                  </Td>
                  <Td className="text-xs">{tx.kind ?? dash}</Td>
                  <Td className="font-mono text-xs text-cream-muted">{tx.roundId ? tx.roundId.slice(0, 8) : dash}</Td>
                  <Td className="gh-num text-[10px]">{hand ?? dash}</Td>
                  <Td>{tx.outcome ? <Badge tone={outcomeTone[tx.outcome]}>{tx.outcome}</Badge> : dash}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <Amount value={tx.amount} className="text-[10px]" />
                  </Td>
                  <Td className="gh-num text-right text-[10px]">{formatCredits(tx.balanceAfter)}</Td>
                  <Td className="whitespace-nowrap">{tx.replays > 0 ? <Badge tone="torch">Duplicate blocked ×{tx.replays}</Badge> : dash}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}
