import type { CSSProperties, ReactNode } from "react";
import { GH_ICONS, type GhIconName } from "./paths";
import { GH_SPRITES } from "./sprites";
import { cx } from "./util";

export interface GhIconProps {
  name: GhIconName;
  /** Pixel size; the 12×12 grid reads best at 12, 24 or 36. Defaults to 20 (`.gh-icon`). */
  size?: number;
  /** Accessible name. Without it the icon is decorative (aria-hidden). */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/** Pixel icon from pixel-paths.json (viewBox 0 0 12 12, fill currentColor, crisp edges). */
export function GhIcon({ name, size, title, className, style }: GhIconProps) {
  const dims = size ? { width: size, height: size } : undefined;
  return (
    <svg
      className={cx("gh-icon", className)}
      viewBox="0 0 12 12"
      style={{ ...dims, ...style }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={GH_ICONS[name]} />
    </svg>
  );
}

export interface GhCrestProps {
  /** `ring` = crest inside the gold ring (felt centre, loading); `plain` = the bird only. */
  variant?: "plain" | "ring";
  /** Rendered size in px. Keep to whole multiples of the 48/64 source (the board uses 32, 96, 128, 192, 256). */
  size?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/** House Flamingo crest (pixel art, always pixelated). */
export function GhCrest({ variant = "plain", size = 96, alt = "", className, style }: GhCrestProps) {
  const big = size > 96 || size % 64 === 0;
  const src =
    variant === "ring"
      ? big
        ? GH_SPRITES.crestRing64
        : GH_SPRITES.crestRing48
      : big
        ? GH_SPRITES.crest64
        : GH_SPRITES.crest48;
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cx("gh-pixelated", className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}

/** Crimson crest banner from the Heraldry board ("In use"). 150×236 at size 1. */
export function GhCrestBanner({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={className} style={{ position: "relative", width: 150, height: 236, ...style }} aria-hidden>
      <div
        style={{
          position: "absolute", left: -6, right: -6, top: 0, height: 10,
          background: "linear-gradient(180deg, var(--gh-gold-200), var(--gh-gold-500))", boxShadow: "0 0 0 2px var(--gh-ink)",
        }}
      />
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: 8, bottom: 0, background: "var(--gh-gold-400)",
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
        }}
      />
      <div
        style={{
          position: "absolute", left: 6, right: 6, top: 8, bottom: 12,
          background: "linear-gradient(180deg, var(--gh-crimson-600), var(--gh-crimson-700) 70%, var(--gh-crimson-800))",
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
        }}
      />
      <GhCrest size={96} style={{ position: "absolute", left: 27, top: 40 }} />
    </div>
  );
}

/** Gold coin sprite (16 px source). Board sizes: 64, 32, 20. */
export function GhCoin({ size = 32, alt = "", className }: { size?: number; alt?: string; className?: string }) {
  return (
    <img src={GH_SPRITES.coin} alt={alt} width={size} height={size} className={cx("gh-pixelated", className)} style={{ width: size, height: size }} />
  );
}

/** The king's 32×32 portrait (boss bar, dialogs). */
export function GhKingPortrait({ size = 96, alt = "The king", className, style }: { size?: number; alt?: string; className?: string; style?: CSSProperties }) {
  return (
    <img
      src={GH_SPRITES.kingPortrait}
      alt={alt}
      width={size}
      height={size}
      className={cx("gh-pixelated", className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}

export interface GhHeartsProps {
  /** Last hands at this table, oldest first: true = win or push (full), false = loss (empty), null = not played (empty). */
  results: ReadonlyArray<boolean | null>;
  /** Override the per-heart size (the seat default is 18×16 from `.gh-hearts img`). */
  size?: number;
  className?: string;
}

export function GhHearts({ results, size, className }: GhHeartsProps) {
  const words = results.map((r) => (r === null ? "not played" : r ? "won" : "lost"));
  return (
    <div className={cx("gh-hearts", className)} role="img" aria-label={`Last ${results.length} hands: ${words.join(", ")}`}>
      {results.map((r, i) => (
        <img key={i} src={r ? GH_SPRITES.heartFull : GH_SPRITES.heartEmpty} alt="" style={size ? { width: size, height: size } : undefined} />
      ))}
    </div>
  );
}

export type GhTagTone = "gold" | "you" | "soft" | "stone" | "crimson" | "torch" | "silver" | "ghost";

/** `.gh-tag` pill (status, YOU, Soft, Doubled, Bust...). */
export function GhTag({
  tone = "gold",
  icon,
  children,
  className,
  style,
}: {
  tone?: GhTagTone;
  icon?: GhIconName;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={cx("gh-tag", tone !== "gold" && `gh-tag--${tone}`, className)} style={style}>
      {icon && <GhIcon name={icon} size={12} />}
      {children}
    </span>
  );
}
