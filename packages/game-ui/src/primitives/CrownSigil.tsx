import { PixelArt } from "./pixel";

/** Our own house mark: a pixel crown over "21". */
const ROWS = [
  "#...#...#",
  "##.###.##",
  "#########",
  "#o##o##o#",
  "#########",
  ".........",
  ".www..w..",
  "...w.ww..",
  "..w...w..",
  ".www.www.",
] as const;

export function CrownSigil({ className }: { className?: string }) {
  return (
    <PixelArt
      rows={ROWS}
      palette={{ "#": "var(--color-gold-light)", o: "var(--color-carpet)", w: "var(--color-gold-light)" }}
      className={`pixelated ${className ?? ""}`}
    />
  );
}
