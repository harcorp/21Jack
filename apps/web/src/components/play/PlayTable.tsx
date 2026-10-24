"use client";

import { useState } from "react";
import { GameTable } from "@21jack/game-ui";
import { useBalance } from "@/components/site/BalanceProvider";
import { DepositPanel } from "@/components/wallet/DepositPanel";
import { Alert, Button, Modal } from "@/components/ui";

/** Smallest chip on the table: below this the player cannot place any bet. */
const MIN_BET = 5;

export function PlayTable() {
  const { balance, setBalance } = useBalance();
  // Offer a top-up as soon as a broke player walks in; they can dismiss it and reopen it later.
  const [topUpOpen, setTopUpOpen] = useState(() => balance !== null && balance < MIN_BET);

  if (balance === null) {
    return (
      <Alert tone="error" title="The hall is closed">
        We could not load your purse, so the table cannot open. Try again in a moment.
      </Alert>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {balance < MIN_BET && !topUpOpen ? (
        <Alert tone="info" title="Your purse is empty">
          <p className="mb-2">Add credits to place a bet against the King.</p>
          <Button size="sm" variant="primary" onClick={() => setTopUpOpen(true)}>
            Add credits
          </Button>
        </Alert>
      ) : null}
      <GameTable initialBalance={balance} onBalanceChange={setBalance} />
      <Modal open={topUpOpen} onClose={() => setTopUpOpen(false)} label="Add credits to play">
        <DepositPanel
          title="Your purse is empty"
          onDeposited={(next) => {
            if (next >= MIN_BET) setTopUpOpen(false);
          }}
          footer={
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setTopUpOpen(false)}>
                Not now
              </Button>
            </div>
          }
        />
      </Modal>
    </div>
  );
}
