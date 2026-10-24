"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, PixelIcon } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

export function LogoutButton({ variant = "ghost", iconOnly }: { variant?: "ghost" | "wood" | "stone"; iconOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/session", { method: "DELETE" });
    } catch {
      // Cookie may already be gone; continue to the gate either way.
    }
    router.replace("/");
    router.refresh();
  };
  if (iconOnly) {
    return (
      <button type="button" className="gh-iconbtn shrink-0" onClick={logout} disabled={busy} aria-busy={busy || undefined} aria-label="Leave the castle" title="Leave the castle">
        {busy ? <span className="gh-spinner" aria-hidden="true" /> : <PixelIcon name="logout" size={20} />}
      </button>
    );
  }
  return (
    <Button variant={variant} size="sm" busy={busy} onClick={logout}>
      <PixelIcon name="logout" size={16} />
      Leave the castle
    </Button>
  );
}
