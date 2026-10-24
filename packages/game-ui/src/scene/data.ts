// Grand Hall scene data. Values are copied verbatim from the design system
// (design/grand-hall-v3/design-system/*-anchors.json and *-king-sheet.json, also
// served from /grand-hall/data/). Keep them in sync if the art is re-rendered.

export type StageVariant = "desktop" | "mobile";
export type StageMode = StageVariant | "auto";

/** Every overlay anchor shipped with the scene, as % of the stage (x, y). */
export const ANCHOR_NAMES = [
  "chipTray",
  "shoe",
  "discard",
  "seat1",
  "seat1Rim",
  "seat2",
  "seat2Rim",
  "seat3",
  "seat3Rim",
  "seat4",
  "seat4Rim",
  "seat5",
  "seat5Rim",
  "dealerCards",
  "crest",
  "kingHead",
  "kingCrown",
  "light6",
  "light7",
  "light8",
  "light9",
  "light10",
  "light11",
  "light12",
  "light13",
  "light14",
  "light15",
  "light16",
  "light17",
  "light22",
  "light23",
  "light25",
] as const;

export type StageAnchorName = (typeof ANCHOR_NAMES)[number];
/** [x%, y%] inside the stage. Values may sit outside 0..100 (off-stage on mobile). */
export type AnchorPoint = readonly [x: number, y: number];
export type AnchorMap = Readonly<Record<StageAnchorName, AnchorPoint>>;

export const DESKTOP_ANCHORS: AnchorMap = {
  chipTray: [35.01, 46.07],
  shoe: [62.89, 45.13],
  discard: [71.5, 44.91],
  seat1: [25.43, 53.8],
  seat1Rim: [14.82, 56.12],
  seat2: [32.95, 62.86],
  seat2Rim: [23.58, 70.81],
  seat3: [50.0, 67.09],
  seat3Rim: [50.0, 78.53],
  seat4: [67.05, 62.86],
  seat4Rim: [76.42, 70.81],
  seat5: [74.57, 53.8],
  seat5Rim: [85.18, 56.12],
  dealerCards: [50.0, 48.92],
  crest: [50.0, 51.9],
  kingHead: [50.0, 31.18],
  kingCrown: [50.0, 20.81],
  light6: [-23.48, 34.77],
  light7: [2.44, 23.4],
  light8: [14.84, 17.96],
  light9: [22.11, 14.77],
  light10: [25.93, 13.09],
  light11: [123.48, 34.77],
  light12: [97.56, 23.4],
  light13: [85.16, 17.96],
  light14: [77.89, 14.77],
  light15: [74.07, 13.09],
  light16: [42.39, 21.05],
  light17: [57.61, 21.05],
  light22: [4.96, 89.64],
  light23: [95.04, 89.64],
  light25: [50.0, 27.36],
};

export const MOBILE_ANCHORS: AnchorMap = {
  chipTray: [2.49, 36.04],
  shoe: [90.83, 35.45],
  discard: [118.19, 35.19],
  seat1: [-25.53, 43.85],
  seat1Rim: [-56.56, 46.63],
  seat2: [-0.07, 53.35],
  seat2Rim: [-24.44, 61.26],
  seat3: [50.0, 57.5],
  seat3Rim: [50.0, 68.16],
  seat4: [100.07, 53.35],
  seat4Rim: [124.44, 61.26],
  seat5: [125.53, 43.85],
  seat5Rim: [156.56, 46.63],
  dealerCards: [50.0, 38.36],
  crest: [50.0, 41.75],
  kingHead: [50.0, 22.63],
  kingCrown: [50.0, 14.01],
  light6: [-158.65, 39.42],
  light7: [-102.22, 19.97],
  light8: [-69.81, 8.8],
  light9: [-48.78, 1.55],
  light10: [-37.07, -2.49],
  light11: [258.65, 39.42],
  light12: [202.22, 19.97],
  light13: [169.81, 8.8],
  light14: [148.78, 1.55],
  light15: [137.07, -2.49],
  light16: [22.74, 4.78],
  light17: [77.26, 4.78],
  light22: [-79.0, 69.29],
  light23: [179.0, 69.29],
  light25: [50.0, 23.17],
};

export const STAGE_ANCHORS: Readonly<Record<StageVariant, AnchorMap>> = {
  desktop: DESKTOP_ANCHORS,
  mobile: MOBILE_ANCHORS,
};

/**
 * Anchor keys in the JSON are numbered screen left (seat1) to screen right (seat5).
 * The game's turn order runs the other way (turn seat 1 = dealer's left = screen right),
 * see the SceneLayers board. Use this to map a turn-order seat number to its anchors.
 */
