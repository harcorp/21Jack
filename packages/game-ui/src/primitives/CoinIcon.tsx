import { PixelArt } from "./pixel";

const ROWS = ["..####..", ".#oooo#.", "#oo##oo#", "#o#oooo#", "#o#oooo#", "#oo##oo#", ".#oooo#.", "..####.."] as const;

export function CoinIcon({ className }: { className?: string }) {
  return (
    <PixelArt
      rows={ROWS}
      palette={{ "#": "var(--color-wood-dark)", o: "var(--color-gold-light)" }}
      className={`pixelated ${className ?? ""}`}
    />
  );
}
