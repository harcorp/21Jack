"use client";

import type { Action } from "@21jack/contracts";
import type { CSSProperties, ReactNode } from "react";
import { type GhChipValue, ghChipsFor, ghFmt } from "../gh";
import { ActionIcon } from "../primitives";
import { STAGE_SOURCE, type StageVariant, useStageAnchors } from "../scene";

// Multi table overlay CSS: the scaled design canvas, felt parallax, chip slide-in and the
// end-of-round chip collect. Hoisted once by React 19 like the scene sheet.
const MULTI_CSS = /* css */ `
.mt-canvas { position: absolute; left: 0; top: 0; transform-origin: 0 0; pointer-events: none;
  font-family: var(--gh-font-body, Inter, system-ui, sans-serif); color: var(--gh-cream-100, #FBF4E4); }
.mt-canvas * { pointer-events: auto; }
.mt-canvas .mt-inert, .mt-canvas .mt-inert * { pointer-events: none; }
.mt-felt { position: absolute; inset: 0; pointer-events: none;
  transform: translate3d(calc(var(--ghs-px, 0) * -6px), calc(var(--ghs-py, 0) * -6px), 0); }
.mt-abs { position: absolute; }
.mt-stack-in > i:last-of-type { animation: mt-chip-in 320ms steps(6, end) both; }
@keyframes mt-chip-in { from { transform: translate(var(--mt-fx, 0px), var(--mt-fy, -24px)); opacity: .2; } }
.mt-collect { animation: mt-collect 450ms steps(6, end) var(--mt-delay, 1.4s) forwards; }
@keyframes mt-collect { to { transform: translate(var(--mt-tx, 0px), var(--mt-ty, -140px)); opacity: 0; } }
/* centre moment: pops in over the dealer, holds, then clears the view of the King and the cards */
.mt-moment { transform: translate(-50%, -50%); animation: mt-moment 3s steps(12, end) forwards; }
.mt-moment--long { animation-duration: 5s; }
@keyframes mt-moment {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.9); }
  8%, 82% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; visibility: hidden; transform: translate(-50%, -50%) scale(1); }
}
.mt-action-icon { height: 18px; margin-bottom: -2px; }
.gh-action--compact .mt-action-icon { height: 14px; }
@media (prefers-reduced-motion: reduce) {
  .mt-felt { transform: none; }
  .mt-stack-in > i:last-of-type { animation: none; }
  .mt-collect { animation-duration: 1ms; }
  .mt-moment { animation-timing-function: step-end; }
}
`;

export function MultiStyles() {
  return (
    <style href="21jack-multi-table" precedence="default">
      {MULTI_CSS}
    </style>
  );
}

/**
 * The design canvas (1440×810 desktop, 390×844 mobile) scaled to the stage, so overlays use the
 * stage template's source pixels and % positions verbatim. Renders only for the variant on screen.
 */
export function StageCanvas({ variant, children }: { variant: StageVariant; children: ReactNode }) {
  const ctx = useStageAnchors();
  if (ctx.variant !== variant) return null;
  const { width, height } = STAGE_SOURCE[variant];
  return (
    <div
      className="mt-canvas"
      data-canvas={variant}
      style={{ width, height, transform: `scale(${ctx.scale})`, visibility: ctx.width > 0 ? undefined : "hidden" }}
    >
      {children}
    </div>
  );
}

const CHIP_CLASS: Record<GhChipValue, string> = { 5: "c5", 10: "c10", 25: "c25", 100: "c100", 500: "c500", 1000: "c1k" };

export type CollectTarget = { x: number; y: number } | null;

