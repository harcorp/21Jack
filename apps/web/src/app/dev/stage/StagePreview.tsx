"use client";

import {
  ANCHOR_NAMES,
  GrandHallStage,
  KING_FRAMES,
  type KingMood,
  StageAnchor,
  type StageAnchorName,
  type StageDepth,
  type StageMode,
  useStageAnchors,
} from "@21jack/game-ui";
import { useState } from "react";

function depthFor(name: StageAnchorName): StageDepth {
  if (name === "light22" || name === "light23") return "fg";
  if (name.startsWith("light")) return "far";
  if (name.startsWith("king")) return "king";
  return "table";
}

function AnchorMarkers() {
  return (
    <>
      {ANCHOR_NAMES.map((name) => (
        <StageAnchor key={name} name={name} depth={depthFor(name)} className="pointer-events-none">
          <span
            className="relative block"
            style={{ width: "calc(10 * var(--gh-u))", height: "calc(10 * var(--gh-u))", minWidth: 6, minHeight: 6 }}
          >
            <span className="absolute inset-0 rounded-full border-2 border-[#FFE08A] bg-[#C0392B]/70" />
            <span className="absolute left-full top-full ml-0.5 whitespace-nowrap bg-black/70 px-1 font-mono text-[9px] leading-tight text-[#FFE08A]">
              {name}
            </span>
          </span>
        </StageAnchor>
      ))}
    </>
  );
}

/** Sizes in stage px (`--gh-u`) so the plate scales with the stage. */
function DemoOverlays() {
  return (
    <>
      <StageAnchor name="seat3Rim" align="center">
        <div
          className="flex items-center justify-center border-2 border-[#1A1014] bg-[#14121A]/85 font-pixel text-[#FFE08A]"
          style={{ width: "calc(150 * var(--gh-u))", height: "calc(34 * var(--gh-u))", fontSize: "calc(14 * var(--gh-u))" }}
        >
          Seat 3 plate
        </div>
      </StageAnchor>
      <StageAnchor name="dealerCards" align="bottom">
        <div className="flex gap-1">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="border-2 border-[#1A1014] bg-[#FBF4E4]"
              style={{ width: "calc(52 * var(--gh-u))", height: "calc(72 * var(--gh-u))" }}
            />
          ))}
        </div>
      </StageAnchor>
      <StageAnchor name="kingCrown" align="bottom" depth="none" offset={{ y: -8 }}>
        <VariantBadge />
      </StageAnchor>
    </>
  );
}

function VariantBadge() {
  const { variant, scale, width } = useStageAnchors();
  return (
    <span className="whitespace-nowrap bg-black/70 px-2 py-0.5 font-mono text-[10px] text-[#FFE08A]">
      {variant} · scale {scale.toFixed(3)} · {Math.round(width)}px
    </span>
  );
}

const button =
  "border-2 border-[#1A1014] bg-[#38333D] px-3 py-1.5 font-pixel text-xs text-[#FBF4E4] hover:bg-[#4A3A30] aria-pressed:bg-[#E8B53A] aria-pressed:text-[#1A1014]";

export type PreviewMode = StageMode | "both";

export function StagePreview({ initialMode = "both", initialMarkers = true }: { initialMode?: PreviewMode; initialMarkers?: boolean }) {
  const [mood, setMood] = useState<KingMood>("idle");
  const [hit, setHit] = useState(0);
  const [markers, setMarkers] = useState(initialMarkers);
  const [demo, setDemo] = useState(false);
  const [parallax, setParallax] = useState(true);
  const [mode, setMode] = useState<PreviewMode>(initialMode);

  const overlays = (
    <>
      {demo && <DemoOverlays />}
      {markers && <AnchorMarkers />}
    </>
  );
  const stageProps = { king: mood, kingHit: hit, parallax };

  return (
    <main className="flex min-h-dvh flex-col gap-4 overflow-x-hidden bg-[#0E0C12] pb-10 text-[#FBF4E4]">
      <header className="flex flex-col gap-2 px-4 pt-4">
        <h1 className="font-pixel text-lg text-[#FFE08A]">Grand Hall stage</h1>
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="King mood">
          {KING_FRAMES.map((f) => (
            <button key={f} type="button" className={button} aria-pressed={mood === f} onClick={() => setMood(f)}>
              {f}
            </button>
          ))}
          <button
            type="button"
            className={button}
            onClick={() => {
              // Board: grimace held 1.2s, then back to the loop.
              setMood("grimace");
              setHit((n) => n + 1);
              window.setTimeout(() => setMood("idle"), 1200);
            }}
          >
            Hit the king
          </button>
        </div>
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Stage options">
          <button type="button" className={button} aria-pressed={markers} onClick={() => setMarkers((v) => !v)}>
            Anchor markers
          </button>
          <button type="button" className={button} aria-pressed={demo} onClick={() => setDemo((v) => !v)}>
            Demo overlays
          </button>
          <button type="button" className={button} aria-pressed={parallax} onClick={() => setParallax((v) => !v)}>
            Parallax
          </button>
          {(["both", "auto"] as const).map((m) => (
            <button key={m} type="button" className={button} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === "both" ? "Desktop + mobile" : "Auto"}
            </button>
          ))}
        </div>
      </header>

      {mode === "auto" ? (
        <section aria-label="Auto stage" data-testid="stage-auto">
          <GrandHallStage variant="auto" {...stageProps}>
            {overlays}
          </GrandHallStage>
        </section>
      ) : (
        <>
          {mode !== "mobile" && (
            <section aria-label="Desktop stage" data-testid="stage-desktop">
              <GrandHallStage variant="desktop" {...stageProps}>
                {overlays}
              </GrandHallStage>
            </section>
          )}
          {mode !== "desktop" && (
            <section aria-label="Mobile stage" data-testid="stage-mobile" className="mx-auto w-full max-w-[390px]">
              <GrandHallStage variant="mobile" {...stageProps}>
                {overlays}
              </GrandHallStage>
            </section>
          )}
        </>
      )}
    </main>
  );
}
