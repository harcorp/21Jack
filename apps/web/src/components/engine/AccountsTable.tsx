import type { AdminAccount } from "@21jack/contracts";
import { Badge, Panel, Table, Td, Th, Tr, formatCredits } from "@/components/ui";
import { shortDate } from "./time";

export function AccountsTable({ accounts }: { accounts: AdminAccount[] | null }) {
  return (
    <Panel title="Accounts" tone="stone" framed>
      {accounts === null ? (
        <p className="text-cream-muted">Loading accounts…</p>
      ) : accounts.length === 0 ? (
        <p className="text-cream-muted">No accounts yet.</p>
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
                <Td className="font-semibold whitespace-nowrap">{a.username}</Td>
                <Td className="gh-num text-right text-[10px]">{formatCredits(a.balance)}</Td>
                <Td className="gh-num text-right text-[10px]">{formatCredits(a.ledgerSum)}</Td>
                <Td>{a.consistent ? <Badge tone="felt">✓ Consistent</Badge> : <Badge tone="carpet">✗ Mismatch</Badge>}</Td>
                <Td className="text-xs whitespace-nowrap text-cream-muted">
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
