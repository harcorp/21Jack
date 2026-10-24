import { type PreviewMode, StagePreview } from "./StagePreview";

const MODES: PreviewMode[] = ["both", "auto", "desktop", "mobile"];

// Dev-only preview of the Grand Hall scene engine. ?mode=auto|both&markers=0
export default async function DevStagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const mode = MODES.find((m) => m === sp.mode) ?? "both";
  return <StagePreview initialMode={mode} initialMarkers={sp.markers !== "0"} />;
}
