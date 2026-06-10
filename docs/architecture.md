# Architecture

A Next.js 15 (App Router) app with a SQLite content database, shipped as one
Docker container. The entire UI is an iPod Classic; there are no conventional
web pages besides the `/itunes` stub.

```
Browser ──► <Ipod/> (client)                    Next.js route handlers
  ClickWheel / keyboard                            /api/content/[section]
        │ IpodInput events                         /api/articles[/slug]
        ▼                                          /api/youtube
  ipodStore (Zustand) ◄── dataSources.ts ──fetch──►/api/tweets/random
        │ stack of Frames                              │ Drizzle ORM
        ▼                                              ▼
  ScreenRouter ──► views (SplitMenu/List/CoverFlow/…)  SQLite (data/ipod.db)
                                                        ▲
                                     fetchers (YouTube RSS, Substack RSS)
```

## The 320×240 logical screen

Every view is laid out in a fixed **320×240 px coordinate system** — the real
6th-gen Classic's resolution. `Screen.tsx` measures the physical cutout with a
ResizeObserver and applies `transform: scale()`. Write view CSS in logical
pixels once; never query the viewport inside a view.

## Input pipeline

1. `ClickWheel.tsx` captures pointer events. A press that moves < 8 px is a
   tap and resolves to a zone (`menu`/`prev`/`next`/`playPause`/`center`,
   `zoneAt` in `src/lib/input/wheel.ts`). A longer drag is a scrub: pointer
   angles accumulate (`accumulate`) and emit one signed tick per 18°
   (`DETENT_DEG` — the tuning knob for wheel feel).
2. `src/lib/input/keyboard.ts` maps keys to the same `IpodInput` events.
3. `ipodStore.handleInput` interprets events **per the active view**: menus
   move the selection, text views scroll by `SCROLL_STEP`, coverflow flips on
   select, media views treat select as play/pause. prev/next skip tracks
   whenever media is loaded; otherwise they step the selection.
4. Every effective tick fires `clicker.tick()` (`src/lib/audio/clicker.ts`):
   a synthesized Web Audio click + `navigator.vibrate(5)`. The AudioContext is
   resumed on the first user gesture (iOS requirement; iOS has no vibration).

All wheel math is pure and unit-tested — tune `DETENT_DEG` fearlessly.

## Persistent players (media survives navigation)

Ported from the old site's `ipod.js`: **players are created once and never
unmounted** — unmounting or moving an iframe reloads it, which kills
playback. `src/components/ipod/PlayersLayer.tsx` (mounted once in
`Screen.tsx`) owns both:

- **YouTube** (`src/lib/players/youtube.ts`): one `YT.Player` (IFrame API) in
  a stage covering the screen body. The stage is *revealed* (opacity +
  z-index, never `display:none`) only while the top frame is the YouTube
  now-playing frame; behind the menu the audio keeps playing. `onStateChange`
  reports play/pause to the store and auto-advances on end.
