/**
 * Additive importer for UGG Chronicles episodes straight from a standard
 * Instagram data export (the yearly download).
 *
 *   npm run import:ugg:instagram -- --source "/path/to/instagram-export"
 *
 * The export root must contain `your_instagram_activity/media/reels.json` and the
 * referenced `media/reels/YYYYMM/*.mp4` files. Each reel's `title` is the full
 * post caption (in UTF-8-as-latin-1 mojibake); its episode number is parsed from
 * "Ep. N".
 *
 * What it does:
 *   1. Reads the committed seed src/data/seed/ugg.json (existing episodes).
 *   2. Parses every reel into a CaptionEntry, drops non-UGG reels and any episode
 *      already in the seed (so it only adds new ones).
 *   3. COPIES each new video to data/videos/ugg/ugg-N.mp4 (data/ is gitignored;
 *      the export in Downloads is left intact). Already-copied files are skipped.
 *   4. Reads durations via ffprobe when available.
 *   5. Merges the new rows into ugg.json (sorted by episode) via the shared
 *      buildSeedRows, keeping the exact field shape of the existing entries.
 *
 * Idempotent: re-running with the same export adds nothing.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildSeedRows,
  instagramCaptionEntry,
  videoFilename,
  type CaptionEntry,
  type UggSeedRow,
} from './ugg-lib';

const DEST_DIR = process.env.VIDEOS_DIR ?? path.join(process.cwd(), 'data', 'videos', 'ugg');
const SEED_FILE = path.join(process.cwd(), 'src', 'data', 'seed', 'ugg.json');

function sourceDir(): string {
  const idx = process.argv.indexOf('--source');
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error('usage: npm run import:ugg:instagram -- --source "/path/to/instagram-export"');
    process.exit(1);
  }
  return process.argv[idx + 1];
}

interface RawMedia {
  uri?: string;
  title?: string;
  creation_timestamp?: number;
}

/** A new episode: its parsed caption plus where its video lives + its timestamp. */
interface NewReel {
  entry: CaptionEntry;
  uri: string;
  creationTimestamp: number;
}

/** Flatten reels.json into new UGG episodes not already in `existing`. */
function collectNewReels(src: string, existing: Set<number>): NewReel[] {
  const reelsPath = path.join(src, 'your_instagram_activity', 'media', 'reels.json');
  if (!fs.existsSync(reelsPath)) {
    console.error(`no reels.json at ${reelsPath}`);
    process.exit(1);
  }
  const parsed = JSON.parse(fs.readFileSync(reelsPath, 'utf8')) as {
    ig_reels_media?: Array<{ media?: RawMedia[] }>;
  };
  const media: RawMedia[] = (parsed.ig_reels_media ?? []).flatMap((r) => r.media ?? []);

  const byEpisode = new Map<number, NewReel>();
  for (const m of media) {
    if (!m.title || !m.uri || !m.creation_timestamp) continue;
    const entry = instagramCaptionEntry(m.title);
    if (!entry || existing.has(entry.episode) || byEpisode.has(entry.episode)) continue;
    byEpisode.set(entry.episode, { entry, uri: m.uri, creationTimestamp: m.creation_timestamp });
  }
  return [...byEpisode.values()].sort((a, b) => a.entry.episode - b.entry.episode);
}

function hasFfprobe(): boolean {
  try {
    execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function probeDuration(filePath: string): number | undefined {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', filePath],
      { encoding: 'utf8' },
    );
    const seconds = parseFloat(out.trim());
    return Number.isFinite(seconds) ? Math.round(seconds) : undefined;
  } catch {
    return undefined;
  }
}

function main() {
  const src = sourceDir();
  const existingRows = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8')) as UggSeedRow[];
  const existing = new Set(existingRows.map((r) => r.episode));

  const reels = collectNewReels(src, existing);
  if (reels.length === 0) {
    console.log('no new UGG episodes in the export — nothing to do.');
    return;
  }
  console.log(`new episodes: ${reels.map((r) => r.entry.episode).join(', ')}`);

  // Copy videos into the repo's gitignored video dir (leave the export intact).
  fs.mkdirSync(DEST_DIR, { recursive: true });
  let copied = 0;
  let kept = 0;
  for (const reel of reels) {
    const dest = path.join(DEST_DIR, videoFilename(reel.entry.episode));
    if (fs.existsSync(dest)) {
      kept++;
      continue;
    }
    const from = path.join(src, reel.uri);
    if (!fs.existsSync(from)) {
      console.error(`missing video for episode ${reel.entry.episode}: ${from}`);
      process.exit(1);
    }
    fs.copyFileSync(from, dest);
    copied++;
  }
  console.log(`videos: copied ${copied}, already in place ${kept} -> ${DEST_DIR}`);

  const timestamps = new Map<number, number>(reels.map((r) => [r.entry.episode, r.creationTimestamp]));
  const durations = new Map<number, number>();
  if (hasFfprobe()) {
    for (const reel of reels) {
      const d = probeDuration(path.join(DEST_DIR, videoFilename(reel.entry.episode)));
      if (d !== undefined) durations.set(reel.entry.episode, d);
    }
    console.log(`durations: probed ${durations.size} via ffprobe`);
  } else {
    console.log('durations: ffprobe not found, skipping');
  }

  const newRows = buildSeedRows(reels.map((r) => r.entry), timestamps, durations);
  const merged = [...existingRows, ...newRows].sort((a, b) => a.episode - b.episode);
  fs.writeFileSync(SEED_FILE, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`seed: ${existingRows.length} -> ${merged.length} rows in ${SEED_FILE}`);
}

main();
