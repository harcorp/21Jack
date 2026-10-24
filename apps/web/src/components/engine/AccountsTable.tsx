import type { AdminAccount } from "@21jack/contracts";
import { Badge, Panel, Table, Td, Th, Tr, formatCredits } from "@/components/ui";
import { shortDate } from "./time";

export function AccountsTable({ accounts }: { accounts: AdminAccount[] | null }) {
  return (
    <Panel title="Accounts" tone="parchment">
      {accounts === null ? (
        <p className="opacity-70">Loading accounts…</p>
      ) : accounts.length === 0 ? (
        <p>No accounts yet.</p>
      ) : (
        <Table caption="Accounts with balance and ledger sum">
          <thead>
            <Tr>
              <Th>Username</Th>
              <Th className="text-right">Balance</Th>
              <Th className="text-right">Ledger sum</Th>
              <Th>Consistency</Th>
              <Th>Created</Th>
            </Tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <Tr key={a.id}>
                <Td className="whitespace-nowrap">{a.username}</Td>
                <Td className="text-right font-pixel text-sm tabular-nums">{formatCredits(a.balance)}</Td>
                <Td className="text-right font-pixel text-sm tabular-nums">{formatCredits(a.ledgerSum)}</Td>
                <Td>{a.consistent ? <Badge tone="felt">✓ Consistent</Badge> : <Badge tone="carpet">✗ Mismatch</Badge>}</Td>
                <Td className="font-pixel text-xs whitespace-nowrap">
                  <time dateTime={a.createdAt}>{shortDate(a.createdAt)}</time>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}
