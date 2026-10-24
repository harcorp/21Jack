import type { Card, HiddenCard } from "@21jack/contracts";
import type { CSSProperties, ReactNode } from "react";
import { GH_FACES, GH_PIPS } from "./paths";
import { GH_SPRITES } from "./sprites";
import { GhStyles } from "./styles";
import { cx, ghCardLabel, isHiddenCard, isRedSuit } from "./util";

/** Card widths from the Cards board: SM 46 (other seats), MD 64 (desktop hands, dealer), LG 84 (mobile hand), XL 108 (overlays). */
export type GhCardSize = "sm" | "md" | "lg" | "xl";

const SUIT_PIP = { S: GH_PIPS.spade, H: GH_PIPS.heart, D: GH_PIPS.diamond, C: GH_PIPS.club } as const;

export interface GhCardProps {
  /** A real card, `{ hidden: true }` for the dealer hole card, or omitted for a face-down card. */
  card?: Card | HiddenCard | null;
  size?: GhCardSize;
  /** Exact width in px (overrides `size`, e.g. to fit a scaled seat). Height is always 1.4× width. */
  width?: number;
  /** The one card a double receives: dealt sideways, rotated 90°. */
  sideways?: boolean;
  /** Play the deal animation (`gh-deal`, 420 ms) from the shoe offset. */
  dealt?: boolean;
  /** Shoe offset from the card in px, used by the deal animation (`--from-x` / `--from-y`). */
  dealFrom?: { x: number; y: number };
  /** Delay before the deal / flip animation starts, in ms (stagger cards with it). */
  delayMs?: number;
  /** Play a stepped flip when the card turns face up (hole card reveal). */
  flipIn?: boolean;
  /** Draw the mirrored bottom-right corner. Defaults to true for MD and larger. */
  mirrored?: boolean;
  onAnimationEnd?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Grand Hall playing card: `.gh-card` drawn in CSS with inline pixel SVG pips.
 * Animation hooks are props; reduced motion disables them (grand-hall.css + extras).
 */
export function GhCard({
  card,
  size = "md",
  width,
  sideways,
  dealt,
  dealFrom,
  delayMs,
  flipIn,
  mirrored,
  onAnimationEnd,
  className,
  style,
}: GhCardProps) {
  const vars: Record<string, string> = {};
  if (width) vars["--card-w"] = `${width}px`;
  if (dealFrom) {
    vars["--from-x"] = `${dealFrom.x}px`;
    vars["--from-y"] = `${dealFrom.y}px`;
  }
  const cardStyle: CSSProperties = { ...(vars as CSSProperties), ...(delayMs ? { animationDelay: `${delayMs}ms` } : null), ...style };
  const motionCls = cx(dealt && "is-dealt", flipIn && !dealt && "ghx-flip-in");
  const sizeCls = `gh-card--${size}`;

  if (!card || isHiddenCard(card)) {
    return (
      <div
        className={cx("gh-card gh-card--back", sizeCls, sideways && "gh-card--sideways", motionCls, className)}
        style={cardStyle}
        role="img"
        aria-label="Face-down card"
        onAnimationEnd={onAnimationEnd}
      >
        <img className="gh-card__crest" src={GH_SPRITES.crest48} alt="" />
        {flipIn && <GhStyles />}
      </div>
    );
  }

  const pip = SUIT_PIP[card.suit];
  const face = card.rank === "K" || card.rank === "Q" || card.rank === "J" ? GH_FACES[card.rank] : null;
  const showMirror = mirrored ?? (size !== "sm" && (width ?? 64) >= 56);
  const corner = (br: boolean) => (
    <div className={cx("gh-card__corner", br && "gh-card__corner--br")}>
      <span className="gh-card__rank">{card.rank}</span>
      <svg className="gh-card__pip" viewBox="0 0 7 7" aria-hidden>
        <path d={pip} />
      </svg>
    </div>
  );
  return (
    <div
      className={cx("gh-card", sizeCls, isRedSuit(card.suit) && "is-red", sideways && "gh-card--sideways", motionCls, className)}
      style={cardStyle}
      role="img"
      aria-label={ghCardLabel(card) + (sideways ? ", dealt sideways" : "")}
      onAnimationEnd={onAnimationEnd}
    >
      {corner(false)}
      <div className="gh-card__center">
        {face ? (
          <svg className="gh-card__face" viewBox="0 0 9 9" aria-hidden>
            <path d={face} />
          </svg>
        ) : (
          <svg className="gh-card__pip" viewBox="0 0 7 7" aria-hidden>
            <path d={pip} />
          </svg>
        )}
      </div>
      {showMirror && corner(true)}
      {(flipIn || sideways) && <GhStyles />}
    </div>
  );
}

/** Face-down card (crimson lattice + crest). */
export function GhCardBack(props: Omit<GhCardProps, "card">) {
  return <GhCard {...props} card={null} />;
}

export interface GhCardRowProps {
  cards: ReadonlyArray<Card | HiddenCard>;
  size?: GhCardSize;
  width?: number;
  /** Rotate the last card 90° (a doubled hand). */
  lastSideways?: boolean;
  /** Animate cards with index >= this value as freshly dealt (newest on top). */
  dealtFrom?: number;
  dealFrom?: { x: number; y: number };
  /** Stagger between dealt cards, ms. */
  staggerMs?: number;
  /** Indexes of cards that just turned face up (hole card reveal). */
  flipIndexes?: ReadonlyArray<number>;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** `.gh-cards`: overlapping row (-55% of --card-w), one drop shadow for the group, dealt left to right. */
export function GhCardRow({
  cards,
  size = "md",
  width,
  lastSideways,
  dealtFrom,
  dealFrom,
  staggerMs = 140,
  flipIndexes,
  children,
  className,
  style,
}: GhCardRowProps) {
  const vars = width ? ({ "--card-w": `${width}px` } as CSSProperties) : undefined;
  const label = cards.map(ghCardLabel).join(", ");
  return (
    <div className={cx("gh-cards", lastSideways && "ghx-has-sideways", className)} style={{ ...vars, ...style }} role="img" aria-label={label}>
      {cards.map((c, i) => {
        const isNew = dealtFrom !== undefined && i >= dealtFrom;
        return (
          <GhCard
            key={i}
            card={c}
            size={size}
            width={width}
            sideways={lastSideways && i === cards.length - 1 && cards.length > 2}
            dealt={isNew}
            dealFrom={dealFrom}
            delayMs={isNew && dealtFrom !== undefined ? (i - dealtFrom) * staggerMs : undefined}
            flipIn={flipIndexes?.includes(i)}
          />
        );
      })}
      {children}
      {lastSideways && <GhStyles />}
    </div>
  );
}
