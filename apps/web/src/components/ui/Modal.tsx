"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx";

/** Native <dialog>: focus trap, Esc to close and inert background come from the browser. */
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
        "m-auto w-[calc(100%-2rem)] max-w-xl bg-transparent p-0 text-parchment backdrop:bg-ink/75 backdrop:backdrop-blur-[2px]",
        className,
      )}
    >
      {children}
    </dialog>
  );
}
