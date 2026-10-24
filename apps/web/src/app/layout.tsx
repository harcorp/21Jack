import type { Metadata, Viewport } from "next";
import { Inter, Pixelify_Sans, Press_Start_2P, Silkscreen } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Grand Hall faces: Pixelify Sans (display), Press Start 2P (numbers), Inter (body).
const pixelify = Pixelify_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-pixelify" });
const pressStart = Press_Start_2P({ subsets: ["latin"], weight: "400", variable: "--font-press-start" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
// Kept for game-ui's `font-pixel` labels until the table is rebuilt.
const silkscreen = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-silkscreen" });
// Pixelify's numerals are ambiguous (2/5 read as S, 3 as 8), so digits and money signs inside display text use Silkscreen Regular.
const digits = localFont({
  src: "../fonts/Silkscreen-Regular.ttf",
  variable: "--font-digits",
  display: "block",
  // A metric fallback face would cover every character and hide Pixelify, so disable it.
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0030-0039, U+002B, U+002D, U+2212, U+0025" }],
});

export const metadata: Metadata = {
  title: "21Jack",
  description: "The Grand Hall: blackjack against the King — fictional credits only",
};

export const viewport: Viewport = { themeColor: "#14121A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${digits.variable} ${pixelify.variable} ${pressStart.variable} ${inter.variable} ${silkscreen.variable}`}
    >
      <body className="gh-hall-bg min-h-dvh">{children}</body>
    </html>
  );
}
