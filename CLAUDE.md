# CLAUDE.md

Personal website that is a 1:1 iPod Classic replica. Next.js 15 + TypeScript +
CSS Modules, SQLite via better-sqlite3/Drizzle, Zustand for the iPod state.
Read `docs/architecture.md` before structural changes.

## Commands

```bash
npm run dev          # dev server (seed first if data/ipod.db is missing)
npm run seed         # migrate + seed SQLite; seed:force to wipe and reseed
npm run db:generate  # regenerate drizzle/ migrations after editing schema.ts
npm test             # vitest unit + integration (fast, no network)
npm run e2e          # playwright; builds + seeds + serves by itself
npm run typecheck    # tsc --noEmit
docker compose up --build
```

## Hard rules

- **Every feature change updates its tests and docs in the same change**:
  menu/content changes → `tests/unit/tree.test.ts` + an e2e flow +
  `docs/architecture.md`; schema changes → `npm run db:generate` (commit the
  migration) + seed data + integration tests.
- **Never hardcode secrets.** Env vars via `.env` (gitignored); document new
  ones in `.env.example` and README.
- **Screen views are written in 320×240 logical px** and scaled by
  `Screen.tsx`. Never use viewport units or media queries inside
  `src/components/ipod/views/`.
- **Animate transforms/opacity only** (60 fps on a scaled, composited
  screen). No layout-property animations.
- Input logic stays **pure and unit-tested** in `src/lib/input/`; components
  only translate DOM events into those functions.
- Live fetchers must be **additive with seeded fallback** — a network failure
  or empty feed may never blank a view or overwrite seeded content.
- Plain `<img>` is fine inside the logical screen (fixed sizes); keep the
  eslint-disable comment pattern used in existing views.
- **Images are committed pre-optimized** (WebP ≤800px, ~3MB total). Adding
  one: drop it in `public/images/...`, run `npm run optimize:images`,
  reference the `.webp` path. Never commit raw multi-MB photos; never add
  `next/image`/runtime optimization without discussion.

## Adding a content section (the common task)

Follow the 5-step list in `docs/architecture.md` § "The menu tree". In short:
schema table → seed JSON + `seedDb.ts` → `sections` entry in
`app/api/content/[section]/route.ts` → builder in
`src/lib/menu/dataSources.ts` → node in `src/lib/menu/tree.ts` → tests + docs.

## Layout of interest

- `src/lib/menu/tree.ts` — the whole site structure (data-driven)
- `src/lib/store/ipodStore.ts` — navigation stack + input semantics per view
- `src/lib/input/wheel.ts` — wheel math; `DETENT_DEG` tunes wheel feel
- `src/components/ipod/views/` — one component per `ViewType`
- `src/data/seed/` — committed content (JSON + saved article HTML)
- `data/ipod.db` — local SQLite (gitignored; recreate with `npm run seed`)

## Gotchas

- `getDb()` is a `globalThis` singleton (survives dev hot reload); tests
  inject an in-memory DB via `tests/integration/helpers.ts#injectAppDb`.
- Frame identity: replacing the top frame (e.g. items loaded) keeps its
  `key`; `ScreenRouter` treats only `key` changes as navigations.
- `npm run e2e` and `npm run dev` share port 3000 — stop one before the other.
- The X/Twitter table holds `[sample]`-prefixed placeholder tweets until the
  real export is imported (`isSample` flag).
