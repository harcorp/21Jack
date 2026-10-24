"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { stepped } from "./motion";

export const CHIP_VALUES = [100, 25, 10, 5, 1] as const;
export type ChipValue = (typeof CHIP_VALUES)[number];

export const CHIP_STYLE: Record<ChipValue, { fill: string; text: string }> = {
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

/** Where a stack's chips fly when the round is collected. */
export type ChipCollect = "player" | "dealer" | null;

/** Coin-edge notches shared by every side-view chip. */
export const CHIP_EDGE =
  "border-2 border-ink bg-[repeating-linear-gradient(90deg,transparent_0_5px,rgb(241_230_204/0.45)_5px_7px)] shadow-[inset_0_-2px_0_rgb(0_0_0/0.3)]";

/** Offset (px) from the bottom-centre of `el` to the centre of the nearest bankroll on the same table. */
function bankrollOffset(el: HTMLElement): { x: number; y: number } | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const bank = node.querySelector<HTMLElement>("[data-bankroll]");
    if (bank) {
      const a = el.getBoundingClientRect();
      const b = bank.getBoundingClientRect();
      return { x: Math.round(b.left + b.width / 2 - (a.left + a.width / 2)), y: Math.round(b.top + b.height / 2 - a.bottom) };
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Side-view chip stack (largest chip at the bottom). Pass `chips` to keep the order they were placed in.
 * New chips slide over from the bankroll on the felt (or drop in when there is none); `collect` sweeps the stack away.
 */
export function ChipStack({
  amount,
  chips,
  max = 10,
  collect = null,
  collectDelay = 1.6,
  className,
}: {
  amount: number;
  chips?: readonly ChipValue[];
  max?: number;
  collect?: ChipCollect;
  collectDelay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState<{ x: number; y: number } | null>(null);
  const all = chips ?? chipsFor(amount);
  const hidden = Math.max(0, all.length - max);
  const seen = new Map<ChipValue, number>();
  const keyed = all.map((value) => {
    const nth = seen.get(value) ?? 0;
    seen.set(value, nth + 1);
    return { value, key: `${value}-${nth}` };
  });

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      const next = el ? bankrollOffset(el) : null;
      setFrom((prev) => (prev?.x === next?.x && prev?.y === next?.y ? prev : next));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });

  const away =
    collect === "player" && from
      ? { x: from.x, y: from.y, opacity: 0 }
      : collect === "dealer"
        ? { x: 0, y: -140, opacity: 0 }
        : { x: 0, y: 0, opacity: collect ? 0 : 1 };

  return (
    <motion.div
      ref={ref}
      className={`relative flex flex-col items-center ${className ?? ""}`}
      aria-label={`${amount} credits`}
      animate={reduce ? { opacity: collect ? 0 : 1 } : away}
      transition={{ duration: collect ? 0.45 : 0, delay: collect ? collectDelay : 0, ease: stepped(6) }}
    >
      {hidden > 0 && <span className="absolute -top-3.5 font-pixel text-[10px] leading-none text-gold-light">+</span>}
      <div className="relative flex flex-col-reverse items-center">
        {keyed.slice(hidden).map(({ value, key }, i) => (
          <motion.span
            key={key}
            className={`-mt-1.5 block h-2.5 w-9 first:mt-0 sm:w-11 ${CHIP_STYLE[value].fill} ${CHIP_EDGE}`}
            initial={
              reduce
                ? false
                : collect
                  ? { y: -140, opacity: 0 }
                  : from
                    ? { x: from.x, y: from.y + i * 4, opacity: 1 }
                    : { y: -24, opacity: 0 }
            }
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={{ duration: from || collect ? 0.32 : 0.24, delay: from ? 0 : i * 0.05, ease: stepped(from ? 6 : 4) }}
          />
        ))}
      </div>
    </motion.div>
  );
}