export interface StakeProps {
  amount: number;
  /** Chips in the order they were placed (your bet); otherwise the amount is broken down largest first. */
  chips?: readonly GhChipValue[] | null;
  /** Offset (source px) new chips slide in from, e.g. your plate. */
  from?: { x: number; y: number };
  /** Settled: sweep the stack to this offset (the plate on a win / push, the dealer on a loss). */
  collect?: CollectTarget;
  lost?: boolean;
  size?: "md" | "sm";
  max?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Stake on the felt: a flat chip stack (`.gh-stack`) with the gold amount pill. Your chips keep the
 * order you clicked them and each new one slides in from your plate; once a round settles the stack
 * is swept to the winner after a beat.
 */
export function Stake({ amount, chips, from, collect, lost, size = "md", max = 8, className, style }: StakeProps) {
  const list = chips && chips.length > 0 ? chips : ghChipsFor(amount, max).chips;
  const shown = list.slice(Math.max(0, list.length - max));
  const more = list.length - shown.length;
  const sm = size === "sm";
  const vars = {
    ...(from ? { "--mt-fx": `${from.x}px`, "--mt-fy": `${from.y}px` } : null),
    ...(collect ? { "--mt-tx": `${collect.x}px`, "--mt-ty": `${collect.y}px` } : null),
  } as CSSProperties;
  return (
    <div
      className={["ghx-stake", lost && "is-lost", collect && "mt-collect", className].filter(Boolean).join(" ")}
      style={{ ...vars, ...style }}
      role="img"
      aria-label={`Stake ${ghFmt(amount)}${lost ? ", lost" : ""}`}
    >
      <div className={["gh-stack", sm && "ghx-stack--sm", "mt-stack-in"].filter(Boolean).join(" ")}>
        {shown.map((v, i) => (
          <i key={`${v}-${i}`} className={CHIP_CLASS[v]} />
        ))}
        {more > 0 && <span className="ghx-stack-more">+{more}</span>}
      </div>
      <span className="ghx-stake__value ghx-stake__value--pill" aria-hidden>
        {ghFmt(amount)}
      </span>
    </div>
  );
}

const LABEL: Record<Action, string> = { hit: "Hit", stand: "Stand", double: "Double", split: "Split" };
const KEY: Record<Action, string> = { hit: "H", stand: "S", double: "D", split: "P" };
const ORDER: Action[] = ["hit", "stand", "double", "split"];

export interface MultiActionBarProps {
  allowed: readonly Action[];
  subs: Partial<Record<Action, string>>;
  /** Credits missing for Double / Split (allowed but unaffordable). */
  brokeBy?: number;
  busy: boolean;
  compact?: boolean;
  onAction: (action: Action) => void;
}

/**
 * ActionBar (`.gh-actionbar` / `.gh-action`) with the pixel action icons from the primitives inside
 * each button. Locks while a request is in flight. Keyboard: H / S / D / P via aria-keyshortcuts.
 */
export function MultiActionBar({ allowed, subs, brokeBy, busy, compact, onAction }: MultiActionBarProps) {
  return (
    <div
      className={["gh-actionbar", busy && "is-locked"].filter(Boolean).join(" ")}
      role="group"
      aria-label="Your move"
      aria-busy={busy || undefined}
      style={compact ? { gap: 8, justifyContent: "center" } : undefined}
    >
      {ORDER.map((a) => {
        const enabled = allowed.includes(a);
        const broke = enabled && (a === "double" || a === "split") && (brokeBy ?? 0) > 0;
        const sub = broke ? `Need ${ghFmt(brokeBy ?? 0)} more` : subs[a];
        return (
          <button
            key={a}
            type="button"
            className={["gh-action", `gh-action--${a}`, compact && "gh-action--compact", broke && "is-broke"].filter(Boolean).join(" ")}
            disabled={!enabled || busy}
            aria-disabled={broke || undefined}
            aria-keyshortcuts={compact ? undefined : KEY[a]}
            aria-label={`${LABEL[a]}${sub ? `, ${sub}` : ""}`}
            onClick={broke ? undefined : () => onAction(a)}
          >
            {!compact && <span className="gh-action__key">{KEY[a]}</span>}
            <ActionIcon action={a} className="mt-action-icon" />
            <span>{LABEL[a]}</span>
            {sub && <span className="gh-action__sub">{sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
