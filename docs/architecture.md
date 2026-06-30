# Architecture

A Next.js 15 (App Router) app with a SQLite content database, shipped as one
Docker container. The primary UI is an iPod Classic at `/`; a second,
desktop-only "iTunes" view at `/itunes` (see § "Desktop iTunes view") is a
parallel display layer over the same data.

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
   The center and play/pause buttons also have **press-and-hold gestures**
   (`HOLD_MS`, ~500 ms): both `ClickWheel.tsx` and the keyboard listener in
   `Ipod.tsx` arm a hold timer that fires `holdSelect` / `holdPlayPause` and
   suppresses the tap, so a tap and a hold stay distinct.
3. `ipodStore.handleInput` interprets events **per the active view**: menus
   move the selection, text views scroll by `SCROLL_STEP`, coverflow flips on
   select, media views treat select as play/pause. prev/next skip tracks
   whenever media is loaded; otherwise they step the selection. **`holdSelect`
   jumps to Now Playing** (`goToNowPlaying`); **`holdPlayPause` sleeps the
   screen**. A dimmed screen swallows the first input (it only wakes).
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
- **Spotify** (`src/lib/players/spotify.ts`): a hidden `<audio>` element that
  streams Spotify's keyless 30 s preview MP3s (the `audioPreview.url` shipped
  in each playlist's embed feed — no API keys). It reuses the same Now Playing
  card as SoundCloud, so a Music → Recommendations playlist gets the full
  native transport (per-track queue, wheel-skip, real scrubber). Like ugg, the
  store starts it *inside the user's gesture* (`spotifyLoad` in `playTrack`).

