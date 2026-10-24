"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SessionRequest, type Account } from "@21jack/contracts";
import { Alert, Button, Input } from "@/components/ui";
import { apiFetch, errorMessage } from "@/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = SessionRequest.safeParse({ username });
    if (!parsed.success) {
      setFieldError("3–24 characters: letters, numbers or underscore.");
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      await apiFetch<Account>("/api/session", { method: "POST", body: JSON.stringify(parsed.data) });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Your name, traveller"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={24}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        hint="New names get a fresh account; known names sign back in."
        error={fieldError}
        required
      />
      <Button type="submit" variant="primary" size="lg" busy={busy} className="gh-btn--block">
        {busy ? "Opening the gate…" : "Open the gate"}
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </form>
  );
}
