import type { CSSProperties } from "react";
import type { StageVariant } from "../scene";

/**
 * Overlay positions for the solo table, in stage px (1440×810 desktop, 390×844 mobile), taken from
 * TableStage.dc.html / MobileStage.dc.html. Every point is an offset from a scene anchor so the
 * overlays ride the table's parallax layer.
 *
 * The stake point is fixed per hand slot: betting, dealing, playing, the reveal and settlement all
 * draw the stake at the same spot, and the cards stack above it.
 */
export interface SoloLayout {
  /** Card width for the player's hand (by card count) and the dealer. */
  handCardWidth: (cards: number, split: boolean) => number;
  dealerCardWidth: number;
  /** Dealer row centre, offset from `dealerCards`. */
  dealerOffset: { x: number; y: number };
  /** Stake centre for hand `i` of `n`, offset from `seat3`. */
  stake: (i: number, n: number) => { x: number; y: number };
  /** Gap between the bottom of the cards and the stake centre. */
  cardsAboveStake: number;
  /** Player plate (top centre), offset from `seat3Rim`. */
  plateOffset: { x: number; y: number };
  /** Bankroll stacks (centre), offset from `seat3`. */
  bankrollOffset: { x: number; y: number };
  /** Whether the hand meta (total, tags, result) sits beside the cards or above them. */
  meta: (i: number, n: number) => "left" | "right" | "above";
  /** Where the per-hand result badge goes. */
  resultOnCards: boolean;
}

export const SOLO_LAYOUT: Record<StageVariant, SoloLayout> = {
  desktop: {
    handCardWidth: () => 64,
    dealerCardWidth: 64,
    // Template: dealer row centred at 45.6% (369 px); the anchor sits at 48.92%.
    dealerOffset: { x: 0, y: -27 },
    stake: (i, n) => ({ x: n === 2 ? (i === 0 ? -100 : 100) : 0, y: 0 }),
    cardsAboveStake: 32,
    // Template plate: translate(-50%, -60px) from the rim anchor.
    plateOffset: { x: 0, y: -60 },
    bankrollOffset: { x: -230, y: 6 },
    meta: (i, n) => (n === 2 && i === 0 ? "left" : "right"),
    resultOnCards: false,
  },
  mobile: {
    handCardWidth: (cards, split) => (split ? (cards > 3 ? 46 : 56) : cards > 3 ? 64 : 84),
    dealerCardWidth: 46,
    dealerOffset: { x: 0, y: -2 },
    // seat3 is at 485 px; the template's hand ends at 474 with the stake under it.
    stake: (i, n) => ({ x: n === 2 ? (i === 0 ? -82 : 82) : 0, y: 18 }),
    cardsAboveStake: 28,
    // Template plate top: 548 px (the rim anchor is at 575); 8 px higher so it clears the tray at 640.
    plateOffset: { x: 0, y: -35 },
    bankrollOffset: { x: -128, y: 18 },
    meta: (_i, n) => (n === 2 ? "above" : "right"),
    resultOnCards: true,
  },
};

/** `calc(n * var(--gh-u))`: n stage px at the current stage size. */
export const u = (n: number) => `calc(${n} * var(--gh-u))`;

/** Absolute box in stage px (for HUD / dock pieces that are not on a scene anchor). */
export function stageBox(pos: { left?: number | string; right?: number | string; top?: number | string; bottom?: number | string }): CSSProperties {
  const v = (n: number | string | undefined) => (n === undefined ? undefined : typeof n === "string" ? n : u(n));
  return { position: "absolute", left: v(pos.left), right: v(pos.right), top: v(pos.top), bottom: v(pos.bottom) };
}

/**
 * Ratio between on-screen px and the element's own CSS px (the `.ghx-scale` zoom of the stage).
 * Fly-in offsets are measured on screen and applied as transforms inside the zoomed overlay.
 */
export function screenScale(el: HTMLElement): number {
  const w = el.offsetWidth;
  if (!w) return 1;
  const r = el.getBoundingClientRect().width / w;
  return r > 0 ? r : 1;
}

/** Solo table CSS, hoisted once (React 19 <style href precedence>). */
export const SOLO_CSS = /* css */ `
.solo-fit { width: min(100%, max(720px, calc((100dvh - var(--solo-chrome, 170px)) * 16 / 9))); margin-inline: auto; }
@media (max-width: 719.98px) {
  .solo-fit { width: min(100%, max(290px, calc((100dvh - var(--solo-chrome-m, 196px)) * 390 / 844))); }
}
.solo-fit--container { width: 100%; }
.solo-zoom { zoom: var(--gh-scale, 1); }
.solo-dock-zoom { zoom: max(var(--gh-scale, 1), .72); }
.solo-actions .gh-action { gap: 3px; min-height: 86px; }
.solo-actions .gh-action--compact { width: 84px; min-height: 78px; font-size: 16px; padding: 6px 4px 8px; }
.solo-actions .solo-action__icon { height: 18px; width: auto; }
.solo-actions .gh-action--compact .solo-action__icon { height: 14px; }
.solo-hole-flip { --gh-dur: 600ms; }
.solo-veil { position: absolute; inset: 0; background: rgba(8, 6, 12, .62); }
@media (prefers-reduced-motion: reduce) { .solo-actions .gh-action { transition: none; } }
`;
