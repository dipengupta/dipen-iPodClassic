/**
 * iTunes data loaders. Each fetches the same `/api/...` routes the iPod uses
 * (so the live refresh-if-stale + seed fallback in those route handlers applies
 * identically) and maps rows into the SectionData view-models in types.ts.
 *
 * This is the iTunes parallel of src/lib/menu/dataSources.ts — kept separate
 * because that file imports the iPod store and player singletons.
 */

import { ABOUT_TEXT, MAGNETS_PHOTO, OCTAVIUM_PHOTO, VINYLS_PHOTO } from './static';
import type {
  AudioTrack,
  CoverItem,
  LoaderKey,
  Playlist,
  ReadingEntry,
  SectionData,
  TrackGroup,
  TrackRow,
  VideoGroup,
} from './types';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

// --- Row shapes (mirror the API responses) ---------------------------------

interface ArticleRow {
  slug: string;
  title: string;
  publishedLabel: string;
  sourceLabel: string;
  sourceUrl: string;
}
interface VideoRow {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
}
interface UggRow {
  episode: number;
  name: string;
  caption: string;
  postedAt: string;
  year: number;
  filename: string;
}
interface GuitarRow {
  id: number;
  name: string;
  year: string;
  imagePath: string;
  description: string;
}
interface GalleryRow {
  id: number;
  title: string;
  description: string;
  imagePath: string;
}
interface MugRow {
  id: number;
  title: string;
  giftedBy: string;
  category: string;
  detail: string;
}
interface RecipeRow {
  id: number;
  title: string;
  category: 'food' | 'baking' | 'drinks' | 'tips';
  body: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
}
interface ConcertRow {
  id: number;
  year: string;
  name: string;
}
interface ListRow {
  id: number;
  category: 'ruining' | 'right';
  name: string;
}
interface WifiRow {
  id: number;
  name: string;
}
interface TimelineRow {
  id: number;
  role: string;
  company: string;
  dates: string;
  location: string;
  description: string;
}
interface LinkRow {
  id: number;
  label: string;
  url: string;
}
interface TweetRow {
  id: number;
  number: number | null;
  text: string;
  postedAt: string | null;
  url: string | null;
}
interface RecTrackRow {
  trackUri: string;
  title: string;
  artist: string;
  previewUrl: string;
}
interface RecommendationRow {
  id: number;
  title: string;
  service: 'spotify' | 'apple';
  playlistUrl: string;
  note: string;
  tracks: RecTrackRow[];
}

// --- Helpers ---------------------------------------------------------------

const RECIPE_CATEGORY_LABEL: Record<RecipeRow['category'], string> = {
  food: 'Food',
  baking: 'Baking',
  drinks: 'Drinks',
  tips: 'Tips & Tricks',
};

const MUG_GROUPS: Array<{ category: string; label: string }> = [
  { category: 'state', label: 'States' },
  { category: 'city', label: 'Cities' },
  { category: 'country', label: 'Countries' },
  { category: 'special', label: 'Special' },
];

const LIST_GROUP: Record<ListRow['category'], string> = {
  ruining: 'Americans taking a good thing and ruining it',
  right: 'Americans doing things right',
};

function youtubeGroups(items: VideoRow[], headingPrefix: string): VideoGroup[] {
  const byYear = new Map<string, VideoRow[]>();
  for (const v of items) {
    const year = v.publishedAt.slice(0, 4) || 'Unknown';
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(v);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, videos]) => ({
      heading: `${headingPrefix} · ${year}`,
      videos: videos.map((v) => ({
        id: `yt-${v.videoId}`,
        title: v.title,
        sublabel: v.publishedAt.slice(0, 10),
        source: 'youtube' as const,
        youtubeId: v.videoId,
        // Shown beneath the player, like the UGG caption.
        caption: v.description || undefined,
      })),
    }));
}

function uggGroups(items: UggRow[]): VideoGroup[] {
  const byYear = new Map<number, UggRow[]>();
  for (const row of items) {
    if (!byYear.has(row.year)) byYear.set(row.year, []);
    byYear.get(row.year)!.push(row);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, episodes]) => ({
      heading: `UGG Chronicles · ${year}`,
      videos: episodes.map((e) => ({
        id: `ugg-${e.episode}`,
        title: `Ep. ${e.episode} | ${e.name}`,
        sublabel: e.postedAt?.slice(0, 10),
        source: 'ugg' as const,
        videoSrc: `/api/video/${e.filename}`,
        caption: e.caption,
      })),
    }));
}

