import type { Metadata } from "next";
import { EngineConsole } from "@/components/engine/EngineConsole";

export const metadata: Metadata = { title: "Casino Engine · 21Jack" };

export default function EnginePage() {
  return <EngineConsole />;
}
