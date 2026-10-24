import type { Card, HiddenCard, Suit } from "@21jack/contracts";
import { GH_AVATAR_IDS, GH_AVATARS, type GhAvatarId } from "./sprites";

/** Join class names, skipping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Integer credits with thousands separators, as the boards print them ("2,760"). */
export function ghFmt(n: number): string {
  return Math.trunc(n).toLocaleString("en-US");
}

/** Signed amount for payouts and deltas: "+20", "+0", "−5" (U+2212 like the boards). */
export function ghSigned(n: number): string {
  return n < 0 ? `−${ghFmt(-n)}` : `+${ghFmt(n)}`;
}

export function isHiddenCard(card: Card | HiddenCard): card is HiddenCard {
  return "hidden" in card && card.hidden === true;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}

const SUIT_NAMES: Record<Suit, string> = { S: "spades", H: "hearts", D: "diamonds", C: "clubs" };
const RANK_NAMES: Record<string, string> = { A: "Ace", J: "Jack", Q: "Queen", K: "King" };

export function ghCardLabel(card: Card | HiddenCard): string {
  if (isHiddenCard(card)) return "Face-down card";
  return `${RANK_NAMES[card.rank] ?? card.rank} of ${SUIT_NAMES[card.suit]}`;
}

/** Resolve an avatar id or an image URL to an image source. */
export function ghAvatarSrc(avatar: GhAvatarId | string): string {
  return (GH_AVATARS as Record<string, string>)[avatar] ?? avatar;
}

/** Deterministic avatar for an account id or username (until avatars are picked at registration). */
export function ghAvatarFor(seed: string): GhAvatarId {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GH_AVATAR_IDS[Math.abs(h) % GH_AVATAR_IDS.length] ?? "squire";
}
