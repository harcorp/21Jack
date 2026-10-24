"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ButtonHTMLAttributes } from "react";
import { stepped } from "./motion";

export const CHIP_VALUES = [100, 25, 10, 5, 1] as const;
export type ChipValue = (typeof CHIP_VALUES)[number];

const CHIP_STYLE: Record<ChipValue, { fill: string; text: string }> = {
  1: { fill: "bg-stone", text: "text-parchment" },
  5: { fill: "bg-carpet", text: "text-parchment" },
  10: { fill: "bg-[#3f9a52]", text: "text-parchment" },
  25: { fill: "bg-gold", text: "text-ink" },
  100: { fill: "bg-ink", text: "text-gold-light" },
};

/** Octagonal clip gives a blocky disc. */
const DISC = "[clip-path:polygon(25%_0,75%_0,100%_25%,100%_75%,75%_100%,25%_100%,0_75%,0_25%)]";

/** Greedy split of an integer amount into chip denominations (largest first). */
export function chipsFor(amount: number): ChipValue[] {
  const chips: ChipValue[] = [];
  let rest = Math.max(0, Math.floor(amount));
  for (const value of CHIP_VALUES) {
    while (rest >= value && chips.length < 40) {
      chips.push(value);
      rest -= value;
    }
  }
  return chips;
}

/** Front-facing chip, used for bet buttons. */
export function ChipButton({
  value,
  className,
  ...button
}: { value: ChipValue } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value">) {
  const style = CHIP_STYLE[value];
  return (
    <button
      type="button"
      aria-label={`Add ${value} credits`}
      className={`group relative h-12 w-12 shrink-0 cursor-pointer outline-offset-2 transition-transform focus-visible:outline-2 focus-visible:outline-torch enabled:hover:-translate-y-1 enabled:active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:w-14 ${className ?? ""}`}
      {...button}
    >
      <span className={`absolute inset-0 ${DISC} bg-ink`} />
      <span className={`absolute inset-[3px] ${DISC} ${style.fill}`} />
      <span
        className={`absolute inset-[9px] flex items-center justify-center ${DISC} border-2 border-dashed border-parchment/70 font-pixel text-xs ${style.text} sm:text-sm`}
      >
        {value}
      </span>
    </button>
  );
}

/** Side-view chip stack; chips drop in with stepped timing. */
export function ChipStack({ amount, max = 10, className }: { amount: number; max?: number; className?: string }) {
  const reduce = useReducedMotion();
  const chips = chipsFor(amount).reverse().slice(-max);
  return (
    <div className={`flex flex-col items-center ${className ?? ""}`} aria-label={`${amount} credits`}>
      <div className="relative flex flex-col-reverse items-center">
        {chips.map((value, i) => (
          <motion.span
            key={`${i}-${value}`}
            className={`-mt-1.5 block h-2.5 w-9 border-2 border-ink first:mt-0 sm:w-11 ${CHIP_STYLE[value].fill} shadow-[inset_0_-2px_0_rgb(0_0_0/0.3)]`}
            initial={reduce ? false : { y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.24, delay: i * 0.05, ease: stepped(4) }}
          />
        ))}
      </div>
    </div>
  );
}
