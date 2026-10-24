"use client";

import { BalancePill } from "@/components/ui";
import { useBalance } from "./BalanceProvider";

export function HeaderBalance() {
  return <BalancePill balance={useBalance().balance} />;
}
