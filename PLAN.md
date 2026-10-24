# 21Jack — Team 3 Build Plan (3 hours)

Source: `blackjack-team-brief-miami.pdf`. Goal: three connected parts — **Game**, **Casino Engine**, **Casino Website** — delivering the journey:
create account → deposit fictional credits → bet → play (Hit/Stand/Double/Split) → result → new balance → transaction history. Plus one team twist.

> Brief rule: *"Each person runs their own AI session and owns a clear part. Do not hand the whole casino to one agent."*
> So the "multi-agent workflow" here = **4 human-owned Claude sessions in parallel**, each one fanning out to its own subagents inside its own folders.

---

## 1. Owners (4-person team → Game split in two)

| Owner | Delivery | Folders owned | Main agent | Skills |
|---|---|---|---|---|
| **P1 — Game Logic** | Rules, deck, dealer, rounds, hidden cards, settlement calls | `packages/blackjack-core`, `apps/game` | `game-developer` | — |
| **P2 — Game UI** | Table, cards, chips, controls, animations, coach overlay | `packages/game-ui` | `frontend-developer` (+ `game-developer` for game feel) | `frontend-design`, `ui-ux-pro-max` |
| **P3 — Casino Engine** | Accounts, wallet, deposits, bets, payouts, history, idempotency | `apps/engine`, `packages/contracts` | `general-purpose` (+ `Plan` to review money logic) | — |
| **P4 — Casino Website** | Lobby, account flow, wallet, history, embeds game, startup docs | `apps/web`, `packages/theme`, root `README.md` | `frontend-developer` | `ui-ux-pro-max`, `frontend-design` |

Assign names (Andres L, Nicolas Conde, David R, Luis) to P1–P4 before starting.
Root files (`package.json`, `turbo.json`, `pnpm-workspace.yaml`) are owned by whoever scaffolds (proposed: David). If another part needs a change, its owner makes it.

**Agent notes**
- `frontend-developer` and `game-developer` start by asking a "context-manager" that does not exist. Every prompt must say: *"Skip the context-manager step. Context: read PLAN.md and packages/contracts."*
- There is no backend specialist agent; P3 uses `general-purpose` and asks `Plan` to review the idempotency/atomicity design once.
- At 2:10 everyone runs `/code-review` on their own folders; P4 uses `claude-in-chrome` (or `run` skill) to walk the full journey.

---

## 2. Turborepo layout

```
21Jack/
├─ apps/
│  ├─ web/        Next.js 16 (App Router) :3000  — P4. Lobby, auth, wallet, history, /play (mounts game-ui)
│  ├─ game/       Hono on Node        :3001  — P1. Round state, deck, actions. Never sends hidden card.
│  └─ engine/     Hono on Node        :3002  — P3. Accounts, wallet, bets, payouts, history.
├─ packages/
│  ├─ contracts/      zod schemas + TS types for every payload, IDs, error codes — P3 (agreed by all)
│  ├─ blackjack-core/ pure rules: hand value, soft totals, naturals, allowed actions, dealer, settle, coach — P1
│  ├─ game-ui/        React components + Motion animations, talks only to /api/game — P2
│  ├─ theme/          Tailwind v4 tokens (colors, fonts, radii) from ui-ux-pro-max — P4
│  └─ tsconfig/       shared tsconfig bases — scaffolder
├─ turbo.json  pnpm-workspace.yaml  package.json  .env.example  README.md
```

Stack: pnpm + Turborepo, TypeScript 7, Next.js 16, Hono (`@hono/node-server`), Drizzle ORM, Neon Postgres (one DB, two schemas: `casino` owned by P3, `game` owned by P1), zod, Vitest, Tailwind v4, Motion.

Commands:
- `pnpm dev` → turbo runs web/game/engine together.
- `pnpm check` → `turbo run typecheck test` + `pnpm smoke` (API end-to-end script).
- `pnpm db:push` → Drizzle pushes both schemas.

