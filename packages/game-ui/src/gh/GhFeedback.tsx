import type { HandOutcome } from "@21jack/contracts";
import type { CSSProperties, ReactNode } from "react";
import { GhCrest, GhIcon, GhKingPortrait, GhTag } from "./GhHeraldry";
import type { GhIconName } from "./paths";
import { GhStyles } from "./styles";
import { cx, ghFmt, ghSigned } from "./util";

export type GhResultKind = "victory" | "blackjack" | "push" | "defeat";

export function ghResultKind(outcome: HandOutcome): GhResultKind {
  return outcome === "win" ? "victory" : outcome === "loss" ? "defeat" : outcome;
}

const WORD: Record<GhResultKind, string> = { victory: "Victory", blackjack: "Blackjack", push: "Push", defeat: "Defeat" };

function Sparkles({ spots }: { spots: ReadonlyArray<CSSProperties> }) {
  return (
    <>
      {spots.map((s, i) => (
        <i key={i} className="gh-sparkle" style={{ animationDelay: `${-0.3 * i}s`, ...s }} aria-hidden />
      ))}
    </>
  );
}

export interface GhResultBadgeProps {
  outcome: HandOutcome | GhResultKind;
  /** Credits returned (2× stake on a win, stake on a push, 0 on a loss). */
  payout: number;
  /** `board` 220 wide (Hands board) · `seat` compact under a seat · `stage` beside a hand on the felt. */
  size?: "board" | "seat" | "stage";
  className?: string;
}

/** ResultBadge per hand (`.gh-result`): Victory, Push, Defeat, Blackjack (with sparkles). */
export function GhResultBadge({ outcome, payout, size = "board", className }: GhResultBadgeProps) {
  const kind: GhResultKind = outcome === "win" || outcome === "loss" ? ghResultKind(outcome) : outcome;
  const box: CSSProperties =
    size === "board" ? { minWidth: 220, position: "relative" } : size === "seat" ? { minWidth: 0, padding: "4px 12px 6px", position: "relative" } : { minWidth: 0, padding: "5px 12px 7px", position: "relative" };
  const word: CSSProperties | undefined = size === "seat" ? { fontSize: 17 } : size === "stage" ? { fontSize: 19 } : undefined;
  const amount: CSSProperties | undefined = size === "board" ? undefined : { fontSize: 10 };
  return (
    <div className={cx("gh-result", `gh-result--${kind}`, className)} style={box} role="status" aria-label={`${WORD[kind]}, ${ghSigned(payout)} credits returned`}>
      <span className="gh-result__word" style={word}>
        {WORD[kind]}
      </span>
      <span className="gh-result__amount" style={amount}>
        {ghSigned(payout)}
      </span>
      {kind === "blackjack" &&
        (size === "board" ? (
          <Sparkles spots={[{ left: 8, top: 6 }, { right: 10, top: 10 }, { right: 40, bottom: 6 }]} />
        ) : (
          <Sparkles spots={[{ left: -6, top: -6 }, { right: -5, top: 6 }, { left: "40%", bottom: -7 }]} />
        ))}
    </div>
  );
}

export type GhBannerKind = "victory" | "blackjack" | "push" | "defeat" | "bust" | "kingslayer";

const MOMENT: Record<GhBannerKind, { word: string; eyebrow: string; frame: string }> = {
  victory: { word: "Victory!", eyebrow: "Round won", frame: "gh-frame--felt" },
  blackjack: { word: "BLACKJACK!", eyebrow: "Natural at the deal", frame: "gh-frame--crimson" },
  push: { word: "Push", eyebrow: "Stake returned", frame: "gh-frame--stone" },
  defeat: { word: "Defeat", eyebrow: "The king takes it", frame: "gh-frame--stone" },
  bust: { word: "Bust!", eyebrow: "Over 21", frame: "gh-frame--crimson" },
  kingslayer: { word: "Kingslayer!", eyebrow: "The king falls", frame: "gh-frame--crimson" },
};

