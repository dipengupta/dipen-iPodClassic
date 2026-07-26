import { getSoundcloudTracks } from '../players/soundcloud';
import { useIpodStore } from '../store/ipodStore';
import type { FrameItem, MenuNode, PlayTrack } from './types';

/**
 * Client-side loaders: fetch a node's dataSource from the API routes and map
 * rows into FrameItems (label + what selecting them does). Adding a content
 * section = add a builder here, a table + seed entry, and a node in tree.ts.
 */

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

interface ArticleRow {
  slug: string;
  title: string;
  publishedLabel: string;
  sourceLabel: string;
  sourceUrl: string;
}

async function articles(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: ArticleRow[] }>('/api/articles');
  return items.map((a) => ({
    id: a.slug,
    label: a.title,
    sublabel: a.publishedLabel,
    onSelect: {
      kind: 'detail',
      view: 'textReader',
      payload: {
        title: a.title,
        articleSlug: a.slug,
        sourceUrl: a.sourceUrl,
        sourceLabel: a.sourceLabel,
        publishedLabel: a.publishedLabel,
      },
    },
  }));
}

interface VideoRow {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
}

async function youtube(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: VideoRow[] }>('/api/youtube');
  const byYear = new Map<string, VideoRow[]>();
  for (const video of items) {
    const year = video.publishedAt.slice(0, 4) || 'Unknown';
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(video);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, videos]) => {
      // The year is the playback queue: prev/next and auto-advance move
      // through it via the persistent player.
      const queue: PlayTrack[] = videos.map((v) => ({
        id: v.videoId,
        title: v.title,
        description: v.description,
        date: v.publishedAt,
      }));
      return {
        id: `yt-${year}`,
        label: year,
        sublabel: `${videos.length} video${videos.length === 1 ? '' : 's'}`,
        onSelect: {
          kind: 'items' as const,
          title: year,
          view: 'list' as const,
          items: videos.map((v, i) => ({
            id: v.videoId,
            label: v.title,
            sublabel: v.publishedAt,
            onSelect: { kind: 'play' as const, source: 'youtube' as const, index: i, queue },
          })),
        },
      };
    });
}

interface SoundcloudFallbackRow {
  id: number;
  title: string;
  url: string;
}

async function soundcloud(): Promise<FrameItem[]> {
  // Live track list from the persistent widget (ascending, like the old
  // site's iPod). If the widget is slow or blocked, fall back to the seeded
  // rows that link out — never an eternal spinner.
  const tracks = await getSoundcloudTracks();
  if (tracks && tracks.length > 0) {
    return tracks.map((track, i) => ({
      id: `sc-${track.id}`,
      label: track.title,
      sublabel: track.date ? track.date.slice(0, 10).replace(/\//g, '-') : undefined,
      onSelect: { kind: 'play', source: 'soundcloud', index: i, queue: tracks },
    }));
  }
  const { items } = await fetchJson<{ items: SoundcloudFallbackRow[] }>('/api/soundcloud');
  return items.map((row) => ({
    id: `sc-fallback-${row.id}`,
    label: row.title,
    onSelect: { kind: 'external', href: row.url },
  }));
}

interface GuitarRow {
  id: number;
  name: string;
  year: string;
  imagePath: string;
  description: string;
}

async function guitars(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: GuitarRow[] }>('/api/content/guitars');
  return items.map((g) => ({
    id: `guitar-${g.id}`,
    label: g.name,
    sublabel: g.year,
    imagePath: g.imagePath,
    flipText: g.year ? `${g.description}\n\n(${g.year})` : g.description,
  }));
}

interface UggRow {
  episode: number;
  name: string;
  caption: string;
  postedAt: string;
  year: number;
  filename: string;
}

