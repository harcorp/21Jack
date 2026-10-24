/**
 * Grand Hall extras: the few pieces the boards and stage markup draw with inline styles
 * (stage stake pill, bet spot, countdown dial, flip, recommended glow, compact action buttons...).
 * Everything else uses the `gh-*` classes from grand-hall.css directly, which must be loaded
 * globally by the app. Values below are copied from the board/stage markup, not invented.
 *
 * Rendered with React 19 `<style href precedence>` so it is hoisted to <head> and deduplicated,
 * no matter how many components include <GhStyles />.
 */
const GHX_CSS = `
.ghx-scale { zoom: var(--gh-scale, 1); }

/* ---- cards ---- */
.gh-cards.ghx-has-sideways { padding-right: calc(var(--card-w, 64px) * .4); }
.gh-card.ghx-flip-in { animation: ghx-flip var(--gh-dur, 220ms) steps(4, end) both; }
@keyframes ghx-flip { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
.gh-card--sideways.ghx-flip-in { animation-name: ghx-flip-side; }
@keyframes ghx-flip-side { 0% { transform: rotate(90deg) scaleX(0); } 100% { transform: rotate(90deg) scaleX(1); } }

/* ---- hand meta placed beside the cards (stage) ---- */
.ghx-hand-side { position: absolute; bottom: 2px; display: flex; flex-direction: column; gap: 5px; white-space: nowrap; filter: none; }
.ghx-hand-side--left { right: calc(100% + 10px); align-items: flex-end; }
.ghx-hand-side--right { left: calc(100% + 10px); align-items: flex-start; }
.ghx-hand-cards { position: relative; }
.ghx-split { display: flex; gap: 30px; align-items: flex-start; }

/* ---- stake (stack + amount) ---- */
.ghx-stake { display: inline-flex; align-items: center; gap: 6px; }
.ghx-stake.is-lost { opacity: .55; }
.ghx-stake__value { font-family: var(--gh-font-num); font-size: 10px; line-height: 1; color: var(--gh-cream-100); }
.ghx-stake__value--pill { color: var(--gh-gold-200); background: rgba(14, 12, 18, .85); padding: 4px 5px; box-shadow: inset 0 0 0 2px var(--gh-ink); }
.gh-stack.ghx-stack--sm > i { width: 36px; height: 14px; margin-top: -9px; }
.gh-stack.ghx-stack--xs > i { width: 30px; height: 12px; margin-top: -8px; box-shadow: 0 0 0 2px var(--gh-ink), 0 3px 0 0 var(--chip), 0 3px 0 2px var(--gh-ink); }
.ghx-stack-more { position: absolute; top: -14px; right: -16px; z-index: 1; height: 16px; padding: 0 4px; display: grid; place-items: center;
  font-family: var(--gh-font-num); font-size: 8px; color: var(--gh-wood-900); background: var(--gh-torch-400); box-shadow: inset 0 0 0 2px var(--gh-ink); }
.gh-stack.ghx-chip-in > i:last-of-type { animation: gh-chip-slide var(--gh-dur) var(--gh-ease) both; }

/* ---- bet spot on the felt ---- */
.ghx-betspot { position: relative; width: 96px; height: 60px; display: grid; place-items: center; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(10, 30, 20, .35), rgba(10, 30, 20, .15) 70%, transparent);
  outline: 2px dashed var(--gh-gold-400); outline-offset: -2px; box-shadow: 0 0 0 2px rgba(26, 16, 20, .55); }
.ghx-betspot__label { font-family: var(--gh-font-display); font-weight: 700; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--gh-gold-200); text-shadow: 0 2px 0 var(--gh-ink); opacity: .8; }
.ghx-betspot.is-filled { outline-style: solid; outline-color: rgba(232, 181, 58, .55); }
.ghx-betspot.is-active { outline-color: var(--gh-gold-200); box-shadow: 0 0 0 2px var(--gh-ink), 0 0 22px 6px rgba(255, 200, 90, .45); animation: ghx-glow 1.4s steps(4) infinite; }
.ghx-betspot.is-locked { outline-color: var(--gh-stone-400); }
.ghx-betspot--sm { width: 72px; height: 46px; }
.ghx-betspot__value { position: absolute; left: 50%; bottom: -14px; transform: translateX(-50%); }
@keyframes ghx-glow { 0%, 100% { box-shadow: 0 0 0 2px var(--gh-ink), 0 0 22px 6px rgba(255, 200, 90, .45); } 50% { box-shadow: 0 0 0 2px var(--gh-ink), 0 0 10px 2px rgba(255, 200, 90, .25); } }

/* ---- action buttons ---- */
.gh-action--compact { width: 84px; min-height: 70px; font-size: 18px; }
.gh-action.ghx-recommended::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  box-shadow: inset 0 0 0 2px var(--gh-gold-200), 0 0 18px 4px rgba(255, 200, 90, .55); animation: gh-pulse 1.4s steps(4) infinite; }
.gh-action__lock { display: flex; align-items: center; gap: 4px; }

/* ---- timers ---- */
.ghx-timer-badge { position: relative; display: grid; place-items: center; flex: none; }
.ghx-timer-badge > .gh-ring { inset: 0; }
.ghx-dial { width: 152px; height: 152px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--gh-torch-400) calc(var(--p, 100) * 1%), rgba(26, 16, 20, .85) 0);
  box-shadow: 0 0 0 3px var(--gh-ink), 0 0 0 7px var(--gh-gold-400), 0 0 0 9px var(--gh-ink), 0 0 30px 6px rgba(255, 150, 50, .35); }
.ghx-dial__face { width: 120px; height: 120px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  background: radial-gradient(circle at 50% 35%, var(--gh-stone-600), var(--gh-stone-900) 75%); box-shadow: 0 0 0 3px var(--gh-ink); }
.ghx-dial--sm { width: 60px; height: 60px; box-shadow: 0 0 0 2px var(--gh-ink), 0 0 0 4px var(--gh-gold-400); }
.ghx-dial--sm .ghx-dial__face { width: 46px; height: 46px; gap: 0; background: var(--gh-stone-800); box-shadow: none; }
.ghx-cap { font-family: var(--gh-font-display); font-weight: 700; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--gh-cream-400); }

/* ---- seats ---- */
.ghx-offline { position: absolute; right: -10px; bottom: -6px; width: 26px; height: 26px; display: grid; place-items: center;
  background: var(--gh-crimson-700); color: var(--gh-cream-100); box-shadow: inset 0 0 0 2px var(--gh-ink), 0 0 0 2px var(--gh-crimson-400); }
.ghx-plate-row { display: flex; align-items: center; justify-content: center; gap: 5px; height: 22px; }
.gh-seat.ghx-seat--stage { width: 190px; }
.gh-seat.is-waiting-seat { opacity: .72; }
.ghx-mini { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.ghx-mini__name { font-size: 11px; font-weight: 600; color: var(--gh-cream-100); font-family: var(--gh-font-body); }
.ghx-mini .gh-total { height: 22px; font-size: 8px; padding: 0 6px; }
.ghx-mini .gh-tag { height: 18px; font-size: 10px; padding: 0 5px; }

/* ---- result moments ---- */
.ghx-moment { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 40px 18px; text-align: center; }
.ghx-moment__word { font-family: var(--gh-font-display); font-weight: 700; font-size: 52px; line-height: 1.05; letter-spacing: .01em; color: var(--m, var(--gh-gold-200));
  text-shadow: 0 3px 0 var(--gh-ink), 0 0 22px var(--m-glow, rgba(255, 200, 90, .7)); }
.ghx-moment__detail { font-size: 14px; color: var(--gh-cream-100); }
.ghx-moment--victory { --m: var(--gh-gold-400); }
.ghx-moment--push { --m: var(--gh-silver-300); --m-glow: rgba(201, 205, 214, .35); }
.ghx-moment--defeat, .ghx-moment--bust { --m: var(--gh-crimson-300); --m-glow: rgba(224, 86, 106, .45); }
.ghx-moment--kingslayer { box-shadow: inset 0 0 0 2px var(--gh-ink), inset 0 0 0 4px var(--gh-gold-200), inset 0 0 0 6px var(--gh-gold-500), inset 0 0 0 8px rgba(0, 0, 0, .35), var(--gh-glow-gold); }
.ghx-moment--blackjack { box-shadow: inset 0 0 0 2px var(--gh-ink), inset 0 0 0 4px var(--gh-gold-200), inset 0 0 0 6px var(--gh-gold-500), inset 0 0 0 8px rgba(0, 0, 0, .35), 0 0 40px 8px rgba(255, 200, 90, .25); }
.ghx-moment__row { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px 12px; margin-top: 2px; }
.ghx-banner-sub { font-family: var(--gh-font-body); font-weight: 500; font-size: 13px; letter-spacing: 0; text-transform: none; color: var(--gh-cream-300); text-shadow: none; }

/* ---- boss bar ---- */
.ghx-boss-damage { position: absolute; right: -54px; top: 18px; font-family: var(--gh-font-num); font-size: 16px; color: var(--gh-torch-400); text-shadow: 0 2px 0 var(--gh-ink); }
.ghx-boss-portrait { border-radius: 50%; background: var(--gh-stone-800); box-shadow: 0 0 0 2px var(--gh-ink), 0 0 0 5px var(--gh-gold-400), 0 0 0 7px var(--gh-ink); z-index: 2; }
.gh-boss.is-shake .ghx-boss-portrait { background: var(--gh-crimson-800); box-shadow: 0 0 0 2px var(--gh-ink), 0 0 0 5px var(--gh-gold-200), 0 0 0 7px var(--gh-ink), 0 0 18px 4px rgba(255, 120, 60, .6); }
.gh-boss.is-defeated .ghx-boss-portrait { box-shadow: 0 0 0 2px var(--gh-ink), 0 0 0 5px var(--gh-gold-200), 0 0 0 7px var(--gh-ink), 0 0 22px 6px rgba(255, 200, 90, .55); }
.gh-boss.is-defeated .ghx-boss-portrait img { filter: grayscale(.6); }

@media (prefers-reduced-motion: reduce) {
  .gh-card.ghx-flip-in, .gh-action.ghx-recommended::after, .ghx-betspot.is-active, .gh-boss.is-shake .gh-boss__frame,
  .gh-stack.ghx-chip-in > i, .gh-btn, .gh-action, .gh-chip { animation: none !important; transition: none !important; }
}
`;

export function GhStyles() {
  return (
    <style href="gh-extras" precedence="default">
      {GHX_CSS}
    </style>
  );
}
