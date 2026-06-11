import { getSoundcloudTracks } from '../players/soundcloud';
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

interface LocationRow {
  id: number;
  title: string;
  notesJson: string;
  state: string | null;
  country: string | null;
}

async function locations(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: LocationRow[] }>('/api/content/locations');
  const byCountry = new Map<string, LocationRow[]>();
  for (const loc of items) {
    const country = loc.country ?? 'Elsewhere';
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country)!.push(loc);
  }
  return [...byCountry.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([country, locs]) => ({
      id: `country-${country}`,
      label: country,
      sublabel: `${locs.length} place${locs.length === 1 ? '' : 's'}`,
      onSelect: {
        kind: 'items',
        title: country,
        view: 'list',
        items: locs.map((loc) => {
          const notes = (JSON.parse(loc.notesJson) as string[]).filter(Boolean);
          const trips = [...new Set(notes)];
          return {
            id: `loc-${loc.id}`,
            label: loc.title.replace(`, ${country}`, ''),
            sublabel: `${notes.length} trip${notes.length === 1 ? '' : 's'}`,
            onSelect: {
              kind: 'detail' as const,
              view: 'textReader' as const,
              payload: {
                title: loc.title,
                text: `Trips: ${notes.length}\n\n${trips.map((t) => `• ${t}`).join('\n')}`,
              },
            },
          };
        }),
      },
    }));
}

interface MugRow {
  id: number;
  title: string;
  giftedBy: string;
  category: string;
  detail: string;
}

const MUG_CATEGORY_LABEL: Record<string, string> = {
  state: 'State mug',
  city: 'City mug',
  country: 'Country mug',
  special: 'Special mug',
};

async function mugs(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: MugRow[] }>('/api/content/mugs');
  return items.map((m) => {
    const lines = [MUG_CATEGORY_LABEL[m.category] ?? 'Mug'];
    if (m.detail) lines.push(m.detail);
    lines.push(m.giftedBy ? `Gifted by ${m.giftedBy}` : 'Self-acquired');
    return {
      id: `mug-${m.id}`,
      label: m.title,
      sublabel: m.giftedBy ? `from ${m.giftedBy}` : undefined,
      flipText: lines.join('\n'),
    };
  });
}

interface GalleryRow {
  id: number;
  title: string;
  description: string;
  imagePath: string;
}

async function gallery(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: GalleryRow[] }>('/api/content/gallery');
  return items.map((g) => ({
    id: `gallery-${g.id}`,
    label: g.title,
    imagePath: g.imagePath,
    onSelect: {
      kind: 'detail',
      view: 'photo',
      payload: { title: g.title, imagePath: g.imagePath, text: g.description },
    },
  }));
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

interface ConcertRow {
  id: number;
  year: string;
  name: string;
}

async function concerts(): Promise<FrameItem[]> {
  const { items } = await fetchJson<{ items: ConcertRow[] }>('/api/content/concerts');
  // Chronological year groups (seed order); each year opens a readable list.
  const byYear = new Map<string, ConcertRow[]>();
  for (const concert of items) {
    if (!byYear.has(concert.year)) byYear.set(concert.year, []);
    byYear.get(concert.year)!.push(concert);
  }
  return [...byYear.entries()].map(([year, shows]) => ({
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

async function tweets(): Promise<FrameItem[]> {
  // Scraped @20swithepennguy archive, newest first from the API.
  const { items } = await fetchJson<{ items: TweetRow[] }>('/api/content/tweets');
  return items.map((t) => {
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

const builders: Record<string, () => Promise<FrameItem[]>> = {
  articles,
  youtube,
  guitars,
  ugg,
  soundcloud,
  locations,
  mugs,
  gallery,
  photos,
  kitchen,
  concerts,
  wifi,
  timeline,
  links,
  tweets,
};

export async function loadItems(node: MenuNode): Promise<FrameItem[]> {
  const builder = node.dataSource ? builders[node.dataSource] : undefined;
  if (!builder) return [];
  return builder();
}
