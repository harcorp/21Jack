import type { CSSProperties, ReactNode } from "react";
import { GhStyles } from "./styles";
import { cx, ghFmt } from "./util";

/** The six denominations of the Chips board (`--gh-chip-*`). */
export const GH_CHIP_VALUES = [5, 10, 25, 100, 500, 1000] as const;
export type GhChipValue = (typeof GH_CHIP_VALUES)[number];

const SUFFIX: Record<GhChipValue, string> = { 5: "5", 10: "10", 25: "25", 100: "100", 500: "500", 1000: "1k" };
const LABEL: Record<GhChipValue, string> = { 5: "5", 10: "10", 25: "25", 100: "100", 500: "500", 1000: "1K" };

/**
 * Break an amount into chips, largest first (the bottom of the stack), as the stage does.
 * Returns at most `max` chips plus how many more would be needed (`more`) and any remainder
 * that no chip covers (amounts below 5).
 */
export function ghChipsFor(amount: number, max = 8): { chips: GhChipValue[]; more: number } {
  const all: GhChipValue[] = [];
  let left = Math.max(0, Math.trunc(amount));
  for (const v of [...GH_CHIP_VALUES].reverse()) {
    while (left >= v) {
      all.push(v);
      left -= v;
    }
  }
  return { chips: all.slice(0, max), more: Math.max(0, all.length - max) };
}

export type GhChipSize = "sm" | "md" | "lg";

export interface GhChipProps {
  value: GhChipValue;
  /** SM 36 · MD 56 · LG 72 from the board. */
  size?: GhChipSize;
  /** Exact diameter in px (stage tray uses 50, mobile 44). */
  diameter?: number;
  /** Selected lifts 6 px with a gold ring and glow (the last chip placed). */
  selected?: boolean;
  disabled?: boolean;
  /** Reason appended to the accessible name when disabled ("above your balance"). */
  disabledReason?: string;
  onClick?: (value: GhChipValue) => void;
  /** Render as a static span instead of a button (display only). */
  static?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Upright chip (`.gh-chip`), a button in the chip selector. */
export function GhChip({ value, size = "md", diameter, selected, disabled, disabledReason, onClick, static: isStatic, className, style }: GhChipProps) {
  const cls = cx("gh-chip", `gh-chip--${SUFFIX[value]}`, size !== "md" && `gh-chip--${size}`, selected && "is-selected", disabled && "is-disabled", className);
  const dims: CSSProperties | undefined = diameter
    ? { width: diameter, height: diameter, fontSize: diameter <= 44 ? 8 : diameter < 56 ? 9 : undefined }
    : undefined;
  const name = `${ghFmt(value)} credits` + (disabled && disabledReason ? `, ${disabledReason}` : "");
  if (isStatic) {
    return (
      <span className={cls} style={{ ...dims, cursor: "default", ...style }} role="img" aria-label={name}>
        {LABEL[value]}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      style={{ ...dims, ...style }}
      disabled={disabled}
      aria-pressed={selected || undefined}
      aria-label={`Add ${name}`}
      onClick={onClick ? () => onClick(value) : undefined}
    >
      {LABEL[value]}
    </button>
  );
}

export interface GhChipStackProps {
  amount: number;
  /** Tallest stack before the overflow marker; the board says "at most eight high". */
  max?: number;
  /** md = 44 px chips (felt, desktop), sm = 36 px, xs = 30 px (mobile seats). */
  size?: "md" | "sm" | "xs";
  /** Print the amount under the stack (`.gh-stack__value`). */
  showValue?: boolean;
  /** Animate the top chip sliding in (gh-chip-slide). */
  slideIn?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Flat stake stack seen in perspective (`.gh-stack`), largest chips at the bottom, with an overflow marker. */
export function GhChipStack({ amount, max = 8, size = "md", showValue, slideIn, className, style }: GhChipStackProps) {
  const { chips, more } = ghChipsFor(amount, max);
  const shown = chips.length ? chips : ([5] as GhChipValue[]);
  return (
    <div
      className={cx("gh-stack", size !== "md" && `ghx-stack--${size}`, slideIn && "ghx-chip-in", className)}
      style={style}
      role="img"
      aria-label={`Stake ${ghFmt(amount)}`}
    >
      {shown.map((v, i) => (
        <i key={i} className={`c${SUFFIX[v]}`} />
      ))}
      {more > 0 && <span className="ghx-stack-more">+{more}</span>}
      {showValue && (
        <span className="gh-stack__value gh-num" style={{ fontSize: 10 }}>
          {ghFmt(amount)}
        </span>
      )}
      {(size !== "md" || more > 0 || slideIn) && <GhStyles />}
    </div>
  );
}

export interface GhStakeProps {
  amount: number;
  /** `pill` = gold number on a dark plate (stage); `plain` = cream number (Hands board). */
  tone?: "pill" | "plain";
  size?: GhChipStackProps["size"];
  /** A lost stake is dimmed (bust, defeat). */
  lost?: boolean;
  max?: number;
  className?: string;
}

/** Stack + amount, side by side, as each hand's stake sits on the felt. */
export function GhStake({ amount, tone = "pill", size = "md", lost, max, className }: GhStakeProps) {
  return (
    <div className={cx("ghx-stake", lost && "is-lost", className)} aria-label={`Stake ${ghFmt(amount)}${lost ? ", lost" : ""}`}>
      <GhChipStack amount={amount} size={size} max={max} />
      <span className={cx("ghx-stake__value", tone === "pill" && "ghx-stake__value--pill")} aria-hidden>
        {ghFmt(amount)}
      </span>
      <GhStyles />
    </div>
  );
}

export interface GhBetSpotProps {
  /** Current stake on the spot; 0 shows the empty ring with its label. */
  amount: number;
  /** Your bet is being built here (glows, pulses). */
  active?: boolean;
  /** Bets are closed / ready (chips locked until the deal). */
  locked?: boolean;
  /** Text shown when empty. */
  label?: ReactNode;
  size?: "md" | "sm";
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Bet circle on the felt for a seat. The boards place the stake stack at the seat anchor;
 * this adds the dashed gold ring used for empty slots so a seat reads as "bet here".
 */
export function GhBetSpot({ amount, active, locked, label = "Bet", size = "md", onClick, className, style }: GhBetSpotProps) {
  const filled = amount > 0;
  const body = (
    <>
      {filled ? (
        <>
          <GhChipStack amount={amount} size={size === "sm" ? "sm" : "md"} slideIn={active} />
          <span className="ghx-betspot__value ghx-stake__value ghx-stake__value--pill">{ghFmt(amount)}</span>
        </>
      ) : (
        <span className="ghx-betspot__label">{label}</span>
      )}
      <GhStyles />
    </>
  );
  const cls = cx("ghx-betspot", size === "sm" && "ghx-betspot--sm", filled && "is-filled", active && "is-active", locked && "is-locked", className);
  const name = filled ? `Bet ${ghFmt(amount)}` : "No bet";
  if (onClick) {
    return (
      <button type="button" className={cls} style={{ border: 0, cursor: "pointer", ...style }} onClick={onClick} aria-label={name} disabled={locked}>
        {body}
      </button>
    );
  }
  return (
    <div className={cls} style={style} role="img" aria-label={name}>
      {body}
    </div>
  );
}
