import type { Suit } from "@21jack/contracts";
import { PixelArt } from "./pixel";

const GLYPHS: Record<Suit, readonly string[]> = {
  H: [".##..##.", "########", "########", "########", ".######.", "..####..", "...##...", "........"],
  D: ["...##...", "..####..", ".######.", "########", "########", ".######.", "..####..", "...##..."],
  S: ["...##...", "..####..", ".######.", "########", "########", "########", "...##...", "..####.."],
  C: ["...##...", "..####..", "..####..", "##.##.##", "########", "##.##.##", "...##...", "..####.."],
};

export const SUIT_NAMES: Record<Suit, string> = { H: "hearts", D: "diamonds", S: "spades", C: "clubs" };

export const isRedSuit = (suit: Suit) => suit === "H" || suit === "D";

export function SuitGlyph({ suit, className }: { suit: Suit; className?: string }) {
  return (
    <PixelArt
      rows={GLYPHS[suit]}
      palette={{ "#": "currentColor" }}
      className={`pixelated ${isRedSuit(suit) ? "text-carpet" : "text-ink"} ${className ?? ""}`}
    />
  );
}
