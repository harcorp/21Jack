"use client";

import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { stepped } from "./motion";

const FX_DELAY = 0.7;

/**
 * Wraps the king portrait. When `eventKey` changes with a non-zero `delta`, plays once:
 * damage (delta < 0) = shake + red flash + floating "-N"; heal (delta > 0) = sparkles + "+N".
 */
export function BossFx({ eventKey, delta, children }: { eventKey: string | null; delta: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const active = !!eventKey && delta !== 0;

  useEffect(() => {
    if (!active || reduce || delta > 0 || !scope.current) return;
    const controls = animate(
      scope.current,
      { x: [0, -8, 8, -6, 6, -3, 0] },
      { duration: 0.45, delay: FX_DELAY, ease: stepped(7) },
    );
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey]);

  const text = delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <div ref={scope} className="relative">
      {children}
      {active && (
        <div key={eventKey} className="pointer-events-none absolute inset-0" aria-hidden="true">
          {delta < 0 && !reduce && (
            <motion.div
              className="absolute inset-0 bg-[#e0393e] mix-blend-multiply"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.75, 0, 0.5, 0] }}
              transition={{ duration: 0.5, delay: FX_DELAY, ease: stepped(5) }}
            />
          )}
          {delta > 0 &&
            !reduce &&
            [15, 40, 65, 85].map((left, i) => (
              <motion.span
                key={left}
                className="absolute bottom-2 h-1.5 w-1.5 bg-gold-light shadow-[0_0_6px_var(--color-torch)]"
                style={{ left: `${left}%` }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -48, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.9, delay: FX_DELAY + i * 0.08, ease: stepped(6) }}
              />
            ))}
          <motion.span
            className={`absolute left-1/2 top-0 -translate-x-1/2 font-display text-3xl font-bold drop-shadow-[2px_2px_0_var(--color-ink)] sm:text-4xl ${
              delta < 0 ? "text-[#ff5a5f]" : "text-gold-light"
            }`}
            initial={reduce ? { opacity: 1, y: -8 } : { opacity: 0, y: 0 }}
            animate={reduce ? { opacity: 1, y: -8 } : { opacity: [0, 1, 1, 0], y: -40 }}
            transition={{ duration: 1.2, delay: FX_DELAY, ease: stepped(8) }}
          >
            {text}
          </motion.span>
        </div>
      )}
    </div>
  );
}
