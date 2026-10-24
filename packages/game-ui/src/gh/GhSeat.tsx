import type { CSSProperties, ReactNode } from "react";
import { GhButton } from "./GhButton";
import { GhResultBadge, type GhResultKind } from "./GhFeedback";
import { GhHandTotal } from "./GhHand";
import { GhHearts, GhIcon, GhTag, type GhTagTone } from "./GhHeraldry";
import { GhTurnTimer, type GhTurnTimerProps } from "./GhHud";
import type { GhAvatarId } from "./sprites";
import { GH_SPRITES } from "./sprites";
import { GhStyles } from "./styles";
import { cx, ghAvatarSrc, ghFmt } from "./util";

export interface GhPortraitProps {
  /** Avatar id (squire … jester) or an image URL. Omit with `empty`. */
  avatar?: GhAvatarId | string;
  alt?: string;
  /** SM 40 (mobile row, lists) · MD 64 (table seats) · LG 96 (avatar picker). */
  size?: "sm" | "md" | "lg";
  you?: boolean;
  /** Active turn: gold glow. */
  active?: boolean;
  /** Sitting out / disconnected: greyed. */
  off?: boolean;
  /** Disconnected badge (no-signal icon) at the bottom right. */
  offline?: boolean;
  /** Empty seat: dashed gold ring with a plus. */
  empty?: boolean;
  /** Turn countdown ring (place a <GhTurnTimer variant="ring" /> config here). */
  timer?: Omit<GhTurnTimerProps, "variant">;
  /** Hide the seconds bubble on the ring (mobile mini row). */
  ringOnly?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Portrait in a gold ring (`.gh-portrait`). */
export function GhPortrait({ avatar, alt = "", size = "md", you, active, off, offline, empty, timer, ringOnly, className, style }: GhPortraitProps) {
  return (
    <div
      className={cx("gh-portrait", size !== "md" && `gh-portrait--${size}`, you && "is-you", active && "is-active", (off || offline) && "is-off", empty && "is-empty", className)}
      style={{ ...(empty ? { color: "var(--gh-gold-200)" } : null), ...style }}
    >
      {empty ? <GhIcon name="plus" size={size === "sm" ? 16 : 28} /> : avatar && <img src={ghAvatarSrc(avatar)} alt={alt} />}
      {timer &&
        (ringOnly ? (
          <div className="gh-ring" style={{ "--p": Math.round((timer.progress ?? 1) * 100), inset: size === "sm" ? -9 : undefined } as CSSProperties} />
        ) : (
          <GhTurnTimer {...timer} variant="ring" />
        ))}
      {offline && (
        <span className="ghx-offline" aria-label="Disconnected">
          <GhIcon name="nosignal" size={14} />
        </span>
      )}
      {(offline || ringOnly) && <GhStyles />}
    </div>
  );
}

/** Seat status, matching the stage's tag map. */
export type GhSeatStatus = "betting" | "ready" | "waiting" | "turn" | "stood" | "out" | "off" | "done";

const STATUS_TONE: Record<GhSeatStatus, GhTagTone> = {
  betting: "torch",
  ready: "soft",
  waiting: "stone",
  turn: "torch",
  stood: "stone",
  out: "ghost",
  off: "crimson",
  done: "stone",
};

export interface GhSeatPlaqueProps {
  /** Empty seat: "Seat N" + dashed ring + Sit here. */
  empty?: boolean;
  /** 1-based seat number shown on empty seats. */
  seatNumber?: number;
  name?: string;
  avatar?: GhAvatarId | string;
  /** That player's own balance (coin plaque). */
  balance?: number;
  /** Last three hands: true = win/push, false = loss, null = not played. */
  hearts?: ReadonlyArray<boolean | null>;
  you?: boolean;
  status?: GhSeatStatus;
  /** Status tag text; defaults from `status` ("Betting", "Ready", "Sitting out"...). */
  tag?: ReactNode;
  /** Active turn countdown (deadline or seconds/progress). */
  timer?: Omit<GhTurnTimerProps, "variant">;
  /** Finished with a result: replaces the tag. */
  result?: { kind: GhResultKind; payout: number };
  onSit?: () => void;
  sitLabel?: string;
  /**
   * `board` = Seats board (name above the portrait, tag below);
   * `stage` = rim plate on the stage (name + YOU + tag in one row above the portrait, 190 wide).
   */
  layout?: "board" | "stage";
  className?: string;
  style?: CSSProperties;
}

function defaultTag(status: GhSeatStatus, name: string | undefined, you: boolean | undefined): ReactNode {
  switch (status) {
    case "betting":
      return "Betting";
    case "ready":
      return (
        <>
          <GhIcon name="check" size={12} />
          Ready
        </>
      );
    case "waiting":
      return "Waiting";
    case "turn":
      return you ? "Your turn" : name ? `${name}'s turn` : "Turn";
    case "stood":
      return "Stood";
    case "out":
      return "Sitting out";
    case "off":
      return "Reconnecting…";
    case "done":
      return null;
  }
}

/** PlayerSeat on the table rim: name, portrait in a gold ring, three hearts and a coin plaque. */
export function GhSeatPlaque({
  empty,
  seatNumber,
  name,
  avatar,
  balance = 0,
  hearts = [null, null, null],
  you,
  status = "waiting",
  tag,
  timer,
  result,
  onSit,
  sitLabel = "Sit here",
  layout = "board",
  className,
  style,
}: GhSeatPlaqueProps) {
  const stage = layout === "stage";
  const off = status === "out" || status === "off";
  const tagText = tag ?? defaultTag(status, name, you);
  const tagTone: GhTagTone = you && (status === "turn" || status === "waiting") && layout === "board" ? (status === "turn" ? "you" : "ghost") : STATUS_TONE[status];
  const tagEl = tagText ? <GhTag tone={tagTone}>{tagText}</GhTag> : null;
  const nameColor = empty || off ? { color: "var(--gh-cream-400)" } : undefined;

  if (empty) {
    return (
      <div className={cx("gh-seat", stage && "ghx-seat--stage", className)} style={style}>
        <span className="gh-seat__name" style={nameColor}>
          Seat {seatNumber ?? ""}
        </span>
        <GhPortrait empty />
        <GhButton size="sm" style={{ marginTop: 10 }} onClick={onSit} disabled={!onSit}>
          {sitLabel}
        </GhButton>
        {stage && <GhStyles />}
      </div>
    );
  }

  const portrait = (
    <GhPortrait
      avatar={avatar}
      alt={you ? "You" : (name ?? "")}
      you={you}
      active={status === "turn"}
      off={off}
      offline={status === "off"}
      timer={status === "turn" ? timer : undefined}
    />
  );

  return (
    <div
      className={cx("gh-seat", off && "is-off", stage && "ghx-seat--stage", status === "waiting" && !you && layout === "board" && "is-waiting-seat", className)}
      style={style}
      aria-label={`${you ? "Your seat" : (name ?? "Seat")}, ${ghFmt(balance)} credits`}
    >
      {stage ? (
        <div className="ghx-plate-row">
          <span className="gh-seat__name" style={nameColor}>
            {name}
          </span>
          {you && <GhTag tone="you">You</GhTag>}
          {tagEl}
        </div>
      ) : you ? (
        <GhTag tone="you" style={{ marginBottom: -2 }}>
          You
        </GhTag>
      ) : (
        <span className="gh-seat__name" style={nameColor}>
          {name}
        </span>
      )}
      {portrait}
      <GhHearts results={hearts} />
      <div className="gh-plaque">
        <img src={GH_SPRITES.coin} alt="" />
        <span>{ghFmt(balance)}</span>
      </div>
      {!stage && (result ? <GhResultBadge outcome={result.kind} payout={result.payout} size="seat" /> : tagEl)}
      <GhStyles />
    </div>
  );
}

export interface GhMiniSeatProps {
  name: string;
  avatar: GhAvatarId | string;
  total?: number | null;
  status?: "turn" | "stood" | "next" | "bust" | "waiting" | "done";
  /** Turn progress 0..1 for the small ring. */
  progress?: number;
}

const MINI_TONE: Record<NonNullable<GhMiniSeatProps["status"]>, GhTagTone> = {
  turn: "torch",
  stood: "stone",
  next: "ghost",
  bust: "crimson",
  waiting: "ghost",
  done: "stone",
};

/** MiniPortraitRow (mobile): everyone else collapsed into one row, in turn order. */
export function GhMiniPortraitRow({ seats, className }: { seats: ReadonlyArray<GhMiniSeatProps>; className?: string }) {
  return (
    <div
      className={cx("gh-frame gh-frame--glass gh-notch", className)}
      role="list"
      aria-label="Other players"
      style={{ width: 358, maxWidth: "100%", boxSizing: "border-box", padding: "12px 12px 10px", display: "grid", gridTemplateColumns: `repeat(${Math.max(1, seats.length)}, minmax(0, 1fr))`, gap: 6 }}
    >
      {seats.map((s) => (
        <div key={s.name} role="listitem" className="ghx-mini">
          <GhPortrait
            size="sm"
            avatar={s.avatar}
            active={s.status === "turn"}
            timer={s.status === "turn" ? { progress: s.progress ?? 1 } : undefined}
            ringOnly
          />
          <span className="ghx-mini__name">{s.name}</span>
          {s.total !== undefined && <GhHandTotal total={s.total} />}
          {s.status && <GhTag tone={MINI_TONE[s.status]}>{s.status === "turn" ? "Turn" : s.status[0]!.toUpperCase() + s.status.slice(1)}</GhTag>}
        </div>
      ))}
      <GhStyles />
    </div>
  );
}
