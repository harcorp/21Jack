"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { GhStyles, ghChipsFor, ghFmt, type GhChipValue } from "../gh";
import { stepped } from "../primitives";
import { screenScale } from "./layout";

/** Where a stake's chips fly when the round is collected. */
export type ChipCollect = "player" | "dealer" | null;

const CHIP_CLASS: Record<GhChipValue, string> = { 5: "c5", 10: "c10", 25: "c25", 100: "c100", 500: "c500", 1000: "c1k" };

/** Offset (screen px) from the bottom-centre of `el` to the centre of the bankroll on the same table. */
function bankrollOffset(el: HTMLElement): { x: number; y: number } | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const bank = node.querySelector<HTMLElement>("[data-bankroll]");
    if (bank) {
      const a = el.getBoundingClientRect();
      const b = bank.getBoundingClientRect();
      const k = screenScale(el);
      return { x: Math.round((b.left + b.width / 2 - (a.left + a.width / 2)) / k), y: Math.round((b.top + b.height / 2 - a.bottom) / k) };
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Grand Hall stake stack (`.gh-stack`, largest chip at the bottom, or in the order placed).
 * New chips slide over from the bankroll on the felt; winnings drop in from the dealer;
 * `collect` sweeps the stack to the player's bankroll or to the dealer.
 */
export function StakeStack({
  amount,
  chips,
  max = 8,
  collect = null,
  collectDelay = 1.6,
  dealerDistance = 170,
}: {
  amount: number;
  chips?: readonly GhChipValue[];
  max?: number;
  collect?: ChipCollect;
  collectDelay?: number;
  /** How far up (stage px) the dealer's side is, for lost stakes and winnings. */
  dealerDistance?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState<{ x: number; y: number } | null>(null);
  const all = chips ?? ghChipsFor(amount, 40).chips;
  const hidden = Math.max(0, all.length - max);
  const seen = new Map<GhChipValue, number>();
  const keyed = all.map((value) => {
    const nth = seen.get(value) ?? 0;
    seen.set(value, nth + 1);
    return { value, key: `${value}-${nth}` };
  });

  // While the stack is being collected it is displaced, so keep the offset measured before.
  const collecting = collect !== null;
  useLayoutEffect(() => {
    if (collecting) return;
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
        ? { x: 0, y: -dealerDistance, opacity: 0 }
        : { x: 0, y: 0, opacity: collect ? 0 : 1 };

  return (
    <motion.div
      ref={ref}
      className="gh-stack"
      role="img"
      aria-label={`Stake ${ghFmt(amount)} credits`}
      animate={reduce ? { opacity: collect ? 0 : 1 } : away}
      transition={{ duration: collect ? 0.45 : 0, delay: collect ? collectDelay : 0, ease: stepped(6) }}
    >
      {keyed.slice(hidden).map(({ value, key }, i) => (
        <motion.i
          key={key}
          className={CHIP_CLASS[value]}
          initial={
            reduce
              ? false
              : collect
                ? { y: -dealerDistance, opacity: 0 }
                : from
                  ? { x: from.x, y: from.y + i * 6, opacity: 1 }
                  : { y: -24, opacity: 0 }
          }
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: from || collect ? 0.32 : 0.24, delay: from ? 0 : i * 0.05, ease: stepped(from ? 6 : 4) }}
        />
      ))}
      {hidden > 0 && <span className="ghx-stack-more">+{hidden}</span>}
      <GhStyles />
    </motion.div>
  );
}

/**
 * The stake spot of one hand slot: a fixed box whose stack grows upwards from a fixed baseline and
 * whose amount pill sits beside it, so nothing moves between betting, playing and settlement.
 */
export function StakeSpot({
  ring,
  active,
  pillSide = "right",
  amount,
  children,
  label,
  collected,
}: {
  /** Dashed "bet here" ring (betting state). */
  ring?: boolean;
  active?: boolean;
  pillSide?: "left" | "right";
  amount: number;
  children?: ReactNode;
  /** Text inside the empty ring. */
  label?: ReactNode;
  /** The stake is being collected: the amount fades out with the chips. */
  collected?: boolean;
}) {
  return (
    <div data-stake-spot style={{ position: "relative", width: 96, height: 60 }}>
      {ring && (
        <div
          className={["ghx-betspot", amount > 0 && "is-filled", active && "is-active"].filter(Boolean).join(" ")}
          style={{ position: "absolute", inset: 0 }}
          aria-hidden="true"
        >
          {amount <= 0 && <span className="ghx-betspot__label">{label ?? "Bet"}</span>}
        </div>
      )}
      <div style={{ position: "absolute", left: "50%", bottom: 16, transform: "translateX(-50%)" }}>{children}</div>
      {amount > 0 && (
        <span
          className="ghx-stake__value ghx-stake__value--pill"
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            opacity: collected ? 0 : 1,
            transition: collected ? "opacity 0s linear 1.9s" : undefined,
            ...(pillSide === "right" ? { left: "calc(100% - 14px)" } : { right: "calc(100% - 14px)" }),
          }}
        >
          {ghFmt(amount)}
        </span>
      )}
      <GhStyles />
    </div>
  );
}

/* ------------------------------------------------------------------ bankroll */

const BANK_VALUES = [1000, 500, 100, 25, 10, 5] as const;
const MAX_STACKS = 4;
const MAX_TALL = 10;

/** Greedy denomination split grouped into at most four stacks (the smallest groups merge), largest first. */
export function bankrollStacks(balance: number): GhChipValue[][] {
  let rest = Math.max(0, Math.floor(balance));
  const stacks: GhChipValue[][] = [];
  for (const value of BANK_VALUES) {
    const n = Math.floor(rest / value);
    rest -= n * value;
    if (n > 0) stacks.push(Array<GhChipValue>(n).fill(value));
  }
  while (stacks.length > MAX_STACKS) {
    const last = stacks.pop() ?? [];
    stacks[stacks.length - 1]?.push(...last);
  }
  return stacks;
}

/**
 * The player's remaining credits as chip stacks on the felt, next to the stake spot.
 * `holdGains` delays increases so winnings land after the chips slide back from the spot.
 */
export function Bankroll({ balance, holdGains = false }: { balance: number; holdGains?: boolean }) {
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
      aria-label={`Your bankroll: ${ghFmt(balance)} credits`}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, height: 64 }}>
        {stacks.length === 0 && (
          <span style={{ width: 30, height: 12, borderRadius: "50%", outline: "2px dashed var(--gh-gold-400)", opacity: 0.5 }} />
        )}
        {stacks.map((stack) => {
          const visible = stack.slice(0, MAX_TALL);
          return (
            <div key={stack[0]} className="gh-stack ghx-stack--xs" style={{ width: 32 }}>
              {visible.map((value, i) => (
                <motion.i
                  key={`${value}-${i}`}
                  className={CHIP_CLASS[value]}
                  initial={reduce ? false : { y: -16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.03, ease: stepped(4) }}
                />
              ))}
              {stack.length > MAX_TALL && <span className="ghx-stack-more">+</span>}
            </div>
          );
        })}
      </div>
      <span className="ghx-stake__value ghx-stake__value--pill">{ghFmt(shown)}</span>
      <GhStyles />
    </div>
  );
}
