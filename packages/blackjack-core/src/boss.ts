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
    const damage = BOSS_DAMAGE[outcome];
    if (defeated) return { damage, hpAfter: 0, defeated: false };
    hp = Math.min(Math.max(hp + damage, 0), maxHp);
    const blow = hp === 0;
    if (blow) defeated = true;
    return { damage, hpAfter: hp, defeated: blow };
  });
  return { hp, delta: hp - startHp, defeated, nextHp: defeated ? maxHp : hp, hands };
}