function galleryCovers(items: GalleryRow[], prefix: string): CoverItem[] {
  return items.map((p) => ({
    id: `${prefix}-${p.id}`,
    label: p.title,
    imagePath: p.imagePath,
    flipText: p.description || p.title,
  }));
}

// --- Loaders ---------------------------------------------------------------

async function guitars(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: GuitarRow[] }>('/api/content/guitars');
  return {
    kind: 'coverflow',
    items: items.map((g) => ({
      id: `guitar-${g.id}`,
      label: g.name,
      sublabel: g.year,
      imagePath: g.imagePath,
      flipText: g.year ? `${g.description}\n\n(${g.year})` : g.description,
    })),
  };
}

async function kitchen(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: GalleryRow[] }>('/api/content/kitchen');
  return { kind: 'coverflow', items: galleryCovers(items, 'dish') };
}

async function photos(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: GalleryRow[] }>('/api/content/photos');
  return { kind: 'coverflow', items: galleryCovers(items, 'photo') };
}

/** Playlist metadata for the dynamic PLAYLISTS sidebar section. */
export async function loadPlaylists(): Promise<Playlist[]> {
  const { items } = await fetchJson<{ items: RecommendationRow[] }>(
    '/api/content/recommendations',
  );
  return items.map((rec) => ({
    id: rec.id,
    title: rec.title,
    service: rec.service,
    playlistUrl: rec.playlistUrl,
  }));
}

/** One Spotify playlist's tracks as a playable table (selected from PLAYLISTS). */
export async function loadPlaylist(recId: number): Promise<SectionData> {
  const { items } = await fetchJson<{ items: RecommendationRow[] }>(
    '/api/content/recommendations',
  );
  const rec = items.find((r) => r.id === recId);
  if (!rec || rec.tracks.length === 0) {
    return {
      kind: 'tracks',
      columns: { name: 'Name', secondary: 'Artist' },
      groups: [{ rows: [{ id: `rec-${recId}`, name: 'Open playlist ↗', href: rec?.playlistUrl ?? '#' }] }],
    };
  }
  const queue: AudioTrack[] = [];
  const rows: TrackRow[] = rec.tracks.map((t) => {
    const playIndex = queue.length;
    queue.push({ id: t.trackUri, title: t.artist ? `${t.title} — ${t.artist}` : t.title, audioSrc: t.previewUrl });
    return { id: `${rec.id}-${playIndex}`, name: t.title, secondary: t.artist || undefined, playIndex };
  });
  return { kind: 'tracks', columns: { name: 'Name', secondary: 'Artist' }, groups: [{ rows }], queue };
}

interface SoundcloudFallbackRow {
  id: number;
  title: string;
  url: string;
}

/** Fallback only — the live widget (ItunesApp) is preferred. Link-out rows. */
async function soundcloud(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: SoundcloudFallbackRow[] }>('/api/soundcloud');
  return {
    kind: 'tracks',
    columns: { name: 'Track' },
    groups: [{ rows: items.map((t) => ({ id: `sc-${t.id}`, name: t.title, href: t.url })) }],
  };
}

async function mugs(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: MugRow[] }>('/api/content/mugs');
  const byCategory = new Map<string, MugRow[]>();
  for (const mug of items) {
    if (!byCategory.has(mug.category)) byCategory.set(mug.category, []);
    byCategory.get(mug.category)!.push(mug);
  }
  const groups: TrackGroup[] = MUG_GROUPS.filter(({ category }) => byCategory.has(category)).map(
    ({ category, label }) => ({
      heading: label,
      rows: byCategory.get(category)!.map((m) => ({
        id: `mug-${m.id}`,
        name: m.title,
        secondary: m.giftedBy ? `from ${m.giftedBy}` : undefined,
      })),
    }),
  );
  return { kind: 'tracks', columns: { name: 'Mug', secondary: 'Gifted by' }, groups };
}

async function concerts(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: ConcertRow[] }>('/api/content/concerts');
  const byYear = new Map<string, ConcertRow[]>();
  for (const c of items) {
    if (!byYear.has(c.year)) byYear.set(c.year, []);
    byYear.get(c.year)!.push(c);
  }
  const groups: TrackGroup[] = [...byYear.entries()].reverse().map(([year, shows]) => ({
    heading: year,
    rows: shows.map((s) => ({ id: `concert-${s.id}`, name: s.name })),
  }));
  return { kind: 'tracks', columns: { name: 'Show' }, groups };
}