Trust boundaries:
- Browser → **only** `apps/web` (Next route handlers under `/api/*`). Session cookie holds `accountId`; web never trusts an `accountId` from the client body.
- web → game / engine and game → engine use header `x-service-key` (`SERVICE_KEY` in `.env`, never in browser code).
- Only `apps/game` decides cards and results. Only `apps/engine` changes balances.

---

## 3. Contracts (agree in the first 15 minutes, then freeze)

### IDs
`accountId`, `roundId`, `handId`, `transactionId`: UUID v4. `handId` = `${roundId}:0` / `${roundId}:1`.

### Idempotency keys (engine enforces UNIQUE)
| Operation | Key |
|---|---|
| Deposit | client-generated UUID per click |
| Initial bet | `bet:{roundId}:{handId}:initial` |
| Split stake | `bet:{roundId}:{handId1}:split` |
| Double stake | `bet:{roundId}:{handId}:double` |
| Payout | `payout:{roundId}:{handId}` |

Same key twice → engine returns the **original** transaction, no second debit/credit.

### Engine API (`:3002`, all require `x-service-key`)
```
POST /accounts                     { username }                       -> Account
GET  /accounts/:id                                                    -> Account
POST /accounts/:id/deposits        { amount:int>0, idempotencyKey }   -> { transaction, balance }
POST /bets                         { accountId, roundId, handId, kind:'initial'|'split'|'double',
                                     amount:int>0, idempotencyKey }   -> { transaction, balance } | 402 INSUFFICIENT_FUNDS
POST /payouts                      { accountId, roundId, handId, outcome:'win'|'blackjack'|'push'|'loss',
                                     finalStake, amount, idempotencyKey } -> { transaction, balance }
GET  /accounts/:id/transactions    ?limit                             -> Transaction[]  (newest first)
```
`Account = { id, username, balance, createdAt }`
`Transaction = { id, accountId, type:'deposit'|'bet'|'payout', kind?, amount (signed int), balanceAfter, roundId?, handId?, outcome?, createdAt }`

Atomic debit (one SQL transaction):
`INSERT transaction ... ON CONFLICT (idempotency_key) DO NOTHING` → if conflict, return existing;
else `UPDATE accounts SET balance = balance - $amt WHERE id=$id AND balance >= $amt RETURNING balance` → 0 rows = rollback + 402.

### Game API (`:3001`, called only by web proxy `/api/game/*`)
```
POST /rounds                   { accountId, bet:int>0, coach:boolean, requestId }  -> RoundView
GET  /rounds/:id                                                                   -> RoundView
POST /rounds/:id/actions       { action:'hit'|'stand'|'double'|'split', handIndex, actionId } -> RoundView
```
`requestId` / `actionId`: client UUID. Game stores processed ids → a retry returns the stored RoundView, never draws again.

```ts
RoundView = {
  roundId, accountId, status: 'player_turn' | 'settled',
  dealer: { cards: (Card | { hidden: true })[], total: number | null },   // total null while hidden
  hands: Array<{
    handId, cards: Card[], total, soft: boolean, stake,
    status: 'playing' | 'stood' | 'bust' | 'blackjack' | 'doubled' | 'twentyone',
    fromSplit: boolean, splitAces: boolean,
    outcome?: 'win' | 'blackjack' | 'push' | 'loss', payout?: number,
    allowedActions: ('hit'|'stand'|'double'|'split')[]
  }>,
  activeHandIndex: number | null,
  balance: number,
  coach?: { recommended: Action | null, history: { action, recommended, matched }[], score: { matched, total } }
}
Card = { rank: 'A'|'2'..'10'|'J'|'Q'|'K', suit: 'S'|'H'|'D'|'C' }
```

### Errors (all services)
`{ error: { code, message } }` — `VALIDATION_ERROR 400`, `INSUFFICIENT_FUNDS 402`, `NOT_FOUND 404`, `INVALID_ACTION 409`, `ROUND_SETTLED 409`, `UNAUTHORIZED 401`.

