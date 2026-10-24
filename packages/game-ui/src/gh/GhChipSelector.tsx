import type { ReactNode } from "react";
import { GhButton } from "./GhButton";
import { GhChip, GH_CHIP_VALUES, type GhChipValue } from "./GhChip";
import { ghFmt } from "./util";

export interface GhChipSelectorProps {
  /** Current bet being built. */
  bet: number;
  /** Credits available (chips worth more than `balance - bet` are disabled). */
  balance: number;
  min?: number;
  max?: number;
  /** The last chip placed lifts (`is-selected`). */
  selected?: GhChipValue | null;
  chips?: ReadonlyArray<GhChipValue>;
  onAdd?: (value: GhChipValue) => void;
  onUndo?: () => void;
  onClear?: () => void;
  onSubmit?: () => void;
  /** "Deal" (solo) or "Ready" (multiplayer). */
  submitLabel?: string;
  submitVariant?: "gold" | "felt";
  /** Defaults to `bet <= 0 || bet < min`. */
  submitDisabled?: boolean;
  /** Submit request in flight. */
  loading?: boolean;
  /** Every chip and button locked (bets closed). */
  locked?: boolean;
  /**
   * `desktop` = Chip selector board (56 px chips in slots, Undo + Clear, Deal LG);
   * `stage` = the docked tray on the 1440 stage (50 px chips, Clear, Deal min 140, hint);
   * `mobile` = 358-wide tray (Bet + Clear header, 44 px chips, block Deal).
   */
  layout?: "desktop" | "stage" | "mobile";
  /** Short text after the Deal button (stage), e.g. "Bets close in 12s". */
  hint?: ReactNode;
}

/** The betting tray, styled like the dealer's chip tray. */
export function GhChipSelector({
  bet,
  balance,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  selected = null,
  chips = GH_CHIP_VALUES,
  onAdd,
  onUndo,
  onClear,
  onSubmit,
  submitLabel = "Deal",
  submitVariant = "gold",
  submitDisabled,
  loading,
  locked,
  layout = "desktop",
  hint,
}: GhChipSelectorProps) {
  const room = Math.min(balance, max) - bet;
  const reason = (v: number) => (bet + v > max ? "above the table maximum" : v > balance - bet ? "not enough credits" : undefined);
  const chipOff = (v: number) => locked || v > room;
  const goOff = submitDisabled ?? (bet <= 0 || bet < min);
  const submit = (
    <GhButton
      variant={submitVariant}
      size="lg"
      block={layout === "mobile"}
      disabled={locked || goOff}
      loading={loading}
      onClick={onSubmit}
      style={layout === "stage" ? { minWidth: 140 } : undefined}
    >
      {submitLabel}
    </GhButton>
  );

  if (layout === "mobile") {
    return (
      <div
        className="gh-tray gh-notch"
        role="group"
        aria-label="Place a bet"
        style={{ width: 358, maxWidth: "100%", boxSizing: "border-box", flexDirection: "column", alignItems: "stretch", gap: 12, padding: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <GhBetValue bet={bet} inline />
          <GhButton variant="stone" size="sm" notch={false} disabled={locked || bet <= 0} onClick={onClear}>
            Clear
          </GhButton>
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "12px 4px 12px", margin: "-4px -4px 0" }}>
          {chips.map((v) => (
            <GhChip key={v} value={v} diameter={44} selected={selected === v} disabled={chipOff(v)} disabledReason={reason(v)} onClick={onAdd} />
          ))}
        </div>
        {submit}
      </div>
    );
  }

  const stage = layout === "stage";
  return (
    <div className="gh-tray gh-notch" role="group" aria-label="Place a bet" style={stage ? { gap: 10, padding: "12px 14px 14px" } : undefined}>
      {chips.map((v) => (
        <div key={v} className="gh-tray__slot" style={stage ? { width: 62, height: 62 } : undefined}>
          <GhChip value={v} diameter={stage ? 50 : undefined} selected={selected === v} disabled={chipOff(v)} disabledReason={reason(v)} onClick={onAdd} />
        </div>
      ))}
      {stage ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "0 10px", minWidth: 96 }}>
          <span className="gh-label" style={{ fontSize: 13, color: "var(--gh-gold-200)" }}>Bet</span>
          <span className="gh-num gh-shadow-text" style={{ fontSize: 20, color: "var(--gh-cream-100)" }} aria-live="polite">
            {ghFmt(bet)}
          </span>
        </div>
      ) : (
        <GhBetValue bet={bet} />
      )}
      {stage ? (
        <GhButton variant="stone" size="sm" notch={false} disabled={locked || bet <= 0} onClick={onClear}>
          Clear
        </GhButton>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <GhButton variant="stone" size="sm" notch={false} disabled={locked || bet <= 0} onClick={onUndo}>
            Undo
          </GhButton>
          <GhButton variant="stone" size="sm" notch={false} disabled={locked || bet <= 0} onClick={onClear}>
            Clear
          </GhButton>
        </div>
      )}
      {submit}
      {hint && <span style={{ fontSize: 12, color: "var(--gh-cream-200)", maxWidth: 92, lineHeight: 1.3 }}>{hint}</span>}
    </div>
  );
}

/** "BET 35" read-out used in the trays (and as the HUD bet). */
export function GhBetValue({ bet, inline, label = "Bet" }: { bet: number; inline?: boolean; label?: string }) {
  const cap = {
    fontFamily: "var(--gh-font-display)", fontWeight: 700, fontSize: 12, letterSpacing: ".14em",
    textTransform: "uppercase", color: "var(--gh-cream-200)",
  } as const;
  if (inline) {
    return (
      <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={cap}>{label}</span>
        <span className="gh-num gh-shadow-text" style={{ fontSize: 20, color: "var(--gh-gold-200)" }} aria-live="polite">
          {ghFmt(bet)}
        </span>
      </span>
    );
  }
  return (
    <div style={{ width: 104, display: "flex", flexDirection: "column", gap: 8, paddingLeft: 6 }}>
      <span style={cap}>{label}</span>
      <span className="gh-num gh-shadow-text" style={{ fontSize: 24, color: "var(--gh-gold-200)" }} aria-live="polite">
        {ghFmt(bet)}
      </span>
    </div>
  );
}

export interface GhReadyTrayProps {
  bet: number;
  /** After pressing Ready: chips locked until the deal. */
  ready?: boolean;
  onReady?: () => void;
  loading?: boolean;
  /** Shared countdown, rendered at the end (e.g. <GhTurnTimer variant="dial" size="sm" />). */
  timer?: ReactNode;
  waitingText?: string;
}

/** Multiplayer end of the tray: bet + Ready + shared countdown, or the locked "Ready · waiting" state. */
export function GhReadyTray({ bet, ready, onReady, loading, timer, waitingText = "Waiting for others" }: GhReadyTrayProps) {
  return (
    <div className="gh-tray gh-notch" style={{ gap: 16 }}>
      <GhBetValue bet={bet} />
      <GhButton variant="felt" size="lg" icon={ready ? "check" : undefined} disabled={ready || bet <= 0} loading={loading} onClick={onReady}>
        Ready
      </GhButton>
      {ready ? (
        <span style={{ fontSize: 13, color: "var(--gh-cream-300)", maxWidth: 110, lineHeight: 1.35 }}>
          {waitingText}
        </span>
      ) : (
        timer
      )}
    </div>
  );
}