- **SoundCloud** (`src/lib/players/soundcloud.ts`): a permanently off-screen
  audio-only widget. On READY, `getSounds()` yields the track list (reversed
  to ascending — track ids keep the widget's index for `skip()`), which the
  `soundcloud` dataSource awaits (6 s timeout → seeded fallback rows that
  link out). `PLAY/PAUSE/FINISH` events report state back.

The store's `playback` slice (`{ source, index, playing, queue }`) is the
single source of truth: `playTrack` pushes (or in-place updates) the
now-playing frame, `skipTrack` moves through the queue, and starting one
source pauses the other. While media is loaded, the **prev/next wheel
buttons are transport controls** (selection-stepping otherwise), and the
status bar shows a ▶ flag. `NowPlayingView` is a passive card (EQ bars) over
the hidden SoundCloud audio; `VideoView`'s YouTube branch is just a backdrop
under the raised stage (its Instagram-reel branch still renders inline).

## Navigation: the frame stack

`ipodStore` holds `stack: Frame[]`. A `Frame` is `{ key, title, view, items,
payload, selectedIndex, scrollOffset, maxScroll, flipped }`. Pushing happens
via `pushNode` (menu tree), `pushItems` (pre-built lists, e.g. a year of
videos), or `pushDetail` (article/video/photo payloads). MENU pops (after
unflipping a flipped cover). `ScreenRouter` watches the top frame's `key` and
runs the 180 ms slide animation, rendering the outgoing frame in a second
layer until the animation ends. Note: item loads replace the top frame object
*without* changing its `key` — only `key` changes are navigations.

## The menu tree (extensibility core)

`src/lib/menu/tree.ts` declares the whole site as a `MenuNode` tree. A node
either has `children` (static submenu), a `dataSource` (rows loaded from the
API), or a `payload` (leaf content). `src/lib/menu/dataSources.ts` maps each
`DataSourceKey` to an API fetch and converts rows into `FrameItem`s, including
what selecting them does (`SelectSpec`: push a node, push built items, open a
detail view, follow an external link, or run an action).

**To add a new section:**

1. Add a table to `src/lib/db/schema.ts`, run `npm run db:generate`.
2. Add seed data in `src/data/seed/` and wire it in `src/lib/seed/seedDb.ts`.
3. Expose it in `app/api/content/[section]/route.ts` (one line in `sections`).
4. Add a builder in `dataSources.ts` and a `MenuNode` in `tree.ts`.
5. Update the tree integrity test and add an e2e check; update this doc.

## Data layer

- **better-sqlite3 + Drizzle** (`src/lib/db/`). Synchronous, no engine binary;
  migrations are plain SQL in `drizzle/`, applied by `scripts/migrate.ts` /
  the Docker entrypoint.
- **Seeding** (`scripts/seed.ts` → `src/lib/seed/seedDb.ts`): idempotent;
  `--force` wipes first. Sources are committed under `src/data/seed/` —
  including the 10 saved article HTML files parsed by `parseArticle.ts`
  (handles both Django `{% filter linebreaks %}` plain text and raw HTML).
  The old Django repo is **not** needed at build or runtime.
- **Live fetchers** (`src/lib/fetchers/`): YouTube channel RSS (6 h staleness)
  and Substack RSS (24 h), tracked in the `fetch_meta` table. Both are
  strictly additive upserts with network failures swallowed — the seeded data
  is always a complete fallback. Substack dedup matches slug, URL, *and*
  normalized title (cross-posts), and excludes Substack's default
  "coming-soon" post.

## Images

The screen's largest physical rendering is ~800px wide (380px device at ~2×
DPR), so **all images are committed pre-optimized**: WebP, max 800px long
edge, quality 80 (`public/images/**` is ~3MB total). The committed
`scripts/optimize-images.ts` (sharp) does the conversion and deletes the
heavy original.

**Adding an image:** drop the original under `public/images/...`, run
`npm run optimize:images`, reference the resulting `.webp` path in seed
data. There is no runtime optimizer (`next/image` is deliberately unused —
right-sized static WebP + plain `<img loading="lazy" decoding="async">` is
simpler, Docker-friendly, and predictable inside the scaled 320×240 screen).

## Theming

Two skins — `silver` (default) and `black` — are CSS custom property sets on
`html[data-theme]` (`app/globals.css`). The device chrome is pure CSS
gradients + inline SVG, so themes swap ~10 variables and stay retina-sharp.
The screen content itself never themes (real iPods only varied the hardware
color). Persistence: `localStorage` + cookie; an inline script in
`app/layout.tsx` applies the theme pre-hydration to avoid flashes.

## Responsive

One `<Ipod/>` component; differences are CSS-only (`Ipod.module.css`).
Desktop centers a ~380 px device with a keyboard-hint strip and an `/itunes`
corner link. Mobile (`max-width: 767px` or coarse pointer) fills the viewport
with safe-area padding. `/itunes` is a stub for the future desktop companion.

## Testing

- **Unit** (`tests/unit/`): wheel math (incl. ±π wraparound), store
  transitions and clamping, menu tree integrity, article template parsing,
  feed parsing against real fixture XML in `tests/fixtures/`.
- **Integration** (`tests/integration/`): seeding, fetcher caching/dedup/
  fallback, and API route handlers — all against in-memory SQLite with
  migrations applied; network stubbed.
- **E2E** (`e2e/`, Playwright): desktop keyboard project and mobile
  touch-viewport project (tap zones, circular scrub via synthesized pointer
  arcs, scrub-vs-tap discrimination). `npm run e2e` builds, seeds, and boots
  the production server itself.

## Docker

Multi-stage `Dockerfile` on `node:22-bookworm-slim` (glibc → better-sqlite3
prebuilds). The runner gets the Next standalone output, the esbuild-bundled
seed script, migrations, and seed JSON. The entrypoint migrates + seeds an
empty `/data` volume, then runs `server.js`. Pin Node 22 everywhere
(`.nvmrc`, Dockerfile) so native module ABIs match.
