"use client";

import type { Action, BossView, RoundView } from "@21jack/contracts";
import { useEffect, useRef, useState } from "react";
import { coachLines } from "./lib/coach";
import { celebrate, celebrateKingslayer } from "./lib/confetti";
import { roundResult } from "./lib/format";
import { useDealerReveal } from "./lib/useDealerReveal";
import {
  ActionButton,
  ActionIcon,
  BalancePill,
  BankrollStacks,
  BossBar,
  ChipButton,
  ChipStack,
  chipsFor,
  CoachPanel,
  CoachSummon,
  CoachToggle,
  CrownSigil,
  KingslayerBanner,
  Panel,
  ResultBanner,
  type ChipValue,
} from "./primitives";
import { DealerArea, DealerThrone } from "./table/DealerArea";
import { BettingSeat, HandSeat } from "./table/HandSeat";
import { Shoe, ShoeContext } from "./table/Shoe";

export interface TableViewProps {
  round: RoundView | null;
  balance: number;
  busy: boolean;
  error: string | null;
  onBet(amount: number): void;
  onAction(action: Action, handIndex: number): void;
  onNewRound(): void;
  /** Boss state for the betting screen (no round yet); a round's own `boss` takes precedence. */
  boss?: BossView | null;
  /** Coach Mode on/off. Uncontrolled (local state) when omitted, defaulting to whether the round has coach data. */
  coach?: boolean;
  onCoachChange?(on: boolean): void;
  /** Id of a round this client just started: if it arrives already settled (naturals), the dealer reveal is staged. */
  freshRoundId?: string | null;
  /** Called once per settled round when the dealer reveal has finished and the outcome is on screen. */
  onRevealDone?(roundId: string): void;
}

const BET_CHIPS: ChipValue[] = [5, 10, 25, 100];

// Each move has its own colour and icon from the theme palette so players tell them apart at a glance.
const ACTIONS: { action: Action; label: string; key: string; variant: "felt" | "carpet" | "gold" | "wood" }[] = [
  { action: "hit", label: "Hit", key: "H", variant: "felt" },
  { action: "stand", label: "Stand", key: "S", variant: "carpet" },
  { action: "double", label: "Double", key: "D", variant: "gold" },
  { action: "split", label: "Split", key: "P", variant: "wood" },
];

/** The king as he stood before this round settled, shown until the reveal ends. */
function bossBeforeRound(b: BossView): BossView {
  return { ...b, hp: Math.max(0, Math.min(b.maxHp, b.hp - b.delta)), delta: 0, defeated: false };
}

