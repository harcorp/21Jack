"use client";

import { MultiTable } from "@21jack/game-ui";
import { useBalance } from "@/components/site/BalanceProvider";

export function MultiPlay() {
  const { balance, setBalance } = useBalance();
  // Desktop: the 16:9 stage (controls docked inside) is capped so it fits under the header.
  // Below 720px of width the stage switches to the portrait mobile hall at full width.
  return (
    <MultiTable
      balance={balance}
      onBalanceChange={setBalance}
      className="mx-auto md:max-w-[max(720px,calc((100dvh-10.5rem)*16/9))]"
    />
  );
}
