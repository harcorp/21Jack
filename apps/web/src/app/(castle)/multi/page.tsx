import type { Metadata } from "next";
import { ModeSwitch } from "@/components/multi/ModeSwitch";
import { MultiPlay } from "@/components/multi/MultiPlay";
import { Badge } from "@/components/ui";

export const metadata: Metadata = { title: "The shared table · 21Jack" };

export default function MultiPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-0 py-3 sm:px-4 *:min-w-0">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 sm:px-0">
        <ModeSwitch active="multi" />
        <h1 className="flex items-center gap-2 font-display text-xl text-gold-light sm:text-2xl">
          The shared table <Badge tone="torch">WIP</Badge>
        </h1>
      </div>
      <MultiPlay />
    </main>
  );
}
