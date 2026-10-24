"use client";

import type { BossView } from "@21jack/contracts";
import {
  GhBalance,
  GhBossBar,
  GhHearts,
  GhPortrait,
  GhStyles,
  GhTablePlate,
  GhTag,
  GH_SPRITES,
  ghFmt,
  type GhSeatStatus,
  type GhTagTone,
} from "../gh";
import { stageBox } from "./layout";

export interface SoloHudProps {
  phase: string;
  phaseTone: GhTagTone;
  balance: number;
  /** Credits just returned (flashes the balance gold with a "+N" tag). */
  delta?: number;
  boss: BossView | null;
  bossEventKey: string | null;
}

/** Desktop HUD from TableStage: table plate (left), boss bar (centre), balance (right). */
export function DesktopHud({ phase, phaseTone, balance, delta, boss, bossEventKey }: SoloHudProps) {
  return (
    <>
      <div style={stageBox({ left: 20, top: 16 })}>
        <div className="solo-zoom">
          <GhTablePlate name="Solo table" mode="Solo" meta="Min 5 · Dealer stands on 17" phase={phase} phaseTone={phaseTone} />
        </div>
      </div>
      {boss && (
        <div style={{ ...stageBox({ left: "50%", top: 4 }), transform: "translateX(-50%)" }}>
          <div className="solo-zoom">
            <GhBossBar boss={boss} variant="stage" eventKey={bossEventKey ?? undefined} />
          </div>
        </div>
      )}
      <div style={stageBox({ right: 20, top: 16 })}>
        <div className="solo-zoom">
          <GhBalance value={balance} delta={delta} />
        </div>
      </div>
    </>
  );
}

/** Mobile HUD from MobileStage: table plate + balance row, compact boss bar under it. */
export function MobileHud({ phase, balance, delta, boss, bossEventKey }: SoloHudProps) {
  return (
    <>
      <div style={{ ...stageBox({ left: 12, right: 12, top: 12 }) }}>
        <div className="solo-zoom" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div className="gh-frame gh-frame--glass gh-notch" style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span className="gh-display" style={{ fontSize: 15, color: "var(--gh-gold-200)", letterSpacing: ".04em", whiteSpace: "nowrap" }}>
              Solo table
            </span>
            <span style={{ fontSize: 11, color: "var(--gh-cream-300)", whiteSpace: "nowrap" }}>{phase}</span>
          </div>
          <GhBalance value={balance} delta={delta} compact />
        </div>
      </div>
      {boss && (
        <div style={{ ...stageBox({ left: "50%", top: 70 }), transform: "translateX(-50%)" }}>
          <div className="solo-zoom">
            <GhBossBar boss={boss} variant="mobile" width={318} eventKey={bossEventKey ?? undefined} />
          </div>
        </div>
      )}
    </>
  );
}

export interface PlateProps {
  name: string;
  avatar: string;
  balance: number;
  hearts: ReadonlyArray<boolean | null>;
  status: GhSeatStatus;
  tag?: string;
}

/**
 * The player's plate on the rim, MobileStage "your plate" layout (portrait, then name + YOU, hearts
 * and balance). Used on desktop too: the taller TableStage plate would run under the dock.
 */
export function RimPlate({ name, avatar, balance, hearts, status, tag }: PlateProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "8px 18px 8px 14px",
        background: "rgba(14, 12, 18, .74)",
        boxShadow: "inset 0 0 0 2px #1A1014, inset 0 0 0 4px #8A5A14",
      }}
      aria-label={`Your seat, ${ghFmt(balance)} credits`}
    >
      <GhPortrait avatar={avatar} alt="Your avatar" you={status !== "turn"} active={status === "turn"} style={{ width: 56, height: 56, flex: "none" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="gh-seat__name">{name}</span>
          <GhTag tone="you">You</GhTag>
          {tag && <GhTag tone={status === "turn" || status === "betting" ? "torch" : "stone"}>{tag}</GhTag>}
        </div>
        <GhHearts results={hearts} />
        <div className="gh-plaque">
          <img src={GH_SPRITES.coin} alt="" />
          <span>{ghFmt(balance)}</span>
        </div>
      </div>
      <GhStyles />
    </div>
  );
}
