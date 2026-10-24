"use client";

import type { RoundView } from "@21jack/contracts";
import { BossFx, DealerKing, DEAL_STAGGER, HandTotalBadge } from "../primitives";
import { dealerTotalLabel } from "../lib/format";
import { DealtCard } from "./Shoe";
import { cardOverlap } from "./HandSeat";

export function DealerArea({ round }: { round: RoundView | null }) {
  const settled = round?.status === "settled";
  const total = round?.dealer.total ?? null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex min-h-20 items-end sm:min-h-28" aria-label="Dealer cards" role="group">
        {round?.dealer.cards.map((card, i) => {
          const delay = i < 2 ? (i * 2 + 1) * DEAL_STAGGER : 0.35 + (i - 2) * 0.35;
          const flipDelay = i === 1 && settled ? 0.15 : delay + 0.22;
          return (
            <div key={`${round.roundId}-dealer-${i}`} className={cardOverlap(i)}>
              <DealtCard card={"hidden" in card ? undefined : card} delay={delay} flipDelay={flipDelay} />
            </div>
          );
        })}
      </div>
      {round && (
        <HandTotalBadge label={`Dealer ${dealerTotalLabel(round)}`} tone={total !== null && total > 21 ? "bad" : "neutral"} />
      )}
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
