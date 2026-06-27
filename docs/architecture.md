# Architecture

A Next.js 15 (App Router) app with a SQLite content database, shipped as one
Docker container. The entire UI is an iPod Classic; there are no conventional
web pages besides the `/itunes` stub.

```
Browser ──► <Ipod/> (client)                    Next.js route handlers
  ClickWheel / keyboard                            /api/content/[section]
        │ IpodInput events                         /api/articles[/slug]
        ▼                                          /api/youtube
  ipodStore (Zustand) ◄── dataSources.ts ──fetch──►    │
        │ stack of Frames                              │ Drizzle ORM
        ▼                                              ▼
  ScreenRouter ──► views (SplitMenu/List/CoverFlow/…)  SQLite (data/ipod.db)
                                                        ▲
                                     fetchers (YouTube RSS, Substack RSS)

  <video> ◄──/api/video/[file] (Range streaming)──── data/videos/ugg/*.mp4
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
source pauses the others (there are three: `youtube`, `soundcloud`, `ugg` —
the local-video stage below). While media is loaded, the **prev/next wheel
buttons are transport controls** (selection-stepping otherwise), and the
status bar shows a ▶ flag. `NowPlayingView` is the SoundCloud card — track
counter, title (sliding in from the skip direction), a simulated EQ
visualizer (`scaleY`-only; real spectrum data is unreachable across the
iframe origin) and the progress bar; `VideoView` is just a backdrop under
the raised stages.

**Progress & scrubbing**: each player wrapper exposes `…SeekBy(seconds)` and
reports position/duration into the store's `progress` slice (SoundCloud via
the widget's `PLAY_PROGRESS` event, YouTube via a 500 ms poll while playing,
the local video via `timeupdate`). Like the real iPod, **a center press on a
playback frame toggles scrub mode** (`scrubbing` + `scrubNonce` in the
store) — the wheel then seeks ±5 s (`SEEK_STEP_SEC`) with an optimistic
progress nudge, MENU dismisses the scrubber before popping, and play/pause
lives on Space / the wheel's bottom zone. `ScrubOsd` (PlayersLayer) overlays
the video stages with the bar and `m:ss` / `-m:ss` times, and dozes off
(exiting the mode) after 3 s idle; the Now Playing card draws its own bar
and shares the same store state.

## Local video: UGG Chronicles (the Instagram section)

The Instagram section plays the UGG Chronicles episodes from **on-device
files** instead of embeds. The pieces:

- **Import** (`npm run import:ugg -- --source "<UGG Project dir>"`,
  `scripts/import-ugg.ts` + pure helpers in `scripts/ugg-lib.ts`): fixes the
  export's UTF-8-as-latin-1 mojibake, recovers each episode's posting
  timestamp from the official Instagram export (title match, then
  caption-body match for the 2021 IGTV era; hard-fails rather than guess),
  **moves** the MP4s to `data/videos/ugg/ugg-<ep>.mp4` (gitignored, ~2.7GB
  never enters git), and writes the committed seed
  `src/data/seed/ugg.json`. Idempotent — re-run it when new episodes land.
- **Serving** (`app/api/video/[file]/route.ts`): streams with HTTP **Range**
  support (Safari requires 206s; Next's `public/` serving doesn't reliably
  honor Range in dev). Filenames are allowlisted (`ugg-N.mp4`), and the dir
  is overridable via `VIDEOS_DIR` (Docker: `/data/videos/ugg`). A missing
  file 404s and the view shows "Video unavailable" — menus never blank.
- **Menu** (`ugg` dataSource): year rows ("UGG Chronicles - 2025", newest
  first) → episode rows ("Ep. 204 | <name>", newest first). Selecting plays
  with `source: 'ugg'` and the **year as the queue**: prev/next skip
  episodes, `ended` auto-advances, center toggles play/pause.
- **Player** (`UggStage`, mounted once inside `PlayersLayer`): a persistent
  `<video>` with the same contract as the YouTube stage — revealed (opacity)
  only on the episode's video frame, **audio keeps playing behind the
  menus** after MENU. The element is driven through
  `src/lib/players/uggVideo.ts`, and `playTrack` calls `uggLoad()`
  **synchronously inside the user's gesture** — Safari refuses unmuted
  `play()` from a later React effect, which would force a second press.
  `VideoView` is just the black backdrop under the stage.
- **Caption overlay**: a wheel tick bumps `captionNonce`, which slides up a
  translucent panel with the original Instagram caption; further ticks
  scroll it (the video frame's `scrollOffset`/`maxScroll`, one text line per
  tick) and ~3 s of idle fades it out. All animation is transform/opacity.
- **Video Fullscreen** (Settings toggle, like the real iPod's Videos →
  Settings → Fullscreen): most episodes are portrait phone videos that
  letterbox tiny under `object-fit: contain`. With the setting on, a
  portrait episode fills the stage width (`height: auto`, clipped by the
  stage) and the **wheel pans the crop** instead of scrolling the caption
  (the frame's `panOffset`/`maxPan`, `PAN_STEP` px per tick; toggle off to
  read long captions). `UggStage` measures `videoWidth/videoHeight` on
  `loadedmetadata` and reports `setMaxPan` (0 for landscape — those keep
  caption scrolling); a fresh measurement starts the crop centered. Scrub
  mode still wins the wheel, and panning is `translateY` only. YouTube
  videos are untouched (the iframe can't be cropped).

## Navigation: the frame stack

`ipodStore` holds `stack: Frame[]`. A `Frame` is `{ key, title, view, items,
payload, selectedIndex, scrollOffset, maxScroll, panOffset, maxPan,
flipped }`. Pushing happens
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

Two patterns worth copying: **About** (home menu) is a pure static node — a
`textReader` `payload` with no table or API behind it. **Recipes** (under
Misc) is the full data-driven shape: the builder groups rows into category
sub-lists (Food/Baking/Drinks/Tips & Tricks), and each recipe opens a
scrollable `textReader` detail whose optional `sourceUrl` renders the
"View Original" footer for recipes saved from the web.

The simplest data-driven shape is the **group-then-scroll list** shared by
**Concerts** (years → shows) and **List** (two headed groups → entries): the
builder buckets `(category, name, sortOrder)` rows into a fixed set of groups,
and each group `onSelect`s a `kind: 'items'` `list` of plain label rows. Copy
that when a section is just headed lists of one-liners.

Split-menu preview pane: a node's static `previewImage` is the default, but
for the image-backed coverflow sections (guitars/photos/kitchen)
`SplitMenuView` lazily loads the section's images once per session and shows
a random one on every highlight (static image as the fallback while loading).

**To add a new section:**

1. Add a table to `src/lib/db/schema.ts`, run `npm run db:generate`.
2. Add seed data in `src/data/seed/` and a `SeedUnit` in `src/lib/seed/seedDb.ts`.
3. Expose it in `app/api/content/[section]/route.ts` (one line in `sections`).
4. Add a builder in `dataSources.ts` and a `MenuNode` in `tree.ts`.
5. Update the tree integrity test and add an e2e check; update this doc.

No manual reseed is needed after deploy — the new `SeedUnit` carries its own
fingerprint, so the deploy-time sync fills the new table on the next boot (see
Data layer below).

## Data layer

- **better-sqlite3 + Drizzle** (`src/lib/db/`). Synchronous, no engine binary;
  migrations are plain SQL in `drizzle/`, applied by `scripts/migrate.ts` /
  the Docker entrypoint.
- **Seeding** (`scripts/seed.ts` → `src/lib/seed/seedDb.ts`): per-table and
  self-syncing. Each table is a `SeedUnit` with a `fingerprint` (sha256 of its
  committed seed source); `syncSeed` runs on every boot and re-seeds only the
  units whose fingerprint changed — recorded in the `seed_meta` table — so a
  new section or edited seed file lands on the next deploy with **no manual
  reseed**. A unit whose source file is absent (partial checkout) is left
  untouched, never wiped. `--force` clears everything (fingerprints included)
  and rebuilds from scratch. Sources are committed under `src/data/seed/` —
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
gradients + inline SVG, so themes swap ~9 variables and stay retina-sharp.
Only the device themes: the page backdrop and hint text (`--backdrop`,
`--hint-color`) are defined once on `:root` and never overridden, and the
screen content never themes either (real iPods only varied the hardware
color). Persistence: `localStorage` + cookie; an inline script in
`app/layout.tsx` applies the theme pre-hydration to avoid flashes.

The Settings menu (`settingsItems` in `ipodStore.ts`) also holds the
pennguytweets order toggle (newest-first vs shuffled) — a `tweetShuffle`
store flag persisted in `localStorage` and re-read by the `tweets()` builder
on every visit to the list, so each shuffled visit deals a fresh order —
and the **Video Fullscreen** toggle (`videoFullscreen`, also
`localStorage`-persisted), which crops portrait UGG episodes to fill the
screen with wheel panning (see the UGG section).

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

## Deployment (Fly.io)

Production runs the same Docker image on a single Fly machine
(`fly.toml`; app `dipen-ipod-classic`, region `iad`) with a volume named
`ipod_data` mounted at `/data` — the entrypoint migrates + seeds it on first
boot exactly like local Docker, and a non-empty DB is never re-seeded, so the
volume's content survives `fly deploy`. **Never scale past one machine**:
better-sqlite3 writes a local file and the volume belongs to one machine.

- Deploy: `fly deploy` (builds the Dockerfile remotely).
- Trial vs production: `fly.toml` ships in trial mode
  (`auto_stop_machines = "stop"`, `min_machines_running = 0`); for production
  flip to `"off"` / `1` so there are no cold starts.
- Videos: the UGG MP4s are not in the image; upload them once with
  `fly ssh sftp` into `/data/videos/ugg` (`VIDEOS_DIR` already points there).
- Domain: `fly certs add <domain>`, then at the DNS host an A/AAAA record on
  the apex to the IPs from `fly ips list` and a CNAME `www` →
  `dipen-ipod-classic.fly.dev`, all DNS-only (no proxy) so Fly can issue certs.
