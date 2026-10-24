import type { Metadata } from "next";
import { ModeSwitch } from "@/components/multi/ModeSwitch";
import { MultiPlay } from "@/components/multi/MultiPlay";
import { Badge, PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "The shared table · 21Jack" };

export default function MultiPage() {
  return (
    <PageShell className="max-w-6xl">
      <div className="mb-4 flex flex-col items-center gap-3">
        <ModeSwitch active="multi" />
        <h1 className="flex items-center gap-2 font-display text-2xl text-gold-light">
          The shared table <Badge tone="torch">WIP</Badge>
        </h1>
      </div>
      <MultiPlay />
    </PageShell>
  );
}