async function ugg(): Promise<FrameItem[]> {
  // Rows arrive most-recent-episode first; years inherit that order.
  const { items } = await fetchJson<{ items: UggRow[] }>('/api/content/ugg');
  const byYear = new Map<number, UggRow[]>();
  for (const row of items) {
    if (!byYear.has(row.year)) byYear.set(row.year, []);
    byYear.get(row.year)!.push(row);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, episodes]) => {
      // The year is the playback queue: prev/next and auto-advance move
      // through it inside the local video view.
      const queue: PlayTrack[] = episodes.map((e) => ({
        id: String(e.episode),
        title: `Ep. ${e.episode} | ${e.name}`,
        caption: e.caption,
        videoSrc: `/api/video/${e.filename}`,
        date: e.postedAt,
      }));
      return {
        id: `ugg-${year}`,
        label: `UGG Chronicles - ${year}`,
        sublabel: `${episodes.length} episode${episodes.length === 1 ? '' : 's'}`,
        onSelect: {
          kind: 'items' as const,
          title: `UGG Chronicles - ${year}`,
          view: 'list' as const,
          items: episodes.map((e, i) => ({
            id: `ugg-ep-${e.episode}`,
            label: `Ep. ${e.episode} | ${e.name}`,
            onSelect: { kind: 'play' as const, source: 'ugg' as const, index: i, queue },
          })),
        },
      };
    });
}

interface MugRow {
  id: number;
  title: string;
  giftedBy: string;
  category: string;
  detail: string;
}

// Group order + plural headings for the grouped mug list.
const MUG_GROUPS: Array<{ category: string; label: string }> = [
  { category: 'state', label: 'States' },
  { category: 'city', label: 'Cities' },
  { category: 'country', label: 'Countries' },
  { category: 'special', label: 'Special' },
];

async function mugs(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: MugRow[] }>('/api/content/mugs');
  // Category groups in fixed order; each opens a list of mugs showing who
  // gifted each one at a glance.
  const byCategory = new Map<string, MugRow[]>();
  for (const mug of items) {
    if (!byCategory.has(mug.category)) byCategory.set(mug.category, []);
    byCategory.get(mug.category)!.push(mug);
  }
  return MUG_GROUPS.filter(({ category }) => byCategory.has(category)).map(({ category, label }) => {
    const group = byCategory.get(category)!;
    return {
      id: `mugs-${category}`,
      label,
      sublabel: String(group.length),
      onSelect: {
        kind: 'items',
        title: label,
        view: 'list',
        items: group.map((m) => ({
          id: `mug-${m.id}`,
          label: m.title,
          sublabel: m.giftedBy ? `from ${m.giftedBy}` : undefined,
        })),
      },
    };
  });
}

interface GalleryRow {
  id: number;
  title: string;
  description: string;
  imagePath: string;
}

async function photos(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: GalleryRow[] }>('/api/content/photos');
  return items.map((p) => ({
    id: `photo-${p.id}`,
    label: p.title,
    imagePath: p.imagePath,
    flipText: p.description || p.title,
  }));
}

async function kitchen(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: GalleryRow[] }>('/api/content/kitchen');
  return items.map((dish) => ({
    id: `dish-${dish.id}`,
    label: dish.title,
    imagePath: dish.imagePath,
    flipText: dish.description || dish.title,
  }));
}

async function alison(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: GalleryRow[] }>('/api/content/alison');
  return items.map((p) => ({
    id: `alison-${p.id}`,
    label: p.description,
    imagePath: p.imagePath,
    flipText: p.title,
  }));
}

interface RecipeRow {
  id: number;
  title: string;
  category: 'food' | 'baking' | 'drinks' | 'tips';
  body: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
}

const RECIPE_CATEGORY_LABEL: Record<RecipeRow['category'], string> = {
  food: 'Food',
  baking: 'Baking',
  drinks: 'Drinks',
  tips: 'Tips & Tricks',
};

