import type { Action, BossView, Card, HiddenCard, SeatView, TableView } from "@21jack/contracts";
import type { GhChipValue, GhCountdown, GhTagTone } from "../gh";
import type { FeedEvent, YourResult } from "./model";

/** Everything the desktop and mobile layers draw, derived once per render in MultiTable. */
export interface MultiView {
  table: TableView;
  youSeat: number | null;
  mySeat: SeatView | null;
  seated: boolean;
  /** Your seat can still bet this round. */
  canBet: boolean;
  /** Sum of the chips picked but not yet placed. */
  bet: number;
  pendingChips: readonly GhChipValue[];
  placedChips: readonly GhChipValue[];
  balance: number | null;
  /** Your balance minus the bet being built. */
  bankroll: number | null;
  busy: boolean;
  busyAction: Action | null;
  error: string | null;
  /** Countdown of the current window (betting, turn or results). */
  countdown: GhCountdown;
  windowMs: number;
  yourTurn: boolean;
  turnSeat: SeatView | null;
  next: string | null;
  yourPlace: number | null;
  dealer: {
    cards: Array<Card | HiddenCard>;
    total: number | null;
    revealing: boolean;
    holeFlipping: boolean;
    caption: string | null;
  };
  /** Settled and the dealer reveal has finished: show outcomes, payouts and the King's reaction. */
  settledDone: boolean;
  result: YourResult | null;
  /** BossView with `delta` hidden until the reveal is done. */
  boss: BossView;
  bossKey: string | undefined;
  hearts: Readonly<Record<string, ReadonlyArray<boolean | null>>>;
  feed: readonly FeedEvent[];
  /** Number of cards a hand had when this client first saw it (cards after that animate in). */
  firstSeen: (key: string, count: number) => number;
  phaseLabel: string;
  phaseTone: GhTagTone;
  join: () => void;
  leave: () => void;
  addChip: (value: GhChipValue) => void;
  clearChips: () => void;
  placeBet: () => void;
  act: (action: Action) => void;
  dismissError: () => void;
}
