# AGENTS.md

Guidance for AI coding agents working on this repo. It complements
`CLAUDE.md` (same rules, summarized here) and `docs/architecture.md` (system
design — read it before structural work).

## What this is

A personal website rendered entirely as an iPod Classic. One Next.js app,
one SQLite file, one Docker container. The iPod UI is a 320×240 logical
screen driven by a Zustand navigation stack and pure click-wheel math.

## Definition of done — check before finishing any task

1. `npm run typecheck` passes.
2. `npm test` passes (unit + integration; offline, fast).
3. `npm run e2e` passes if you touched UI, navigation, or APIs.
4. Tests covering the change were added/updated — not just left green.
5. `docs/architecture.md` / `README.md` / `CLAUDE.md` updated if behavior,
   commands, env vars, or structure changed.
6. New migrations committed (`npm run db:generate`) when `schema.ts` changed.
7. No secrets in code; new env vars documented in `.env.example`.

## Files to touch, by change type

| Change | Files |
| ------ | ----- |
| New content section | `src/lib/db/schema.ts`, `drizzle/` (generated), `src/data/seed/`, `src/lib/seed/seedDb.ts`, `app/api/content/[section]/route.ts`, `src/lib/menu/dataSources.ts`, `src/lib/menu/tree.ts`, `tests/unit/tree.test.ts`, `e2e/ipod.spec.ts`, `docs/architecture.md` |
| New view type | `src/lib/menu/types.ts` (ViewType), `src/components/ipod/views/`, `ScreenRouter.tsx`, input semantics in `ipodStore.handleInput`, `tests/unit/store.test.ts`, e2e |
| Wheel feel / input | `src/lib/input/wheel.ts` (pure; covered by `tests/unit/wheel.test.ts`) |
| Live data source | `src/lib/fetchers/`, `fetch_meta` staleness, `tests/integration/fetchers.test.ts` + fixture XML in `tests/fixtures/` |
| Theming | CSS custom properties in `app/globals.css` only |

## Invariants (do not break)

- Views are laid out in logical 320×240 px; `Screen.tsx` owns scaling.
- Only `transform`/`opacity` are animated.
- Fetchers are additive-with-fallback; seeded content is never overwritten
  or deleted by a feed.
- The menu tree is the single source of site structure; don't hand-wire
  navigation in components.
- Node 22 everywhere (`.nvmrc`, Dockerfile) — better-sqlite3 ABI must match.

## Verifying UI work

Prefer a Playwright check over screenshots-by-hand: the e2e suite boots its
own seeded production server (`playwright.config.ts#webServer`). For ad-hoc
inspection: `npm run seed && npm run dev`, then drive with the keyboard
(arrows / Enter / Esc / Space).
