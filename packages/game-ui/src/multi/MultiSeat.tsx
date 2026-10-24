"use client";

import { MULTI_TURN_SECONDS, type HandView } from "@21jack/contracts";
import { GhBetSpot, GhHand, GhSeatPlaque, ghAvatarFor } from "../gh";
import { DESKTOP_ANCHORS, seatAnchorForTurn } from "../scene";
import { seatState, turnNumber } from "./model";
import { type CollectTarget, Stake } from "./parts";
import type { MultiView } from "./view";

const W = 1440;
const H = 810;
/** Dealer hand centre on the desktop stage (TableStage template: left 50%, top 45.6%). */
export const DEALER_POS = { x: 0.5 * W, y: 0.456 * H };
const SHOE = { x: (DESKTOP_ANCHORS.shoe[0] / 100) * W, y: (DESKTOP_ANCHORS.shoe[1] / 100) * H };

/** Hides the outcome until the dealer reveal has finished. */
export function veiled(hand: HandView, show: boolean): HandView {
  if (show) return hand;
  const { outcome: _o, payout: _p, ...rest } = hand;
  return rest;
}

/**
 * One seat on the desktop stage: hands on the felt at the seat anchor (meta on the outer side, stake
 * under the cards), the stake before the deal, and the rim plate (TableStage `plateStyle`).
 * Seat index i plays i-th, so it sits at the design's turn-order seat i+1 (seat 1 = screen right).
 */
export function MultiSeat({ v, index }: { v: MultiView; index: number }) {
  const { table } = v;
  const seat = table.seats[index] ?? null;
  const mine = index === v.youSeat;
  const { felt, rim } = seatAnchorForTurn(turnNumber(index));
  const [fxp, fyp] = DESKTOP_ANCHORS[felt];
  const [rxp, ryp] = DESKTOP_ANCHORS[rim];
  const fx = (fxp / 100) * W;
  const fy = (fyp / 100) * H;
  const rx = (rxp / 100) * W;
  const ry = (ryp / 100) * H;
  // Meta beside the cards on the outer side (TableStage), except the two end seats, where the outer
  // side would run into their own rim plate: there it goes toward the dealer.
  const side: "left" | "right" = felt === "seat2" || felt === "seat5" ? "left" : "right";
  const state = seatState(table, index, v.dealer.revealing, mine);
  const plateStyle = { left: `${rxp}%`, top: `${ryp}%`, transform: "translate(-50%, -60px)" };

  if (!seat) {
    const canSit = !v.seated;
    return (
      <div className="mt-abs" style={plateStyle}>
        <GhSeatPlaque
          empty
          layout="stage"
          seatNumber={index + 1}
          onSit={canSit && !v.busy ? v.join : undefined}
          className={canSit ? undefined : "[&_.gh-btn]:invisible"}
        />
      </div>
    );
  }

  const dealt = seat.hands.length > 0;
  const playing = table.phase === "playing";
  const turnHand = playing && table.turn?.seat === index ? table.turn.handIndex : null;
  const showOutcome = table.phase === "settled" && v.settledDone;
  const bettingOpen = table.phase === "waiting" || table.phase === "betting";
  const pending = mine && v.canBet ? v.pendingChips : null;
  const preStake = pending ? v.bet : (seat.bet ?? 0);
  const placedSum = v.placedChips.reduce((s, c) => s + c, 0);
  const preChips = pending ?? (mine && placedSum === preStake && placedSum > 0 ? v.placedChips : null);
  const two = seat.hands.length === 2;
  const roundKey = `${table.roundNumber}`;

  return (
    <>
      {dealt && (
        <div
          className="mt-abs"
          style={{
            left: `${fxp}%`,
            top: `${fyp}%`,
            transform: "translate(-50%, calc(-100% + 20px))",
            display: "flex",
            alignItems: "flex-end",
            gap: two ? 34 : 0,
          }}
        >
          {seat.hands.map((hand, k) => {
            const key = `${roundKey}-${hand.handId}`;
            const won = (hand.payout ?? 0) > 0;
            // Sweep from under the cards: to the plate on a win / push, to the dealer on a loss.
            const collect: CollectTarget = showOutcome
              ? won
                ? { x: Math.round(rx - fx), y: Math.round(ry - fy + 10) }
                : { x: Math.round(DEALER_POS.x - fx), y: Math.round(DEALER_POS.y - fy - 10) }
              : null;
            return (
              <div key={hand.handId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <GhHand
                  hand={veiled(hand, showOutcome)}
                  size="md"
                  meta={two ? (k === 0 ? "left" : "right") : side}
                  hideStake
                  active={turnHand === k}
                  waiting={playing && turnHand !== k && hand.status === "playing"}
                  label={two ? (k === 0 ? "Left" : "Right") : undefined}
                  dealtFrom={v.firstSeen(key, hand.cards.length)}
                  dealFrom={{ x: Math.round(SHOE.x - fx), y: Math.round(SHOE.y - fy + 110) }}
                />
                <Stake
                  key={`${key}-${showOutcome ? "settled" : "play"}`}
                  amount={showOutcome && won ? (hand.payout ?? hand.stake) : hand.stake}
                  lost={!showOutcome && hand.status === "bust"}
                  collect={collect}
                />
              </div>
            );
          })}
        </div>
      )}

      {!dealt && bettingOpen && (preStake > 0 || pending) && (
        <div className="mt-abs" style={{ left: `${fxp}%`, top: `${fyp}%`, transform: "translate(-50%, -50%)" }}>
          {preStake > 0 ? (
            <Stake
              key={`${roundKey}-bet`}
              amount={preStake}
              chips={preChips}
              from={mine ? { x: Math.round(rx - fx), y: Math.round(ry - fy) } : undefined}
            />
          ) : (
            <GhBetSpot amount={0} active label="Your bet" />
          )}
        </div>
      )}

      <div className="mt-abs" style={{ ...plateStyle, zIndex: state.status === "turn" ? 2 : 1 }}>
        <GhSeatPlaque
          layout="stage"
          name={seat.username}
          avatar={ghAvatarFor(seat.username)}
          you={mine}
          status={state.status}
          tag={state.tag ?? undefined}
          hearts={v.hearts[seat.accountId] ?? [null, null, null]}
          balance={mine ? (v.bankroll ?? 0) : 0}
          timer={state.status === "turn" ? { deadline: table.deadline, durationMs: MULTI_TURN_SECONDS * 1000 } : undefined}
          className={mine ? undefined : "[&_.gh-plaque]:hidden"}
        />
      </div>
    </>
  );
}
