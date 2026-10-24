"use client";

import { type RefObject, useEffect } from "react";

const clamp = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

type OrientationCtor = { requestPermission?: () => Promise<string> };

/**
 * Drives `--ghs-px` / `--ghs-py` (-1..1) on the stage element from the mouse position
 * (fine pointers) or device tilt (coarse pointers, only where no permission prompt is
 * needed). Values are smoothed in a rAF loop that sleeps once settled; nothing re-renders.
 */
export function useStageParallax(stageRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !enabled || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;

    const write = () => {
      el.style.setProperty("--ghs-px", cx.toFixed(4));
      el.style.setProperty("--ghs-py", cy.toFixed(4));
    };
    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      if (Math.abs(tx - cx) < 0.001 && Math.abs(ty - cy) < 0.001) {
        cx = tx;
        cy = ty;
        write();
        raf = 0;
        return;
      }
      write();
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1);
      ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1);
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };

    let baseBeta: number | null = null;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      if (baseBeta == null) baseBeta = e.beta;
      tx = clamp(e.gamma / 25);
      ty = clamp((e.beta - baseBeta) / 25);
      kick();
    };

    const fine = window.matchMedia("(pointer: fine)").matches;
    const Orientation = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
    const tiltAllowed = !fine && !!Orientation && typeof Orientation.requestPermission !== "function";

    if (fine) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    } else if (tiltAllowed) {
      window.addEventListener("deviceorientation", onTilt, { passive: true });
    }

    return () => {
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onTilt);
      if (raf) cancelAnimationFrame(raf);
      el.style.setProperty("--ghs-px", "0");
      el.style.setProperty("--ghs-py", "0");
    };
  }, [stageRef, enabled]);
}
