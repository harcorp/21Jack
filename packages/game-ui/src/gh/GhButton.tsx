import type { ButtonHTMLAttributes, ReactNode } from "react";
import { GhIcon } from "./GhHeraldry";
import type { GhIconName } from "./paths";
import { cx } from "./util";

export type GhButtonVariant = "gold" | "crimson" | "stone" | "felt" | "wood" | "ghost";
export type GhButtonSize = "sm" | "md" | "lg" | "xl";

export interface GhButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: GhButtonVariant;
  /** SM 44 · MD 48 · LG 64 · XL 96 (min heights from the Buttons board). */
  size?: GhButtonSize;
  block?: boolean;
  /** Request in flight: stepped spinner, label dimmed, clicks ignored. */
  loading?: boolean;
  /** Stepped pixel corners (on by default except ghost, like the board). */
  notch?: boolean;
  /** Gold outline frame (`gh-btn--framed`). */
  framed?: boolean;
  icon?: GhIconName;
  children: ReactNode;
}

/** PixelButton from the Buttons board (`.gh-btn`). */
export function GhButton({
  variant = "gold",
  size = "md",
  block,
  loading,
  notch,
  framed,
  icon,
  className,
  children,
  disabled,
  onClick,
  type = "button",
  ...rest
}: GhButtonProps) {
  const useNotch = notch ?? variant !== "ghost";
  return (
    <button
      type={type}
      className={cx(
        "gh-btn",
        variant !== "gold" && `gh-btn--${variant}`,
        size !== "md" && `gh-btn--${size}`,
        block && "gh-btn--block",
        framed && "gh-btn--framed",
        useNotch && "gh-notch",
        loading && "is-loading",
        className,
      )}
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      {...rest}
    >
      {loading ? <span className="gh-spinner" aria-hidden /> : icon ? <GhIcon name={icon} /> : null}
      <span className="gh-btn__label">{children}</span>
    </button>
  );
}

/** Square icon button (menu, dismiss). 48 px by default. */
export function GhIconButton({
  icon,
  label,
  size = 48,
  iconSize,
  className,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { icon: GhIconName; label: string; size?: number; iconSize?: number }) {
  return (
    <button type="button" className={cx("gh-iconbtn", className)} aria-label={label} style={{ width: size, height: size }} {...rest}>
      <GhIcon name={icon} size={iconSize} />
    </button>
  );
}

type Preset = Omit<GhButtonProps, "children"> & { children?: ReactNode };

/** Solo: start the round with the placed bet. Gold LG. */
export function GhDealButton({ children = "Deal", size = "lg", ...p }: Preset) {
  return <GhButton size={size} {...p}>{children}</GhButton>;
}

/** Multiplayer: lock the bet for the shared deal. Felt LG. */
export function GhReadyButton({ children = "Ready", size = "lg", variant = "felt", ...p }: Preset) {
  return <GhButton size={size} variant={variant} {...p}>{children}</GhButton>;
}

/** After a settled round ("Next hand" in the stage). Gold SM. */
export function GhNewRoundButton({ children = "Next hand", size = "sm", ...p }: Preset) {
  return <GhButton size={size} {...p}>{children}</GhButton>;
}

/** Empty seat / spectator banner ("Sit here", "Sit down"). Gold SM. */
export function GhSitButton({ children = "Sit here", size = "sm", ...p }: Preset) {
  return <GhButton size={size} {...p}>{children}</GhButton>;
}

/** Leave the table. Crimson SM. */
export function GhLeaveButton({ children = "Leave", size = "sm", variant = "crimson", icon = "door", ...p }: Preset) {
  return <GhButton size={size} variant={variant} icon={icon} {...p}>{children}</GhButton>;
}