Split/Double order in game: validate move is legal → call engine `/bets` → on 402 return error with **no state change** → on success apply move, persist round (`version` +1).

---

## 4. House rules checklist (blackjack-core tests, P1)
- Fresh 52-card deck per round, Fisher–Yates with `crypto.randomInt`, RNG injectable for tests.
- Ace 11 if it fits, else 1; soft flag. A+6 = soft 17; +10 → hard 17.
- Naturals checked right after deal on both sides: both → push; else natural wins immediately (pays 2× stake).
- 21 auto-finishes a hand; bust loses immediately.
- Dealer reveals after all player hands finish; hits <17, stands on all 17 incl. soft 17. Dealer does not draw if all player hands busted.
- Double: any two-card hand before a hit, incl. after split, **not** split aces. One card, then done.
- Split: same rank only (K+Q no), one split max, left hand first, each gets one new card (left first). Split aces: one card each, auto-stand. A+10 after split = 21, normal win.
- Payout: win 2×, push 1×, loss 0, natural 2× (of final stake).
- No insurance/surrender/side bets.

---

## 5. Twist: **Coach Mode**
Toggle before betting. Shows the basic-strategy move for the active hand; after each action shows ✓/✗; end of round shows "Coach score 3/4"; history shows coach accuracy per round.

| Owner | Part of the twist |
|---|---|
| P1 | `recommend(hand, dealerUpCard, allowed)` in blackjack-core (S17 basic strategy table, fallback when move not allowed) + coach state in RoundView |
| P2 | Hint chip on the table, ✓/✗ feedback animation, end-of-round score |
| P3 | Store `coachScore` on payout transactions (`metadata` jsonb) |
| P4 | Coach toggle in lobby + coach accuracy column in history |

**Visible success criterion:** with Coach ON, playing a hard 16 vs dealer 10 shows "Hit" as recommended, standing shows ✗, and the history row shows the round's score.

---

## 6. Timeline (T = start of build; Saturday 09:30)

### T+0:00 – 0:15 · Scaffold + contracts (everyone, in parallel)
| Owner | Session does | Subagents in parallel |
|---|---|---|
| Scaffolder (David) | `create-turbo`, pnpm workspace, 3 apps + 5 packages empty but running, `.env.example`, push | — |
| P3 | Writes `packages/contracts` from section 3 (zod), shares on screen, team approves | `general-purpose`: Drizzle schema `casino` + Neon DB |
| P1 | — | `game-developer`: `blackjack-core` TDD from checklist §4 (pure TS, no deps, start immediately in its own folder) |
| P4 | Turns §10 palette/fonts into `packages/theme` tokens (validate contrast with `ui-ux-pro-max`); starts lobby art prompts | — |
| P2 | Generates the empty-table background (§10 assets) and builds pixel card + chip components | `frontend-developer`: Motion prototypes (deal, flip, chip stack) on a mock RoundView over the background |

### T+0:15 – 1:20 · Build 1 → rough journey working end-to-end
- P3: `/accounts`, `/deposits`, `/bets`, `/payouts`, `/transactions` with idempotency + atomic debit. Vitest on PGlite for money rules.
- P1: `apps/game` rounds + actions for **Hit/Stand only**, `ENGINE_MODE=mock` until engine is up, then real.
- P2: Table screen consuming RoundView from a fixture; then wired to `/api/game`.
- P4: Sign-up/login (username → cookie), lobby with balance, deposit form, history table, `/play` mounting `<GameTable/>`, `/api/game/*` and `/api/wallet/*` proxies.
- **T+1:15 integration gate:** one real round, balance changes, history shows bet + payout.

### T+1:20 – 1:30 · Break / workflow exchange — show one AI success or failure, fix blockers.

