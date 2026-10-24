import { BOSS_DAMAGE, BOSS_MAX_HP, type BossPayoutMetadata, type HandOutcome } from "@21jack/contracts";

export type BossDamageResult = {
  /** hp shown for the settled round (0 when defeated). */
  hp: number;
  delta: number;
  defeated: boolean;
  /** hp to store for the account's next round (resets to max after a defeat). */
  nextHp: number;
  /** Per-hand payout metadata; only the hand that lands the final blow has defeated=true. */
  hands: BossPayoutMetadata[];
};

/** Applies BOSS_DAMAGE hand by hand, clamped to [0, maxHp]. Once the king falls, later hands do nothing. */
export function applyBossDamage(startHp: number, outcomes: HandOutcome[], maxHp = BOSS_MAX_HP): BossDamageResult {
  let hp = Math.min(Math.max(startHp, 0), maxHp);
  let defeated = false;
  const hands = outcomes.map((outcome): BossPayoutMetadata => {
    if (defeated) return { damage: 0, hpAfter: 0, defeated: false };
    const before = hp;
    hp = Math.min(Math.max(hp + BOSS_DAMAGE[outcome], 0), maxHp);
    const blow = hp === 0;
    if (blow) defeated = true;
    // Record the real change, so a loss against a full-health king shows no heal.
    return { damage: hp - before, hpAfter: hp, defeated: blow };
  });
  return { hp, delta: hp - startHp, defeated, nextHp: defeated ? maxHp : hp, hands };
}