export function TableView({
  round,
  balance,
  busy,
  error,
  onBet,
  onAction,
  onNewRound,
  boss = null,
  coach,
  onCoachChange,
  freshRoundId = null,
  onRevealDone,
}: TableViewProps) {
  const shoeRef = useRef<HTMLDivElement>(null);
  const [pendingChips, setPendingChips] = useState<ChipValue[]>([]);
  const pendingBet = pendingChips.reduce((sum, v) => sum + v, 0);
  const lastBet = useRef(0);
  const [localCoach, setLocalCoach] = useState<boolean | null>(null);
  const coachOn = coach ?? localCoach ?? !!round?.coach;
  const setCoach = (on: boolean) => {
    setLocalCoach(on);
    onCoachChange?.(on);
  };

  const playing = round?.status === "player_turn";
  const settled = round?.status === "settled";
  const reveal = useDealerReveal(round, freshRoundId);
  const revealing = settled && !reveal.done;
  const outcomeShown = settled && reveal.done;
  const activeIndex = round?.activeHandIndex ?? null;
  const activeHand = playing && activeIndex !== null ? round.hands[activeIndex] : undefined;
  const allowed = new Set(activeHand?.allowedActions ?? []);
  const result = round && outcomeShown ? roundResult(round) : null;
  const split = (round?.hands.length ?? 0) > 1;
  const bossView = revealing && round.boss ? bossBeforeRound(round.boss) : (round?.boss ?? boss);
  const bossEvent = outcomeShown && round.boss && round.boss.delta !== 0 ? round.roundId : null;
  const kingslain = outcomeShown && round.boss?.defeated === true;
  // Payouts are already in the balance; hold them back until the outcome is revealed.
  const shownBalance = revealing ? balance - round.hands.reduce((sum, h) => sum + (h.payout ?? 0), 0) : balance;
  const onTable = round ? round.hands.reduce((sum, h) => sum + h.stake, 0) : pendingBet;
  const recommended = coachOn && playing ? (round.coach?.recommended ?? null) : null;

  // Restore the previous bet when returning to the betting state, capped by the balance.
  const betting = round === null;
  useEffect(() => {
    if (betting) setPendingChips(lastBet.current <= balance ? chipsFor(lastBet.current) : []);
    // Only when entering the betting state; balance changes must not wipe the chips being placed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betting]);

  const celebrated = useRef<string | null>(null);
  useEffect(() => {
    if (!round || !result || celebrated.current === round.roundId) return;
    celebrated.current = round.roundId;
    if (result.net > 0) void celebrate(result.tone === "blackjack");
    if (round.boss?.defeated) void celebrateKingslayer();
  }, [round, result]);

  const revealNotified = useRef<string | null>(null);
  useEffect(() => {
    if (!round || !outcomeShown || revealNotified.current === round.roundId) return;
    revealNotified.current = round.roundId;
    onRevealDone?.(round.roundId);
  }, [round, outcomeShown, onRevealDone]);

  const act = (action: Action) => {
    if (busy || !activeHand || activeIndex === null || !allowed.has(action)) return;
    onAction(action, activeIndex);
  };
  const deal = () => {
    if (busy || pendingBet <= 0 || pendingBet > balance) return;
    lastBet.current = pendingBet;
    onBet(pendingBet);
  };

  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest("input, textarea, select")) return;
    const key = e.key.toUpperCase();
    if (playing) {
      const match = ACTIONS.find((a) => a.key === key);
      if (match) act(match.action);
    } else if (settled && key === "N") {
      if (!busy && !revealing) onNewRound();
    }
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <ShoeContext.Provider value={shoeRef}>
      <div className={`mx-auto flex w-full flex-col gap-3 bg-stone-dark p-2 font-display text-parchment sm:gap-4 sm:p-4 ${coachOn ? "max-w-4xl lg:max-w-6xl" : "max-w-4xl"}`}>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CrownSigil className="h-8 w-8 sm:h-10 sm:w-10" />
            <h2 className="font-display text-xl font-bold text-gold-light sm:text-3xl">The King&apos;s Table</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="border-2 border-ink bg-ink/70 px-2 py-1 font-pixel text-xs text-gold-light sm:text-sm">
              Bet {onTable}
            </span>
            <BalancePill balance={shownBalance} />
          </div>
        </header>

        {bossView && (
          <BossBar
            hp={bossView.hp}
            maxHp={bossView.maxHp}
            delta={bossEvent ? bossView.delta : 0}
            defeats={bossView.defeats}
            eventKey={bossEvent}
          />
        )}

        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col">
            <DealerThrone eventKey={bossEvent} delta={bossEvent ? (round?.boss?.delta ?? 0) : 0} />

            <div className="voxel-block bg-wood p-1.5 sm:p-2.5">
              <div className="relative flex min-h-[22rem] flex-col items-center justify-between gap-2 overflow-hidden border-4 border-wood-dark bg-felt bg-[radial-gradient(ellipse_at_50%_35%,var(--color-felt)_0%,var(--color-felt-dark)_100%)] px-2 py-3 sm:min-h-[27rem] sm:gap-3 sm:px-6">
                <Shoe shoeRef={shoeRef} />

                {kingslain && round.boss && (
                  <div className="pointer-events-none absolute inset-x-0 top-[22%] z-20 flex justify-center px-2">
                    <KingslayerBanner key={round.roundId} defeats={round.boss.defeats} />
                  </div>
                )}

                <DealerArea round={round} reveal={reveal} />

                {/* Fixed-height slot: the result banner overflows it (centred) instead of pushing the hands down. */}
                <div className="relative flex h-16 w-full items-center justify-center sm:h-24" aria-live="polite">
                  {result ? (
                    <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
                      <ResultBanner key={round?.roundId} tone={result.tone} title={result.title} detail={result.detail} />
                    </div>
                  ) : revealing ? null : (
                    <p className="select-none text-center font-pixel text-[10px] uppercase tracking-[0.15em] text-gold/70">
                      Dealer stands on 17 · Wins pay 1:1
                    </p>
                  )}
                </div>

                {/* Hands row: padded so it never runs under the bankroll (symmetric on sm+ to keep the circle centred). */}
                <div className="flex w-full items-start justify-center pr-24 sm:px-28">
                  {round ? (
                    <div className="flex min-w-0 flex-1 items-start justify-center">
                      {round.hands.map((hand, i) => (
                        // Split hands get equal fixed columns so a hand growing a card never moves its neighbour's circle.
                        <div key={hand.handId} className={split ? "flex min-w-0 flex-1 basis-0 justify-center" : "contents"}>
                          <HandSeat
                            hand={outcomeShown ? hand : { ...hand, outcome: undefined, payout: undefined }}
                            index={i}
                            split={split}
                            settled={!!outcomeShown}
                            active={!!playing && activeIndex === i}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start justify-center">
                      <BettingSeat active={pendingBet > 0} label={pendingBet > 0 ? `Bet ${pendingBet}` : "Place your bet"}>
                        <ChipStack amount={pendingBet} chips={pendingChips} />
                      </BettingSeat>
                    </div>
                  )}
                </div>

                {/* Anchored to the felt corner, outside the hands flow: stack changes never move anything. */}
                <BankrollStacks
                  balance={round ? shownBalance : Math.max(0, shownBalance - pendingBet)}
                  holdGains={!!outcomeShown}
                  className="absolute bottom-3 right-2 sm:right-3"
                />
              </div>
            </div>
          </div>

          {coachOn ? (
            <CoachPanel lines={coachLines(round)} onDismiss={() => setCoach(false)} className="lg:mt-12 lg:w-72 lg:shrink-0" />
          ) : (
            <CoachSummon onSummon={() => setCoach(true)} className="self-end lg:mt-12" />
          )}
        </div>

        <Panel tone="stone" className="p-3">
          {error && (
            <p role="alert" className="mb-3 border-2 border-ink bg-carpet px-3 py-2 text-center font-display text-base">
              {error}
            </p>
          )}

          {round === null && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {BET_CHIPS.map((v) => (
                  <ChipButton
                    key={v}
                    value={v}
                    disabled={busy || pendingBet + v > balance}
                    onClick={() => setPendingChips((c) => [...c, v])}
                  />
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <ActionButton variant="ghost" disabled={busy || pendingBet === 0} onClick={() => setPendingChips([])}>
                  Clear
                </ActionButton>
                <ActionButton
                  variant="gold"
                  disabled={busy || pendingBet <= 0 || pendingBet > balance}
                  onClick={deal}
                  className="min-w-32"
                >
                  {busy ? "Dealing…" : `Deal ${pendingBet > 0 ? pendingBet : ""}`.trim()}
                </ActionButton>
              </div>
              <CoachToggle on={coachOn} onChange={setCoach} />
              {balance === 0 && !busy && (
                <p className="text-center text-base text-parchment/80">Your purse is empty. Visit the treasury to add credits.</p>
              )}
            </div>
          )}

          {playing && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="toolbar" aria-label="Actions">
              {ACTIONS.map(({ action, label, key, variant }) => (
                <ActionButton
                  key={action}
                  variant={variant}
                  hotkey={key}
                  glow={recommended === action}
                  disabled={busy || !allowed.has(action)}
                  onClick={() => act(action)}
                  aria-keyshortcuts={key}
                >
                  <ActionIcon action={action} />
                  {label}
                </ActionButton>
              ))}
            </div>
          )}

          {settled && (
            <div className="flex justify-center">
              <ActionButton variant="gold" className="min-w-40" disabled={busy || revealing} onClick={onNewRound} hotkey="N">
                New round
              </ActionButton>
            </div>
          )}
        </Panel>
      </div>
    </ShoeContext.Provider>
  );
}