The store's `playback` slice (`{ source, index, playing, queue }`) is the
single source of truth — `NowPlayingView` reads the current track live from it,
not from a frame payload. `playTrack(source, queue, index, navigate)` is the
hub: starting one source pauses the others (there are four: `youtube`,
`soundcloud`, `spotify`, `ugg` — the local-video stage below). **`navigate`
controls focus**: an explicit track pick (`kind: 'play'`) navigates to the card,
but `skipTrack` — used by both auto-advance (`onEnded`) **and** the prev/next
transport buttons — passes `navigate: false`, so a track that ends or is skipped
while you're browsing a menu **plays on in the background without yanking you to
Now Playing** (it only swaps in place if you're already on the card). To get
back, the **main menu grows a "Now Playing" item** once a track is loaded
(`ensureHomeNowPlaying`), and **holding the center button** jumps there from
anywhere (`goToNowPlaying`). While media is loaded the status bar shows a ▶
flag. `NowPlayingView` is the audio card (SoundCloud and Spotify, labeled by
source) — track counter, title (sliding in from the skip direction), a calm
simulated EQ (`scaleY`-only; real spectrum data is unreachable across the iframe
origins) and the progress bar; `VideoView` is just a backdrop under the stages.

**Sleep / display-off** (`SleepLayer`, mounted in `Screen.tsx`): holding
play/pause sets `asleep`, and the screen also auto-dims after ~60 s idle (the
Classic's backlight timeout; suppressed over an active video). A near-black
overlay fades in above every stage while audio keeps playing; the first input
only wakes it (`handleInput` swallows that press). `activityNonce` (bumped on
every input) resets the idle timer.

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
Collections) is the full data-driven shape: the builder groups rows into category
sub-lists (Food/Baking/Drinks/Tips & Tricks), and each recipe opens a
scrollable `textReader` detail whose optional `sourceUrl` renders the
"View Original" footer for recipes saved from the web.

**Recommendations** (Music, just above Octavium) shows the mixed-source pattern:
each `recommendations` row is a playlist. Spotify rows open a native track list
(`kind: 'items'`) whose rows `kind: 'play'` through the Spotify Now Playing
card; Apple Music rows (no keyless control path) `kind: 'external'` and
deep-link out. Tracks are committed seed + a keyless additive refresh (below).

The simplest data-driven shape is the **group-then-scroll list** shared by
**Concerts Seen** (years → shows), **List** (two headed groups → entries), and
the **Mug Collection** (States/Cities/Countries/Special → each mug with its
gifter — a plain list beats cover flow for imageless rows): the builder buckets
`(category, name, sortOrder)` rows into a fixed set of groups, and each group
`onSelect`s a `kind: 'items'` `list` of plain label rows. Copy that when a
section is just headed lists of one-liners.

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
- **Live fetchers** (`src/lib/fetchers/`): YouTube channel RSS (6 h staleness),
  Substack RSS (24 h), and Spotify recommendations (6 h), tracked in the
  `fetch_meta` table. All are best-effort with network failures swallowed — the
  seeded data is always a complete fallback. Substack dedup matches slug, URL,
  *and* normalized title (cross-posts), and excludes Substack's default
  "coming-soon" post. Spotify is **keyless**: it parses each playlist's public
  embed page (`__NEXT_DATA__` → track URI, title, artist, 30 s preview MP3) and
  replaces that playlist's tracks only on a successful fetch. Regenerate the
  committed seed (`recommendation-tracks.json`) any time with
  `npm run import:spotify`.

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
the **Video Fullscreen** toggle (`videoFullscreen`, also
`localStorage`-persisted), which crops portrait UGG episodes to fill the
screen with wheel panning (see the UGG section), and a **Click Sound** toggle
(`clickSound`) that drives `clicker.setMuted()` so the wheel ticks can be
silenced (persisted in `localStorage`, restored in `Ipod.tsx`).

## Responsive

One `<Ipod/>` component; differences are CSS-only (`Ipod.module.css`).
Desktop centers a ~380 px device with a keyboard-hint strip and an `/itunes`
corner link. Mobile (`max-width: 767px` or coarse pointer) fills the viewport
with safe-area padding, and the `/itunes` link is hidden.

## Device-aware view selection

On launch the visitor is routed to whichever front-end fits the device — iTunes
on large screens, the iPod on small/touch — instead of always defaulting to the
iPod. `src/lib/device/viewRouting.ts` is the single source of truth; the
selection rule (`preferredView()`):

- **landscape + coarse pointer → iTunes** (the phone-tilt feature),
- **otherwise coarse / `max-width: 767px` → iPod**,
- **otherwise (desktop) → iTunes**.

A user who explicitly switches pins their choice in
`localStorage['ipod-view-pref']`, which overrides the rule so they are never
bounced back. The cross-links carry the intent as a **`?view=` query param**
(`/itunes?view=itunes`, `/?view=ipod`) rather than pinning in an `onClick`: the
param rides in the URL, so it survives the navigation regardless of hydration
timing (an `onClick` can race the click and miss). Both the pre-hydration script
and `useViewSync` read the param, call `pinView()`, and clean the URL.

Two layers apply the same rule, by design:

1. A **pre-hydration inline `<script>` in `app/layout.tsx`** (mirroring the theme
   script) owns **load-time routing**: on every document load it reads the pin +
   media queries and redirects before paint, so neither view flashes. It reads
   `localStorage` fresh on each new document, so it reliably sees the pin a
   cross-link wrote just before navigating. It duplicates the rule as a JS string
   because it can't import — keep it in sync with `viewRouting.ts`.
2. **`useViewSync(current)`** in `Ipod` and `ItunesApp` persists a `?view=` param
   on mount (covers SPA navigations the script can't see) and owns the **live
   two-way tilt**: it listens for `matchMedia('(orientation: landscape)')` changes
   and switches routes as the phone rotates — but only while nothing is pinned.
   This needs only the orientation media query, **not** the gyroscope
   `DeviceOrientationEvent`, so no iOS permission prompt is involved. (It
   deliberately does **not** redirect on mount by device: load-time routing is the
   script's job — a mount redirect would fight a deliberate navigation.)

The two pages can't disagree (both obey one `preferredView`), so there is no
redirect loop. The iTunes CSS `display:none` belt-and-suspenders fallback
(`app/itunes/itunes.module.css`) is scoped to **portrait** so it no longer hides
a landscape phone.

## Desktop iTunes view

`/itunes` is a second, **desktop-only** display of the same content — an
old-school iTunes-7 window — and is deliberately **independent of the iPod**:
nothing under `src/components/ipod/**`, `src/lib/store/**`, `src/lib/players/**`,
or `src/lib/menu/**` is imported or modified. The two views share exactly one
thing: the JSON served by the `/api/...` routes.

- **Two layers, one data spine.** The iPod's `dataSources.ts` is bound to the
  iPod store and player singletons, so iTunes gets its own parallel data layer
  in `src/lib/itunes/`: `loaders.ts` fetches the same routes the iPod uses
  (`/api/content/[section]`, `/api/articles[/slug]`, `/api/youtube`,
  `/api/video/[file]`) — so the live refresh-if-stale + seed fallback in those
  handlers applies identically — and maps rows into the `SectionData`
  view-models in `types.ts`. `catalog.ts` is the single source of truth for the
  sidebar.
- **Sidebar IA** (`catalog.ts` + dynamic playlists): themed sections, each item
  listed once — **MUSIC** (Guitars / YouTube / Instagram / SoundCloud /
  Octavium), **PHOTOS** (Photos / Kitchen Wins), **COLLECTIONS** (Mug Collection
  / Vinyls / Fridge Magnets / Recipes), **WRITING** (Articles / pennguytweets),
  **ABOUT** (Professional / About), **PLAYLISTS** (one row per Recommendations
  playlist, built at runtime — `loadPlaylists()`; Spotify rows open their own
  track list, Apple rows link out), **ODDS & ENDS** (Concerts Seen / List / Wi-Fi
  Names / Links), and **DEVICES → Dipen's iPod** (a `next/link` back to `/`).
  Each entry carries a `unit` noun for the status bar. `ItunesApp` merges the
  static `catalog` with the dynamic playlist entries and passes the list to
  `Sidebar`, which is **drag-resizable** (a divider between it and the main pane).
  The iPod's **Settings is intentionally excluded**; an `itunesCatalog` test
  guards that every iPod section is still surfaced.
- **Layout** (`ItunesApp`): title bar (`Dipen's iTunes`) → **toolbar** (circular
  Apple-style transport buttons + the volume slider on the left, the now-playing
  display kept **dead-center** via equal-width side zones, the Grid/Cover Flow
  toggle on the right for galleries) → body (resizable sidebar + main pane) →
  **status bar** (a live section count, e.g. "16 guitars" / "37 songs", plus an
  artwork-size slider for galleries). The `.window` is larger and `resize: both`.
- **Views** (`src/components/itunes/views/`): `GalleryPane` (**Grid by default**,
  Cover Flow via the toolbar toggle; one image-size slider zooms both),
  `TrackTable` (songs + plain grouped lists), `VideoPane` (YouTube embeds + local
  UGG `<video>`, each showing its description/caption beneath the player),
  `ReadingPane` (articles with lazy `bodyHtml`, recipes, timeline, About; the
  reader fills the pane width and **single-entry sections like About drop the
  list tier**), `TweetsView` (a Twitter-style pennguytweets feed with a
  Latest/Shuffle toggle), `StaticPhotoView` (Octavium/Vinyls/Magnets), and
  `ExternalList` (links). Chrome: `TitleBar` + `Toolbar` (wrapping `LcdStatus`) +
  `Sidebar` + `StatusBar`.
- **Cover Flow** is a *fork* of the iPod's: the pure transform math lives in
  `views/coverflowMath.ts` (copied and scaled up), focus is driven by local
  React state (click / arrow keys / wheel / a horizontal scrubber under the
  covers), and the focused item's caption + description fill the space below the
  covers (no flip). The image-size slider enlarges the covers **in place**
  (`coverTransform(offset, scale)` scales the fan distances; the perspective is
  fixed — not a scene zoom).
- **Track tables are keyboard-navigable**: `TrackTable` is focusable — arrow keys
  move the row selection, **Enter** plays the selected song (or opens its link),
  **Space** toggles play/pause. Single-click selects, double-click still plays.
- **Playback is iTunes-local and isolated** — it never touches the iPod's
  player singletons. `ItunesApp` drives two engines through one transport, keyed
  by a `source`: a hidden `<audio>` for Spotify's keyless 30 s previews, and a
  hidden **iTunes-local SoundCloud widget** (`src/lib/itunes/soundcloudPlayer.ts`,
  a copy of the iPod's `soundcloud.ts`) that plays full SoundCloud tracks as a
  library-style list — starting one source pauses the other. YouTube uses a plain
  `<iframe>` embed (its own element, never `ipod-yt-player`); UGG reuses the
  stateless Range-streaming `/api/video/[file]` route via a native `<video>`.
- **Theme + color = chrome only.** The shared root layout already sets
  `data-theme` on `<html>` for `/itunes`. `app/itunes/itunes.module.css` defines
  the iTunes design **tokens** (gradient values *copied* from the iPod CSS, not
  imported) on `.page`, with `[data-theme='black']` overrides for the **chrome**
  (title bar, sidebar) only; the screen interior stays the classic light iTunes
  look in both themes. The status/now-playing display uses iTunes' pale
  blue-aluminum panel (`--it-lcd`), not green, and the scroll areas get
  Apple-Aqua blue scrollbars (scoped to `.page` in `app/itunes/itunes.module.css`).
- **Mobile**: `ItunesApp` redirects coarse-pointer / `max-width:767px` visitors
  back to `/` (the `.page` wrapper is also `display:none` there as a fallback).
- **Intentional, documented duplication** (the price of strict isolation): the
  signature gradient tokens, the Octavium/Vinyls/Fridge Magnets strings/images in
  `src/lib/itunes/static.ts`, and the SoundCloud widget driver
  (`src/lib/itunes/soundcloudPlayer.ts`, a copy of `src/lib/players/soundcloud.ts`)
  are copied from the iPod side rather than shared — keep those in sync if the
  originals change. (The iTunes `ABOUT_TEXT` is **not** a mirror; it's written for
  the iTunes companion, while the iPod keeps its own click-wheel version.)

## Testing

- **Unit** (`tests/unit/`): wheel math (incl. ±π wraparound), store
  transitions and clamping, menu tree integrity, article template parsing,
  feed parsing against real fixture XML in `tests/fixtures/`. For iTunes:
  `itunesLoaders` (row→view-model mapping with a stubbed `fetch`),
  `itunesCatalog` (a regression guard that fails if a future iPod section is
  not surfaced in the sidebar), and `itunesCoverflow` (the forked transform
  math). `viewRouting` covers the device-selection rule and the pinned-choice
  override.
- **Integration** (`tests/integration/`): seeding, fetcher caching/dedup/
  fallback, and API route handlers — all against in-memory SQLite with
  migrations applied; network stubbed.
- **E2E** (`e2e/`, Playwright): desktop keyboard project and mobile
  touch-viewport project (tap zones, circular scrub via synthesized pointer
  arcs, scrub-vs-tap discrimination). `e2e/itunes.spec.ts` covers the iTunes
  view (sidebar groups, Cover Flow flip + Grid toggle, video mount, article
  lazy-load, the DEVICES link back to the iPod, and the mobile redirect).
  `e2e/deviceRouting.spec.ts` covers device-aware launch (desktop → iTunes,
  portrait phone → iPod), the sticky pinned choice, and the live tilt
  (landscape ↔ portrait switch via `setViewportSize`).
  `npm run e2e` builds, seeds, and boots the production server itself.

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
