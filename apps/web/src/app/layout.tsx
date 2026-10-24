import type { Metadata } from "next";
import { Pixelify_Sans, Silkscreen } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const pixelify = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixelify" });
const silkscreen = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-silkscreen" });
// Pixelify's numerals are ambiguous (2/5 read as S, 3 as 8), so digits and money signs always use Silkscreen Regular.
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
  description: "Voxel Castle blackjack — fictional credits only",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${digits.variable} ${pixelify.variable} ${silkscreen.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
