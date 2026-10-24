import { describe, expect, it } from "vitest";
import { BOSS_MAX_HP } from "@21jack/contracts";
import { applyBossDamage } from "./index";

describe("applyBossDamage", () => {
  it("win damages 1, blackjack 2, push 0", () => {
    expect(applyBossDamage(5, ["win"])).toMatchObject({ hp: 4, delta: -1, defeated: false, nextHp: 4 });
    expect(applyBossDamage(5, ["blackjack"])).toMatchObject({ hp: 3, delta: -2 });
    expect(applyBossDamage(5, ["push"])).toMatchObject({ hp: 5, delta: 0 });
  });
  it("loss heals 1 capped at max", () => {
    expect(applyBossDamage(3, ["loss"])).toMatchObject({ hp: 4, delta: 1 });
    expect(applyBossDamage(BOSS_MAX_HP, ["loss", "loss"])).toMatchObject({ hp: BOSS_MAX_HP, delta: 0 });
  });
  it("applies split hands in order with per-hand metadata", () => {
    expect(applyBossDamage(4, ["win", "loss"]).hands).toEqual([
      { damage: -1, hpAfter: 3, defeated: false },
      { damage: 1, hpAfter: 4, defeated: false },
    ]);
  });
  it("defeat shows hp 0, flags the final blow and resets next hp to max", () => {
    const r = applyBossDamage(1, ["blackjack"]);
    expect(r).toMatchObject({ hp: 0, delta: -1, defeated: true, nextHp: BOSS_MAX_HP });
    expect(r.hands).toEqual([{ damage: -1, hpAfter: 0, defeated: true }]);
  });
  it("a hand after the final blow cannot heal the fallen king", () => {
    const r = applyBossDamage(1, ["win", "loss"]);
    expect(r).toMatchObject({ hp: 0, defeated: true });
    expect(r.hands[1]).toEqual({ damage: 0, hpAfter: 0, defeated: false });
  });
});

describe("applyBossDamage at full health", () => {
  it("records no heal when the king is already at max hp", () => {
    const r = applyBossDamage(BOSS_MAX_HP, ["loss"]);
    expect(r).toMatchObject({ hp: BOSS_MAX_HP, delta: 0, defeated: false });
    expect(r.hands).toEqual([{ damage: 0, hpAfter: BOSS_MAX_HP, defeated: false }]);
  });
});
