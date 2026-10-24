import Link from "next/link";

/** Pixel "21" crown sigil + wordmark. */
export function Logo() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-display text-2xl font-medium text-gold-light focus-visible:outline-2 focus-visible:outline-torch">
      <svg viewBox="0 0 10 8" aria-hidden="true" className="pixelated h-6 w-8" shapeRendering="crispEdges">
        <path fill="#c9973a" d="M0 1h1v1h1v1h1v-2h1v2h2v-2h1v2h1v-1h1v-1h1v7h-10z" />
        <path fill="#f2cf6b" d="M2 5h2v1h-1v1h1v0h-2v-1h1v-1h-1zM6 5h1v2h-1z" />
      </svg>
      21Jack
    </Link>
  );
}
