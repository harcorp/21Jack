"use client";

import type { SeatView } from "@21jack/contracts";
import {
  BankrollStacks,
  BetCircle,
  ChipStack,
  chipsFor,
  HandTotalBadge,
  PlayingCard,
  type ChipCollect,
  type ChipValue,
} from "../primitives";
import { handTotalLabel, OUTCOME_LABELS, signed } from "../lib/format";

// Lift the outer seats on wide screens so the row follows the curve of the table.
const ARC = ["lg:-translate-y-6", "lg:-translate-y-1", "", "lg:-translate-y-1", "lg:-translate-y-6"];

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(1, Math.max(0, seconds / total));
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center" aria-label={`${seconds} seconds left`}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="var(--color-ink)" stroke="var(--color-stone)" strokeWidth="4" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={seconds <= 5 ? "var(--color-carpet)" : "var(--color-torch)"}
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 250ms linear" }}
        />
      </svg>
      <span className="relative font-pixel text-[10px] text-parchment">{seconds}</span>
    </span>
  );
}

export function MultiSeat({
  index,
  seat,
  mine,
  turnHand,
  secondsLeft,
  windowSeconds,
  settled,
  pendingChips = null,
  placedChips = null,
  bankroll = null,
}: {
  index: number;
  seat: SeatView | null;
  mine: boolean;
  turnHand: number | null;
  secondsLeft: number | null;
  windowSeconds: number;
  settled: boolean;
  /** Your chips for the next bet while betting (only for your seat). */
  pendingChips?: readonly ChipValue[] | null;
  /** The chips of the bet you just placed, to keep their order (only for your seat). */
  placedChips?: readonly ChipValue[] | null;
  /** Your bankroll left after the pending bet (only for your seat). */
  bankroll?: number | null;
}) {
  const active = turnHand !== null;
  const frame = mine ? "border-gold bg-ink/55" : "border-ink/60 bg-ink/35";
  const staked = seat?.hands.reduce((sum, h) => sum + h.stake, 0) ?? 0;
  const net = seat && settled && seat.payout !== null ? seat.payout - staked : null;
  const pending = pendingChips?.reduce((sum, v) => sum + v, 0) ?? 0;
  const dealt = (seat?.hands.length ?? 0) > 0;
  const won = settled && dealt && (seat?.payout ?? 0) > 0;
  // What sits in the circle: the chips being placed, the confirmed bet, the stakes in play, or the payout to collect.
  const onCircle = pendingChips ? pending : won ? (seat?.payout ?? 0) : dealt ? staked : (seat?.bet ?? 0);
  const placedSum = placedChips?.reduce((sum, v) => sum + v, 0) ?? 0;
  const circleChips: readonly ChipValue[] =
    pendingChips ?? (placedChips && placedSum === onCircle && placedSum > 0 ? placedChips : chipsFor(onCircle));
  const collect: ChipCollect = settled && dealt ? (won ? "player" : "dealer") : null;

  return (
    <li
      className={`relative flex min-w-0 flex-col items-center gap-1.5 border-4 p-2 ${frame} ${ARC[index] ?? ""} ${mine ? "col-span-2 sm:col-span-1" : ""}`}
      aria-label={seat ? `Seat ${index + 1}: ${seat.username}${mine ? " (you)" : ""}${active ? ", playing" : ""}` : `Seat ${index + 1}: empty`}
    >
      {active && (
        <div
          className="torch-flicker pointer-events-none absolute -inset-1 border-4 border-torch shadow-[0_0_18px_4px_var(--color-torch)]"
          aria-hidden="true"
        />
      )}
      {!seat ? (
        <div className="flex min-h-28 flex-col items-center justify-center gap-1 text-parchment/60">
          <span className="h-10 w-10 rounded-full border-2 border-dashed border-parchment/40" aria-hidden="true" />
          <span className="font-pixel text-[10px]">Empty seat</span>
        </div>
      ) : (
        <>
          <div className="relative flex w-full min-w-0 items-center justify-between gap-1">
            {/* Other players' chips fly from (and back to) their name plate; yours use the bankroll below. */}
            {!mine && <span data-bankroll aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-0 w-0" />}
            <span className={`truncate font-display text-sm font-semibold ${mine ? "text-gold-light" : "text-parchment"}`}>
              {seat.username}
              {mine && <span className="ml-1 font-pixel text-[9px] text-gold">YOU</span>}
            </span>
            {active && secondsLeft !== null && <CountdownRing seconds={secondsLeft} total={windowSeconds} />}
          </div>

          <div className="flex min-h-24 flex-wrap items-end justify-center gap-2">
            {seat.hands.map((hand, h) => (
              <div
                key={hand.handId}
                className={`flex flex-col items-center gap-1 ${turnHand === h && seat.hands.length > 1 ? "outline-2 outline-torch" : ""}`}
              >
                <div className="flex items-end [zoom:0.62]">
                  {hand.cards.map((card, i) => (
                    <div key={`${hand.handId}-${i}`} className={i === 0 ? "" : "-ml-9 sm:-ml-12"}>
                      <PlayingCard card={card} flipDelay={0.1} />
                    </div>
                  ))}
                </div>
                <HandTotalBadge
                  label={handTotalLabel(hand)}
                  tone={hand.status === "bust" ? "bad" : hand.status === "blackjack" ? "gold" : "neutral"}
                />
                {hand.outcome && (
                  <HandTotalBadge
                    tone={hand.outcome === "loss" ? "bad" : hand.outcome === "push" ? "neutral" : "gold"}
                    label={OUTCOME_LABELS[hand.outcome]}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Fixed height: chips and bankroll changes never move the seat. */}
          {/* Your seat: bankroll beside the circle on phones (seat spans both columns), under it from sm up. */}
          <div
            className={`flex w-full items-end justify-center ${
              mine ? "h-16 gap-3 sm:h-[9.5rem] sm:flex-col-reverse sm:items-center sm:justify-start sm:gap-1" : "h-16 sm:h-20"
            }`}
          >
            {mine && <BankrollStacks balance={bankroll ?? 0} holdGains={settled} className={`shrink-0 ${bankroll === null ? "invisible" : ""}`} />}
            <BetCircle active={mine && onCircle > 0}>
              {onCircle > 0 && <ChipStack amount={onCircle} chips={circleChips} max={8} collect={collect} />}
            </BetCircle>
          </div>
          <span className="h-3 font-pixel text-[10px] leading-3 text-parchment/80">
            {net !== null
              ? `${signed(net)} credits`
              : pendingChips
                ? pending > 0
                  ? `Bet ${pending}`
                  : "Place your bet"
                : seat.bet !== null
                  ? `Bet ${seat.bet}`
                  : staked > 0
                    ? `Bet ${staked}`
                    : "No bet"}
          </span>
        </>
      )}
    </li>
  );
}
