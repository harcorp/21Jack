"use client";

import type { RoundView } from "@21jack/contracts";

/**
 * Owner: P2 (Game UI). Placeholder table — replace with the Voxel Castle scene (PLAN.md §10).
 * Talks only to the web proxy under /api/game; never to the game or engine services directly.
 */
export function GameTable({ round }: { round?: RoundView }) {
  return (
    <section className="block bg-felt p-8 text-parchment">
      <div className="font-display text-2xl">The King&apos;s Table</div>
      <p className="font-pixel mt-2 text-sm">{round ? `Round ${round.roundId}` : "Place your bet to start"}</p>
    </section>
  );
}
