"use client";

import type { Action, BossView, HandView, RoundView } from "@21jack/contracts";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  GhButton,
  GhChipSelector,
  GhNewRoundButton,
  GhResultBanner,
  GhTag,
  GhToast,
  ghAvatarFor,
  ghAvatarSrc,
  ghChipsFor,
  type GhChipValue,
  type GhSeatStatus,
  type GhTagTone,
} from "./gh";
import { coachLines } from "./lib/coach";
import { celebrate, celebrateKingslayer } from "./lib/confetti";
import { roundResult } from "./lib/format";
import { useDealerReveal, type DealerReveal } from "./lib/useDealerReveal";
import { GrandHallStage, StageAnchor, useStageAnchors, type KingMood, type StageVariant } from "./scene";
import { Bankroll, StakeSpot, StakeStack, type ChipCollect } from "./table/Chips";
import { DealerHand } from "./table/DealerArea";
import { ACTION_KEYS, DockStatus, MobileBetDock, SoloActionBar } from "./table/Dock";
import { PlayerHand } from "./table/HandSeat";
import { DesktopHud, MobileHud, RimPlate } from "./table/Hud";
import { SOLO_CSS, SOLO_LAYOUT, stageBox } from "./table/layout";
import { ShoeContext, ShoeMark } from "./table/Shoe";
import { CoachOverlay } from "./table/CoachOverlay";

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
  /** Id of an unfinished round picked up on load: shows the "Welcome back" card until dismissed. */
  resumedRoundId?: string | null;
  /** The player's plate on the rim. */
  player?: { name: string; avatar?: string };
  /**
   * `viewport` (default): the stage is sized so stage + controls fit the window height
   * (set `--solo-chrome` / `--solo-chrome-m` to the height of the page chrome around it).
   * `container`: the stage fills its container width (previews).
   */
  fit?: "viewport" | "container";
}

/** The king as he stood before this round settled, shown until the reveal ends. */
function bossBeforeRound(b: BossView): BossView {
  return { ...b, hp: Math.max(0, Math.min(b.maxHp, b.hp - b.delta)), delta: 0, defeated: false };
}

const RANK_WORD: Record<string, string> = { A: "ace", K: "king", Q: "queen", J: "jack" };
/** Grimace held after a boss hit before the king goes back to his idle loop (King board: 1.2 s + the flash). */
const GRIMACE_MS = 1600;
/** How long the BLACKJACK / Kingslayer moment stays over the table. */
const MOMENT_MS = 3600;

