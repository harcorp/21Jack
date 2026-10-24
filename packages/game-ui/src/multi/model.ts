import { MULTI_MAX_SEATS, type HandView, type SeatView, type TableView } from "@21jack/contracts";
import type { GhBannerKind, GhResultKind, GhSeatStatus, GhTagTone } from "../gh";
import { ghSigned } from "../gh";

/** Seat index (0-based, TableView.seats) to the design's turn-order seat number (1 = screen right). */
export function turnNumber(index: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(MULTI_MAX_SEATS, Math.max(1, index + 1)) as 1 | 2 | 3 | 4 | 5;
}

export function seatStaked(seat: SeatView): number {
  return seat.hands.reduce((sum, h) => sum + h.stake, 0);
}

export function seatPaid(seat: SeatView): number {
  return seat.payout ?? seat.hands.reduce((sum, h) => sum + (h.payout ?? 0), 0);
}

/** Overall result of a settled seat, from its hands. */
export function seatResult(seat: SeatView): { kind: GhResultKind; paid: number; net: number } | null {
  if (seat.hands.length === 0 || seat.hands.some((h) => !h.outcome)) return null;
  const paid = seatPaid(seat);
  const net = paid - seatStaked(seat);
  const kind: GhResultKind =
    seat.hands.some((h) => h.outcome === "blackjack") && net > 0 ? "blackjack" : net > 0 ? "victory" : net < 0 ? "defeat" : "push";
  return { kind, paid, net };
}

export interface SeatState {
  status: GhSeatStatus;
  /** Tag text; null hides the tag (settled: results sit on the hands). */
  tag: string | null;
  tone: GhTagTone;
}

const TONE: Record<GhSeatStatus, GhTagTone> = {
  betting: "stone",
  ready: "soft",
  waiting: "ghost",
  turn: "torch",
  stood: "stone",
  out: "ghost",
  off: "crimson",
  done: "stone",
};

function doneTag(hands: readonly HandView[]): string {
  if (hands.every((h) => h.status === "bust")) return "Bust";
  if (hands.some((h) => h.status === "doubled")) return "Doubled";
  if (hands.some((h) => h.status === "blackjack")) return "Blackjack";
  return "Stood";
}

/**
 * Plate status for a seat, matching the stage's tag map: betting / ready while bets are open,
 * turn / waiting / stood while playing, done (no tag) once settled.
 */
export function seatState(table: TableView, index: number, revealing: boolean, mine: boolean): SeatState {
  const seat = table.seats[index];
  const s = (status: GhSeatStatus, tag: string | null, tone: GhTagTone = TONE[status]): SeatState => ({ status, tag, tone });
  if (!seat) return s("waiting", null);
  if (table.phase === "waiting" || table.phase === "betting") return seat.bet === null ? s("betting", "Betting") : s("ready", "Ready");
  if (seat.hands.length === 0) return s("out", "Next round");
  if (table.phase === "playing") {
    if (table.turn?.seat === index) return s("turn", mine ? "Your turn" : "Turn");
    if (seat.hands.every((h) => h.status !== "playing")) {
      const tag = doneTag(seat.hands);
      return s("stood", tag, tag === "Bust" ? "crimson" : tag === "Doubled" || tag === "Blackjack" ? "gold" : "stone");
    }
    return s("waiting", "Waiting");
  }
  // settled
  if (revealing) {
    const tag = doneTag(seat.hands);
    return s("stood", tag, tag === "Bust" ? "crimson" : "stone");
  }
  return s("done", null);
}

/** Seats still to play after the current turn, in turn order. */
export function playOrder(table: TableView): { next: string | null; yourPlace: number | null } {
  if (table.phase !== "playing" || !table.turn) return { next: null, yourPlace: null };
  const pending: Array<{ index: number; name: string }> = [];
  for (let i = table.turn.seat + 1; i < MULTI_MAX_SEATS; i++) {
    const seat = table.seats[i];
    if (seat && seat.hands.some((h) => h.status === "playing")) pending.push({ index: i, name: seat.username });
  }
  const you = table.you.seat;
  const at = you === null ? -1 : pending.findIndex((p) => p.index === you);
  return { next: pending[0]?.name ?? null, yourPlace: at >= 0 ? at + 1 : null };
}

export interface YourResult {
  kind: GhBannerKind;
  title: string;
  detail: string;
  paid: number;
  net: number;
}

