import { cx } from "./cx";

// 12x12 pixel icons from design/grand-hall-v3/design-system/pixel-paths.json.
const paths = {
  menu: "M0 1h12v1h-12zM0 2h12v1h-12zM0 5h12v1h-12zM0 6h12v1h-12zM0 9h12v1h-12zM0 10h12v1h-12z",
  close: "M0 0h2v1h-2zM10 0h2v1h-2zM0 1h3v1h-3zM9 1h3v1h-3zM1 2h3v1h-3zM8 2h3v1h-3zM2 3h3v1h-3zM7 3h3v1h-3zM3 4h6v1h-6zM4 5h4v1h-4zM4 6h4v1h-4zM3 7h6v1h-6zM2 8h3v1h-3zM7 8h3v1h-3zM1 9h3v1h-3zM8 9h3v1h-3zM0 10h3v1h-3zM9 10h3v1h-3zM0 11h2v1h-2zM10 11h2v1h-2z",
  plus: "M5 0h2v1h-2zM5 1h2v1h-2zM5 2h2v1h-2zM5 3h2v1h-2zM5 4h2v1h-2zM0 5h12v1h-12zM0 6h12v1h-12zM5 7h2v1h-2zM5 8h2v1h-2zM5 9h2v1h-2zM5 10h2v1h-2zM5 11h2v1h-2z",
  back: "M5 0h2v1h-2zM4 1h2v1h-2zM3 2h2v1h-2zM2 3h2v1h-2zM1 4h2v1h-2zM0 5h12v1h-12zM0 6h12v1h-12zM1 7h2v1h-2zM2 8h2v1h-2zM3 9h2v1h-2zM4 10h2v1h-2zM5 11h2v1h-2z",
  sound: "M5 0h2v1h-2zM4 1h3v1h-3zM3 2h4v1h-4zM9 2h1v1h-1zM0 3h6v1h-6zM9 3h1v1h-1zM0 4h6v1h-6zM7 4h1v1h-1zM10 4h1v1h-1zM0 5h6v1h-6zM7 5h1v1h-1zM10 5h1v1h-1zM0 6h6v1h-6zM7 6h1v1h-1zM10 6h1v1h-1zM0 7h6v1h-6zM7 7h1v1h-1zM10 7h1v1h-1zM0 8h6v1h-6zM9 8h1v1h-1zM3 9h4v1h-4zM9 9h1v1h-1zM4 10h3v1h-3zM5 11h2v1h-2z",
  mute: "M5 0h2v1h-2zM4 1h3v1h-3zM3 2h4v1h-4zM0 3h6v1h-6zM8 3h1v1h-1zM11 3h1v1h-1zM0 4h6v1h-6zM9 4h2v1h-2zM0 5h6v1h-6zM9 5h2v1h-2zM0 6h6v1h-6zM8 6h1v1h-1zM11 6h1v1h-1zM0 7h6v1h-6zM0 8h6v1h-6zM3 9h4v1h-4zM4 10h3v1h-3zM5 11h2v1h-2z",
  eye: "M4 2h4v1h-4zM2 3h8v1h-8zM1 4h3v1h-3zM8 4h3v1h-3zM0 5h3v1h-3zM5 5h2v1h-2zM9 5h3v1h-3zM0 6h3v1h-3zM5 6h2v1h-2zM9 6h3v1h-3zM1 7h3v1h-3zM8 7h3v1h-3zM2 8h8v1h-8zM4 9h4v1h-4z",
  nosignal: "M4 1h4v1h-4zM2 2h2v1h-2zM8 2h2v1h-2zM1 3h1v1h-1zM10 3h1v1h-1zM3 4h6v1h-6zM2 5h1v1h-1zM9 5h1v1h-1zM5 6h2v1h-2zM4 7h1v1h-1zM7 7h1v1h-1zM5 9h2v1h-2zM5 10h2v1h-2z",
  crown: "M0 1h1v1h-1zM5 1h2v1h-2zM11 1h1v1h-1zM0 2h2v1h-2zM4 2h4v1h-4zM10 2h2v1h-2zM0 3h2v1h-2zM3 3h6v1h-6zM10 3h2v1h-2zM0 4h12v1h-12zM0 5h12v1h-12zM0 6h12v1h-12zM0 7h12v1h-12zM0 8h12v1h-12zM0 10h12v1h-12zM0 11h12v1h-12z",
  lock: "M4 0h4v1h-4zM3 1h2v1h-2zM7 1h2v1h-2zM3 2h1v1h-1zM8 2h1v1h-1zM3 3h1v1h-1zM8 3h1v1h-1zM1 4h10v1h-10zM1 5h10v1h-10zM1 6h4v1h-4zM7 6h4v1h-4zM1 7h4v1h-4zM7 7h4v1h-4zM1 8h5v1h-5zM7 8h4v1h-4zM1 9h10v1h-10zM1 10h10v1h-10z",
  user: "M4 0h4v1h-4zM3 1h6v1h-6zM3 2h6v1h-6zM3 3h6v1h-6zM4 4h4v1h-4zM2 6h8v1h-8zM1 7h10v1h-10zM0 8h12v1h-12zM0 9h12v1h-12zM0 10h12v1h-12z",
  chest: "M1 1h10v1h-10zM0 2h1v1h-1zM5 2h2v1h-2zM11 2h1v1h-1zM0 3h1v1h-1zM5 3h2v1h-2zM11 3h1v1h-1zM0 4h12v1h-12zM0 5h5v1h-5zM7 5h5v1h-5zM0 6h5v1h-5zM7 6h5v1h-5zM0 7h1v1h-1zM11 7h1v1h-1zM0 8h1v1h-1zM11 8h1v1h-1zM0 9h1v1h-1zM11 9h1v1h-1zM0 10h12v1h-12z",
  scroll: "M1 0h9v1h-9zM0 1h1v1h-1zM2 1h1v1h-1zM9 1h1v1h-1zM0 2h1v1h-1zM2 2h1v1h-1zM9 2h1v1h-1zM1 3h2v1h-2zM4 3h4v1h-4zM9 3h1v1h-1zM2 4h1v1h-1zM9 4h1v1h-1zM2 5h1v1h-1zM4 5h4v1h-4zM9 5h1v1h-1zM2 6h1v1h-1zM9 6h1v1h-1zM2 7h1v1h-1zM4 7h3v1h-3zM9 7h1v1h-1zM2 8h1v1h-1zM9 8h1v1h-1zM2 9h9v1h-9zM2 10h1v1h-1zM10 10h1v1h-1zM3 11h8v1h-8z",
  refresh: "M4 0h4v1h-4zM9 0h1v1h-1zM2 1h2v1h-2zM8 1h2v1h-2zM1 2h1v1h-1zM7 2h3v1h-3zM1 3h1v1h-1zM0 4h1v1h-1zM0 5h1v1h-1zM11 5h1v1h-1zM0 6h1v1h-1zM11 6h1v1h-1zM11 7h1v1h-1zM10 8h1v1h-1zM2 9h3v1h-3zM10 9h1v1h-1zM2 10h2v1h-2zM8 10h2v1h-2zM2 11h1v1h-1zM4 11h4v1h-4z",
  info: "M4 0h4v1h-4zM2 1h8v1h-8zM1 2h4v1h-4zM7 2h4v1h-4zM1 3h10v1h-10zM0 4h5v1h-5zM7 4h5v1h-5zM0 5h5v1h-5zM7 5h5v1h-5zM0 6h5v1h-5zM7 6h5v1h-5zM0 7h5v1h-5zM7 7h5v1h-5zM1 8h4v1h-4zM7 8h4v1h-4zM1 9h10v1h-10zM2 10h8v1h-8zM4 11h4v1h-4z",
  check: "M10 1h2v1h-2zM9 2h3v1h-3zM8 3h3v1h-3zM7 4h3v1h-3zM0 5h2v1h-2zM6 5h3v1h-3zM0 6h3v1h-3zM5 6h3v1h-3zM1 7h5v1h-5zM2 8h3v1h-3zM3 9h1v1h-1z",
  swords: "M0 0h2v1h-2zM10 0h2v1h-2zM0 1h3v1h-3zM9 1h3v1h-3zM1 2h3v1h-3zM8 2h3v1h-3zM2 3h3v1h-3zM7 3h3v1h-3zM3 4h6v1h-6zM4 5h4v1h-4zM3 6h6v1h-6zM2 7h3v1h-3zM7 7h3v1h-3zM1 8h2v1h-2zM9 8h2v1h-2zM0 9h3v1h-3zM9 9h3v1h-3zM0 10h2v1h-2zM10 10h2v1h-2z",
  logout: "M0 0h6v1h-6zM0 1h1v1h-1zM5 1h1v1h-1zM0 2h1v1h-1zM5 2h1v1h-1zM8 2h1v1h-1zM0 3h1v1h-1zM5 3h1v1h-1zM8 3h2v1h-2zM0 4h1v1h-1zM3 4h9v1h-9zM0 5h1v1h-1zM3 5h9v1h-9zM0 6h1v1h-1zM5 6h1v1h-1zM8 6h2v1h-2zM0 7h1v1h-1zM5 7h1v1h-1zM8 7h1v1h-1zM0 8h1v1h-1zM5 8h1v1h-1zM0 9h1v1h-1zM5 9h1v1h-1zM0 10h6v1h-6z",
  door: "M2 0h8v1h-8zM1 1h1v1h-1zM10 1h1v1h-1zM1 2h1v1h-1zM10 2h1v1h-1zM1 3h1v1h-1zM10 3h1v1h-1zM1 4h1v1h-1zM10 4h1v1h-1zM1 5h1v1h-1zM8 5h1v1h-1zM10 5h1v1h-1zM1 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM1 7h1v1h-1zM10 7h1v1h-1zM1 8h1v1h-1zM10 8h1v1h-1zM1 9h1v1h-1zM10 9h1v1h-1zM1 10h1v1h-1zM10 10h1v1h-1zM0 11h12v1h-12z",
} as const;

export type PixelIconName = keyof typeof paths;

/** Decorative pixel icon (fill: currentColor). Draw at 12, 24 or 36 px. */
export function PixelIcon({ name, size = 20, className }: { name: PixelIconName; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true" focusable="false" className={cx("gh-icon shrink-0", className)} style={{ width: size, height: size }}>
      <path d={paths[name]} />
    </svg>
  );
}
