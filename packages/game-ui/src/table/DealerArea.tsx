"use client";

import type { RoundView } from "@21jack/contracts";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BossFx, DealerKing, DEAL_STAGGER, HandTotalBadge, stepped } from "../primitives";
import { dealerTotalLabel } from "../lib/format";
import { REVEAL_TIMING, type DealerReveal } from "../lib/useDealerReveal";
import { DealtCard } from "./Shoe";
import { cardOverlap } from "./HandSeat";

const SHAKE = { x: [0, -8, 8, -6, 6, -3, 0] };
const STILL = { x: 0 };

/**
 * Dealer cards and total. Pass `reveal` (from `useDealerReveal`) to stage the settlement card by card;
 * without it the round's cards are shown as they arrive.
 */
export function DealerArea({ round, reveal }: { round: RoundView | null; reveal?: DealerReveal }) {
  const reduce = useReducedMotion();
  const settled = round?.status === "settled";
  const cards = reveal ? reveal.cards : (round?.dealer.cards ?? []);
  const total = reveal ? reveal.total : (round?.dealer.total ?? null);
  const done = reveal ? reveal.done : settled;
  const staged = !!reveal?.revealing;
  const label = !round ? "" : total === null ? "?" : reveal ? (total > 21 ? `Bust ${total}` : String(total)) : dealerTotalLabel(round);
  const bust = total !== null && total > 21;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className="flex h-20 items-end sm:h-28"
        aria-label="Dealer cards"
        role="group"
        animate={reveal && done && bust && !reduce ? SHAKE : STILL}
        transition={{ duration: 0.45, ease: stepped(7) }}
      >
        {round &&
          cards.map((card, i) => {
            const delay = staged && i >= 2 ? 0 : i < 2 ? (i * 2 + 1) * DEAL_STAGGER : 0.35 + (i - 2) * 0.35;
            const flipDelay = i === 1 && (staged || settled) ? (staged ? 0 : 0.15) : delay + 0.22;
            return (
              <div key={`${round.roundId}-dealer-${i}`} className={cardOverlap(i)}>
                <DealtCard
                  card={"hidden" in card ? undefined : card}
                  delay={delay}
                  flipDelay={flipDelay}
                  flipDuration={i === 1 && reveal?.holeFlipping ? REVEAL_TIMING.flip / 1000 : undefined}
                />
              </div>
            );
          })}
      </motion.div>
      {/* Fixed-height total slot: present before the deal too, so the felt below never shifts. */}
      <div className="relative flex h-7 flex-col items-center sm:h-8">
        {round && <HandTotalBadge label={`Dealer ${label}`} tone={bust ? "bad" : "neutral"} />}
          <AnimatePresence>
            {reveal?.caption && (
              <motion.p
                key="caption"
                className="pointer-events-none absolute top-full mt-1.5 whitespace-nowrap bg-ink/70 px-2 py-0.5 font-pixel text-[10px] uppercase tracking-[0.2em] text-gold-light sm:text-xs"
                initial={{ opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: [0.55, 1, 0.55] }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={reduce ? { duration: 0 } : { duration: 1.2, repeat: Infinity, ease: stepped(4) }}
                aria-live="polite"
              >
                {reveal.caption}
              </motion.p>
            )}
          </AnimatePresence>
      </div>
    </div>
  );
}

export function DealerThrone({ eventKey = null, delta = 0 }: { eventKey?: string | null; delta?: number }) {
  return (
    <div className="pointer-events-none relative z-10 -mb-5 flex justify-center sm:-mb-7">
      <BossFx eventKey={eventKey} delta={delta}>
        <DealerKing className="h-20 w-20 drop-shadow-[0_6px_0_rgb(0_0_0/0.45)] sm:h-28 sm:w-28" />
      </BossFx>
    </div>
  );
}
