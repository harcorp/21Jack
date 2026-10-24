import type { ReactNode } from "react";
import { Alert } from "@/components/ui";
import { BalanceProvider } from "./BalanceProvider";
import { SiteHeader } from "./SiteHeader";

export type SessionAccount = { id: string; username: string; balance: number | null };

export function SignedInFrame({ account, children }: { account: SessionAccount; children: ReactNode }) {
  return (
    <BalanceProvider initialBalance={account.balance}>
      <SiteHeader username={account.username} />
      {account.balance === null ? (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <Alert tone="error" title="Treasury unreachable">
            We could not load your balance. Some actions may fail until the castle services are back.
          </Alert>
        </div>
      ) : null}
      {children}
    </BalanceProvider>
  );
}
