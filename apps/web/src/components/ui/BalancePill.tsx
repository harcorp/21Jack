"use client";

import { useEffect, useRef, useState } from "react";
import { coinSrc } from "./sprites";
import { formatCredits } from "./format";
import { cx } from "./cx";

/** HUD balance (Grand Hall `.gh-balance`). `null` = unknown (service down). Flashes gold when credits come in. */
export function BalancePill({ balance, className }: { balance: number | null; className?: string }) {
  const previous = useRef(balance);
  const [up, setUp] = useState(false);

  useEffect(() => {
    const before = previous.current;
    previous.current = balance;
    if (balance === null || before === null || balance <= before) return;
    setUp(true);
    const t = setTimeout(() => setUp(false), 1200);
    return () => clearTimeout(t);
  }, [balance]);

  return (
    <div
      className={cx("gh-balance max-w-full", balance === 0 && "is-zero", up && "is-up", className)}
      role="status"
      aria-live="polite"
      aria-label={balance === null ? "Balance unavailable" : `Balance: ${formatCredits(balance)} credits`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny inline pixel sprite */}
      <img src={coinSrc} alt="" aria-hidden="true" width={32} height={32} className="gh-balance__coin shrink-0" />
      <span className="gh-balance__value whitespace-nowrap" aria-hidden="true">
        {balance === null ? "—" : formatCredits(balance)}
      </span>
    </div>
  );
}
