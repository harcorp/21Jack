import { GameTable } from "@21jack/game-ui";

/** Owner: P4 (Casino Website). Placeholder lobby — replace with the castle gate lobby (PLAN.md §10). */
export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="font-display text-4xl text-gold-light">21Jack</h1>
      <p className="font-pixel text-sm">Fictional credits only. Service status: /api/health</p>
      <GameTable />
    </main>
  );
}
