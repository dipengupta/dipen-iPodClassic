import { XMLParser } from 'fast-xml-parser';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import * as schema from '../db/schema';

export const YOUTUBE_CHANNEL_ID = 'UC6Luaw5wf-XpJMPbbkxbTZw';
export const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;

const STALE_MS = 6 * 60 * 60 * 1000;
const META_KEY = 'youtube';

export interface FeedVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string; // YYYY-MM-DD
}

/** Parses a YouTube channel RSS (Atom) feed into video entries. */
export function parseYoutubeFeed(xml: string): FeedVideo[] {
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);
  let entries = doc?.feed?.entry ?? [];
  if (!Array.isArray(entries)) entries = [entries];
  const videos: FeedVideo[] = [];
  for (const entry of entries) {
    const videoId = entry?.['yt:videoId'];
    const title = entry?.title;
    if (!videoId || !title) continue;
    videos.push({
      videoId: String(videoId),
      title: String(title),
      description: String(entry?.['media:group']?.['media:description'] ?? ''),
      publishedAt: String(entry?.published ?? '').slice(0, 10),
    });
  }
  return videos;
}

export function isStale(db: Db, key: string, staleMs: number, now = Date.now()): boolean {
  const meta = db.select().from(schema.fetchMeta).where(eq(schema.fetchMeta.key, key)).get();
  if (!meta?.lastFetchedAt) return true;
  return now - meta.lastFetchedAt.getTime() > staleMs;
}

export function markFetched(db: Db, key: string, now = new Date()): void {
  db.insert(schema.fetchMeta)
    .values({ key, lastFetchedAt: now })
    .onConflictDoUpdate({ target: schema.fetchMeta.key, set: { lastFetchedAt: now } })
    .run();
}

/**
 * Merges the live RSS feed (~15 latest videos) into the archive table.
 * Failures are swallowed: the DB archive is always a complete fallback.
 */
export async function refreshYoutubeIfStale(
  db: Db,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!isStale(db, META_KEY, STALE_MS)) return;
  try {
    const res = await fetchImpl(YOUTUBE_FEED_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const videos = parseYoutubeFeed(await res.text());
    for (const video of videos) {
      db.insert(schema.youtubeVideos)
        .values(video)
        .onConflictDoNothing()
        .run();
    }
    markFetched(db, META_KEY);
  } catch {
    // Network/parse failure: serve the archive, retry on the next stale check.
  }
}
