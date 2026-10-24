import type { Card, HandOutcome, HandStatus, HandView, HiddenCard } from "@21jack/contracts";
import type { CSSProperties, ReactNode } from "react";
import { GhCardRow, type GhCardSize } from "./GhCard";
import { GhStake } from "./GhChip";
import { GhTag, type GhTagTone } from "./GhHeraldry";
import { GhResultBadge } from "./GhFeedback";
import { GhStyles } from "./styles";
import { cx } from "./util";

export interface GhHandTotalProps {
  /** Number, or null / "?" while the dealer's hole card is hidden. */
  total: number | string | null;
  className?: string;
  style?: CSSProperties;
}

/** `.gh-total`: gold at 21, crimson over 21, "?" while hidden. */
export function GhHandTotal({ total, className, style }: GhHandTotalProps) {
  const hidden = total === null || total === "?";
  const n = typeof total === "number" ? total : Number.NaN;
  return (
    <span
      className={cx("gh-total", hidden && "is-hidden", n === 21 && "is-21", n > 21 && "is-bust", className)}
      style={style}
      aria-label={hidden ? "Total hidden" : `Total ${total}`}
    >
      {hidden ? "?" : total}
    </span>
  );
}

const STATUS_TAG: Partial<Record<HandStatus, [string, GhTagTone]>> = {
  stood: ["Stood", "stone"],
  bust: ["Bust", "crimson"],
  doubled: ["Doubled", "gold"],
  twentyone: ["Stands", "stone"],
};

export interface GhHandProps {
  /** Seed every field from a contract hand; explicit props below override it. */
  hand?: HandView;
  cards?: ReadonlyArray<Card | HiddenCard>;
  total?: number | string | null;
  soft?: boolean;
  status?: HandStatus;
  stake?: number;
  outcome?: HandOutcome;
  /** Credits returned for the hand (shown on the result badge as "+payout"). */
  payout?: number;
  splitAces?: boolean;
  /** Extra tags after the automatic ones. */
  tags?: ReadonlyArray<{ text: string; tone?: GhTagTone }>;
  /** Small caps label above the cards (split: "Left · playing"). */
  label?: string;
  /** The hand being played: gold pulsing outline. */
  active?: boolean;
  /** Another hand / player is playing first: dimmed. */
  waiting?: boolean;
  size?: GhCardSize;
  cardWidth?: number;
  /**
   * `below` = Hands board (total, tags and stake under the cards);
   * `left` / `right` = stage (total, tags and result beside the cards, stake under).
   */
  meta?: "below" | "left" | "right";
  /** Hide the stake (dealer hand). */
  hideStake?: boolean;
  /** Cards with index >= this play the deal animation. */
  dealtFrom?: number;
  dealFrom?: { x: number; y: number };
  flipIndexes?: ReadonlyArray<number>;
  /** Extra content in the meta column (e.g. a "Dealer" tag). */
  extra?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A hand group: cards, total badge, soft / status tags, outcome badge and stake. */
export function GhHand(props: GhHandProps) {
  const h = props.hand;
  const cards = props.cards ?? h?.cards ?? [];
  const total = props.total !== undefined ? props.total : (h?.total ?? null);
  const soft = props.soft ?? h?.soft ?? false;
  const status = props.status ?? h?.status;
  const stake = props.stake ?? h?.stake;
  const outcome = props.outcome ?? h?.outcome;
  const payout = props.payout ?? h?.payout;
  const splitAces = props.splitAces ?? h?.splitAces ?? false;
  const { label, active, waiting, size = "md", cardWidth, meta = "below", hideStake, dealtFrom, dealFrom, flipIndexes, extra, className, style } = props;

  const tags: Array<{ text: string; tone?: GhTagTone }> = [];
  const numeric = typeof total === "number" ? total : null;
  if (soft && numeric !== null && numeric < 21 && status !== "bust") tags.push({ text: "Soft", tone: "soft" });
  const st = status ? STATUS_TAG[status] : undefined;
  if (st && !splitAces && !(status === "stood" && outcome)) tags.push({ text: st[0], tone: st[1] });
  if (splitAces) tags.push({ text: "1 card only", tone: "stone" });
  if (props.tags) tags.push(...props.tags);

  const lost = outcome === "loss" || status === "bust";
  const doubled = status === "doubled";
  const metaItems = (
    <>
      {meta !== "below" && label && <span className="gh-hand__label" style={active ? { color: "var(--gh-gold-200)" } : undefined}>{label}</span>}
      <GhHandTotal total={total} />
      {tags.map((t) => (
        <GhTag key={t.text} tone={t.tone}>
          {t.text}
        </GhTag>
      ))}
      {outcome && <GhResultBadge outcome={outcome} payout={payout ?? 0} size={meta === "below" ? "seat" : "stage"} />}
      {extra}
    </>
  );

  return (
    <div className={cx("gh-hand", active && "is-active", waiting && "is-waiting", className)} style={style}>
      {meta === "below" && label && (
        <span className="gh-hand__label" style={active ? { color: "var(--gh-gold-200)" } : undefined}>
          {label}
        </span>
      )}
      <div className="ghx-hand-cards">
        <GhCardRow
          cards={cards}
          size={size}
          width={cardWidth}
          lastSideways={doubled}
          dealtFrom={dealtFrom}
          dealFrom={dealFrom}
          flipIndexes={flipIndexes}
        />
        {meta !== "below" && <div className={cx("ghx-hand-side", `ghx-hand-side--${meta}`)}>{metaItems}</div>}
      </div>
      {meta === "below" && <div className="gh-hand__meta">{metaItems}</div>}
      {!hideStake && stake !== undefined && <GhStake amount={stake} lost={lost} tone={meta === "below" ? "plain" : "pill"} />}
      <GhStyles />
    </div>
  );
}

export interface GhSplitHandsProps {
  hands: ReadonlyArray<HandView>;
  /** Index of the hand being played (`RoundView.activeHandIndex`), null when none. */
  activeIndex: number | null;
  size?: GhCardSize;
  /** Stage placement puts each hand's meta on its outer side. */
  meta?: "below" | "side";
  className?: string;
}

/** Two hands after a split: "Left · playing" glows, "Right · next" waits. */
export function GhSplitHands({ hands, activeIndex, size = "md", meta = "below", className }: GhSplitHandsProps) {
  return (
    <div className={cx("ghx-split", className)} style={meta === "side" ? { gap: 34, alignItems: "flex-end" } : undefined}>
      {hands.map((hand, i) => {
        const side = i === 0 ? "Left" : "Right";
        const isActive = activeIndex === i;
        const settledOrDone = hand.outcome !== undefined || hand.status !== "playing";
        const suffix = isActive ? " · playing" : activeIndex !== null && i > activeIndex && !settledOrDone ? " · next" : "";
        return (
          <GhHand
            key={hand.handId}
            hand={hand}
            label={side + suffix}
            active={isActive}
            waiting={activeIndex !== null && !isActive && !settledOrDone}
            size={size}
            meta={meta === "side" ? (i === 0 ? "left" : "right") : "below"}
          />
        );
      })}
    </div>
  );
}
