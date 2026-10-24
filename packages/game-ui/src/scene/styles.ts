import { STAGE_MOBILE_BREAKPOINT } from "./data";

// Scene CSS, hoisted once into <head> by React 19 (<style href precedence>), so the stage
// works without any global stylesheet. Values mirror design-system/grand-hall.css
// (.gh-stage, .gh-layer, .gh-glow, .gh-embers, .gh-vignette and their keyframes).
//
// Stage unit: `--gh-u` is one source pixel at the current stage size (1440 wide on desktop,
// 390 on mobile), computed from container query units so it is correct on first paint.
// Overlays size themselves with e.g. `calc(64 * var(--gh-u))`. `--gh-scale` holds the same
// ratio as a unitless number (set from JS after mount, 1 before).
const BP = STAGE_MOBILE_BREAKPOINT;

export const SCENE_CSS = /* css */ `
.ghs-root { container: gh-stage / inline-size; width: 100%; max-width: 100%; min-width: 0; }
.ghs-stage {
  --gh-u: calc(100cqw / 1440); --ghs-px: 0; --ghs-py: 0;
  position: relative; width: 100%; aspect-ratio: 1440 / 810; overflow: hidden; isolation: isolate;
  background: #0E0C12; contain: layout paint;
}
.ghs-stage[data-variant="mobile"] { --gh-u: calc(100cqw / 390); aspect-ratio: 390 / 844; }
.ghs-set { position: absolute; inset: 0; pointer-events: none; }
.ghs-stage[data-variant="desktop"] .ghs-set--mobile,
.ghs-stage[data-variant="mobile"] .ghs-set--desktop,
.ghs-stage[data-variant="auto"] .ghs-set--mobile { display: none; }

.ghs-depth {
  position: absolute; inset: 0; pointer-events: none;
  transform: translate3d(
    calc(var(--ghs-px) * var(--ghs-d, 0) * -12 * var(--gh-u)),
    calc(var(--ghs-py) * var(--ghs-d, 0) * -12 * var(--gh-u)), 0);
  will-change: transform;
}
.ghs-depth--far { --ghs-d: 0.15; inset: calc(-2 * var(--gh-u)); }
.ghs-depth--table { --ghs-d: 0.5; }
.ghs-depth--king { --ghs-d: 0.5; }
.ghs-depth--fg { --ghs-d: 1; }
.ghs-depth--none { --ghs-d: 0; transform: none; will-change: auto; }

.ghs-layer {
  position: absolute; inset: 0; width: 100%; height: 100%; display: block;
  image-rendering: pixelated; pointer-events: none; user-select: none; -webkit-user-drag: none;
}
.ghs-poster { z-index: 0; }
.ghs-live { opacity: 0; transition: opacity 160ms linear; }
.ghs-set[data-ready="true"] .ghs-live { opacity: 1; }

.ghs-king { position: absolute; overflow: hidden; }
.ghs-king__shake { position: absolute; inset: 0; }
.ghs-king__sheet {
  position: absolute; top: 0; left: 0; width: 500%; height: 100%; max-width: none; display: block;
  image-rendering: pixelated; pointer-events: none; user-select: none; -webkit-user-drag: none;
  transform: translateX(calc(var(--ghs-frame, 0) * -20%));
}

.ghs-glow {
  position: absolute; width: calc(var(--ghs-size, 140) * var(--gh-u)); height: calc(var(--ghs-size, 140) * var(--gh-u));
  transform: translate(-50%, -50%); pointer-events: none; border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 170, 70, .35), rgba(255, 120, 40, 0) 65%);
  mix-blend-mode: screen; animation: gh-flicker 2.4s steps(6) infinite;
}
.ghs-embers { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.ghs-embers > i {
  position: absolute; bottom: -6px; width: 3px; height: 3px; background: #FFD089;
  box-shadow: 0 0 6px 2px rgba(255, 150, 50, .7); animation: gh-ember 9s linear infinite;
}
.ghs-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(8, 6, 12, .55)); }
.ghs-dockshade {
  position: absolute; left: 0; right: 0; bottom: 0; height: calc(330 / 844 * 100%); pointer-events: none;
  background: linear-gradient(180deg, rgba(14, 12, 18, 0), rgba(14, 12, 18, .72) 42%, rgba(14, 12, 18, .92));
}

.ghs-overlay { position: absolute; inset: 0; z-index: 10; }
.ghs-anchor {
  position: absolute; width: 0; height: 0; left: var(--ax-d); top: var(--ay-d);
  transform: translate3d(
    calc(var(--ghs-px) * var(--ghs-d, 0.5) * -12 * var(--gh-u)),
    calc(var(--ghs-py) * var(--ghs-d, 0.5) * -12 * var(--gh-u)), 0);
}
.ghs-stage[data-variant="mobile"] .ghs-anchor { left: var(--ax-m); top: var(--ay-m); }
.ghs-stage[data-variant="desktop"] .ghs-anchor[data-only="mobile"],
.ghs-stage[data-variant="auto"] .ghs-anchor[data-only="mobile"],
.ghs-stage[data-variant="mobile"] .ghs-anchor[data-only="desktop"] { display: none; }
.ghs-anchor__body { position: absolute; left: 0; top: 0; width: max-content; pointer-events: auto; }
.ghs-anchor__body[data-align="center"] { transform: translate(-50%, -50%); }
.ghs-anchor__body[data-align="top"] { transform: translate(-50%, 0); }
.ghs-anchor__body[data-align="bottom"] { transform: translate(-50%, -100%); }
.ghs-anchor__body[data-align="left"] { transform: translate(0, -50%); }
.ghs-anchor__body[data-align="right"] { transform: translate(-100%, -50%); }
.ghs-anchor__body[data-align="top-left"] { transform: none; }
.ghs-anchor__body[data-align="top-right"] { transform: translate(-100%, 0); }
.ghs-anchor__body[data-align="bottom-left"] { transform: translate(0, -100%); }
.ghs-anchor__body[data-align="bottom-right"] { transform: translate(-100%, -100%); }

@container gh-stage (max-width: ${BP - 0.02}px) {
  .ghs-stage[data-variant="auto"] { --gh-u: calc(100cqw / 390); aspect-ratio: 390 / 844; }
  .ghs-stage[data-variant="auto"] .ghs-set--desktop { display: none; }
  .ghs-stage[data-variant="auto"] .ghs-set--mobile { display: block; }
  .ghs-stage[data-variant="auto"] .ghs-anchor { left: var(--ax-m); top: var(--ay-m); }
  .ghs-stage[data-variant="auto"] .ghs-anchor[data-only="mobile"] { display: block; }
  .ghs-stage[data-variant="auto"] .ghs-anchor[data-only="desktop"] { display: none; }
}

@keyframes gh-flicker { 0%, 100% { opacity: .9; } 20% { opacity: .7; } 40% { opacity: 1; } 60% { opacity: .78; } 80% { opacity: .95; } }
@keyframes gh-ember { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(40px, -640px); opacity: 0; } }
@keyframes gh-shake { 0%, 100% { transform: none; } 25% { transform: translateX(-4px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-2px); } }

@media (prefers-reduced-motion: reduce) {
  .ghs-glow, .ghs-embers > i { animation: none !important; }
  .ghs-embers { display: none; }
  .ghs-depth, .ghs-anchor { transform: none !important; }
  .ghs-live { transition: none; }
}
`;
