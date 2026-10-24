"use client";

import {
  MULTI_BET_SECONDS,
  MULTI_RESULT_SECONDS,
  MULTI_TURN_SECONDS,
  newId,
  TableView as TableViewSchema,
  type Action,
  type BossView,
  type RoundView,
  type TableView,
} from "@21jack/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type GhChipValue, type GhTagTone, GhLoading, GhStyles, useGhCountdown } from "../gh";
import { GameApiError, requestJson } from "../lib/api";
import { useDealerReveal } from "../lib/useDealerReveal";
import { GrandHallStage, type KingMood } from "../scene";
import { MultiDesktop } from "./MultiDesktop";
import { MultiMobile } from "./MultiMobile";
import { type FeedEvent, diffFeed, houseWinsMost, playOrder, seatResult, settleFeed, yourResult } from "./model";
import { MultiStyles } from "./parts";
import type { MultiView } from "./view";

const POLL_MS = 1000;
const FEED_LIMIT = 5;

export interface MultiTableProps {
  apiBase?: string;
  /** Wallet balance known by the page; used until the table reports one (the table only knows it after a bet). */
  balance?: number | null;
  onBalanceChange?: (balance: number) => void;
  className?: string;
}

type Status = "loading" | "ready" | "closed";

const BET_OPEN = new Set<TableView["phase"]>(["waiting", "betting"]);

/**
 * The shared multiplayer table inside the Grand Hall stage. Polls the table every second (a sequence
 * guard drops stale responses), builds bets chip by chip, and stages the dealer's reveal before
 * outcomes, payouts and the King's reaction show.
 */
