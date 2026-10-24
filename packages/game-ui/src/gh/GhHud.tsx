"use client";

import type { BossView } from "@21jack/contracts";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { GhIconButton } from "./GhButton";
import { GhCoin, GhIcon, GhKingPortrait, GhTag, type GhTagTone } from "./GhHeraldry";
import { GhStyles } from "./styles";
import { cx, ghFmt, ghSigned } from "./util";

/* ------------------------------------------------------------------ balance */

export interface GhBalanceProps {
  value: number;
  /** Credits just returned: the value flashes gold and a "+N" tag shows beside it. */
  delta?: number;
  /** Show the menu icon button (HUD group, 12 px gap). */
  onMenu?: () => void;
  /** Mobile: 24 px coin. */
  compact?: boolean;
  className?: string;
}

/** BalancePill (`.gh-balance`): normal, credits returned (gold), zero (crimson). */
export function GhBalance({ value, delta, onMenu, compact, className }: GhBalanceProps) {
  const pill = (
    <div
      className={cx("gh-balance", value <= 0 && "is-zero", !!delta && delta > 0 && value > 0 && "is-up", !onMenu && !delta && className)}
      role="status"
      aria-label={`Balance ${ghFmt(value)} credits`}
    >
      <GhCoin size={compact ? 24 : 32} className="gh-balance__coin" />
      <span className="gh-balance__value">{ghFmt(value)}</span>
    </div>
  );
  if (!onMenu && !delta) return pill;
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: onMenu ? 12 : 10 }}>
      {pill}
      {!!delta && delta > 0 && <GhTag tone="torch">{ghSigned(delta)}</GhTag>}
      {onMenu && <GhIconButton icon="menu" label="Open menu" onClick={onMenu} />}
    </div>
  );
}

