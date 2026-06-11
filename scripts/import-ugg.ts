/**
 * One-shot (re-runnable) importer for the UGG Chronicles Instagram archive.
 *
 *   npm run import:ugg -- --source "/path/to/UGG Project"
 *
 * Expects the source directory to contain:
 *   - ugg_captions.json                       {episode, title, caption}[]
 *   - videos/UGG NNN - <name>.mp4             one per episode
 *   - instagram-*\/your_instagram_activity/media/{reels,posts_1,igtv_videos}.json
 *     (the official export; used only to recover posting timestamps)
 *
 * What it does:
 *   1. Fixes the export's UTF-8-as-latin-1 mojibake.
 *   2. Resolves a posting timestamp for every episode (title match, then
 *      caption match for the 2021 IGTV-era posts) — hard-fails if any episode
 *      is left without one.
 *   3. MOVES (renames, never copies) each video to data/videos/ugg/ugg-N.mp4.
 *      data/ is gitignored, so the 2.7GB never lands in the repo history.
 *   4. Reads durations via ffprobe when available (skipped otherwise).
 *   5. Writes the committed seed file src/data/seed/ugg.json.
 *
 * Idempotent: already-moved videos are left alone, so it can be re-run after
 * a partial import or when new episodes are added to the source folder.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildSeedRows,
  fixMojibake,
  resolveTimestamps,
  videoFilename,
  type CaptionEntry,
  type ExportItem,
} from './ugg-lib';

const DEST_DIR = path.join(process.cwd(), 'data', 'videos', 'ugg');
const SEED_FILE = path.join(process.cwd(), 'src', 'data', 'seed', 'ugg.json');

function sourceDir(): string {
  const idx = process.argv.indexOf('--source');
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error('usage: npm run import:ugg -- --source "/path/to/UGG Project"');
    process.exit(1);
  }
  return process.argv[idx + 1];
}

function readCaptions(src: string): CaptionEntry[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(src, 'ugg_captions.json'), 'utf8'),
  ) as CaptionEntry[];
  return raw.map((entry) => ({
    episode: entry.episode,
    title: fixMojibake(entry.title),
    caption: fixMojibake(entry.caption ?? ''),
  }));
}

/** Flatten the three export files into title+timestamp pairs. */
function readExportItems(src: string): ExportItem[] {
  const mediaDirs = fs
    .readdirSync(src, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('instagram-'))
    .map((e) => path.join(src, e.name, 'your_instagram_activity', 'media'))
    .filter((dir) => fs.existsSync(dir));
  if (mediaDirs.length === 0) {
    console.error(`no instagram-*/your_instagram_activity/media directory under ${src}`);
    process.exit(1);
  }

  interface RawMedia { title?: string; creation_timestamp?: number }
  interface RawItem extends RawMedia { media?: RawMedia[] }

  const items: ExportItem[] = [];
  const push = (raw: RawItem) => {
    const media = raw.media?.[0];
    const title = raw.title || media?.title || '';
    const ts = raw.creation_timestamp ?? media?.creation_timestamp;
    if (title && ts) items.push({ title: fixMojibake(title), creationTimestamp: ts });
  };

  for (const dir of mediaDirs) {
    const file = (name: string) => path.join(dir, name);
    if (fs.existsSync(file('reels.json'))) {
      const parsed = JSON.parse(fs.readFileSync(file('reels.json'), 'utf8')) as {
        ig_reels_media: RawItem[];
      };
      parsed.ig_reels_media.forEach(push);
    }
    if (fs.existsSync(file('posts_1.json'))) {
      (JSON.parse(fs.readFileSync(file('posts_1.json'), 'utf8')) as RawItem[]).forEach(push);
    }
    if (fs.existsSync(file('igtv_videos.json'))) {
      const parsed = JSON.parse(fs.readFileSync(file('igtv_videos.json'), 'utf8')) as {
        ig_igtv_media: RawItem[];
      };
      parsed.ig_igtv_media.forEach(push);
    }
  }
  return items;
}

/** Map episode number -> current path of its source video, by "UGG NNN" prefix. */
function indexSourceVideos(src: string): Map<number, string> {
  const dir = path.join(src, 'videos');
  const map = new Map<number, string>();
  if (!fs.existsSync(dir)) return map;
  for (const name of fs.readdirSync(dir)) {
    const m = /^UGG\s+(\d+)\s*-/.exec(name);
    if (m && name.toLowerCase().endsWith('.mp4')) {
      map.set(parseInt(m[1], 10), path.join(dir, name));
    }
  }
  return map;
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
  const captions = readCaptions(src);
  console.log(`captions: ${captions.length} episodes`);

  const exportItems = readExportItems(src);
  const { timestamps, unresolved } = resolveTimestamps(captions, exportItems);
  if (unresolved.length > 0) {
    console.error(
      `could not resolve posting dates for episodes: ${unresolved.join(', ')}\n` +
        'refusing to guess — check the export files.',
    );
    process.exit(1);
  }
  console.log(`timestamps: resolved all ${timestamps.size} episodes`);

  // Move videos into the repo (data/ is gitignored).
  fs.mkdirSync(DEST_DIR, { recursive: true });
  const sources = indexSourceVideos(src);
  const missing: number[] = [];
  let moved = 0;
  let kept = 0;
  for (const entry of captions) {
    const dest = path.join(DEST_DIR, videoFilename(entry.episode));
    const from = sources.get(entry.episode);
    if (fs.existsSync(dest)) {
      kept++;
      continue;
    }
    if (!from) {
      missing.push(entry.episode);
      continue;
    }
    fs.renameSync(from, dest);
    moved++;
  }
  if (missing.length > 0) {
    console.error(`no video file found for episodes: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`videos: moved ${moved}, already in place ${kept} -> ${DEST_DIR}`);

  const durations = new Map<number, number>();
  if (hasFfprobe()) {
    for (const entry of captions) {
      const d = probeDuration(path.join(DEST_DIR, videoFilename(entry.episode)));
      if (d !== undefined) durations.set(entry.episode, d);
    }
    console.log(`durations: probed ${durations.size} via ffprobe`);
  } else {
    console.log('durations: ffprobe not found, skipping');
  }

  const rows = buildSeedRows(captions, timestamps, durations);
  fs.writeFileSync(SEED_FILE, `${JSON.stringify(rows, null, 2)}\n`);
  const years = new Map<number, number>();
  for (const row of rows) years.set(row.year, (years.get(row.year) ?? 0) + 1);
  console.log(
    `seed: wrote ${rows.length} rows to ${SEED_FILE}\n` +
      [...years.entries()]
        .sort(([a], [b]) => b - a)
        .map(([year, n]) => `  ${year}: ${n} episodes`)
        .join('\n'),
  );
}

main();
