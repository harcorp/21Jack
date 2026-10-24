"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type Ref, useCallback, useEffect, useRef, useState } from "react";
import type { CoachLine } from "../lib/coach";
import { Claudalf } from "../primitives/Claudalf";
import { SpeechBubble } from "../primitives/CoachPanel";
import { useStageAnchors } from "../scene";
import { stageBox } from "./layout";

/**
 * Claudalf as an overlay on the Grand Hall stage (solo table only).
 *
 * - Desktop: he stands in the bottom-right corner by the right foreground lantern, beside the
 *   dock, with his parchment bubble opening toward the table. "Minimise" (or the C key) folds
 *   him into a round gold-ringed portrait in the same corner; the choice is remembered.
 * - Mobile: only the portrait sits over the stage (top-right, under the HUD). Tapping it opens
 *   the bubble as a compact sheet above the dock, inside the stage, so nothing shifts.
 * - Coach off: the same corner button summons him.
 *
 * Everything is sized in stage px (zoomed with `--gh-scale`), so it scales with the hall and
 * never adds page height.
 */
export interface CoachOverlayProps {
  on: boolean;
  lines: CoachLine[];
  /** Mobile only: top edge of the dock in stage px; the sheet sits just above it. */
  dockTop: number;
  onCoach(on: boolean): void;
}

const COLLAPSED_KEY = "21jack.coach.collapsed";

const COACH_CSS = /* css */ `
.coach-zoom { zoom: max(var(--gh-scale, 1), .62); }
.coach-zoom-m { zoom: var(--gh-scale, 1); }
.coach-portrait { appearance: none; border: 0; padding: 0; cursor: pointer; }
.coach-portrait:hover { filter: brightness(1.12); }
.coach-portrait:focus-visible { outline: 3px solid var(--gh-focus); outline-offset: 8px; }
.coach-dot {
  position: absolute; top: -6px; right: -6px; width: 14px; height: 14px; border-radius: 50%;
  background: var(--color-torch); box-shadow: 0 0 0 2px var(--gh-ink), 0 0 8px var(--color-torch);
}
@media (prefers-reduced-motion: no-preference) {
  .coach-dot { animation: coach-dot 1.2s steps(3) infinite; }
}
@keyframes coach-dot { 50% { transform: scale(1.25); } }
`;

const CTRL =
  "min-h-6 cursor-pointer px-1 font-pixel text-[10px] text-parchment/80 underline-offset-2 outline-offset-2 [text-shadow:1px_1px_0_var(--color-ink)] hover:text-parchment hover:underline focus-visible:outline-2 focus-visible:outline-torch";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true']");
}

/** Collapsed flag remembered in localStorage (read after mount, SSR-safe). */
function useCollapsed(): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // storage unavailable
    }
  }, []);
  const set = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // storage unavailable
    }
  }, []);
  return [collapsed, set];
}

/** Round gold-ringed Claudalf portrait (like the seat portraits), with an optional unread dot. */
function CoachPortrait({
  label,
  onClick,
  unread,
  small,
  expanded,
  buttonRef,
}: {
  label: string;
  onClick: () => void;
  unread?: boolean;
  small?: boolean;
  expanded?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`coach-portrait gh-portrait ${small ? "gh-portrait--sm" : ""}`}
      aria-label={unread ? `${label} (new advice)` : label}
      aria-expanded={expanded}
      title={label}
      onClick={onClick}
    >
      <Claudalf className={small ? "w-7" : "w-11"} />
      {unread && <span aria-hidden="true" className="coach-dot" />}
    </button>
  );
}

