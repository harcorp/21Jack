"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CoinIcon } from "./CoinIcon";

function useCountUp(value: number) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) {
      from.current = value;
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => {
        from.current = v;
        setShown(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);
  return shown;
}

export function BalancePill({ balance, label = "Balance" }: { balance: number; label?: string }) {
  const shown = useCountUp(balance);
  return (
    <div
      className="gold-frame inline-flex items-center gap-2 bg-wood px-3 py-1.5 text-gold-light shadow-[4px_4px_0_rgb(0_0_0/0.4)]"
      aria-label={`${label}: ${balance} credits`}
    >
      <CoinIcon className="h-5 w-5 sm:h-6 sm:w-6" />
      <span className="font-pixel text-lg tabular-nums sm:text-2xl" aria-hidden="true">
        {shown.toLocaleString("en-US")}
      </span>
    </div>
  );
}
