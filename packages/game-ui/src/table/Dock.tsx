"use client";

import type { Action } from "@21jack/contracts";
import type { ReactNode } from "react";
import { GhBet, GhButton, GhChip, GhStyles, GH_CHIP_VALUES, cx, ghFmt, type GhChipValue } from "../gh";
import { ActionIcon } from "../primitives";

const ACTIONS: ReadonlyArray<{ action: Action; label: string; key: string; sub: string }> = [
  { action: "hit", label: "Hit", key: "H", sub: "Take a card" },
  { action: "stand", label: "Stand", key: "S", sub: "Keep total" },
  { action: "double", label: "Double", key: "D", sub: "One card" },
  { action: "split", label: "Split", key: "P", sub: "Two hands" },
];
const OFF_SUB: Record<Action, string> = { hit: "Hand finished", stand: "Hand finished", double: "First two cards only", split: "Pairs only" };

export const ACTION_KEYS: ReadonlyArray<{ action: Action; key: string }> = ACTIONS.map(({ action, key }) => ({ action, key }));

/**
 * Hit / Stand / Double / Split as Grand Hall action buttons (`.gh-action`), each with its pixel
 * icon from the primitives above the label (requested by the client; the design is text only).
 */
export function SoloActionBar({
  allowed,
  onAction,
  locked,
  recommended,
  stake,
  brokeBy,
  compact,
  keepTotal,
}: {
  allowed: ReadonlySet<Action>;
  onAction: (action: Action) => void;
  /** A request is in flight: the bar greys out and ignores clicks. */
  locked: boolean;
  recommended: Action | null;
  /** Extra stake Double / Split would take. */
  stake: number;
  /** Credits missing for Double / Split (0 when affordable). */
  brokeBy: number;
  compact?: boolean;
  /** Current total, for the Stand sub-label ("Keep 17"). */
  keepTotal?: number;
}) {
  return (
    <div
      className={cx("gh-actionbar", "solo-actions", locked && "is-locked")}
      role="toolbar"
      aria-label="Actions"
      aria-busy={locked || undefined}
      style={compact ? { gap: 8, justifyContent: "center" } : undefined}
    >
      {ACTIONS.map(({ action, label, key, sub }) => {
        const enabled = allowed.has(action);
        const costs = action === "double" || action === "split";
        const broke = enabled && costs && brokeBy > 0;
        const reco = !locked && !broke && enabled && recommended === action;
        const subText = !enabled
          ? OFF_SUB[action]
          : broke
            ? `Need ${ghFmt(brokeBy)} more`
            : costs
              ? compact
                ? `+${ghFmt(stake)}`
                : `+${ghFmt(stake)} · ${sub.toLowerCase()}`
              : action === "stand" && keepTotal !== undefined
                ? `Keep ${keepTotal}`
                : sub;
        return (
          <button
            key={action}
            type="button"
            className={cx("gh-action", `gh-action--${action}`, compact && "gh-action--compact", broke && "is-broke", reco && "ghx-recommended")}
            disabled={!enabled}
            aria-disabled={broke || locked || undefined}
            aria-keyshortcuts={key}
            aria-label={`${label}, ${subText}${reco ? ", recommended" : ""}`}
            onClick={() => {
              if (!locked) onAction(action);
            }}
          >
            {!compact && <span className="gh-action__key">{key}</span>}
            <ActionIcon action={action} className="solo-action__icon" />
            <span>{label}</span>
            <span className="gh-action__sub">{subText}</span>
          </button>
        );
      })}
      <GhStyles />
    </div>
  );
}

/** Mobile betting dock from MobileStage: chip tray, then Bet · Clear · Deal. */
export function MobileBetDock({
  bet,
  balance,
  selected,
  locked,
  loading,
  onAdd,
  onClear,
  onDeal,
}: {
  bet: number;
  balance: number;
  selected: GhChipValue | null;
  locked: boolean;
  loading: boolean;
  onAdd: (v: GhChipValue) => void;
  onClear: () => void;
  onDeal: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div className="gh-tray" style={{ padding: "10px 12px 12px", gap: 6 }} role="group" aria-label="Chips">
        {GH_CHIP_VALUES.map((v) => (
          <GhChip
            key={v}
            value={v}
            diameter={44}
            selected={selected === v}
            disabled={locked || bet + v > balance}
            disabledReason="not enough credits"
            onClick={onAdd}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 358 }}>
        <GhBet amount={bet} />
        <GhButton variant="stone" size="sm" notch={false} disabled={locked || bet <= 0} onClick={onClear} style={{ minHeight: 56 }}>
          Clear
        </GhButton>
        <GhButton disabled={locked || bet <= 0 || bet > balance} loading={loading} onClick={onDeal} style={{ flex: 1, minHeight: 56, fontSize: 20 }}>
          Deal
        </GhButton>
      </div>
    </div>
  );
}

/** Dock status line (`.gh-banner`): reveal caption, "Round settled · Next hand". */
export function DockStatus({ title, sub, action, compact }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; compact?: boolean }) {
  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 358 }} role="status" aria-live="polite">
        <div className="gh-banner gh-notch" style={{ width: "100%", boxSizing: "border-box", justifyContent: "space-between", fontSize: 16, gap: 10, padding: "8px 10px 8px 16px", minHeight: 60 }}>
          <span>{title}</span>
          {action}
        </div>
        {sub && <span style={{ fontSize: 13, color: "var(--gh-cream-300)", textAlign: "center" }}>{sub}</span>}
      </div>
    );
  }
  return (
    <div
      className="gh-banner gh-notch"
      role="status"
      aria-live="polite"
      style={{ gap: 14, padding: action ? "10px 12px 10px 18px" : "10px 18px", fontSize: 17, whiteSpace: "nowrap", minHeight: 52, boxSizing: "border-box" }}
    >
      <span>{title}</span>
      {sub && <span className="ghx-banner-sub">{sub}</span>}
      {action}
      <GhStyles />
    </div>
  );
}