interface SoloModel {
  round: RoundView | null;
  reveal: DealerReveal;
  busy: boolean;
  playing: boolean;
  settled: boolean;
  revealing: boolean;
  outcomeShown: boolean;
  activeIndex: number | null;
  activeHand: HandView | undefined;
  allowed: ReadonlySet<Action>;
  recommended: Action | null;
  brokeBy: number;
  pendingChips: GhChipValue[];
  pendingBet: number;
  lastChip: GhChipValue | null;
  balance: number;
  shownBalance: number;
  delta: number | undefined;
  boss: BossView | null;
  bossEvent: string | null;
  result: ReturnType<typeof roundResult>;
  banner: ReactNode;
  toast: ReactNode;
  resume: { total: number; dealer: string } | null;
  phase: string;
  phaseTone: GhTagTone;
  plate: { name: string; avatar: string; hearts: ReadonlyArray<boolean | null>; status: GhSeatStatus; tag?: string };
  dockStatus: { title: string; sub?: string; next: boolean } | null;
  coachOn: boolean;
  onAddChip(v: GhChipValue): void;
  onClear(): void;
  onDeal(): void;
  onAct(a: Action): void;
  onNewRound(): void;
  onResume(): void;
  onCoach(on: boolean): void;
  onVariant(v: StageVariant): void;
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
  resumedRoundId = null,
  player,
  fit = "viewport",
}: TableViewProps) {
  const shoeRef = useRef<HTMLDivElement>(null);
  const [pendingChips, setPendingChips] = useState<GhChipValue[]>([]);
  const pendingBet = pendingChips.reduce((sum, v) => sum + v, 0);
  const lastBet = useRef(0);
  const [localCoach, setLocalCoach] = useState<boolean | null>(null);
  const coachOn = coach ?? localCoach ?? !!round?.coach;
  const setCoach = (on: boolean) => {
    setLocalCoach(on);
    onCoachChange?.(on);
  };
  const [variant, setVariant] = useState<StageVariant>("desktop");
  const [brokeToast, setBrokeToast] = useState<Action | null>(null);
  const [dismissedResume, setDismissedResume] = useState<string | null>(null);
  const [hearts, setHearts] = useState<Array<boolean | null>>([null, null, null]);

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
  const paid = round ? round.hands.reduce((sum, h) => sum + (h.payout ?? 0), 0) : 0;
  // Payouts are already in the balance; hold them back until the outcome is revealed.
  const shownBalance = revealing ? balance - paid : balance;
  const recommended = coachOn && playing ? (round.coach?.recommended ?? null) : null;
  const brokeBy = activeHand && balance < activeHand.stake ? activeHand.stake - balance : 0;
  const showResume = !!playing && round.roundId === resumedRoundId && dismissedResume !== round.roundId;

  // Restore the previous bet when returning to the betting state, capped by the balance.
  const betting = round === null;
  useEffect(() => {
    if (betting) setPendingChips(lastBet.current <= balance ? ghChipsFor(lastBet.current, 40).chips : []);
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
    const net = roundResult(round)?.net ?? 0;
    setHearts((h) => [...h.slice(1), net >= 0]);
    onRevealDone?.(round.roundId);
  }, [round, outcomeShown, onRevealDone]);

  // The king grimaces when he takes boss damage, gloats when the house wins the round.
  const [hitTick, setHitTick] = useState(0);
  const [grimacing, setGrimacing] = useState(false);
  const bossHit = !!bossEvent && (round?.boss?.delta ?? 0) < 0;
  useEffect(() => {
    if (!bossHit) return;
    setHitTick((n) => n + 1);
    setGrimacing(true);
    const id = window.setTimeout(() => setGrimacing(false), GRIMACE_MS);
    return () => window.clearTimeout(id);
  }, [bossHit, bossEvent]);
  const king: KingMood = kingslain || (grimacing && bossHit) ? "grimace" : result && result.net < 0 ? "smug" : "idle";

  useEffect(() => {
    if (!brokeToast) return;
    const id = window.setTimeout(() => setBrokeToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [brokeToast]);

  const act = (action: Action) => {
    if (busy || showResume || !activeHand || activeIndex === null || !allowed.has(action)) return;
    if ((action === "double" || action === "split") && brokeBy > 0) {
      setBrokeToast(action);
      return;
    }
    setBrokeToast(null);
    onAction(action, activeIndex);
  };
  const deal = () => {
    if (busy || pendingBet <= 0 || pendingBet > balance) return;
    lastBet.current = pendingBet;
    onBet(pendingBet);
  };
  const newRound = () => {
    if (!busy && !revealing) onNewRound();
  };

  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest("input, textarea, select")) return;
    const key = e.key.toUpperCase();
    if (showResume) {
      if (key === "ENTER" || key === "ESCAPE" || key === "R") setDismissedResume(round?.roundId ?? null);
      return;
    }
    if (playing) {
      const match = ACTION_KEYS.find((a) => a.key === key);
      if (match) act(match.action);
    } else if (settled && key === "N") {
      newRound();
    }
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // The centre moment (natural / kingslayer) covers the dealer's cards, so it bows out after a beat.
  const [momentDone, setMomentDone] = useState<string | null>(null);
  const momentRound = outcomeShown ? round.roundId : null;
  useEffect(() => {
    if (!momentRound) return;
    const id = window.setTimeout(() => setMomentDone(momentRound), MOMENT_MS);
    return () => window.clearTimeout(id);
  }, [momentRound]);

  // ---- what each region shows (solo states of TableStage / MobileStage) ----
  const natural =
    outcomeShown && round.hands.length === 1 && round.hands[0]!.status === "blackjack" && round.hands[0]!.outcome === "blackjack";
  const banner = momentDone === round?.roundId ? null : kingslain ? (
    <GhResultBanner kind="kingslayer" defeats={round.boss?.defeats} detail="The crown is yours this time" />
  ) : natural ? (
    <GhResultBanner kind="blackjack" detail={`Your ${round.hands[0]!.stake} comes back as ${round.hands[0]!.payout ?? 0}`} />
  ) : null;

  const toast = error ? (
    <GhToast title={error} message="Nothing changed." />
  ) : brokeToast ? (
    <GhToast title={`Not enough credits to ${brokeToast}.`} message="Nothing changed." onDismiss={() => setBrokeToast(null)} />
  ) : null;

  let phase = "Betting";
  let phaseTone: GhTagTone = "torch";
  let plateStatus: GhSeatStatus = "betting";
  let plateTag: string | undefined = "Betting";
  if (playing) {
    phase = split ? `Split · ${activeIndex === 0 ? "left" : "right"} hand` : showResume ? "Round in progress" : "Your turn";
    plateStatus = "turn";
    plateTag = "Your turn";
  } else if (revealing) {
    phase = "Dealer plays";
    phaseTone = "stone";
    plateStatus = "waiting";
    plateTag = "Waiting";
  } else if (settled) {
    phase = natural ? "Natural · paid" : "Settled";
    phaseTone = "gold";
    plateStatus = "done";
    plateTag = undefined;
  }

  const doubled = round?.hands.find((h) => h.status === "doubled");
  const dockStatus: SoloModel["dockStatus"] = revealing
    ? {
        title: reveal.caption ?? "The King plays",
        sub: doubled ? `Doubled · stake ${doubled.stake / 2} → ${doubled.stake} · one card, dealt sideways` : "Dealer stands on 17",
        next: false,
      }
    : outcomeShown && result
      ? {
          title: natural ? "Paid at once" : result.title,
          sub: paid > 0 ? `+${paid} returned to your purse` : "The king keeps the stake",
          next: true,
        }
      : null;

  const up = round?.dealer.cards[0];
  const resume =
    showResume && activeHand ? { total: activeHand.total, dealer: up && !("hidden" in up) ? (RANK_WORD[up.rank] ?? up.rank) : "card" } : null;

  const name = player?.name ?? "You";
  const model: SoloModel = {
    round,
    reveal,
    busy,
    playing: !!playing,
    settled: !!settled,
    revealing: !!revealing,
    outcomeShown: !!outcomeShown,
    activeIndex,
    activeHand,
    allowed,
    recommended,
    brokeBy,
    pendingChips,
    pendingBet,
    lastChip: pendingChips.at(-1) ?? null,
    balance,
    shownBalance,
    delta: outcomeShown && paid > 0 ? paid : undefined,
    boss: bossView,
    bossEvent,
    result,
    banner,
    toast,
    resume,
    phase,
    phaseTone,
    plate: { name, avatar: ghAvatarSrc(player?.avatar ?? ghAvatarFor(name)), hearts, status: plateStatus, tag: plateTag },
    dockStatus,
    coachOn,
    onAddChip: (v) => {
      if (busy || pendingBet + v > balance) return;
      setPendingChips((c) => [...c, v]);
    },
    onClear: () => setPendingChips([]),
    onDeal: deal,
    onAct: act,
    onNewRound: newRound,
    onResume: () => setDismissedResume(round?.roundId ?? null),
    onCoach: setCoach,
    onVariant: setVariant,
  };

  return (
    <ShoeContext.Provider value={shoeRef}>
      <style href="21jack-solo-table" precedence="default">
        {SOLO_CSS}
      </style>
      <div className={fit === "container" ? "solo-fit--container" : "solo-fit"}>
        <GrandHallStage variant="auto" king={king} kingHit={hitTick} label="The king's solo table">
          <ShoeMark shoeRef={shoeRef} />
          <SoloOverlays m={model} />
        </GrandHallStage>
      </div>
    </ShoeContext.Provider>
  );
}

/** Everything drawn over the hall, laid out for the variant on screen. */
function SoloOverlays({ m }: { m: SoloModel }) {
  const { variant } = useStageAnchors();
  const { onVariant } = m;
  useEffect(() => onVariant(variant), [variant, onVariant]);
  const L = SOLO_LAYOUT[variant];
  const mobile = variant === "mobile";
  const round = m.round;
  const hands = round?.hands ?? [];
  const n = Math.max(1, hands.length);
  const split = hands.length > 1;

  // One stake spot per hand slot; slot 0 is the same element from betting to settlement.
  const spots = round
    ? hands.map((hand, i) => {
        const outcome = m.outcomeShown ? hand.outcome : undefined;
        const collect: ChipCollect = !outcome ? null : outcome === "loss" ? "dealer" : "player";
        const amount = outcome && outcome !== "loss" ? (hand.payout ?? hand.stake) : hand.stake;
        return { i, amount, chips: undefined as GhChipValue[] | undefined, collect, pill: hand.stake };
      })
    : [{ i: 0, amount: m.pendingBet, chips: m.pendingChips, collect: null as ChipCollect, pill: m.pendingBet }];

  return (
    <>
      {mobile ? <MobileHud {...hudProps(m)} /> : <DesktopHud {...hudProps(m)} />}

      {round && (
        <StageAnchor name="dealerCards" offset={L.dealerOffset}>
          <div className="solo-zoom">
            <DealerHand round={round} reveal={m.reveal} cardWidth={L.dealerCardWidth} showTag={!mobile} />
          </div>
        </StageAnchor>
      )}

      <StageAnchor name="seat3" offset={L.bankrollOffset}>
        <div className="solo-zoom">
          <Bankroll balance={round ? m.shownBalance : Math.max(0, m.shownBalance - m.pendingBet)} holdGains={m.outcomeShown} />
        </div>
      </StageAnchor>

      {spots.map((s) => (
        <StageAnchor key={`spot-${s.i}`} name="seat3" offset={L.stake(s.i, n)}>
          <div className="solo-zoom">
            <StakeSpot
              ring={!round}
              active={!round && m.pendingBet > 0}
              amount={s.pill}
              pillSide={split && s.i === 0 ? "left" : "right"}
              label="Bet"
              collected={s.collect !== null}
            >
              {s.amount > 0 && (
                <StakeStack amount={s.amount} chips={s.chips} collect={s.collect} dealerDistance={mobile ? 150 : 170} />
              )}
            </StakeSpot>
          </div>
        </StageAnchor>
      ))}

      {!round && mobile && (
        <StageAnchor name="seat3" offset={{ y: L.stake(0, 1).y - 54 }}>
          <div className="solo-zoom">
            <GhTag tone="ghost">Place your bet</GhTag>
          </div>
        </StageAnchor>
      )}

      {hands.map((hand, i) => {
        const p = L.stake(i, n);
        return (
          <StageAnchor key={hand.handId} name="seat3" align="bottom" offset={{ x: p.x, y: p.y - L.cardsAboveStake }}>
            <div className="solo-zoom">
              <PlayerHand
                hand={hand}
                index={i}
                split={split}
                active={m.playing && m.activeIndex === i}
                waiting={m.playing && m.activeIndex !== null && m.activeIndex < i}
                settled={m.outcomeShown}
                cardWidth={L.handCardWidth(hand.cards.length, split)}
                meta={L.meta(i, n)}
                resultOnCards={L.resultOnCards}
              />
            </div>
          </StageAnchor>
        );
      })}

      <StageAnchor name="seat3Rim" align="top" offset={L.plateOffset}>
        <div className="solo-zoom">
          <RimPlate {...m.plate} balance={m.shownBalance} />
        </div>
      </StageAnchor>

      {m.banner && (
        <div style={{ ...stageBox({ left: "50%", top: mobile ? 196 : 308 }), transform: "translate(-50%, -50%)", zIndex: 5, pointerEvents: "none" }}>
          <div className="solo-zoom" style={mobile ? { zoom: "calc(var(--gh-scale, 1) * .62)" } : undefined}>
            {m.banner}
          </div>
        </div>
      )}

      {m.toast && (
        <div style={{ ...stageBox({ left: "50%", top: mobile ? 116 : 92 }), transform: "translateX(-50%)", zIndex: 6, width: "max-content" }}>
          <div className="solo-zoom" style={{ maxWidth: mobile ? 366 : 520 }}>
            {m.toast}
          </div>
        </div>
      )}

      {/* Claudalf: overlay in the bottom-right corner (desktop) / portrait + sheet (mobile). */}
      <CoachOverlay on={m.coachOn} lines={coachLines(round)} dockTop={m.round ? 722 : 640} onCoach={m.onCoach} />

      {!m.resume && (mobile ? <MobileDock m={m} /> : <DesktopDock m={m} />)}

      {m.resume && (
        <>
          <div className="solo-veil" style={{ zIndex: 7 }} />
          <div style={{ ...stageBox({ left: "50%", top: mobile ? "42%" : "45%" }), transform: "translate(-50%, -50%)", zIndex: 8 }}>
            <div className="solo-zoom">
              <div
                className="gh-frame gh-frame--wood gh-notch"
                role="dialog"
                aria-modal="true"
                aria-labelledby="solo-resume-title"
                style={{
                  width: mobile ? 340 : 460,
                  boxSizing: "border-box",
                  padding: mobile ? "22px 20px 24px" : "28px 32px 30px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "center",
                }}
              >
                <span className="gh-eyebrow">Welcome back</span>
                <h2 id="solo-resume-title" className="gh-display" style={{ margin: 0, fontSize: mobile ? 28 : 36, color: "var(--gh-gold-200)", textShadow: "0 3px 0 #1A1014" }}>
                  Round in progress
                </h2>
                <p style={{ margin: 0, fontSize: 15, color: "var(--gh-cream-200)", lineHeight: 1.5 }}>
                  Your {m.resume.total} against the dealer&apos;s {m.resume.dealer} is waiting where you left it. Nothing changed while you were away.
                </p>
                <GhButton size="lg" style={{ marginTop: 6 }} onClick={m.onResume} autoFocus>
                  Resume
                </GhButton>
              </div>
            </div>
          </div>
        </>
      )}

      <div
        className="gh-footnote"
        style={{ ...stageBox({ left: "50%", bottom: mobile ? 8 : 3 }), transform: "translateX(-50%)", fontSize: 10, letterSpacing: ".2em", pointerEvents: "none", whiteSpace: "nowrap" }}
      >
        Fictional credits only
      </div>
    </>
  );
}

function hudProps(m: SoloModel) {
  return { phase: m.phase, phaseTone: m.phaseTone, balance: m.shownBalance, delta: m.delta, boss: m.boss, bossEventKey: m.bossEvent };
}

function nextButton(m: SoloModel) {
  return (
    <GhNewRoundButton disabled={m.busy || m.revealing} onClick={m.onNewRound} aria-keyshortcuts="N">
      Next hand
    </GhNewRoundButton>
  );
}

/** Desktop dock, over the bottom of the stage (TableStage): chip tray, action bar or status line. */
function DesktopDock({ m }: { m: SoloModel }) {
  let body: ReactNode = null;
  if (!m.round) {
    body = (
      <GhChipSelector
        layout="stage"
        bet={m.pendingBet}
        balance={m.balance}
        selected={m.lastChip}
        onAdd={m.onAddChip}
        onClear={m.onClear}
        onSubmit={m.onDeal}
        submitDisabled={m.pendingBet <= 0 || m.pendingBet > m.balance}
        loading={m.busy}
        locked={m.busy}
        hint={m.balance < 5 ? "Purse empty · add credits" : undefined}
      />
    );
  } else if (m.playing && m.activeHand) {
    body = (
      <SoloActionBar
        allowed={m.allowed}
        onAction={m.onAct}
        locked={m.busy || !!m.resume}
        recommended={m.recommended}
        stake={m.activeHand.stake}
        brokeBy={m.brokeBy}
        keepTotal={m.activeHand.total}
      />
    );
  } else if (m.dockStatus) {
    body = <DockStatus title={m.dockStatus.title} sub={m.dockStatus.sub} action={m.dockStatus.next ? nextButton(m) : undefined} />;
  }
  if (!body) return null;
  return (
    <div style={{ ...stageBox({ left: "50%", bottom: 16 }), transform: "translateX(-50%)", zIndex: 3 }}>
      <div className="solo-dock-zoom">{body}</div>
    </div>
  );
}

/** Mobile dock (MobileStage): tray at 640 px, actions / status at 722 px. */
function MobileDock({ m }: { m: SoloModel }) {
  if (!m.round) {
    return (
      <div style={{ ...stageBox({ left: "50%", top: 640 }), transform: "translateX(-50%)", zIndex: 3 }}>
        <div className="solo-zoom">
          <MobileBetDock
            bet={m.pendingBet}
            balance={m.balance}
            selected={m.lastChip}
            locked={m.busy}
            loading={m.busy}
            onAdd={m.onAddChip}
            onClear={m.onClear}
            onDeal={m.onDeal}
          />
        </div>
      </div>
    );
  }
  let body: ReactNode = null;
  if (m.playing && m.activeHand) {
    body = (
      <SoloActionBar
        compact
        allowed={m.allowed}
        onAction={m.onAct}
        locked={m.busy || !!m.resume}
        recommended={m.recommended}
        stake={m.activeHand.stake}
        brokeBy={m.brokeBy}
        keepTotal={m.activeHand.total}
      />
    );
  } else if (m.dockStatus) {
    body = <DockStatus compact title={m.dockStatus.title} sub={m.dockStatus.sub} action={m.dockStatus.next ? nextButton(m) : undefined} />;
  }
  if (!body) return null;
  return (
    <div style={{ ...stageBox({ left: "50%", top: 722 }), transform: "translateX(-50%)", zIndex: 3 }}>
      <div className="solo-zoom">{body}</div>
    </div>
  );
}
