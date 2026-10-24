import { cx } from "./cx";

/** 8x8 pixel coin. */
export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden="true" className={cx("pixelated size-5 shrink-0", className)} shapeRendering="crispEdges">
      <path fill="#1a1410" d="M2 0h4v1h1v1h1v4h-1v1h-1v1h-4v-1h-1v-1h-1v-4h1v-1h1z" />
      <path fill="#c9973a" d="M2 1h4v1h1v4h-1v1h-4v-1h-1v-4h1z" />
      <path fill="#f2cf6b" d="M2 1h3v1h-2v1h-1v2h-1v-3h1z" />
      <path fill="#7a4e2a" d="M4 3h1v2h-1z" />
    </svg>
  );
}
