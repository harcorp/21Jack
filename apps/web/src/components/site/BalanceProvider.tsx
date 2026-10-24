"use client";

import { createContext, use, useState, type ReactNode } from "react";

type BalanceState = { balance: number | null; setBalance: (balance: number) => void };

const BalanceContext = createContext<BalanceState | null>(null);

export function BalanceProvider({ initialBalance, children }: { initialBalance: number | null; children: ReactNode }) {
  const [balance, setBalance] = useState(initialBalance);
  return <BalanceContext value={{ balance, setBalance }}>{children}</BalanceContext>;
}

export function useBalance() {
  const ctx = use(BalanceContext);
  if (!ctx) throw new Error("useBalance must be used inside <BalanceProvider>");
  return ctx;
}