### T+1:30 – 2:25 · Build 2 → full rules, checks, twist
- P1: Double, Split (incl. split aces), naturals, dealer S17, persisted processed actions, coach `recommend()`.
- P2: Two-hand layout, active-hand highlight, double/split buttons from `allowedActions`, result banners, coach overlay, win confetti.
- P3: Retry/duplicate tests, insufficient-funds tests, `metadata.coachScore`, `pnpm smoke` script (owns it; others add cases).
- P4: Balance refresh after every action/settle, coach toggle + history column, error toasts (402 etc.), README startup.

### T+2:25 – 2:40 · Peer playtest (another team plays, reports one issue)
### T+2:40 – 3:00 · Critical fixes, `pnpm check`, `/code-review` per owner, demo prep

---

## 7. Demo-ready checks (`pnpm check`)
- [ ] Core flow: account, deposit, bet, play, result, balance, history (smoke script)
- [ ] Rules: flexible aces, naturals (both/one), bust, push, dealer soft 17 (core unit tests)
- [ ] Double: one extra stake, exactly one card, no more actions
- [ ] Split: two hands, correct stakes/results, no re-split, split aces one card
- [ ] Money: insufficient funds leaves state unchanged; same request twice → no extra card, debit or payout
- [ ] Twist: coach hint + score visible in game and history

## 8. Known limitations (fill before demo)
- Username-only auth (no password) — workshop scope.
- Single table, single player per round.

---

## 9. Animation choice

**Use Motion (`motion/react`, formerly Framer Motion) on DOM/SVG cards, not Skia.**

| Option | Quality | Cost in 3h | Verdict |
|---|---|---|---|
| **Motion** | Springs, `layoutId` shared transitions (shoe → hand), `AnimatePresence` for exits, 3D flips with CSS `rotateY` | Minutes; works with Tailwind and React 19 | ✅ Use |
| `canvas-confetti` | Win/blackjack celebration | 2 minutes | ✅ Add |
| GSAP (free) | Excellent timelines | Imperative API, fights React state | Only if someone already knows it |
| PixiJS v8 / `@pixi/react` | Real game canvas, particles, filters | Asset pipeline + no DOM/a11y; hours | ❌ Not for 3h |
| React Native Skia (web) | Top-tier, but on web loads CanvasKit WASM (~3 MB), separate render tree, no Tailwind | Setup + debugging easily eats Build 1 | ❌ Your instinct is right: too slow here |

Recipes for P2:
- **Deal:** each card `motion.div` with `layoutId={cardKey}` starting at shoe position; stagger 120 ms; spring `{ stiffness: 260, damping: 24 }`.
- **Hole card flip:** two faces with `backface-visibility: hidden`, animate `rotateY 180 → 0` when the server reveals it (front face only rendered once RoundView includes the card — never before).
- **Chips:** `animate` y-offset stack; on payout fly to balance with `layoutId`.
- **Balance:** `animate(from, to, { onUpdate })` count-up.
- **Result:** banner scale-in + `canvas-confetti` on win/blackjack; subtle shake on bust.
- Respect `prefers-reduced-motion` (Motion `useReducedMotion`).
- Cards drawn as SVG/CSS (rank + suit glyph) — no image assets to license or load.
- Pixel feel: card flip and chip drops use stepped timing (`ease: steps(4)` via CSS or Motion keyframes with `times`) instead of smooth springs; deal can stay a spring.

---

## 10. Visual direction: Voxel Castle

Reference: `docs/reference/table-voxel-castle.jpg` — every UI agent prompt must include *"Read docs/reference/table-voxel-castle.jpg and PLAN.md §10 first."*

**Concept:** a blocky (Minecraft-like) medieval throne hall at night. The dealer is a crowned voxel king behind a green-felt table framed in wood blocks; torches, red carpets, stone pillars; gold-framed HUD.

**Do not** use the word "Minecraft", its logo, textures, fonts or mobs, and do not copy the dragon sigil from the reference (it resembles a TV-series house crest). Make our own sigil: a pixel "21" crown. Call the style "voxel" / "blocky".