/** Current bet read-out for the HUD (same type as the tray's "BET" value). */
export function GhBet({ amount, label = "Bet", className }: { amount: number; label?: string; className?: string }) {
  return (
    <div className={cx("gh-frame gh-notch", className)} style={{ padding: "8px 12px", display: "inline-flex", flexDirection: "column", gap: 5, minWidth: 100, boxSizing: "border-box" }}>
      <span className="gh-eyebrow" style={{ fontSize: 11 }}>
        {label}
      </span>
      <span className="gh-num" style={{ fontSize: 16, color: "var(--gh-gold-200)" }} aria-live="polite">
        {ghFmt(amount)}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- boss bar */

export interface GhBossBarProps {
  boss: BossView;
  name?: string;
  /**
   * `hud` = HUD board (king portrait above the bar, 520 wide);
   * `stage` = 1440 stage (pixel crown, 470 wide, damage number at the right);
   * `mobile` = 300 wide with the portrait at the left.
   */
  variant?: "hud" | "stage" | "mobile";
  /** Defeated bonus tag, e.g. "+250 each". */
  bonus?: string;
  /** Change to replay the hit flash + shake for a new settlement. */
  eventKey?: string | number;
  width?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * BossBar from BossView: one segment per heart (`maxHp`), segments lost this round flash (`is-hit`)
 * and the frame shakes; at 0 the bar turns gold (`is-defeated`).
 */
export function GhBossBar({ boss, name = "The King", variant = "hud", bonus, eventKey, width, className, style }: GhBossBarProps) {
  const defeated = boss.defeated || boss.hp <= 0;
  const hits = boss.delta < 0 && !defeated ? Math.min(-boss.delta, boss.maxHp - boss.hp) : 0;
  const segs = Array.from({ length: boss.maxHp }, (_, i) => (i < boss.hp ? "" : i < boss.hp + hits ? "is-hit" : "is-empty"));
  const left = defeated ? "Defeated" : hits > 0 ? `Hit · ${ghSigned(-hits)}` : name;
  const right = `${boss.hp} / ${boss.maxHp}`;
  const mobile = variant === "mobile";
  const track: CSSProperties = { gridTemplateColumns: `repeat(${boss.maxHp}, minmax(0, 1fr))`, ...(mobile ? { gap: 2, padding: 2 } : null) };
  const box: CSSProperties =
    variant === "hud"
      ? { paddingTop: 40, width: width ?? 520 }
      : variant === "stage"
        ? { width: width ?? 470 }
        : { width: width ?? 300, paddingTop: 0, paddingLeft: 30, boxSizing: "border-box" };

  return (
    <div
      key={eventKey}
      className={cx("gh-boss", hits > 0 && !defeated && "is-shake", defeated && "is-defeated", className)}
      role="meter"
      aria-label={`${name} health`}
      aria-valuemin={0}
      aria-valuemax={boss.maxHp}
      aria-valuenow={boss.hp}
      style={{ ...box, ...style }}
    >
      {variant === "stage" ? (
        <div className="gh-boss__crown" style={{ top: 0, width: 48, height: 28, zIndex: 2 }}>
          <GhIcon
            name="crown"
            size={40}
            style={{ color: "var(--gh-gold-400)", filter: "drop-shadow(0 2px 0 var(--gh-ink)) drop-shadow(0 0 6px rgba(255,200,90,.6))" }}
          />
        </div>
      ) : (
        <div
          className="gh-boss__crown ghx-boss-portrait"
          style={mobile ? { left: 0, top: -4, transform: "none", width: 36, height: 36 } : { top: 0, width: 48, height: 48 }}
        >
          <GhKingPortrait size={mobile ? 30 : 40} alt="" />
        </div>
      )}
      <div className="gh-boss__frame" style={mobile ? { height: 28, padding: "6px 8px 6px 14px" } : undefined}>
        <div className="gh-boss__track" style={track}>
          {segs.map((s, i) => (
            <i key={i} className={cx("gh-boss__hp", s)} style={{ height: "100%", display: "block" }} />
          ))}
        </div>
      </div>
      <div className="gh-boss__label" style={mobile ? { fontSize: 12, marginTop: 4 } : undefined}>
        <span>{left}</span>
        {defeated && bonus ? (
          <GhTag>{bonus}</GhTag>
        ) : (
          <span className="gh-num" style={{ fontSize: mobile ? 8 : 10, color: "var(--gh-cream-100)" }}>
            {right}
          </span>
        )}
      </div>
      {variant === "stage" && hits > 0 && <span className="ghx-boss-damage">{ghSigned(-hits)}</span>}
      {defeated && !mobile && (
        <>
          <i className="gh-sparkle" style={{ left: "30%", top: variant === "hud" ? 22 : -10 }} aria-hidden />
          <i className="gh-sparkle" style={{ left: "68%", top: variant === "hud" ? 26 : -6, animationDelay: "-.4s" }} aria-hidden />
        </>
      )}
      <GhStyles />
    </div>
  );
}

/* ------------------------------------------------------------- turn timer */

export interface GhCountdown {
  msLeft: number;
  secondsLeft: number;
  /** 1 = full window left, 0 = expired. */
  progress: number;
}

/** Ticking countdown to an ISO / epoch deadline. Returns a full window until mounted (SSR-safe). */
export function useGhCountdown(deadline: string | number | Date | null | undefined, durationMs: number, tickMs = 250): GhCountdown {
  const [now, setNow] = useState<number | null>(null);
  const end = deadline == null ? null : new Date(deadline).getTime();
  useEffect(() => {
    if (end === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [end, tickMs]);
  if (end === null || now === null) return { msLeft: durationMs, secondsLeft: Math.ceil(durationMs / 1000), progress: 1 };
  const msLeft = Math.max(0, end - now);
  return { msLeft, secondsLeft: Math.ceil(msLeft / 1000), progress: durationMs > 0 ? Math.min(1, msLeft / durationMs) : 0 };
}

export interface GhTurnTimerProps {
  /** Deadline (TableView.deadline). Omit to drive it with `secondsLeft` + `progress`. */
  deadline?: string | number | Date | null;
  /** Length of the whole window, ms (turn or betting window). */
  durationMs?: number;
  secondsLeft?: number;
  progress?: number;
  /**
   * `ring` = countdown ring around a `.gh-portrait` (place it inside the portrait);
   * `badge` = small ring with the number (status banners, 36/48 px);
   * `dial` = shared betting countdown (152 px, "seconds"), `size="sm"` = 60 px tray dial.
   */
  variant?: "ring" | "badge" | "dial";
  size?: "sm" | "md";
  /** Dial caption under it, e.g. "Bets close in 12" ({s} is replaced by the seconds). */
  caption?: string;
  label?: string;
}

/** Turn / betting countdown drawn from a deadline. */
export function GhTurnTimer({ deadline, durationMs = 20000, secondsLeft, progress, variant = "ring", size = "md", caption, label = "Time left" }: GhTurnTimerProps) {
  const live = useGhCountdown(deadline, durationMs);
  const s = secondsLeft ?? live.secondsLeft;
  const p = Math.round((progress ?? live.progress) * 100);
  const pVar = { "--p": p } as CSSProperties;
  const aria = `${label}: ${s} seconds`;

  if (variant === "ring") {
    return (
      <>
        <div className="gh-ring" style={pVar} role="timer" aria-label={aria} />
        <span className="gh-ring__time" aria-hidden>
          {s}
        </span>
      </>
    );
  }
  if (variant === "badge") {
    const d = size === "sm" ? 36 : 48;
    return (
      <div className="ghx-timer-badge" style={{ width: d, height: d }} role="timer" aria-label={aria}>
        <div className="gh-ring" style={pVar} />
        <span className="gh-num" style={{ fontSize: size === "sm" ? 10 : 12, color: "var(--gh-gold-200)" }}>
          {s}
        </span>
        <GhStyles />
      </div>
    );
  }
  const small = size === "sm";
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div className={cx("ghx-dial", small && "ghx-dial--sm")} style={pVar} role="timer" aria-label={aria}>
        <div className="ghx-dial__face">
          <span className={cx("gh-num", !small && "gh-shadow-text")} style={{ fontSize: small ? 14 : 32, color: "var(--gh-gold-200)" }}>
            {s}
          </span>
          {!small && (
            <span className="ghx-cap" style={{ fontSize: 10, color: "var(--gh-cream-300)" }}>
              seconds
            </span>
          )}
        </div>
      </div>
      {caption && (
        <span className="gh-display gh-shadow-text" style={{ fontSize: 20, color: "var(--gh-gold-200)" }}>
          {caption.replace("{s}", String(s))}
        </span>
      )}
      <GhStyles />
    </div>
  );
}

/* --------------------------------------------------------- plate and feed */

export interface GhTablePlateProps {
  name: string;
  /** "Solo" / "Boss mode". */
  mode?: string;
  /** "Min 10 · Max 500 · 3/5 seats". */
  meta?: string;
  round?: number;
  phase?: string;
  phaseTone?: GhTagTone;
  className?: string;
}

/** TablePlate (top left): table name, rules line and phase tag. */
export function GhTablePlate({ name, mode, meta, round, phase, phaseTone = "torch", className }: GhTablePlateProps) {
  return (
    <div className={cx("gh-frame gh-frame--glass gh-notch", className)} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 236, padding: "12px 18px 14px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span className="gh-display gh-shadow-text" style={{ fontSize: 22, color: "var(--gh-gold-200)" }}>
          {name}
        </span>
        {mode && <GhTag tone="stone">{mode}</GhTag>}
        {round !== undefined && !mode && (
          <span className="gh-num" style={{ fontSize: 8, color: "var(--gh-cream-400)" }}>
            ROUND {round}
          </span>
        )}
      </div>
      {meta && <span style={{ fontSize: 13, color: "var(--gh-cream-300)" }}>{meta}</span>}
      {phase && (
        <span>
          <GhTag tone={phaseTone}>{phase}</GhTag>
        </span>
      )}
    </div>
  );
}

export interface GhFeedRow {
  who: ReactNode;
  text: ReactNode;
  /** Crimson dot for boss events. */
  tone?: "default" | "boss";
}

/** TableFeed: newest at the bottom, last 5 events. */
export function GhTableFeed({ rows, title = "Table feed", limit = 5, className }: { rows: ReadonlyArray<GhFeedRow>; title?: string; limit?: number; className?: string }) {
  return (
    <div className={cx("gh-frame gh-frame--glass gh-notch gh-feed", className)} role="log" aria-label={title} style={{ boxSizing: "border-box" }}>
      <span className="ghx-cap" style={{ color: "var(--gh-gold-400)", marginBottom: 4 }}>
        {title}
      </span>
      {rows.slice(-limit).map((r, i) => (
        <div key={i} className="gh-feed__row">
          <i className="gh-feed__dot" style={r.tone === "boss" ? { background: "var(--gh-crimson-400)" } : undefined} />
          <span>
            <b>{r.who}</b> {r.text}
          </span>
        </div>
      ))}
      <GhStyles />
    </div>
  );
}
