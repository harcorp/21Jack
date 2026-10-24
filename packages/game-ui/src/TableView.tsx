"use client";

import type { Action, BossView, RoundView } from "@21jack/contracts";
import { useEffect, useRef, useState } from "react";
import { coachLines } from "./lib/coach";
import { celebrate, celebrateKingslayer } from "./lib/confetti";
import { roundResult } from "./lib/format";
import {
  ActionButton,
  ActionIcon,
  BalancePill,
  BetCircle,
  BossBar,
  ChipButton,
  ChipStack,
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
import { HandSeat } from "./table/HandSeat";
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
}

const BET_CHIPS: ChipValue[] = [5, 10, 25, 100];

// Each move has its own colour and icon from the theme palette so players tell them apart at a glance.
const ACTIONS: { action: Action; label: string; key: string; variant: "felt" | "carpet" | "gold" | "wood" }[] = [
  { action: "hit", label: "Hit", key: "H", variant: "felt" },
  { action: "stand", label: "Stand", key: "S", variant: "carpet" },
  { action: "double", label: "Double", key: "D", variant: "gold" },
  { action: "split", label: "Split", key: "P", variant: "wood" },
];

export function TableView({ round, balance, busy, error, onBet, onAction, onNewRound, boss = null, coach, onCoachChange }: TableViewProps) {
  const shoeRef = useRef<HTMLDivElement>(null);
  const [pendingBet, setPendingBet] = useState(0);
  const lastBet = useRef(0);
  const [localCoach, setLocalCoach] = useState<boolean | null>(null);
  const coachOn = coach ?? localCoach ?? !!round?.coach;
  const setCoach = (on: boolean) => {
    setLocalCoach(on);
    onCoachChange?.(on);
  };

  const playing = round?.status === "player_turn";
  const settled = round?.status === "settled";
  const activeIndex = round?.activeHandIndex ?? null;
  const activeHand = playing && activeIndex !== null ? round.hands[activeIndex] : undefined;
  const allowed = new Set(activeHand?.allowedActions ?? []);
  const result = round ? roundResult(round) : null;
  const split = (round?.hands.length ?? 0) > 1;
  const bossView = round?.boss ?? boss;
  const bossEvent = settled && round.boss && round.boss.delta !== 0 ? round.roundId : null;
  const kingslain = settled && round.boss?.defeated === true;
  const onTable = round ? round.hands.reduce((sum, h) => sum + h.stake, 0) : pendingBet;
  const recommended = coachOn && playing ? (round.coach?.recommended ?? null) : null;

  // Restore the previous bet when returning to the betting state, capped by the balance.
  const betting = round === null;
  useEffect(() => {
    if (betting) setPendingBet(lastBet.current <= balance ? lastBet.current : 0);
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
      if (!busy) onNewRound();
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
            <BalancePill balance={balance} />
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

            <div className="voxel-block bg-wood p-2 sm:p-3">
              <div className="relative flex min-h-[26rem] flex-col items-center justify-between gap-3 overflow-hidden border-4 border-wood-dark bg-felt bg-[radial-gradient(ellipse_at_50%_35%,var(--color-felt)_0%,var(--color-felt-dark)_100%)] px-2 py-4 sm:min-h-[32rem] sm:px-6">
                <Shoe shoeRef={shoeRef} />

                {kingslain && round.boss && (
                  <div className="pointer-events-none absolute inset-x-0 top-[22%] z-20 flex justify-center px-2">
                    <KingslayerBanner key={round.roundId} defeats={round.boss.defeats} />
                  </div>
                )}

                <DealerArea round={round} />

                <div className="flex min-h-20 items-center justify-center" aria-live="polite">
                  {result ? (
                    <ResultBanner key={round?.roundId} tone={result.tone} title={result.title} detail={result.detail} />
                  ) : (
                    <p className="select-none text-center font-pixel text-[10px] uppercase tracking-[0.2em] text-gold/70 sm:text-xs">
                      Dealer stands on all 17s
                      <br />
                      Wins and blackjack pay even money
                    </p>
                  )}
                </div>

                {round ? (
                  <div className={`flex w-full items-start justify-center ${split ? "gap-3 sm:gap-10" : ""}`}>
                    {round.hands.map((hand, i) => (
                      <HandSeat
                        key={hand.handId}
                        hand={hand}
                        index={i}
                        split={split}
                        settled={!!settled}
                        active={!!playing && activeIndex === i}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="min-h-20 sm:min-h-28" />
                    <BetCircle active={pendingBet > 0} label={pendingBet > 0 ? `Bet ${pendingBet}` : "Place your bet"}>
                      <ChipStack amount={pendingBet} />
                    </BetCircle>
                  </div>
                )}
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
                    onClick={() => setPendingBet((b) => b + v)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <ActionButton variant="ghost" disabled={busy || pendingBet === 0} onClick={() => setPendingBet(0)}>
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
              <ActionButton variant="gold" className="min-w-40" disabled={busy} onClick={onNewRound} hotkey="N">
                New round
              </ActionButton>
            </div>
          )}
        </Panel>
      </div>
    </ShoeContext.Provider>
  );
}