async function recipes(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: RecipeRow[] }>('/api/content/recipes');
  // Category groups in fixed menu order; each opens a readable recipe list.
  const byCategory = new Map<RecipeRow['category'], RecipeRow[]>();
  for (const recipe of items) {
    if (!byCategory.has(recipe.category)) byCategory.set(recipe.category, []);
    byCategory.get(recipe.category)!.push(recipe);
  }
  return (Object.keys(RECIPE_CATEGORY_LABEL) as RecipeRow['category'][])
    .filter((category) => byCategory.has(category))
    .map((category) => {
      const group = byCategory.get(category)!;
      const label = RECIPE_CATEGORY_LABEL[category];
      return {
        id: `recipes-${category}`,
        label,
        sublabel: `${group.length} recipe${group.length === 1 ? '' : 's'}`,
        onSelect: {
          kind: 'items',
          title: label,
          view: 'list',
          items: group.map((recipe) => ({
            id: `recipe-${recipe.id}`,
            label: recipe.title,
            onSelect: {
              kind: 'detail',
              view: 'textReader',
              payload: {
                title: recipe.title,
                text: recipe.body,
                sourceUrl: recipe.sourceUrl ?? undefined,
                sourceLabel: recipe.sourceLabel ?? undefined,
              },
            },
          })),
        },
      };
    });
}

interface ConcertRow {
  id: number;
  year: string;
  name: string;
}

async function concerts(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: ConcertRow[] }>('/api/content/concerts');
  // Year groups newest first (seed order is chronological); each year opens
  // a readable list.
  const byYear = new Map<string, ConcertRow[]>();
  for (const concert of items) {
    if (!byYear.has(concert.year)) byYear.set(concert.year, []);
    byYear.get(concert.year)!.push(concert);
  }
  return [...byYear.entries()].reverse().map(([year, shows]) => ({
    id: `concerts-${year}`,
    label: year,
    sublabel: `${shows.length} show${shows.length === 1 ? '' : 's'}`,
    onSelect: {
      kind: 'items',
      title: year,
      view: 'list',
      items: shows.map((show) => ({ id: `concert-${show.id}`, label: show.name })),
    },
  }));
}

interface ListRow {
  id: number;
  category: 'ruining' | 'right';
  name: string;
}

// Fixed group order. The full headings double as both the menu row and the
// sub-list title; no item-count sublabel, so the long labels get the whole
// row width (they'd otherwise truncate next to the count).
const LIST_GROUP: Record<ListRow['category'], string> = {
  ruining: 'Americans taking a good thing and ruining it',
  right: 'Americans doing things right',
};

async function list(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: ListRow[] }>('/api/content/list');
  // Two groups in fixed order; each opens a scrollable list of its entries.
  const byGroup = new Map<ListRow['category'], ListRow[]>();
  for (const row of items) {
    if (!byGroup.has(row.category)) byGroup.set(row.category, []);
    byGroup.get(row.category)!.push(row);
  }
  return (Object.keys(LIST_GROUP) as ListRow['category'][])
    .filter((category) => byGroup.has(category))
    .map((category) => {
      const group = byGroup.get(category)!;
      const heading = LIST_GROUP[category];
      return {
        id: `list-${category}`,
        label: heading,
        onSelect: {
          kind: 'items',
          title: heading,
          view: 'list',
          items: group.map((row) => ({ id: `list-item-${row.id}`, label: row.name })),
        },
      };
    });
}

interface WifiRow {
  id: number;
  name: string;
}

async function wifi(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: WifiRow[] }>('/api/content/wifi');
  return items.map((row) => ({ id: `wifi-${row.id}`, label: row.name }));
}

interface TimelineRow {
  id: number;
  role: string;
  company: string;
  dates: string;
  location: string;
  description: string;
}

async function timeline(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: TimelineRow[] }>('/api/content/timeline');
  return items.map((t) => ({
    id: `job-${t.id}`,
    label: t.role,
    sublabel: `${t.company} · ${t.dates}`,
    onSelect: {
      kind: 'detail',
      view: 'textReader',
      payload: {
        title: t.company,
        text: `${t.role}\n${t.dates}\n${t.location}\n\n${t.description}`,
      },
    },
  }));
}

