# Blackjack, your way: Grand Hall (Design Version 3)

Fictional credits only. Phase 1 export: design system, primitives, UI components, and the solo and multiplayer tables (desktop 1440 and mobile 390).

## Folders
- `design-system/grand-hall.css`: tokens as `--gh-*` CSS variables plus every component class. Fonts come from Google Fonts: Pixelify Sans, Press Start 2P and Inter.
- `design-system/pixel-paths.json`: SVG path data for the suit pips (viewBox 0 0 7 7), face-card emblems (0 0 9 9) and the 19 UI icons (0 0 12 12).
- `design-system/*-anchors.json`: overlay anchor points for seats, dealer cards, shoe, tray and lights, in % of the 16:9 (desktop) or 390×844 (mobile) container.
- `design-system/*-king-sheet.json`: king sprite-sheet frame size and the position box.
- `assets/scene`: layered scene PNGs (far hall, table, foreground), king frames and sheets, and composites. Render them with `image-rendering: pixelated`.
- `assets/sprites`: 12 avatars, king portrait, crest variants, coin, hearts.
- `design-canvas`: the canvas source files exactly as published (`.dc.html` + `canvas.json`). Asset links are `/_blob/<id>`, mapped in `asset-map.json`.
- `design-canvas-local`: the same files with asset links rewritten to relative paths into `assets/` and `design-system/`. These are reference markup; `.dc.html` needs the canvas runtime (`support.js`) to render, so use them as a guide when building React components.
- `generators`: Python sources that produced the art (numba voxel renderer, scene, crest, sprites). `run.py <outdir> 1440 810 desktop` re-renders the layers; `frames.py` re-renders the king frames.

## Key component data (TableStage)
`views/desktop/TableStage.dc.html` and `views/mobile/MobileStage.dc.html` render every table state from one data object (seats → player, hands[cards, total, soft, stake, status, actions, outcome, payout], seat status, timer; table phase; dealer cards; boss hp). Read the `renderVals()` script as the data contract.

## House rules shown in the UI
Blackjack pays 1 to 1 (a natural returns 2× the stake). The dealer stands on all 17s. Double is allowed on any two cards, including after a split, except on split aces. One split per round, same rank only; split aces get one card each. No insurance, surrender or side bets.
