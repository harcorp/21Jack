"use client";

import { GameTable } from "@21jack/game-ui";
import { useBalance } from "@/components/site/BalanceProvider";
import { Alert, ButtonLink } from "@/components/ui";

export function PlayTable() {
  const { balance, setBalance } = useBalance();
  if (balance === null) {
    return (
      <Alert tone="error" title="The hall is closed">
        We could not load your purse, so the table cannot open. Try again in a moment.
      </Alert>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {balance === 0 ? (
        <Alert tone="info" title="Your purse is empty">
          <p className="mb-2">Visit the treasury to add credits before placing a bet.</p>
          <ButtonLink href="/wallet" size="sm" variant="primary">
            Open the treasury
          </ButtonLink>
        </Alert>
      ) : null}
      <GameTable initialBalance={balance} onBalanceChange={setBalance} />
    </div>
  );
}
