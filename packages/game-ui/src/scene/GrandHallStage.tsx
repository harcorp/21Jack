"use client";

import {
  type CSSProperties,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AnchorMap,
  type AnchorPoint,
  type KingMood,
  type StageAnchorName,
  type StageDepth,
  type StageMode,
  type StageVariant,
  PARALLAX_DEPTH,
  STAGE_ANCHORS,
  STAGE_EMBERS,
  STAGE_GLOWS,
  STAGE_MOBILE_BREAKPOINT,
  STAGE_SOURCE,
  sceneAssets,
} from "./data";
import { GrandHallKing } from "./King";
import { SCENE_CSS } from "./styles";
import { useStageParallax } from "./useParallax";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// ---------------------------------------------------------------------------------------
// Context

export interface StageContextValue {
  /** What the stage was asked to render. */
  mode: StageMode;
  /** The variant currently on screen ("auto" resolves after mount; desktop before). */
  variant: StageVariant;
  anchors: AnchorMap;
  /** Stage width / source width (1440 desktop, 390 mobile). 1 before the first measure. */
  scale: number;
  /** Rendered stage size in CSS px (0 before the first measure). */
  width: number;
  height: number;
  anchor: (name: StageAnchorName) => AnchorPoint;
}

const fallbackContext: StageContextValue = {
  mode: "desktop",
  variant: "desktop",
  anchors: STAGE_ANCHORS.desktop,
  scale: 1,
  width: 0,
  height: 0,
  anchor: (name) => STAGE_ANCHORS.desktop[name],
};

const StageContext = createContext<StageContextValue | null>(null);

/** Current stage variant + anchor map. Works outside a stage too (desktop defaults). */
export function useStageAnchors(): StageContextValue {
  return useContext(StageContext) ?? fallbackContext;
}

// ---------------------------------------------------------------------------------------
// Scene layer set (one per variant)

function useLayerSetReady(count: number) {
  const [loaded, setLoaded] = useState(0);
  const seen = useRef(new WeakSet<HTMLImageElement>());
  const mark = useCallback((el: HTMLImageElement | null) => {
    if (!el || seen.current.has(el)) return;
    const done = () => {
      if (seen.current.has(el)) return;
      seen.current.add(el);
      setLoaded((n) => n + 1);
    };
    // Images may finish before hydration, in which case onLoad never fires.
    if (el.complete && el.naturalWidth > 0) done();
    else el.addEventListener("load", done, { once: true });
  }, []);
  return { ready: loaded >= count, mark };
}

interface LayerSetProps {
  variant: StageVariant;
  /** true when this set is the only one rendered (explicit variant), false in auto mode */
  exclusive: boolean;
  assetBase: string;
  king: KingMood;
  kingHit?: boolean | number;
  poster: boolean;
  dockShade: boolean;
}

