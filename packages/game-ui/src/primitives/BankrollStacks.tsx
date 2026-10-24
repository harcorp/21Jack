"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { CHIP_EDGE, CHIP_STYLE } from "./Chip";
import { stepped } from "./motion";

/** Bankroll-only high denominations keep big balances to a few short stacks. */
const BANK_VALUES = [1000, 500, 100, 25, 10, 5, 1] as const;
type BankValue = (typeof BANK_VALUES)[number];

const BANK_FILL: Record<BankValue, string> = {
  1000: "bg-gold-light",
  500: "bg-parchment",
  100: CHIP_STYLE[100].fill,
  25: CHIP_STYLE[25].fill,
  10: CHIP_STYLE[10].fill,
  5: CHIP_STYLE[5].fill,
  1: CHIP_STYLE[1].fill,
};

const MAX_STACKS = 4;
const MAX_TALL = 10;

/** Greedy denomination split grouped into at most four stacks (the smallest groups merge), largest first. */
export function bankrollStacks(balance: number): BankValue[][] {
  let rest = Math.max(0, Math.floor(balance));
  const stacks: BankValue[][] = [];
  for (const value of BANK_VALUES) {
    const n = Math.floor(rest / value);
    rest -= n * value;
    if (n > 0) stacks.push(Array<BankValue>(n).fill(value));
  }
  while (stacks.length > MAX_STACKS) {
    const last = stacks.pop() ?? [];
    stacks[stacks.length - 1]?.push(...last);
  }
  return stacks;
}

/**
 * The player's remaining credits as chip stacks on the felt, next to the bet circle.
 * `holdGains` delays increases so winnings land after the chips slide back from the circle.
 */
export function BankrollStacks({
  balance,
  holdGains = false,
  className,
}: {
  balance: number;
  holdGains?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(balance);
  useEffect(() => {
    if (balance <= shown || !holdGains || reduce) {
      setShown(balance);
      return;
    }
    const id = window.setTimeout(() => setShown(balance), 2000);
    return () => window.clearTimeout(id);
  }, [balance, shown, holdGains, reduce]);

  const stacks = bankrollStacks(shown);

  return (
    <div
      data-bankroll
      role="img"
      aria-label={`Your bankroll: ${balance} credits`}
      className={`flex w-[5.5rem] flex-col items-center gap-1 sm:w-28 ${className ?? ""}`}
    >
      <div className="flex h-12 items-end justify-center gap-1">
        {stacks.length === 0 && <span className="h-2.5 w-5 border-2 border-dashed sm:w-6 border-gold/50" />}
        {stacks.map((stack) => {
          const over = stack.length > MAX_TALL;
          const visible = stack.slice(0, MAX_TALL);
          return (
            <div key={stack[0]} className="relative flex flex-col-reverse items-center">
              {visible.map((value, i) => (
                <motion.span
                  key={`${value}-${i}`}
                  className={`-mt-1.5 block h-2.5 w-5 first:mt-0 sm:w-6 ${BANK_FILL[value]} ${CHIP_EDGE}`}
                  initial={reduce ? false : { y: -16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.03, ease: stepped(4) }}
                />
              ))}
              {over && (
                <span className="absolute -top-3 font-pixel text-[10px] leading-none text-gold-light">+</span>
              )}
            </div>
          );
        })}
      </div>
      <span className="font-pixel text-xs tabular-nums leading-none text-gold-light [text-shadow:1px_1px_0_var(--color-ink)]">
        {shown.toLocaleString("en-US")}
      </span>
    </div>
  );
}