export interface GhResultBannerProps {
  kind: GhBannerKind;
  /** Override the big word. */
  title?: ReactNode;
  eyebrow?: ReactNode;
  /** One line under the word, e.g. "Pays 1 to 1 · your 50 comes back as 100". */
  detail?: ReactNode;
  /** Credits returned / bonus shown as a gold "+N" tag. */
  amount?: number;
  /** Kingslayer: how many times this king has fallen. */
  defeats?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Centre-of-table moment. BLACKJACK follows the stage's "Natural at the deal" frame exactly;
 * the other kinds reuse the same frame with the result colour (see report for the extrapolation).
 */
export function GhResultBanner({ kind, title, eyebrow, detail, amount, defeats, className, style }: GhResultBannerProps) {
  const m = MOMENT[kind];
  const sparkle = kind === "blackjack" || kind === "kingslayer" || kind === "victory";
  return (
    <div className={cx("gh-frame", m.frame, "gh-notch", "ghx-moment", `ghx-moment--${kind}`, className)} style={style} role="status" aria-live="polite">
      {kind === "kingslayer" && <GhKingPortrait size={64} alt="" style={{ filter: "grayscale(.6)", marginBottom: 4 }} />}
      <span className="gh-eyebrow" style={{ color: "var(--gh-gold-100)" }}>
        {eyebrow ?? m.eyebrow}
      </span>
      <span className="ghx-moment__word">{title ?? m.word}</span>
      {(detail || amount !== undefined || defeats !== undefined) && (
        <span className="ghx-moment__row">
          {detail && <span className="ghx-moment__detail">{detail}</span>}
          {defeats !== undefined && <span className="ghx-moment__detail">Kings slain: {ghFmt(defeats)}</span>}
          {amount !== undefined && (
            <GhTag tone="you" style={{ height: 28, fontSize: 16 }}>
              {ghSigned(amount)}
            </GhTag>
          )}
        </span>
      )}
      {sparkle && (
        <Sparkles spots={[{ left: 14, top: 12 }, { right: 18, top: 22 }, { left: "30%", bottom: 8 }, { right: "26%", top: 6 }]} />
      )}
      <GhStyles />
    </div>
  );
}

export interface GhToastProps {
  tone?: "error" | "success" | "info";
  title: ReactNode;
  /** Errors always say what did not change ("Nothing changed."). */
  message?: ReactNode;
  icon?: GhIconName;
  /** Success amount tag ("+500"). */
  amount?: number;
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
}

const TOAST_ICON: Record<NonNullable<GhToastProps["tone"]>, GhIconName> = { error: "info", success: "check", info: "user" };

/** `.gh-toast`: crimson error, felt success, stone info. */
export function GhToast({ tone = "error", title, message, icon, amount, onDismiss, className, style }: GhToastProps) {
  return (
    <div
      className={cx("gh-toast", tone !== "error" && `gh-toast--${tone}`, "gh-notch", className)}
      style={style}
      role={tone === "error" ? "alert" : "status"}
    >
      <GhIcon name={icon ?? TOAST_ICON[tone]} size={22} style={{ flex: "none", color: "var(--gh-gold-200)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <strong>{title}</strong>
        {message && <span>{message}</span>}
      </div>
      {amount !== undefined && (
        <GhTag tone="you" style={{ height: 26, fontSize: 15 }}>
          {ghSigned(amount)}
        </GhTag>
      )}
      {onDismiss && (
        <button type="button" className="gh-iconbtn" aria-label="Dismiss" style={{ width: 44, height: 44 }} onClick={onDismiss}>
          <GhIcon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

export interface GhStatusBannerProps {
  icon?: GhIconName;
  /** Leading slot (e.g. a timer badge or avatar) instead of an icon. */
  lead?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** `.gh-banner`: Watching / Round in progress / dock status lines ("Mariana's turn", "Round settled"). */
export function GhStatusBanner({ icon, lead, title, sub, action, className, style }: GhStatusBannerProps) {
  return (
    <div className={cx("gh-banner", "gh-notch", className)} role="status" style={{ justifyContent: "space-between", ...style }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {lead ?? (icon && <GhIcon name={icon} size={24} />)}
        {title}
      </span>
      {sub && <span className="ghx-banner-sub" style={{ fontSize: 14, color: "var(--gh-cream-200)" }}>{sub}</span>}
      {action}
      <GhStyles />
    </div>
  );
}

/** "Shuffling the deck…" loading panel from the Feedback board. */
export function GhLoading({ text = "Shuffling the deck…" }: { text?: ReactNode }) {
  return (
    <div
      className="gh-frame gh-frame--glass gh-notch"
      role="status"
      aria-live="polite"
      style={{
        minHeight: 300, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22,
        background: "radial-gradient(80% 70% at 50% 40%, rgba(240, 122, 26, .18), rgba(14, 12, 18, .9) 70%)",
      }}
    >
      <GhCrest variant="ring" size={96} />
      <span className="gh-spinner" style={{ width: 24, height: 24 }} aria-hidden />
      <span className="gh-display" style={{ fontSize: 18, color: "var(--gh-gold-200)" }}>
        {text}
      </span>
    </div>
  );
}
