import type { SVGProps } from "react";

/** Renders an ASCII bitmap as crisp SVG pixels (one path per colour). "." is empty. */
export function PixelArt({
  rows,
  palette,
  ...svg
}: { rows: readonly string[]; palette: Record<string, string> } & SVGProps<SVGSVGElement>) {
  const width = rows[0]?.length ?? 0;
  const paths = new Map<string, string>();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] ?? ".";
      if (!palette[ch]) continue;
      paths.set(ch, `${paths.get(ch) ?? ""}M${x} ${y}h1v1h-1z`);
    }
  });
  return (
    <svg viewBox={`0 0 ${width} ${rows.length}`} shapeRendering="crispEdges" aria-hidden="true" {...svg}>
      {[...paths].map(([ch, d]) => (
        <path key={ch} d={d} fill={palette[ch]} />
      ))}
    </svg>
  );
}