export function seatAnchorForTurn(turnSeat: 1 | 2 | 3 | 4 | 5): {
  felt: StageAnchorName;
  rim: StageAnchorName;
} {
  const n = 6 - turnSeat;
  return { felt: `seat${n}` as StageAnchorName, rim: `seat${n}Rim` as StageAnchorName };
}

/** Source size of each variant in CSS px (the stage unit `--gh-u` equals 1 of these). */
export const STAGE_SOURCE: Readonly<Record<StageVariant, { width: number; height: number }>> = {
  desktop: { width: 1440, height: 810 },
  mobile: { width: 390, height: 844 },
};

/** Container width (px) under which `variant="auto"` switches to the mobile stage. */
export const STAGE_MOBILE_BREAKPOINT = 720;

export const KING_FRAMES = ["idle", "breath", "blink", "smug", "grimace"] as const;
export type KingFrame = (typeof KING_FRAMES)[number];
/** "idle" plays the living loop (idle/breath + random blinks); other values hold that frame. */
export type KingMood = KingFrame;

export interface KingSheet {
  frameW: number;
  frameH: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export const KING_SHEET: Readonly<Record<StageVariant, KingSheet>> = {
  desktop: { frameW: 296, frameH: 308, left: 39.722, top: 14.444, width: 20.556, height: 38.025 },
  mobile: { frameW: 468, frameH: 484, left: 20.0, top: 11.848, width: 60.0, height: 28.673 },
};

/** Parallax depth factors from the SceneLayers board (offset = pointer × factor × 12 stage px). */
export const PARALLAX_DEPTH = {
  far: 0.15,
  table: 0.5,
  king: 0.5,
  fg: 1,
  none: 0,
} as const;
export type StageDepth = keyof typeof PARALLAX_DEPTH;
export const PARALLAX_AMPLITUDE = 12;

export interface GlowSpec {
  /** % of the stage */
  x: number;
  y: number;
  /** diameter in stage px (default 140, as .gh-glow) */
  size?: number;
  delay?: number;
  depth: StageDepth;
}

// Positions and sizes from the TableStage / MobileStage templates.
export const STAGE_GLOWS: Readonly<Record<StageVariant, readonly GlowSpec[]>> = {
  desktop: [
    { x: 14.84, y: 17.96, depth: "far" },
    { x: 85.16, y: 17.96, delay: -1.1, depth: "far" },
    { x: 22.11, y: 14.77, size: 110, delay: -0.4, depth: "far" },
    { x: 77.89, y: 14.77, size: 110, delay: -1.6, depth: "far" },
    { x: 17.5, y: 39.5, size: 200, delay: -0.6, depth: "table" },
    { x: 82.5, y: 39.5, size: 200, delay: -1.7, depth: "table" },
    { x: 4.96, y: 89.64, size: 260, delay: -0.3, depth: "fg" },
    { x: 95.04, y: 89.64, size: 260, delay: -2, depth: "fg" },
  ],
  mobile: [
    { x: 22.74, y: 4.78, size: 120, depth: "far" },
    { x: 77.26, y: 4.78, size: 120, delay: -1.2, depth: "far" },
  ],
};

export interface EmberSpec {
  left: number;
  delay: number;
  duration?: number;
}

export const STAGE_EMBERS: Readonly<Record<StageVariant, readonly EmberSpec[]>> = {
  desktop: [
    { left: 9, delay: -1 },
    { left: 16, delay: -4, duration: 11 },
    { left: 23, delay: -7 },
    { left: 34, delay: -2.5, duration: 12 },
    { left: 46, delay: -6, duration: 10 },
    { left: 58, delay: -3 },
    { left: 67, delay: -8, duration: 12 },
    { left: 76, delay: -5 },
    { left: 84, delay: -0.5, duration: 10 },
    { left: 91, delay: -6.5 },
  ],
  mobile: [
    { left: 14, delay: -2 },
    { left: 38, delay: -6, duration: 11 },
    { left: 63, delay: -4 },
    { left: 86, delay: -8, duration: 12 },
  ],
};

export interface SceneAssets {
  composite: string;
  far: string;
  table: string;
  fg: string | null;
  kingSheet: string;
}

export function sceneAssets(variant: StageVariant, base = "/grand-hall"): SceneAssets {
  const p = `${base}/scene/gh-${variant}`;
  return {
    composite: `${p}-composite.png`,
    far: `${p}-far.png`,
    table: `${p}-table.png`,
    // No foreground on mobile: the action bar sits there.
    fg: variant === "desktop" ? `${p}-fg.png` : null,
    kingSheet: `${p}-king-sheet.png`,
  };
}