export function yourResult(table: TableView): YourResult | null {
  if (table.phase !== "settled" || table.you.seat === null) return null;
  const seat = table.seats[table.you.seat];
  const r = seat ? seatResult(seat) : null;
  if (!r) return null;
  const detail = r.net === 0 ? "Stake returned" : `${ghSigned(r.net)} credits`;
  if (r.kind === "blackjack") return { kind: "blackjack", title: "Blackjack!", detail, paid: r.paid, net: r.net };
  if (r.kind === "victory") return { kind: "victory", title: "Victory!", detail, paid: r.paid, net: r.net };
  if (r.kind === "defeat") return { kind: "defeat", title: "Defeat", detail, paid: r.paid, net: r.net };
  return { kind: "push", title: "Push", detail, paid: r.paid, net: r.net };
}

/** True when the house won more settled hands than it lost (the King looks smug). */
export function houseWinsMost(table: TableView): boolean {
  let house = 0;
  let players = 0;
  for (const seat of table.seats) {
    for (const h of seat?.hands ?? []) {
      if (h.outcome === "loss") house += 1;
      else if (h.outcome === "win" || h.outcome === "blackjack") players += 1;
    }
  }
  return house > players;
}

/** Short label for a seat result on the mobile mini row ("Win +50", "BJ +100"). */
export function miniResultLabel(kind: GhResultKind, paid: number): string {
  const word = kind === "blackjack" ? "BJ" : kind === "victory" ? "Win" : kind === "defeat" ? "Loss" : "Push";
  return `${word} ${ghSigned(paid)}`;
}

/* -------------------------------------------------------------- table feed */

export interface FeedEvent {
  id: number;
  who: string;
  text: string;
  tone?: "default" | "boss";
}

/**
 * Derives feed lines from two consecutive table views (joins, bets, moves, results, King hits).
 * Purely client-side: the contract has no event log, so a late joiner starts with an empty feed.
 */
export function diffFeed(prev: TableView | null, next: TableView, youSeat: number | null): Array<Omit<FeedEvent, "id">> {
  if (!prev) return [];
  const out: Array<Omit<FeedEvent, "id">> = [];
  const name = (i: number, seat: SeatView) => (i === youSeat ? "You" : seat.username);
  for (let i = 0; i < MULTI_MAX_SEATS; i++) {
    const a = prev.seats[i] ?? null;
    const b = next.seats[i] ?? null;
    if (!a && b) out.push({ who: name(i, b), text: `took seat ${i + 1}` });
    else if (a && !b) out.push({ who: i === prev.you.seat ? "You" : a.username, text: `left seat ${i + 1}` });
    if (!a || !b || a.accountId !== b.accountId) continue;
    if (a.bet === null && b.bet !== null) out.push({ who: name(i, b), text: `bet ${b.bet}` });
    if (prev.roundNumber !== next.roundNumber) continue;
    b.hands.forEach((h, k) => {
      const old = a.hands[k];
      if (!old) {
        if (k > 0 && a.hands.length === 1) out.push({ who: name(i, b), text: "split" });
        return;
      }
      if (h.status === "doubled" && old.status !== "doubled") out.push({ who: name(i, b), text: `doubled · ${h.total}` });
      else if (h.cards.length > old.cards.length && h.status === "bust") out.push({ who: name(i, b), text: `hit · bust ${h.total}` });
      else if (h.cards.length > old.cards.length) out.push({ who: name(i, b), text: `hit · ${h.total}` });
      else if (h.status === "stood" && old.status === "playing") out.push({ who: name(i, b), text: `stands on ${h.total}` });
    });
  }
  if (prev.phase !== "playing" && next.phase === "playing") out.push({ who: "Round", text: `${next.roundNumber} dealt` });
  return out;
}

/** Results lines once a round's reveal has finished. */
export function settleFeed(table: TableView, youSeat: number | null): Array<Omit<FeedEvent, "id">> {
  const out: Array<Omit<FeedEvent, "id">> = [];
  table.seats.forEach((seat, i) => {
    if (!seat) return;
    const r = seatResult(seat);
    if (!r) return;
    const word = r.kind === "blackjack" ? "blackjack" : r.kind === "victory" ? (i === youSeat ? "win" : "wins") : r.kind === "defeat" ? (i === youSeat ? "lose" : "loses") : "push";
    out.push({ who: i === youSeat ? "You" : seat.username, text: `${word} · ${ghSigned(r.paid)}` });
  });
  const b = table.boss;
  if (b.defeated) out.push({ who: "The King", text: "falls! Kingslayer", tone: "boss" });
  else if (b.delta < 0) out.push({ who: "The King", text: `takes ${-b.delta} · ${b.hp} / ${b.maxHp}`, tone: "boss" });
  else if (b.delta > 0) out.push({ who: "The King", text: `heals ${b.delta} · ${b.hp} / ${b.maxHp}`, tone: "boss" });
  return out;
}
