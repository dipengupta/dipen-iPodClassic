/**
 * Re-generates the committed Spotify track lists for the music Recommendations
 * section, keylessly. For every `service: "spotify"` entry in
 * src/data/seed/recommendations.json it reads the playlist's public embed feed
 * (the same `__NEXT_DATA__` blob the IFrame player uses — title, artist, track
 * URI and a 30s preview MP3) and writes them to
 * src/data/seed/recommendation-tracks.json, keyed by playlist id.
 *
 *   npm run import:spotify
 *
 * No API keys or secrets — just public embed pages. The committed JSON is the
 * never-blank fallback; the app additively refreshes it at runtime via
 * src/lib/fetchers/spotify.ts. Re-run whenever you change the playlists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseSpotifyTracks, playlistIdFromUrl, embedUrl } from '../src/lib/fetchers/spotify';

/** Keep the committed seed lean; the runtime fetcher can carry the full list. */
const MAX_TRACKS = 30;

const SEED_DIR = path.join(process.cwd(), 'src', 'data', 'seed');
const PLAYLISTS_FILE = path.join(SEED_DIR, 'recommendations.json');
const TRACKS_FILE = path.join(SEED_DIR, 'recommendation-tracks.json');

interface PlaylistSeed {
  title: string;
  service: 'spotify' | 'apple';
  playlistUrl: string;
}

async function main(): Promise<void> {
  const playlists = JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf8')) as PlaylistSeed[];
  const out: Record<string, ReturnType<typeof parseSpotifyTracks>> = {};

  for (const playlist of playlists) {
    if (playlist.service !== 'spotify') continue;
    const id = playlistIdFromUrl(playlist.playlistUrl);
    if (!id) {
      console.warn(`skip "${playlist.title}": not a Spotify playlist URL`);
      continue;
    }
    const res = await fetch(embedUrl(id), { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      console.warn(`skip "${playlist.title}": embed HTTP ${res.status}`);
      continue;
    }
    const tracks = parseSpotifyTracks(await res.text()).slice(0, MAX_TRACKS);
    out[id] = tracks;
    console.log(`${playlist.title}: ${tracks.length} playable tracks`);
  }

  fs.writeFileSync(TRACKS_FILE, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote ${TRACKS_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
