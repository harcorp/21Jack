"use client";

import type { HandView } from "@21jack/contracts";
import { motion, useReducedMotion } from "motion/react";
import { BetCircle, ChipStack, DEAL_STAGGER, HandTotalBadge } from "../primitives";
import { handTotalLabel, OUTCOME_LABELS, signed, STATUS_LABELS } from "../lib/format";
import { DealtCard } from "./Shoe";

const SHAKE = { x: [0, -8, 8, -6, 6, -3, 0] };
const STILL = { x: 0 };

export function cardOverlap(i: number) {
  return i === 0 ? "" : "-ml-9 sm:-ml-12";
}

export function HandSeat({
  hand,
  index,
  split,
  active,
  settled,
}: {
  hand: HandView;
  index: number;
  split: boolean;
  active: boolean;
  settled: boolean;
}) {
  const reduce = useReducedMotion();
  const bust = hand.status === "bust";
  const totalTone = bust ? "bad" : hand.status === "blackjack" ? "gold" : hand.total === 21 ? "good" : "neutral";
  const outcome = hand.outcome;
  const net = outcome ? (hand.payout ?? 0) - hand.stake : 0;

  return (
    <motion.div
      className="flex min-w-0 flex-col items-center gap-2"
      animate={bust && !reduce ? SHAKE : STILL}
      transition={{ duration: 0.4, ease: "linear" }}
      aria-label={`${split ? `Hand ${index + 1}` : "Your hand"}${active ? ", active" : ""}`}
      role="group"
    >
      <div className="relative px-2 pb-2 pt-3 sm:px-3">
        {active && (
          <div
            className="torch-flicker pointer-events-none absolute -inset-1 border-4 border-torch shadow-[0_0_18px_4px_var(--color-torch),inset_0_0_12px_var(--color-torch)]"
            aria-hidden="true"
          />
        )}
        {split && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-ink px-1.5 font-pixel text-[10px] text-gold-light">
            Hand {index + 1}
          </span>
        )}
        <div className="flex min-h-20 items-end sm:min-h-28">
          {hand.cards.map((card, i) => {
            const delay = i < 2 && !hand.fromSplit ? i * 2 * DEAL_STAGGER : i === 1 && hand.fromSplit ? index * 0.25 : 0;
            return (
              <div key={`${hand.handId}-${i}-${card.rank}${card.suit}`} className={cardOverlap(i)}>
                <DealtCard card={card} delay={delay} flipDelay={delay + 0.22} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <HandTotalBadge label={handTotalLabel(hand)} tone={totalTone} />
        {!settled && hand.status !== "playing" && hand.status !== "bust" && hand.status !== "blackjack" && (
          <HandTotalBadge label={STATUS_LABELS[hand.status]} />
        )}
        {!settled && active && <HandTotalBadge label={STATUS_LABELS.playing} tone="gold" />}
      </div>

      <BetCircle active={active} label={`Bet ${hand.stake}`}>
        <ChipStack amount={hand.stake} />
      </BetCircle>

      {outcome && (
        <HandTotalBadge
          tone={outcome === "loss" ? "bad" : outcome === "push" ? "neutral" : "gold"}
          label={`${OUTCOME_LABELS[outcome]} ${outcome === "push" ? "" : signed(net)}`.trim()}
        />
      )}
    </motion.div>
  );
}
