import type { Metadata } from "next";
import { PlayTable } from "@/components/play/PlayTable";
import { PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "The King's hall · 21Jack" };

export default function PlayPage() {
  return (
    <PageShell className="max-w-6xl">
      <h1 className="sr-only">The King&apos;s hall</h1>
      <PlayTable />
    </PageShell>
  );
}
