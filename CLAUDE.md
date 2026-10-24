# 21Jack — instructions for every AI session

- Read `PLAN.md` before starting. Contracts live in `packages/contracts` — import types from there; do not redefine payloads.
- Work only inside the folders your owner owns (README table). If another part needs a change, tell its owner instead of editing it.
- Changes to `packages/contracts` need the team's agreement; P3 commits them.
- UI work: read `docs/reference/table-voxel-castle.jpg` and `PLAN.md` §10, and use the tokens/utilities in `packages/theme/theme.css` (`voxel-block`, `voxel-pressed`, `gold-frame`, `torch-flicker`, colors `felt`, `wood`, `gold`, ...). Never use the word "Minecraft" or its assets.
- Agents `frontend-developer` and `game-developer` mention a "context-manager": it does not exist here. Skip that step and use PLAN.md + contracts as context.
- Browser code never calls game/engine directly and never sees `SERVICE_KEY`. Only `apps/game` decides cards; only `apps/engine` changes balances.
- Integer credits only. Every money write uses the idempotency keys from `@21jack/contracts`.
- Before saying something is done, run `pnpm check`.
- Code and comments in English.