export function MultiTable({ apiBase = "/api/multi", balance: walletBalance = null, onBalanceChange, className }: MultiTableProps) {
  const [table, setTable] = useState<TableView | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<Action | null>(null);
  // Chips clicked for the next bet, in order, so the stack in the seat grows chip by chip.
  const [pendingChips, setPendingChips] = useState<GhChipValue[]>([]);
  // The chips of the bet that was just placed, so the stack keeps its order once the server confirms it.
  const [placedChips, setPlacedChips] = useState<GhChipValue[]>([]);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [hearts, setHearts] = useState<Record<string, Array<boolean | null>>>({});
  const seq = useRef(0);
  const applied = useRef(0);
  const prevView = useRef<TableView | null>(null);
  const feedId = useRef(0);
  // Rounds whose deal this client watched happen (their cards animate in from the shoe).
  const liveRounds = useRef(new Set<number>());
  const seen = useRef(new Map<string, number>());
  const recorded = useRef(new Set<number>());

  const pushFeed = useCallback((rows: Array<Omit<FeedEvent, "id">>) => {
    if (rows.length === 0) return;
    setFeed((f) => [...f, ...rows.map((r) => ({ ...r, id: ++feedId.current }))].slice(-FEED_LIMIT));
  }, []);

  const apply = useCallback(
    (raw: unknown, requestSeq: number) => {
      if (requestSeq < applied.current) return;
      const parsed = TableViewSchema.safeParse(raw);
      if (!parsed.success) {
        setError("The table sent something we could not read.");
        return;
      }
      applied.current = requestSeq;
      const next = parsed.data;
      const prev = prevView.current;
      if (prev && BET_OPEN.has(prev.phase) && !BET_OPEN.has(next.phase)) liveRounds.current.add(next.roundNumber);
      pushFeed(diffFeed(prev, next, next.you.seat));
      prevView.current = next;
      setTable(next);
      setStatus("ready");
    },
    [pushFeed],
  );

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

  const tableBalance = table?.you.balance ?? null;
  useEffect(() => {
    if (tableBalance !== null) onBalanceChange?.(tableBalance);
  }, [tableBalance, onBalanceChange]);
  const balance = tableBalance ?? walletBalance;

  const youSeat = table?.you.seat ?? null;
  const mySeat = youSeat === null ? null : (table?.seats[youSeat] ?? null);
  const canBet = mySeat != null && !!table && BET_OPEN.has(table.phase) && mySeat.bet === null;
  // Drop unplaced chips when the betting window closes (or we lose the seat).
  useEffect(() => {
    if (!canBet) setPendingChips([]);
  }, [canBet]);

  // Dealer reveal, staged card by card like single mode (the hook only reads these fields).
  const roundId = table ? `${table.tableId}:${table.roundNumber}` : null;
  const revealRound = useMemo(() => {
    if (!table || BET_OPEN.has(table.phase) || table.dealer.cards.length === 0) return null;
    return {
      roundId: `${table.tableId}:${table.roundNumber}`,
      status: table.phase === "settled" ? "settled" : "playing",
      dealer: table.dealer,
      hands: table.seats.flatMap((s) => s?.hands ?? []),
    } as unknown as RoundView;
  }, [table]);
  const reveal = useDealerReveal(revealRound, table && liveRounds.current.has(table.roundNumber) ? roundId : null);
  const settled = table?.phase === "settled";
  const settledDone = settled && !reveal.revealing;

  // Once a round's reveal finishes: hearts (last three results per player) and the result lines.
  useEffect(() => {
    if (!table || !settledDone || recorded.current.has(table.roundNumber)) return;
    recorded.current.add(table.roundNumber);
    setHearts((h) => {
      const out = { ...h };
      for (const seat of table.seats) {
        const r = seat ? seatResult(seat) : null;
        if (!seat || !r) continue;
        out[seat.accountId] = [...(out[seat.accountId] ?? [null, null, null]), r.kind !== "defeat"].slice(-3);
      }
      return out;
    });
    pushFeed(settleFeed(table, table.you.seat));
  }, [table, settledDone, pushFeed]);

  const windowMs =
    (table?.phase === "betting" ? MULTI_BET_SECONDS : table?.phase === "playing" ? MULTI_TURN_SECONDS : MULTI_RESULT_SECONDS) * 1000;
  const countdown = useGhCountdown(table?.deadline ?? null, windowMs);

  const send = useCallback(
    async (path: string, body: object, opts?: { friendly409?: string; action?: Action }) => {
      setBusy(true);
      setBusyAction(opts?.action ?? null);
      setError(null);
      const mine = ++seq.current;
      try {
        apply(await requestJson<unknown>(`${apiBase}/${path}`, { method: "POST", body: JSON.stringify(body) }), mine);
        return true;
      } catch (err) {
        if (err instanceof GameApiError && err.status === 409 && opts?.friendly409) setError(opts.friendly409);
        else setError(err instanceof Error ? err.message : "Something went wrong.");
        return false;
      } finally {
        setBusy(false);
        setBusyAction(null);
      }
    },
    [apiBase, apply],
  );

  const yourTurn = !!table && table.phase === "playing" && table.turn !== null && table.turn.seat === youSeat;
  const act = useCallback(
    (action: Action) => {
      if (!table) return;
      void send("actions", { action, handIndex: table.turn?.handIndex ?? 0, actionId: newId() }, { action });
    },
    [send, table],
  );

  // H / S / D / P while it is your turn.
  const hotkeys = useRef({ yourTurn, busy, allowed: table?.you.allowedActions ?? [], act });
  hotkeys.current = { yourTurn, busy, allowed: table?.you.allowedActions ?? [], act };
  useEffect(() => {
    const keys: Record<string, Action> = { h: "hit", s: "stand", d: "double", p: "split" };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const action = keys[e.key.toLowerCase()];
      const h = hotkeys.current;
      if (!action || !h.yourTurn || h.busy || !h.allowed.includes(action)) return;
      e.preventDefault();
      h.act(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (status === "loading" && !table) {
    return <GhLoading text="Opening the hall…" />;
  }
  if (!table) {
    return (
      <div className="gh-frame gh-frame--glass gh-notch p-6 text-center" role="status">
        <p className="gh-display text-xl text-[#FFE08A]">The shared table is not open yet</p>
        <p className="mt-2 text-sm text-[#EFE3C8]">The King is still setting up the hall. This page retries every second.</p>
      </div>
    );
  }

  const bet = pendingChips.reduce((sum, c) => sum + c, 0);
  const turnSeat = table.turn ? (table.seats[table.turn.seat] ?? null) : null;
  const { next, yourPlace } = playOrder(table);
  const b = table.boss;
  // Until the reveal ends the bar shows the King as he was before this round.
  const boss: BossView = !settled
    ? { ...b, delta: 0 }
    : settledDone
      ? b
      : { ...b, hp: Math.min(b.maxHp, Math.max(0, b.hp - b.delta)), delta: 0, defeated: false };
  const kingMood: KingMood = settledDone ? (b.delta < 0 || b.defeated ? "grimace" : houseWinsMost(table) ? "smug" : "idle") : "idle";
  const kingHit = settledDone && b.delta < 0 ? table.roundNumber : 0;

  let phaseLabel: string;
  let phaseTone: GhTagTone = "torch";
  const s = countdown.secondsLeft;
  if (table.phase === "waiting") {
    phaseLabel = "Waiting for bets";
    phaseTone = "ghost";
  } else if (table.phase === "betting") phaseLabel = `Betting · ${s}s`;
  else if (table.phase === "playing") phaseLabel = yourTurn ? `Your turn · ${s}s` : turnSeat ? `${turnSeat.username}'s turn · ${s}s` : "Dealing";
  else if (reveal.revealing) {
    phaseLabel = "Dealer plays";
    phaseTone = "stone";
  } else {
    phaseLabel = "Settled";
    phaseTone = "gold";
  }

  const roundNumber = table.roundNumber;
  const firstSeen = (key: string, count: number) => {
    const known = seen.current.get(key);
    if (known !== undefined) return known;
    const start = liveRounds.current.has(roundNumber) ? 0 : count;
    seen.current.set(key, start);
    return start;
  };

  const v: MultiView = {
    table,
    youSeat,
    mySeat,
    seated: mySeat != null,
    canBet,
    bet,
    pendingChips,
    placedChips,
    balance,
    bankroll: balance === null ? null : Math.max(0, balance - (canBet ? bet : 0)),
    busy,
    busyAction,
    error,
    countdown,
    windowMs,
    yourTurn,
    turnSeat,
    next,
    yourPlace,
    dealer: {
      cards: revealRound ? reveal.cards : table.dealer.cards,
      total: revealRound ? reveal.total : table.dealer.total,
      revealing: reveal.revealing,
      holeFlipping: reveal.holeFlipping,
      caption: reveal.caption,
    },
    settledDone,
    result: settledDone ? yourResult(table) : null,
    boss,
    bossKey: settledDone && b.delta !== 0 ? `round-${roundNumber}` : undefined,
    hearts,
    feed,
    firstSeen,
    phaseLabel,
    phaseTone,
    join: () => void send("join", {}, { friendly409: "Table is full" }),
    leave: () => void send("leave", {}),
    addChip: (value) => {
      if (balance !== null && bet + value > balance) return;
      setPendingChips((chips) => [...chips, value]);
    },
    clearChips: () => setPendingChips([]),
    placeBet: () => {
      if (bet <= 0) return;
      const chips = pendingChips;
      void send("bet", { bet, requestId: newId() }).then((ok) => {
        if (!ok) return;
        setPlacedChips(chips);
        setPendingChips([]);
      });
    },
    act,
    dismissError: () => setError(null),
  };

  return (
    <div className={["w-full min-w-0", className].filter(Boolean).join(" ")}>
      <GhStyles />
      <MultiStyles />
      <GrandHallStage
        variant="auto"
        king={kingMood}
        kingHit={kingHit}
        label="The shared table in the Grand Hall: the King deals to up to five players"
      >
        <MultiDesktop v={v} />
        <MultiMobile v={v} />
      </GrandHallStage>
    </div>
  );
}
