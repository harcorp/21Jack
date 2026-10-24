const GOLD = ["#f2cf6b", "#c9973a", "#ffb347", "#f1e6cc", "#7e1c1c"];

export async function celebrate(big: boolean) {
  const { default: confetti } = await import("canvas-confetti");
  const base = { colors: GOLD, shapes: ["square" as const], scalar: 1.1, disableForReducedMotion: true, ticks: 160 };
  confetti({ ...base, particleCount: big ? 140 : 80, spread: big ? 100 : 70, origin: { y: 0.6 } });
  if (big) {
    confetti({ ...base, particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
    confetti({ ...base, particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
  }
}

export async function celebrateKingslayer() {
  const { default: confetti } = await import("canvas-confetti");
  const base = { colors: GOLD, shapes: ["square" as const], scalar: 1.3, disableForReducedMotion: true, ticks: 260 };
  const burst = (delay: number, x: number) =>
    setTimeout(() => confetti({ ...base, particleCount: 120, spread: 120, startVelocity: 55, origin: { x, y: 0.4 } }), delay);
  burst(1200, 0.5);
  burst(1500, 0.2);
  burst(1700, 0.8);
}