function LayerSet({ variant, exclusive, assetBase, king, kingHit, poster, dockShade }: LayerSetProps) {
  const a = sceneAssets(variant, assetBase);
  const { width, height } = STAGE_SOURCE[variant];
  const layerCount = a.fg ? 4 : 3;
  const { ready, mark } = useLayerSetReady(layerCount);
  // In auto mode both sets are in the DOM; lazy images inside the hidden (display: none)
  // set are never fetched, so only the visible variant downloads.
  const loading = exclusive ? "eager" : "lazy";
  const img = (src: string, cls = "ghs-layer ghs-live") => (
    <img
      ref={mark}
      className={cls}
      src={src}
      alt=""
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      draggable={false}
    />
  );

  return (
    <div className={`ghs-set ghs-set--${variant}`} data-ready={ready}>
      {poster && (
        // Baked composite: painted first (preloaded), covered once every live layer decoded.
        <img
          className="ghs-layer ghs-poster"
          src={a.composite}
          alt=""
          width={width}
          height={height}
          loading={loading}
          fetchPriority={exclusive ? "high" : "auto"}
          decoding="async"
          draggable={false}
          style={ready ? { visibility: "hidden" } : undefined}
        />
      )}
      <div className="ghs-depth ghs-depth--far">{img(a.far)}</div>
      <div className="ghs-depth ghs-depth--table">{img(a.table)}</div>
      <div className="ghs-depth ghs-depth--king">
        <GrandHallKing variant={variant} src={a.kingSheet} mood={king} hit={kingHit} loading={loading} imgRef={mark} />
      </div>
      {a.fg && <div className="ghs-depth ghs-depth--fg">{img(a.fg)}</div>}
      {STAGE_GLOWS[variant].map((g) => (
        <div key={`${g.x}-${g.y}`} className={`ghs-depth ghs-depth--${g.depth}`}>
          <div
            className="ghs-glow"
            style={
              {
                left: `${g.x}%`,
                top: `${g.y}%`,
                animationDelay: g.delay ? `${g.delay}s` : undefined,
                "--ghs-size": g.size ?? 140,
              } as CSSProperties
            }
          />
        </div>
      ))}
      <div className="ghs-embers">
        {STAGE_EMBERS[variant].map((e) => (
          <i
            key={e.left}
            style={{
              left: `${e.left}%`,
              animationDelay: `${e.delay}s`,
              animationDuration: e.duration ? `${e.duration}s` : undefined,
            }}
          />
        ))}
      </div>
      <div className="ghs-vignette" />
      {variant === "mobile" && dockShade && <div className="ghs-dockshade" />}
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Stage

export interface GrandHallStageProps {
  /** "auto" (default) shows the mobile portrait stage under 720px of container width. */
  variant?: StageMode;
  /** "idle" plays the living loop; "smug" / "grimace" (or any frame) holds that frame. */
  king?: KingMood;
  /** Rising edge (false -> true) or a changing number replays the boss-hit flash + shake. */
  kingHit?: boolean | number;
  /** Pointer / tilt parallax (always off under prefers-reduced-motion). Default true. */
  parallax?: boolean;
  /** Paint the baked composite until the live layers have decoded. Default true. */
  poster?: boolean;
  /** Mobile only: dark gradient behind the bottom action bar (from MobileStage). Default true. */
  dockShade?: boolean;
  /** Where the scene PNGs live (expects `${assetBase}/scene/gh-*.png`). */
  assetBase?: string;
  className?: string;
  style?: CSSProperties;
  /** Accessible name of the scene. */
  label?: string;
  /** Overlays, drawn above the vignette. Use <StageAnchor> to pin them to the scene. */
  children?: ReactNode;
}

export function GrandHallStage({
  variant = "auto",
  king = "idle",
  kingHit,
  parallax = true,
  poster = true,
  dockShade = true,
  assetBase = "/grand-hall",
  className,
  style,
  label = "The Grand Hall: the king deals at a felt table",
  children,
}: GrandHallStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [measure, setMeasure] = useState({ width: 0, height: 0 });

  // First paint: preload the composite of the variant that will show (React hoists <link>).
  const preloads: Array<{ href: string; media?: string }> = !poster
    ? []
    : variant === "auto"
      ? [
          { href: sceneAssets("desktop", assetBase).composite, media: `(min-width: ${STAGE_MOBILE_BREAKPOINT}px)` },
          {
            href: sceneAssets("mobile", assetBase).composite,
            media: `(max-width: ${STAGE_MOBILE_BREAKPOINT - 0.02}px)`,
          },
        ]
      : [{ href: sceneAssets(variant, assetBase).composite }];

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const update = () => {
      const r = stage.getBoundingClientRect();
      setMeasure((m) => (m.width === r.width && m.height === r.height ? m : { width: r.width, height: r.height }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const resolved: StageVariant =
    variant !== "auto"
      ? variant
      : measure.width > 0 && measure.width < STAGE_MOBILE_BREAKPOINT
        ? "mobile"
        : "desktop";
  const scale = measure.width > 0 ? measure.width / STAGE_SOURCE[resolved].width : 1;

  useStageParallax(stageRef, parallax);

  const ctx = useMemo<StageContextValue>(() => {
    const anchors = STAGE_ANCHORS[resolved];
    return {
      mode: variant,
      variant: resolved,
      anchors,
      scale,
      width: measure.width,
      height: measure.height,
      anchor: (name) => anchors[name],
    };
  }, [variant, resolved, scale, measure.width, measure.height]);

  const sets: StageVariant[] = variant === "auto" ? ["desktop", "mobile"] : [variant];

  return (
    <div ref={rootRef} className={["ghs-root", className].filter(Boolean).join(" ")} style={style}>
      {preloads.map((p) => (
        <link key={p.href} rel="preload" as="image" href={p.href} media={p.media} fetchPriority="high" />
      ))}
      <style href="21jack-grand-hall-scene" precedence="default">
        {SCENE_CSS}
      </style>
      <div
        ref={stageRef}
        className="ghs-stage"
        data-variant={variant}
        data-resolved={resolved}
        role="group"
        aria-label={label}
        style={{ ["--gh-scale" as string]: scale.toFixed(5) }}
      >
        {sets.map((v) => (
          <LayerSet
            key={v}
            variant={v}
            exclusive={variant !== "auto"}
            assetBase={assetBase}
            king={king}
            kingHit={kingHit}
            poster={poster}
            dockShade={dockShade}
          />
        ))}
        <StageContext.Provider value={ctx}>
          <div className="ghs-overlay">{children}</div>
        </StageContext.Provider>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Anchored overlays

export type StageAlign =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface StageAnchorProps {
  name: StageAnchorName;
  /** Only show on this variant. Omit to follow whichever variant is on screen. */
  variant?: StageVariant;
  /** Which point of the child sits on the anchor. Default "center". */
  align?: StageAlign;
  /** Parallax layer to ride with. Felt overlays use "table" (default); HUD uses "none". */
  depth?: StageDepth;
  /** Extra offset in stage px (scaled with the stage). */
  offset?: { x?: number; y?: number };
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Pins its children to a named scene anchor. Positions come from both anchor maps as CSS
 * variables, so the right one applies on first paint (container query), without JS.
 */
export function StageAnchor({
  name,
  variant,
  align = "center",
  depth = "table",
  offset,
  className,
  style,
  children,
}: StageAnchorProps) {
  const d = STAGE_ANCHORS.desktop[name];
  const m = STAGE_ANCHORS.mobile[name];
  const ox = offset?.x ? ` + ${offset.x} * var(--gh-u)` : "";
  const oy = offset?.y ? ` + ${offset.y} * var(--gh-u)` : "";
  const pos = (v: number, o: string) => (o ? `calc(${v}%${o})` : `${v}%`);
  const vars = {
    "--ax-d": pos(d[0], ox),
    "--ay-d": pos(d[1], oy),
    "--ax-m": pos(m[0], ox),
    "--ay-m": pos(m[1], oy),
    "--ghs-d": PARALLAX_DEPTH[depth],
  } as CSSProperties;
  return (
    <div className="ghs-anchor" data-anchor={name} data-only={variant} style={vars}>
      <div className={["ghs-anchor__body", className].filter(Boolean).join(" ")} data-align={align} style={style}>
        {children}
      </div>
    </div>
  );
}
