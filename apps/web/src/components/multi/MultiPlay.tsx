"use client";

import { MultiTable } from "@21jack/game-ui";
import { useBalance } from "@/components/site/BalanceProvider";

export function MultiPlay() {
  const { balance, setBalance } = useBalance();
  return <MultiTable balance={balance} onBalanceChange={setBalance} />;
}
