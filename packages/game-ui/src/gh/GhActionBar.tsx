"use client";

import type { Action } from "@21jack/contracts";
import { useEffect, useRef } from "react";
import { GhIcon } from "./GhHeraldry";
import { GhStyles } from "./styles";
import { cx, ghFmt } from "./util";

export const GH_ACTIONS: ReadonlyArray<Action> = ["hit", "stand", "double", "split"];

const LABEL: Record<Action, string> = { hit: "Hit", stand: "Stand", double: "Double", split: "Split" };
export const GH_ACTION_KEYS: Record<Action, string> = { hit: "H", stand: "S", double: "D", split: "P" };
/** Sub-labels for a disabled action (Buttons board). */
const OFF_SUB: Record<Action, string> = { hit: "Hand finished", stand: "Hand finished", double: "First two cards only", split: "Pairs only" };

export interface GhActionButtonProps {
  action: Action;
  disabled?: boolean;
  /** Not enough credits: crimson frame, lock icon, sub shows how many more are needed. */
  brokeBy?: number;
  /** This action's request is in flight (spinner + "Sending…"). */
  busy?: boolean;
  /** Coach Mode: the recommended move glows. */
  recommended?: boolean;
  /** Second line (e.g. "+10 stake", "Pairs only"). */
  sub?: string;
  /** Show the hotkey hint in the corner (desktop). */
  showKey?: boolean;
  /** Mobile size: 84 × 70, 18 px label. */
  compact?: boolean;
  /** Gallery only: force the pressed / focus look. */
  pressed?: boolean;
  focus?: boolean;
  onClick?: (action: Action) => void;
}

/** ActionButton (`.gh-action`) for Hit, Stand, Double and Split. */
export function GhActionButton({
  action,
  disabled,
  brokeBy,
  busy,
  recommended,
  sub,
  showKey = true,
  compact,
  pressed,
  focus,
  onClick,
}: GhActionButtonProps) {
  const broke = !disabled && brokeBy !== undefined && brokeBy > 0;
  const inert = disabled || broke;
  const key = GH_ACTION_KEYS[action];
  const subText = broke ? `Need ${ghFmt(brokeBy!)} more` : disabled ? (sub ?? OFF_SUB[action]) : sub;
  return (
    <button
      type="button"
      className={cx(
        "gh-action",
        `gh-action--${action}`,
        compact && "gh-action--compact",
        broke && "is-broke",
        busy && "is-busy is-pressed",
        pressed && "is-pressed",
        focus && "is-focus",
        recommended && !inert && "ghx-recommended",
      )}
      disabled={disabled}
      aria-disabled={broke || busy || undefined}
      aria-keyshortcuts={showKey ? key : undefined}
      aria-label={`${LABEL[action]}${subText ? `, ${subText}` : ""}${recommended ? ", recommended" : ""}`}
      onClick={inert || busy || !onClick ? undefined : () => onClick(action)}
    >
      {showKey && !compact && <span className="gh-action__key">{key}</span>}
      {recommended && !inert && <span className="gh-tag gh-tag--you ghx-reco-tag">Coach</span>}
      {busy ? (
        <>
          <span className="gh-spinner" aria-hidden />
          <span className="gh-action__sub">Sending…</span>
        </>
      ) : (
        <>
          <span>{LABEL[action]}</span>
          {subText &&
            (broke ? (
              <span className="gh-action__sub gh-action__lock">
                <GhIcon name="lock" size={10} />
                {subText}
              </span>
            ) : (
              <span className="gh-action__sub">{subText}</span>
            ))}
        </>
      )}
      {(compact || recommended || broke) && <GhStyles />}
    </button>
  );
}

export interface GhActionBarProps {
  /** Actions the server allows for the active hand (`HandView.allowedActions` / `TableView.you.allowedActions`). */
  allowed: ReadonlyArray<Action>;
  onAction?: (action: Action) => void;
  /** The action whose request is in flight; the whole bar locks while it is set. */
  busy?: Action | null;
  /** Lock every button without a spinner (e.g. waiting for the server). */
  locked?: boolean;
  /** Coach Mode recommendation. */
  recommended?: Action | null;
  /** Current stake of the active hand: Double and Split show "+stake" and need that many credits. */
  stake?: number;
  /** Player balance; when below `stake`, allowed Double / Split render as "Need N more". */
  balance?: number;
  /** Override sub-labels per action. */
  subs?: Partial<Record<Action, string>>;
  /** Listen for H / S / D / P on the window while the bar is enabled. */
  hotkeys?: boolean;
  /** Mobile layout: compact buttons, no key hints, 8 px gap. */
  compact?: boolean;
  className?: string;
}

/** ActionBar: only the active player sees it; it locks while a request is in flight. */
export function GhActionBar({
  allowed,
  onAction,
  busy = null,
  locked,
  recommended = null,
  stake,
  balance,
  subs,
  hotkeys,
  compact,
  className,
}: GhActionBarProps) {
  const isLocked = locked || busy !== null;
  const brokeBy = (a: Action) =>
    (a === "double" || a === "split") && stake !== undefined && balance !== undefined && balance < stake ? stake - balance : undefined;

  const latest = useRef({ allowed, onAction, isLocked, brokeBy });
  latest.current = { allowed, onAction, isLocked, brokeBy };

  useEffect(() => {
    if (!hotkeys) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const { allowed: ok, onAction: fire, isLocked: lockedNow, brokeBy: broke } = latest.current;
      const action = GH_ACTIONS.find((a) => GH_ACTION_KEYS[a] === e.key.toUpperCase());
      if (!action || lockedNow || !fire || !ok.includes(action) || (broke(action) ?? 0) > 0) return;
      e.preventDefault();
      fire(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkeys]);

  return (
    <div
      className={cx("gh-actionbar", isLocked && "is-locked", className)}
      role="group"
      aria-label="Your move"
      aria-busy={isLocked || undefined}
      style={compact ? { gap: 8, justifyContent: "center" } : undefined}
    >
      {GH_ACTIONS.map((a) => {
        const enabled = allowed.includes(a);
        const stakeSub = (a === "double" || a === "split") && stake !== undefined ? `+${ghFmt(stake)} stake` : undefined;
        return (
          <GhActionButton
            key={a}
            action={a}
            disabled={!enabled}
            brokeBy={enabled ? brokeBy(a) : undefined}
            busy={busy === a}
            recommended={!isLocked && recommended === a}
            sub={subs?.[a] ?? (enabled ? stakeSub : undefined)}
            showKey={!compact}
            compact={compact}
            onClick={isLocked ? undefined : onAction}
          />
        );
      })}
    </div>
  );
}
