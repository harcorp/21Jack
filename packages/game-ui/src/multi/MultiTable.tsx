"use client";

import {
  MULTI_BET_SECONDS,
  MULTI_RESULT_SECONDS,
  MULTI_TURN_SECONDS,
  newId,
  TableView as TableViewSchema,
  type Action,
  type TableView,
} from "@21jack/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionButton,
  ActionIcon,
  BossBar,
  BossFx,
  ChipButton,
  DealerKing,
  HandTotalBadge,
  KingslayerBanner,
  PlayingCard,
  ResultBanner,
  type BannerTone,
  type ChipValue,
} from "../primitives";
import { GameApiError, requestJson } from "../lib/api";
import { signed } from "../lib/format";
import { MultiSeat } from "./MultiSeat";

const POLL_MS = 1000;
const BET_CHIPS: ChipValue[] = [5, 10, 25, 100];
const ACTIONS: { action: Action; label: string; variant: "felt" | "carpet" | "gold" | "wood" }[] = [
  { action: "hit", label: "Hit", variant: "felt" },
  { action: "stand", label: "Stand", variant: "carpet" },
  { action: "double", label: "Double", variant: "gold" },
  { action: "split", label: "Split", variant: "wood" },
];

export interface MultiTableProps {
  apiBase?: string;
  /** Wallet balance known by the page; used until the table reports one (the table only knows it after a bet). */
  balance?: number | null;
  onBalanceChange?: (balance: number) => void;
}

type Status = "loading" | "ready" | "closed";

function secondsLeft(deadline: string | null, now: number) {
  if (!deadline) return null;
  return Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000));
}

function yourResult(table: TableView): { tone: BannerTone; title: string; detail: string } | null {
  if (table.phase !== "settled" || table.you.seat === null) return null;
  const seat = table.seats[table.you.seat];
  if (!seat || seat.hands.length === 0) return null;
  const staked = seat.hands.reduce((sum, h) => sum + h.stake, 0);
  const paid = seat.payout ?? seat.hands.reduce((sum, h) => sum + (h.payout ?? 0), 0);
  const net = paid - staked;
  const detail = `${signed(net)} credits`;
  if (seat.hands.some((h) => h.outcome === "blackjack") && net > 0) return { tone: "blackjack", title: "Blackjack!", detail };
  if (net > 0) return { tone: "win", title: "You win!", detail };
  if (net < 0) return { tone: "loss", title: "The king wins", detail };
  return { tone: "push", title: "Push", detail: "Stake returned" };
}

