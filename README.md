# 21Jack — Voxel Castle Blackjack

Blackjack AI Challenge (Miami, Team 3). Fictional credits only.

## Start

```bash
pnpm install
cp .env.example .env      # fill DATABASE_URL (Neon) and SERVICE_KEY
pnpm dev                  # web :3000, game :3001, engine :3002
```

Open http://localhost:3000 — `GET /api/health` shows whether game and engine are reachable.

## Checks

```bash
pnpm check                # typecheck + unit tests (rules, game service, engine money rules)
pnpm smoke                # end-to-end through the web API (needs `pnpm dev` running)
```

Leave `DATABASE_URL` empty to run on embedded Postgres (PGlite) stored in `.data/`; set it to a Neon URL to use Postgres.

UI states preview without playing: http://localhost:3000/dev/table

## Layout and owners

| Path | What | Owner |
|---|---|---|
| `apps/web` | Next.js lobby, account, wallet, history, `/play`, `/api/*` proxies | P4 |
| `apps/game` | Hono game service: rounds, deck, actions, hidden cards | P1 |
| `apps/engine` | Hono casino engine: accounts, balances, bets, payouts, history | P3 |
| `packages/contracts` | zod schemas and types shared by everyone | P3 |
| `packages/blackjack-core` | Pure blackjack rules | P1 |
| `packages/game-ui` | Table UI and animations (Motion) | P2 |
| `packages/theme` | Voxel Castle Tailwind tokens | P4 |

Plan, contracts and visual direction: [PLAN.md](PLAN.md).

## Known limitations

- Username-only login (no password) — workshop scope.
- One player per table; the deck is reshuffled every round.
- Game and engine keep in-process locks, so each service must run as a single instance.
- `/dev/table` is not gated in production.
- Coach Mode is a stretch goal: `recommend()` exists in blackjack-core but is not shown in the UI yet.
