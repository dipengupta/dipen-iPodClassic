import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import * as schema from '../db/schema';
import { isStale, markFetched } from './youtubeRss';

/**
 * Keyless Spotify recommendation refresh. Spotify's playlist *embed* page ships
 * the whole track list — title, artist, track URI and a 30s preview MP3 — in a
 * `__NEXT_DATA__` JSON blob with no auth (the same data its IFrame player uses).
 * We parse that, so there are no API keys or secrets. Like the YouTube/Substack
 * fetchers this is best-effort and additive: any failure leaves the committed
 * seed tracks in place, so a recommendation never blanks.
 */

const STALE_MS = 6 * 60 * 60 * 1000;
const META_KEY = 'spotify';

export interface ParsedTrack {
  trackUri: string;
  title: string;
  artist: string;
  previewUrl: string;
}

/** open.spotify.com/playlist/{id}(?…) or spotify:playlist:{id} → {id}. */
export function playlistIdFromUrl(url: string): string | null {
  const m = url.match(/(?:open\.spotify\.com\/playlist\/|spotify:playlist:)([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

export function embedUrl(playlistId: string): string {
  return `https://open.spotify.com/embed/playlist/${playlistId}`;
}

/**
 * Pulls the playable tracks out of a Spotify embed page. Only tracks with a
 * preview MP3 are kept, so every row in the iPod list actually plays.
 */
export function parseSpotifyTracks(html: string): ParsedTrack[] {
  const m = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m) return [];
  let list: unknown;
  try {
    const data = JSON.parse(m[1]);
    list = data?.props?.pageProps?.state?.data?.entity?.trackList;
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const tracks: ParsedTrack[] = [];
  for (const raw of list) {
    const t = raw as {
      uri?: string;
      title?: string;
      subtitle?: string;
      audioPreview?: { url?: string };
    };
    const previewUrl = t.audioPreview?.url;
    if (!t.uri || !t.title || !previewUrl) continue;
    tracks.push({
      trackUri: t.uri,
      title: t.title,
      artist: t.subtitle ?? '',
      previewUrl,
    });
  }
  return tracks;
}

/**
 * Refreshes each Spotify recommendation's tracks from its embed feed. A
 * playlist's rows are replaced only when its fetch succeeds with tracks, so a
 * network or parse failure keeps the seeded fallback. No-ops while fresh.
 */
export async function refreshSpotifyIfStale(
  db: Db,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!isStale(db, META_KEY, STALE_MS)) return;
  const playlists = db
    .select()
    .from(schema.recommendations)
    .where(eq(schema.recommendations.service, 'spotify'))
    .all();
  let anySuccess = false;
  for (const playlist of playlists) {
    const id = playlistIdFromUrl(playlist.playlistUrl);
    if (!id) continue;
    try {
      const res = await fetchImpl(embedUrl(id), {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const tracks = parseSpotifyTracks(await res.text());
      if (tracks.length === 0) continue;
      db.delete(schema.recommendationTracks)
        .where(eq(schema.recommendationTracks.recId, playlist.id))
        .run();
      tracks.forEach((track, i) => {
        db.insert(schema.recommendationTracks)
          .values({ ...track, recId: playlist.id, sortOrder: i })
          .run();
      });
      anySuccess = true;
    } catch {
      // Network/parse failure: keep this playlist's seeded tracks.
    }
  }
  // Only mark fetched if something landed, so a full outage retries next time.
  if (anySuccess) markFetched(db, META_KEY);
}
