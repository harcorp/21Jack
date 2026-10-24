import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ModeSwitch } from "@/components/multi/ModeSwitch";
import { PlayTable } from "@/components/play/PlayTable";
import { requireCurrentAccount } from "@/lib/current";

export const metadata: Metadata = { title: "The King's hall · 21Jack" };

// Height of everything around the stage (site header, mode switch, paddings): the stage is sized so
// stage + dock fit the window without scrolling (see TableView `fit`).
const chrome = { "--solo-chrome": "164px", "--solo-chrome-m": "196px" } as CSSProperties;

export default async function PlayPage() {
  const account = await requireCurrentAccount();
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-2 py-2 sm:px-4 sm:py-3 *:min-w-0" style={chrome}>
      <h1 className="sr-only">The King&apos;s hall</h1>
      <ModeSwitch active="single" />
      <PlayTable player={{ name: account.username }} />
    </main>
  );
}
