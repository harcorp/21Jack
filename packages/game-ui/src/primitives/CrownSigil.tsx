import { PixelArt } from "./pixel";

/** Our own house mark: a pixel crown over "21". */
const ROWS = [
  "#...#...#",
  "##.###.##",
  "#########",
  "#o##o##o#",
  "#########",
  ".........",
  "ww..w.ww.",
  "..w.w..w.",
  ".w..w..w.",
  "www.w.www",
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
