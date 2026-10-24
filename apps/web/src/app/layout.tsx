import type { Metadata } from "next";
import { Pixelify_Sans, Silkscreen } from "next/font/google";
import "./globals.css";

const pixelify = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixelify" });
const silkscreen = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-silkscreen" });

export const metadata: Metadata = {
  title: "21Jack",
  description: "Voxel Castle blackjack — fictional credits only",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelify.variable} ${silkscreen.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