async function list(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: ListRow[] }>('/api/content/list');
  const byGroup = new Map<ListRow['category'], ListRow[]>();
  for (const row of items) {
    if (!byGroup.has(row.category)) byGroup.set(row.category, []);
    byGroup.get(row.category)!.push(row);
  }
  const groups: TrackGroup[] = (Object.keys(LIST_GROUP) as ListRow['category'][])
    .filter((category) => byGroup.has(category))
    .map((category) => ({
      heading: LIST_GROUP[category],
      rows: byGroup.get(category)!.map((row) => ({ id: `list-${row.id}`, name: row.name })),
    }));
  return { kind: 'tracks', columns: { name: 'Entry' }, groups };
}

async function wifi(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: WifiRow[] }>('/api/content/wifi');
  return {
    kind: 'tracks',
    columns: { name: 'Network' },
    groups: [{ rows: items.map((row) => ({ id: `wifi-${row.id}`, name: row.name })) }],
  };
}

async function recipes(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: RecipeRow[] }>('/api/content/recipes');
  const byCategory = new Map<RecipeRow['category'], RecipeRow[]>();
  for (const r of items) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }
  const entries: ReadingEntry[] = [];
  for (const category of Object.keys(RECIPE_CATEGORY_LABEL) as RecipeRow['category'][]) {
    const group = byCategory.get(category);
    if (!group) continue;
    for (const r of group) {
      entries.push({
        id: `recipe-${r.id}`,
        title: r.title,
        heading: RECIPE_CATEGORY_LABEL[category],
        text: r.body,
        sourceUrl: r.sourceUrl ?? undefined,
        sourceLabel: r.sourceLabel ?? undefined,
      });
    }
  }
  return { kind: 'reading', entries };
}

async function professional(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: TimelineRow[] }>('/api/content/timeline');
  return {
    kind: 'reading',
    entries: items.map((t) => ({
      id: `job-${t.id}`,
      title: t.company,
      subtitle: `${t.role} · ${t.dates}`,
      text: `${t.role}\n${t.dates}\n${t.location}\n\n${t.description}`,
    })),
  };
}

async function tweets(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: TweetRow[] }>('/api/content/tweets');
  return {
    kind: 'tweets',
    handle: '20swithepennguy',
    displayName: 'pennguy',
    tweets: items.map((t) => ({
      id: `tweet-${t.number ?? t.id}`,
      number: t.number,
      text: t.text,
      date: t.postedAt ?? undefined,
      url: t.url ?? undefined,
    })),
  };
}

async function articles(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: ArticleRow[] }>('/api/articles');
  return {
    kind: 'reading',
    entries: items.map((a) => ({
      id: a.slug,
      title: a.title,
      subtitle: a.publishedLabel,
      articleSlug: a.slug,
      sourceUrl: a.sourceUrl,
      sourceLabel: a.sourceLabel,
    })),
  };
}

async function links(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: LinkRow[] }>('/api/content/links');
  return {
    kind: 'external',
    rows: items.map((l) => ({
      id: `link-${l.id}`,
      label: l.label,
      sublabel: l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
      href: l.url,
    })),
  };
}

async function youtube(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: VideoRow[] }>('/api/youtube');
  return { kind: 'video', groups: youtubeGroups(items, 'YouTube') };
}

async function instagram(): Promise<SectionData> {
  const { items } = await fetchJson<{ items: UggRow[] }>('/api/content/ugg');
  return { kind: 'video', groups: uggGroups(items) };
}

async function vinyls(): Promise<SectionData> {
  return { kind: 'staticPhoto', ...VINYLS_PHOTO };
}
async function magnets(): Promise<SectionData> {
  return { kind: 'staticPhoto', ...MAGNETS_PHOTO };
}
async function octavium(): Promise<SectionData> {
  return { kind: 'staticPhoto', ...OCTAVIUM_PHOTO };
}
async function about(): Promise<SectionData> {
  return { kind: 'reading', entries: [{ id: 'about', title: 'About', text: ABOUT_TEXT }] };
}

const loaders: Record<LoaderKey, () => Promise<SectionData>> = {
  articles,
  guitars,
  photos,
  soundcloud,
  mugs,
  vinyls,
  magnets,
  recipes,
  kitchen,
  concerts,
  list,
  tweets,
  wifi,
  links,
  professional,
  octavium,
  about,
  youtube,
  instagram,
};

export function loadSection(key: LoaderKey): Promise<SectionData> {
  return loaders[key]();
}