interface LinkRow {
  id: number;
  label: string;
  url: string;
}

async function links(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: LinkRow[] }>('/api/content/links');
  return items.map((l) => ({
    id: `link-${l.id}`,
    label: l.label,
    sublabel: l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
    onSelect: { kind: 'external', href: l.url },
  }));
}

interface TweetRow {
  id: number;
  number: number | null;
  text: string;
  postedAt: string | null;
  url: string | null;
}

const TWEET_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

function shuffled<T>(rows: T[]): T[] {
  const out = [...rows];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function tweets(): Promise<FrameItem[]> {
  // Scraped @20swithepennguy archive, newest first from the API. The
  // settings toggle re-deals the order on every visit to the list.
  const { items } = await fetchJson<{ items: TweetRow[] }>('/api/content/tweets');
  const ordered = useIpodStore.getState().tweetShuffle ? shuffled(items) : items;
  return ordered.map((t) => {
    const posted = t.postedAt
      ? new Date(t.postedAt).toLocaleDateString('en-US', TWEET_DATE_FORMAT)
      : null;
    return {
      id: `tweet-${t.number ?? t.id}`,
      label: t.text,
      sublabel: t.postedAt ? t.postedAt.slice(0, 10) : undefined,
      onSelect: {
        kind: 'detail',
        view: 'textReader',
        payload: {
          title: t.number !== null ? `#${t.number}` : 'pennguytweet',
          text: `${t.number !== null ? `${t.number}/x ` : ''}${t.text}${posted ? `\n\nPosted: ${posted}` : ''}`,
          sourceUrl: t.url ?? undefined,
          sourceLabel: 'X',
        },
      },
    };
  });
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

async function recommendations(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: RecommendationRow[] }>(
    '/api/content/recommendations',
  );
  return items.map((rec) => {
    // Apple Music has no keyless control path, so its rows deep-link out.
    // A Spotify playlist with no resolvable tracks degrades to the same.
    if (rec.service === 'apple' || rec.tracks.length === 0) {
      return {
        id: `rec-${rec.id}`,
        label: rec.title,
        sublabel: rec.service === 'apple' ? 'Apple Music ↗' : rec.note || 'Open ↗',
        onSelect: { kind: 'external', href: rec.playlistUrl },
      };
    }
    // Spotify: a native track list that plays through the Now Playing card,
    // exactly like SoundCloud — wheel-skip, scrubber and all.
    const queue: PlayTrack[] = rec.tracks.map((t) => ({
      id: t.trackUri,
      title: t.artist ? `${t.title} — ${t.artist}` : t.title,
      audioSrc: t.previewUrl,
    }));
    return {
      id: `rec-${rec.id}`,
      label: rec.title,
      sublabel: rec.note || `${rec.tracks.length} tracks`,
      onSelect: {
        kind: 'items',
        title: rec.title,
        view: 'list',
        items: rec.tracks.map((t, i) => ({
          id: `${rec.id}-${i}`,
          label: t.title,
          sublabel: t.artist || undefined,
          onSelect: { kind: 'play' as const, source: 'spotify' as const, index: i, queue },
        })),
      },
    };
  });
}

const builders: Record<string, () => Promise<FrameItem[]>> = {
  recommendations,
  articles,
  youtube,
  guitars,
  ugg,
  soundcloud,
  mugs,
  photos,
  kitchen,
  alison,
  recipes,
  concerts,
  wifi,
  list,
  timeline,
  links,
  tweets,
};

export async function loadItems(node: MenuNode): Promise<FrameItem[]> {
  const builder = node.dataSource ? builders[node.dataSource] : undefined;
  if (!builder) return [];
  return builder();
}
