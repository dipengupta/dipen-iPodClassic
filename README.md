# dipen-ipod-classic

Dipen's personal website, rebuilt as a 1:1 **iPod Classic**. Spin the click
wheel (or use the arrow keys) to browse guitars and photos in Cover Flow,
read articles, flip through a 64-mug collection, watch YouTube videos, and
play SoundCloud tracks — all inside a 320×240 screen.

## Quickstart

### Local development

```bash
npm install
npm run seed      # creates + populates data/ipod.db
npm run dev       # http://localhost:3000
```

### Docker

```bash
docker compose up --build   # http://localhost:3000
```

The container applies migrations and seeds an empty database on first boot;
content persists in the `ipod-data` volume.

## Controls

| Action          | Touch (mobile)              | Keyboard (desktop)    |
| --------------- | --------------------------- | --------------------- |
| Scroll          | Drag a circle on the wheel  | ↑ / ↓                 |
| Select / flip   | Tap the center button       | Enter                 |
| Back (MENU)     | Tap the top of the wheel    | Esc, Backspace, or M  |
| Prev / Next     | Tap wheel left / right      | ← / →                 |
| Play / Pause    | Tap the bottom of the wheel | Space                 |

Prev/Next skip tracks while something is playing (media keeps playing when
you browse away — like a real iPod); otherwise they step the selection.

Scrolling clicks like the real thing (synthesized Web Audio tick) and vibrates
on devices that support it (Android). The theme switcher in `Extras →
Settings` swaps between the silver and black iPod.

## Commands

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Next.js dev server                            |
| `npm run build`      | Production build (standalone output)          |
| `npm run seed`       | Migrate + seed the SQLite DB (skip if seeded) |
| `npm run seed:force` | Wipe and reseed                               |
| `npm run db:generate`| Generate a Drizzle migration from schema.ts   |
| `npm test`           | Vitest unit + integration tests               |
| `npm run e2e`        | Playwright end-to-end suite (builds + seeds)  |
| `npm run typecheck`  | `tsc --noEmit`                                |

## Environment

Copy `.env.example` to `.env` if you need overrides. `DATABASE_PATH` points at
the SQLite file (defaults to `./data/ipod.db`; `/data/ipod.db` in Docker).
Secrets live in `.env` only — never in code.

## Data: live vs. seeded

| Content                  | Source of truth                                            |
| ------------------------ | ---------------------------------------------------------- |
| YouTube videos           | Seeded archive + live channel RSS merge (6h cache)        |
| Articles                 | 10 seeded full-text articles + Substack RSS additions (24h cache) |
| SoundCloud               | Live track list + audio via the hidden persistent widget   |
| Instagram reels, tweets  | Seeded (no reliable public API); refresh via data exports  |
| Guitars, mugs, places, timeline, links | Seeded from `src/data/seed/*.json`          |

Live fetchers never leave the screen blank: on any failure they fall back to
the seeded data and retry on the next staleness check.

See [docs/architecture.md](docs/architecture.md) for how it all fits together
and how to add a new section.
