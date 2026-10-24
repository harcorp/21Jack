import type { ReactNode } from "react";
import { SignedInFrame } from "@/components/site/SignedInFrame";
import { requireCurrentAccount } from "@/lib/current";

export default async function CastleLayout({ children }: { children: ReactNode }) {
  const account = await requireCurrentAccount();
  return <SignedInFrame account={account}>{children}</SignedInFrame>;
}