export function CoachOverlay({ on, lines, dockTop, onCoach }: CoachOverlayProps) {
  const { variant } = useStageAnchors();
  const mobile = variant === "mobile";
  const reduce = useReducedMotion();
  const [collapsed, setCollapsed] = useCollapsed();
  const [sheetOpen, setSheetOpen] = useState(false);
  const portraitRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Unread: advice changed while the bubble was not on screen.
  const key = lines.map((l) => l.text).join("\n");
  const visible = on && (mobile ? sheetOpen : !collapsed);
  const [seen, setSeen] = useState(key);
  useEffect(() => {
    if (visible) setSeen(key);
  }, [visible, key]);
  const unread = on && !visible && key !== seen;

  const toggle = useCallback(() => {
    if (mobile) setSheetOpen((o) => !o);
    else setCollapsed(!collapsed);
  }, [mobile, collapsed, setCollapsed]);

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if (!on || e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTyping(e.target)) return;
    if (e.key === "c" || e.key === "C") toggle();
    else if (e.key === "Escape" && mobile && sheetOpen) closeSheet();
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // Move focus into the sheet when it opens; give it back to the portrait when it closes.
  const openedByUser = useRef(false);
  useEffect(() => {
    if (!openedByUser.current) return;
    if (sheetOpen) closeRef.current?.focus();
    else portraitRef.current?.focus();
  }, [sheetOpen]);
  function openSheet() {
    openedByUser.current = true;
    setSheetOpen(true);
  }
  function closeSheet() {
    openedByUser.current = true;
    setSheetOpen(false);
  }

  // Leaving mobile (or turning the coach off) closes the sheet.
  useEffect(() => {
    if (!mobile || !on) setSheetOpen(false);
  }, [mobile, on]);

  const pop = reduce
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0 } } }
    : {
        initial: { opacity: 0, scale: 0.92, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.92, y: 8 },
        transition: { duration: 0.16 },
      };

  const css = (
    <style href="21jack-coach-overlay" precedence="default">
      {COACH_CSS}
    </style>
  );

  if (mobile) {
    return (
      <>
        {css}
        <div style={{ ...stageBox({ right: 14, top: 118 }), zIndex: 4 }}>
          <div className="coach-zoom-m">
            {on ? (
              <CoachPortrait
                small
                buttonRef={portraitRef}
                label={sheetOpen ? "Hide Claudalf's advice" : "Open Claudalf's advice"}
                expanded={sheetOpen}
                unread={unread}
                onClick={() => (sheetOpen ? closeSheet() : openSheet())}
              />
            ) : (
              <CoachPortrait small label="Summon Claudalf, the coach" onClick={() => onCoach(true)} />
            )}
          </div>
        </div>
        <AnimatePresence>
          {on && sheetOpen && (
            <motion.div
              key="sheet"
              style={{ ...stageBox({ left: 10, right: 10, bottom: 844 - dockTop + 8 }), zIndex: 6, transformOrigin: "100% 100%" }}
              {...pop}
            >
              <div className="coach-zoom-m">
                <aside aria-label="Coach Claudalf" className="voxel-block relative flex items-start gap-3 bg-stone p-3 pt-7">
                  <div className="absolute top-1 right-2 flex items-center gap-2">
                    <button type="button" className={CTRL} onClick={() => onCoach(false)}>
                      Dismiss
                    </button>
                    <button ref={closeRef} type="button" className={CTRL} aria-label="Close Claudalf's advice" onClick={closeSheet}>
                      Close ✕
                    </button>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <Claudalf className="w-14 drop-shadow-[0_4px_0_rgb(0_0_0/0.45)]" />
                    <span className="gold-frame bg-wood px-1.5 py-0.5 font-pixel text-[9px] whitespace-nowrap text-gold-light">Claudalf</span>
                  </div>
                  <SpeechBubble lines={lines} tail="left" bodyClassName="min-h-20" />
                </aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      {css}
      {/* The box is click-through; only the bubble, controls and portraits take the pointer. */}
      <div style={{ ...stageBox({ right: 22, bottom: 20 }), zIndex: 4, pointerEvents: "none" }}>
        <div className="coach-zoom">
          {!on ? (
            <div className="pointer-events-auto flex flex-col items-center gap-2">
              <CoachPortrait label="Summon Claudalf, the coach" onClick={() => onCoach(true)} />
              <span className="gold-frame bg-wood px-2 py-0.5 font-pixel text-[10px] whitespace-nowrap text-gold-light">Summon</span>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {collapsed ? (
                <motion.div key="min" className="pointer-events-auto flex flex-col items-center" style={{ transformOrigin: "100% 100%" }} {...pop}>
                  <CoachPortrait label="Show Claudalf's advice" expanded={false} unread={unread} onClick={() => setCollapsed(false)} />
                </motion.div>
              ) : (
                <motion.aside
                  key="full"
                  aria-label="Coach Claudalf"
                  className="flex items-end gap-3"
                  style={{ transformOrigin: "100% 100%" }}
                  {...pop}
                >
                  {/* Bubble beside him, lifted to head height so it clears the dock. */}
                  <div className="mb-[92px] flex w-[300px] flex-col items-end gap-1">
                    <div className="pointer-events-auto flex items-center gap-2">
                      <button type="button" className={CTRL} aria-expanded={true} title="Minimise (C)" onClick={() => setCollapsed(true)}>
                        – Minimise
                      </button>
                      <button type="button" className={CTRL} onClick={() => onCoach(false)}>
                        Dismiss
                      </button>
                    </div>
                    <SpeechBubble lines={lines} tail="right-low" className="pointer-events-auto w-full flex-none" bodyClassName="min-h-20" />
                  </div>
                  <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-1.5">
                    <Claudalf className="w-24 drop-shadow-[0_4px_0_rgb(0_0_0/0.55)]" />
                    <span className="gold-frame bg-wood px-2 py-0.5 font-pixel text-[10px] whitespace-nowrap text-gold-light">
                      Claudalf · Coach
                    </span>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
}
