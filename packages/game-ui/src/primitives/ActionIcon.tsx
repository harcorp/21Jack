import type { Action } from "@21jack/contracts";
import { PixelArt } from "./pixel";

/** Pixel icons drawn in currentColor, so they follow the button's text colour (and its disabled state). */
const ICONS: Record<Action, readonly string[]> = {
  // A card with a plus: draw another card.
  hit: [
    "ccccccc",
    "c.....c",
    "c.....c",
    "c..c..c",
    "c.ccc.c",
    "c..c..c",
    "c.....c",
    "c.....c",
    "ccccccc",
  ],
  // An open palm: stop here.
  stand: [
    "...c.c..",
    ".c.c.c..",
    ".c.c.c.c",
    ".c.c.c.c",
    ".ccccccc",
    "cccccccc",
    ".ccccccc",
    "..cccccc",
    "...cccc.",
  ],
  // Times two: the stake doubles.
  double: [
    ".........",
    ".........",
    "c...c.ccc",
    ".c.c....c",
    "..c...ccc",
    ".c.c..c..",
    "c...c.ccc",
    ".........",
    ".........",
  ],
  // Arrows parting ways: one hand becomes two.
  split: [
    "ccc...ccc",
    "cc.....cc",
    "c.c...c.c",
    "...c.c...",
    "....c....",
    "....c....",
    "....c....",
    "....c....",
    "....c....",
  ],
};

export function ActionIcon({ action, className }: { action: Action; className?: string }) {
  return <PixelArt rows={ICONS[action]} palette={{ c: "currentColor" }} className={`pixelated h-5 w-auto shrink-0 ${className ?? ""}`} />;
}