### Palette (`packages/theme`)
| Token | Hex | Use |
|---|---|---|
| `felt` / `felt-dark` | `#2E6B3A` / `#1E4A28` | Table surface, felt shading |
| `wood` / `wood-dark` | `#7A4E2A` / `#4A2E17` | Table rail, panels, buttons |
| `stone` / `stone-dark` | `#4A4A55` / `#2B2B33` | Page background, cards in lobby |
| `carpet` | `#7E1C1C` | Accents, danger, bust |
| `gold` / `gold-light` | `#C9973A` / `#F2CF6B` | Frames, balance, primary buttons, win |
| `torch` | `#FFB347` | Glow, highlights, active hand ring |
| `parchment` | `#F1E6CC` | Card faces, scroll/history backgrounds |
| `ink` | `#1A1410` | Text on parchment |

### Type (Google Fonts)
- Display / HUD numbers: **Pixelify Sans** (600–700).
- Small labels and numbers in tables: **Silkscreen** (≥ 12px) — or **VT323** if it reads better on cards.
- Long text (rules, README in UI): Pixelify Sans 400, ≥ 16px. No all-caps body text.

### Building blocks (pure CSS, no image libraries)
- **Blocky frame:** `border-radius: 0`, 4px solid border + `box-shadow: inset -4px -4px 0 rgba(0,0,0,.35), inset 4px 4px 0 rgba(255,255,255,.15)` → bevelled block.
- **Gold HUD pill** (balance, top-right): wood fill, gold border, coin icon (pixel SVG).
- **Cards:** parchment face, 2px ink border, pixel suit glyphs (SVG, 8×8 grid scaled with `image-rendering: pixelated`), back = carpet red with gold "21" crown.
- **Chips:** stacked pixel discs (red / green / gold / black) built from divs; bet circle = gold ring on felt.
- **Player seat:** one seat at the bottom centre (brief = one player vs dealer). Pixel avatar in a gold circle, balance pill below. On split, two card spots side by side; active hand gets a `torch` glow ring.
- **Buttons (Hit / Stand / Double / Split):** wood blocks with gold text, pressed state shifts 2px down and drops the bevel; disabled = stone.
- **Ambient motion:** torch flicker (CSS keyframes on opacity/brightness, 1.2 s, random delays), dealer idle bob (2 px, 2 s). Disabled under `prefers-reduced-motion`.

### Assets (P2 game, P4 lobby)
Claude Code cannot generate images; use an image generator outside the repo and save to `packages/game-ui/assets/` or `apps/web/public/`:
1. `hall-bg.webp` — the reference scene **without table contents and without other players** (empty felt, dealer king present). Cards, chips, HUD are DOM layers positioned in `%` on top.
2. `dealer-king.webp` — optional separate layer for the idle bob.
3. `avatar-*.webp` — 4 pixel portraits for the account avatar picker.
4. `lobby-bg.webp` — castle gate / throne hall entrance for the website.

Fallback if art is late: CSS-only table (felt gradient + wood-block rail) over a dark stone background — the game must never be blocked on art.

### Website (P4) in the same world
- Lobby = castle gate, "Enter the hall" CTA, coach toggle.
- Wallet = treasury chest panel; deposit buttons as gold coin stacks (+50 / +100 / +500 / custom).
- History = parchment ledger scroll: date, round, hand, type, amount (+ gold / − carpet red), balance after.
- Same HUD balance pill as the game so the transition into `/play` feels seamless.

### Optional twist alternative suggested by the reference: **Boss Fight**
The top bar in the reference is a boss health bar. The dealer king has HP (e.g. 100); every winning hand deals damage = payout, losses heal him. Beat the king to earn a "Kingslayer" badge in history. Same split of work as Coach Mode (core computes damage, UI shows bar + hit shake, engine stores it in metadata, website shows badge). Team picks **one**: Coach Mode or Boss Fight.
