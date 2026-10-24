"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx";

/** Native <dialog>: focus trap, Esc to close and inert background come from the browser. Content brings its own frame (e.g. a wood Panel). */
export function Modal({
  open,
  onClose,
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cx(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto bg-transparent p-0 text-cream",
        "shadow-[var(--gh-drop-lg)] backdrop:bg-[rgb(14_12_18/0.8)] backdrop:backdrop-blur-[2px]",
        className,
      )}
    >
      {children}
    </dialog>
  );
}