export function MultiTable({ apiBase = "/api/multi", balance: walletBalance = null, onBalanceChange }: MultiTableProps) {
  const [table, setTable] = useState<TableView | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Chips clicked for the next bet, in order, so the stack in the seat grows chip by chip.
  const [pendingChips, setPendingChips] = useState<ChipValue[]>([]);
  // The chips of the bet that was just placed, so the stack keeps its order once the server confirms it.
  const [placedChips, setPlacedChips] = useState<ChipValue[]>([]);
  const bet = pendingChips.reduce((sum, v) => sum + v, 0);
  const [now, setNow] = useState(() => Date.now());
  const seq = useRef(0);
  const applied = useRef(0);

  const apply = useCallback((raw: unknown, requestSeq: number) => {
    if (requestSeq < applied.current) return;
    const parsed = TableViewSchema.safeParse(raw);
    if (!parsed.success) {
      setError("The table sent something we could not read.");
      return;
    }
    applied.current = requestSeq;
    setTable(parsed.data);
    setStatus("ready");
  }, []);

  const poll = useCallback(async () => {
    const mine = ++seq.current;
    try {
      apply(await requestJson<unknown>(`${apiBase}/table`, { retry: false }), mine);
    } catch {
      setStatus((s) => (s === "ready" ? s : "closed"));
    }
  }, [apiBase, apply]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      void poll();
      timer = setInterval(() => void poll(), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? stop() : start());
    if (document.visibilityState !== "hidden") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const tableBalance = table?.you.balance ?? null;
  useEffect(() => {
    if (tableBalance !== null) onBalanceChange?.(tableBalance);
  }, [tableBalance, onBalanceChange]);
  const balance = tableBalance ?? walletBalance;

  const youSeatNow = table?.you.seat ?? null;
  const mySeatNow = youSeatNow === null ? null : (table?.seats[youSeatNow] ?? null);
  const bettingOpen =
    mySeatNow != null && (table?.phase === "waiting" || table?.phase === "betting") && mySeatNow.bet === null;
  // Drop unplaced chips when the betting window closes (or we lose the seat).
  useEffect(() => {
    if (!bettingOpen) setPendingChips([]);
  }, [bettingOpen]);

  const send = useCallback(
    async (path: string, body: object, friendly409?: string) => {
      setBusy(true);
      setError(null);
      const mine = ++seq.current;
      try {
        apply(await requestJson<unknown>(`${apiBase}/${path}`, { method: "POST", body: JSON.stringify(body) }), mine);
        return true;
      } catch (err) {
        if (err instanceof GameApiError && err.status === 409 && friendly409) setError(friendly409);
        else setError(err instanceof Error ? err.message : "Something went wrong.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [apiBase, apply],
  );

  if (status === "loading" && !table) {
    return <p className="p-6 text-center font-pixel text-sm text-parchment">Opening the hall…</p>;
  }
  if (!table) {
    return (
      <div className="gold-frame bg-stone-dark p-6 text-center text-parchment" role="status">
        <p className="font-display text-xl text-gold-light">The shared table is not open yet</p>
        <p className="mt-2 text-sm">The King is still setting up the hall. This page retries every second.</p>
      </div>
    );
  }

  const youSeat = table.you.seat;
  const mySeat = youSeat === null ? null : table.seats[youSeat];
  const seated = mySeat != null;
  const left = secondsLeft(table.deadline, now);
  const yourTurn = table.phase === "playing" && table.turn !== null && table.turn.seat === youSeat;
  const turnSeat = table.turn ? table.seats[table.turn.seat] : null;
  const canBet = seated && (table.phase === "waiting" || table.phase === "betting") && mySeat.bet === null;
  const result = yourResult(table);
  const settled = table.phase === "settled";
  const bossKey = settled && table.boss.delta !== 0 ? `round-${table.roundNumber}` : null;
  const dealerTotal = table.dealer.total;
  const windowSeconds =
    table.phase === "betting" ? MULTI_BET_SECONDS : table.phase === "playing" ? MULTI_TURN_SECONDS : MULTI_RESULT_SECONDS;

  let headline: string;
  if (table.phase === "waiting") headline = "Waiting for the first bet";
  else if (table.phase === "betting") headline = left !== null ? `Dealing in ${left}s` : "Place your bets";
  else if (table.phase === "playing")
    headline = yourTurn ? "Your move" : turnSeat ? `Waiting for ${turnSeat.username}…` : "The King plays";
  else headline = left !== null ? `Next round in ${left}s` : "Round over";

  async function placeBet() {
    if (bet <= 0) return;
    const chips = pendingChips;
    if (await send("bet", { bet, requestId: newId() })) {
      setPlacedChips(chips);
      setPendingChips([]);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <BossBar
        hp={table.boss.hp}
        maxHp={table.boss.maxHp}
        delta={settled ? table.boss.delta : 0}
        defeats={table.boss.defeats}
        eventKey={bossKey}
        name="The table King"
      />
      {settled && table.boss.defeated && <KingslayerBanner defeats={table.boss.defeats} />}

      <div className="voxel-block bg-wood-dark p-2 sm:p-3">
        <div className="relative flex min-h-[26rem] flex-col items-center gap-4 overflow-hidden border-4 border-wood-dark bg-felt bg-[radial-gradient(ellipse_at_50%_25%,var(--color-felt)_0%,var(--color-felt-dark)_100%)] px-2 py-4 sm:px-6">
          <div className="flex flex-col items-center gap-2">
            <BossFx eventKey={bossKey} delta={table.boss.delta}>
              <DealerKing className="h-16 w-16 drop-shadow-[0_6px_0_rgb(0_0_0/0.45)] sm:h-24 sm:w-24" />
            </BossFx>
            <div className="flex min-h-20 items-end sm:min-h-28" role="group" aria-label="Dealer cards">
              {table.dealer.cards.map((card, i) => (
                <div key={`${table.roundNumber}-d-${i}`} className={i === 0 ? "" : "-ml-9 sm:-ml-12"}>
                  <PlayingCard card={"hidden" in card ? undefined : card} flipDelay={0.1} />
                </div>
              ))}
            </div>
            {table.dealer.cards.length > 0 && (
              <HandTotalBadge
                label={`Dealer ${dealerTotal === null ? "?" : dealerTotal > 21 ? `Bust ${dealerTotal}` : dealerTotal}`}
                tone={dealerTotal !== null && dealerTotal > 21 ? "bad" : "neutral"}
              />
            )}
          </div>

          <p className="bg-ink/70 px-3 py-1 text-center font-pixel text-xs text-gold-light sm:text-sm" aria-live="polite">
            {headline}
          </p>

          {result && (
            <div className="w-full max-w-sm">
              <ResultBanner tone={result.tone} title={result.title} detail={result.detail} />
            </div>
          )}

          <ol className="mt-auto grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5" aria-label="Seats">
            {table.seats.map((seat, i) => (
              <MultiSeat
                key={i}
                index={i}
                seat={seat}
                mine={i === youSeat}
                pendingChips={i === youSeat && canBet ? pendingChips : null}
                placedChips={i === youSeat ? placedChips : null}
                bankroll={i === youSeat && balance !== null ? Math.max(0, balance - (canBet ? bet : 0)) : null}
                turnHand={table.phase === "playing" && table.turn?.seat === i ? table.turn.handIndex : null}
                secondsLeft={table.phase === "playing" && table.turn?.seat === i ? left : null}
                windowSeconds={windowSeconds}
                settled={settled}
              />
            ))}
          </ol>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-2 border-ink bg-carpet px-3 py-2 font-pixel text-xs text-parchment">
          {error}
        </p>
      )}

      <div className="flex flex-col items-center gap-3">
        {!seated ? (
          <ActionButton variant="gold" disabled={busy} onClick={() => void send("join", {}, "Table is full")}>
            Take a seat
          </ActionButton>
        ) : (
          <>
            {canBet && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-wrap justify-center gap-2">
                  {BET_CHIPS.map((value) => (
                    <ChipButton
                      key={value}
                      value={value}
                      disabled={busy || (balance !== null && bet + value > balance)}
                      onClick={() => setPendingChips((chips) => [...chips, value])}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="font-pixel text-sm text-parchment">Bet {bet}</span>
                  <ActionButton variant="ghost" disabled={busy || bet === 0} onClick={() => setPendingChips([])}>
                    Clear
                  </ActionButton>
                  <ActionButton variant="gold" disabled={busy || bet === 0} onClick={() => void placeBet()}>
                    Place bet
                  </ActionButton>
                </div>
              </div>
            )}
            {seated && mySeat.bet !== null && (table.phase === "waiting" || table.phase === "betting") && (
              <p className="font-pixel text-xs text-parchment">Bet {mySeat.bet} placed. Waiting for other players</p>
            )}
            {yourTurn && (
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Your actions">
                {ACTIONS.map(({ action, label, variant }) => (
                  <ActionButton
                    key={action}
                    variant={variant}
                    disabled={busy || !table.you.allowedActions.includes(action)}
                    onClick={() =>
                      void send("actions", { action, handIndex: table.turn?.handIndex ?? 0, actionId: newId() })
                    }
                  >
                    <ActionIcon action={action} />
                    {label}
                  </ActionButton>
                ))}
              </div>
            )}
            <ActionButton variant="ghost" disabled={busy} onClick={() => void send("leave", {})}>
              Leave seat
            </ActionButton>
          </>
        )}
      </div>
    </div>
  );
}
