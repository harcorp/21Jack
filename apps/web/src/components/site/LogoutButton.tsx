"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

export function LogoutButton({ variant = "ghost" }: { variant?: "ghost" | "wood" }) {
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
  return (
    <Button variant={variant} size="sm" busy={busy} onClick={logout}>
      Leave the castle
    </Button>
  );
}
