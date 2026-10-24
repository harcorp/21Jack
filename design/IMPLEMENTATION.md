# Grand Hall v3 — implementation brief

Branch `feat/grand-hall-design`, worktree `/Users/david.rodriguez/Developer/21Jack-grand-hall`.
Source design (from the team, made in Claude Design): `design/grand-hall-v3/`.

## What the design is
- `design-system/grand-hall.css`: tokens (`--gh-*`) + component classes (`gh-btn`, `gh-card`, `gh-seat`, `gh-banner`, `gh-stage`, `gh-layer`, `gh-glow`, `gh-embers`, `gh-vignette`, …) and keyframes. **Use it as the source of truth**; do not re-invent values.
- `assets/scene/*.png`: the hall is a **pre-rendered voxel 3D scene shipped as stacked layers** (far → table → king → foreground) inside a 16:9 container (desktop, 1440×810 source) or a portrait container (mobile, 780×1688 source for 390×844). King sprite frames: idle, breath, blink, smug, grimace (`*-king-sheet.json`: frame size + placement %).
- `design-system/desktop-anchors.json` / `mobile-anchors.json`: % positions (x, y) inside the stage for seats 1–5 (+ rims), dealer cards, shoe, discard, chip tray, crest, king head/crown and light sources. **Every overlay is positioned in % from these anchors.**
- `design-system/pixel-paths.json`: pixel icon paths.
- `design-canvas-local/**.dc.html`: boards. Primitives/UI boards are static HTML (read them, they render). `views/desktop/TableStage.dc.html` and `views/mobile/MobileStage.dc.html` hold the full stage template **and the data for every state** (`solo-betting`, `solo-natural`, `solo-turn`, `solo-split`, `solo-double`, `solo-results`, `solo-nocredits`, `solo-resume`, `multi-betting`, `multi-yourturn`, `multi-otherturn`, `multi-dealer`, `multi-settled`, `multi-watching`) in the `<script type="text/x-dc">` block. The view wrappers depend on a missing `support.js`, so read those two files as text.
- `_renders/*.png`: screenshots of every board (views render black — use the stage HTML + `assets/scene/gh-desktop-composite.png` instead).
- `generators/*.py`: how the art was produced. Reference only — **do not run them**.

## Technology decision
No Skia/WebGL: the 3D is already baked into the layers. Implement with DOM + CSS: stacked `<img>` layers, CSS/Motion animations from the design keyframes, subtle pointer/device-tilt parallax (layers move a few px at different depths), king sprite frame cycling. Pixel art stays crisp (`image-rendering: pixelated`). Respect `prefers-reduced-motion`.

## Rules for every agent
- Read `/Users/david.rodriguez/Developer/21Jack-grand-hall/CLAUDE.md` and `PLAN.md`; contracts in `packages/contracts` are the API — game logic, money and API routes do not change.
- Work only in your owned folders (see your brief). Shared index files (`packages/game-ui/src/index.ts`): append-only, re-read right before editing.
- No `pnpm add` without reporting it first; no git commits (the lead commits); do not start/kill dev servers.
- Dev server for this worktree: **http://127.0.0.1:3100** (hot reload; uses the game/engine services already running on 3001/3002). Playwright is installed at the repo root (`import { chromium } from "playwright"`, `chromium.launch({ channel: "chrome" })`). Save screenshots under `.screens/` in the worktree.
- Code and comments in English. Never use the word "Minecraft".
