import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Db } from '../db/client';
import * as schema from '../db/schema';
import { playlistIdFromUrl } from '../fetchers/spotify';
import { parseArticleTemplate } from './parseArticle';

const SEED_DIR = path.join(process.cwd(), 'src', 'data', 'seed');

function readJson<T>(seedDir: string, file: string): T {
  return JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8')) as T;
}

/**
 * Some checkouts are missing parts of the seed content (it was accidentally
 * gitignored for a while). Seeding stays best-effort per file: a missing
 * source is skipped with a warning instead of aborting the whole seed.
 */
function readJsonOptional<T>(seedDir: string, file: string): T | undefined {
  if (!fs.existsSync(path.join(seedDir, file))) {
    console.warn(`seed: skipping ${file} (not found in ${seedDir})`);
    return undefined;
  }
  return readJson<T>(seedDir, file);
}

/** sha256 of a seed file, or null when the file is absent (skip, don't wipe). */
function fileFingerprint(seedDir: string, file: string): string | null {
  const full = path.join(seedDir, file);
  if (!fs.existsSync(full)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}

function articleFiles(seedDir: string): string[] {
  const dir = path.join(seedDir, 'articles');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^article\d+\.html$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
}

interface TravelSeed {
  visitedLocations: Array<{
    title: string;
    lat?: number;
    lng?: number;
    notes?: string[];
    photos?: Array<{ path: string; alt: string }>;
    state?: string;
    country?: string;
  }>;
  mugStates: Array<[string, string]>;
  mugCities: Array<[string, string, string, string]>;
  mugCountries: Array<[string, string]>;
  mugSpecials: Array<{ title: string; gifted_by: string }>;
}

interface UggSeedRow {
  episode: number;
  title: string;
  name: string;
  caption: string;
  postedAt: string;
  year: number;
  filename: string;
  durationSec?: number;
}

/**
 * One independently-seeded slice of the DB. `fingerprint` returns a hash of the
 * unit's seed source (or null when that source is absent, so syncSeed leaves
 * the table untouched rather than wiping it). `tables` are cleared before a
 * (re)seed so plain index-ordered inserts never double up.
 */
interface SeedUnit {
  name: string;
  tables: SQLiteTable[];
  fingerprint(seedDir: string): string | null;
  seed(db: Db, seedDir: string): void;
}

const SEED_UNITS: SeedUnit[] = [
  {
    // Articles: article1 (oldest) .. article10 (newest); list views sort by sortOrder desc.
    name: 'articles',
    tables: [schema.articles],
    fingerprint(seedDir) {
      const files = articleFiles(seedDir);
      if (files.length === 0) return null;
      const hash = crypto.createHash('sha256');
      for (const file of files) {
        hash.update(file);
        hash.update(fs.readFileSync(path.join(seedDir, 'articles', file)));
      }
      return hash.digest('hex');
    },
    seed(db, seedDir) {
      const files = articleFiles(seedDir);
      if (files.length === 0) console.warn(`seed: skipping articles (no ${path.join(seedDir, 'articles')})`);
      for (const file of files) {
        const num = parseInt(file.match(/\d+/)![0]);
        const parsed = parseArticleTemplate(fs.readFileSync(path.join(seedDir, 'articles', file), 'utf8'));
        db.insert(schema.articles)
          .values({
            slug: `article${num}`,
            title: parsed.title,
            sourceUrl: parsed.sourceUrl,
            sourceLabel: parsed.sourceLabel,
            publishedLabel: parsed.publishedLabel,
            bodyHtml: parsed.subtitleHtml
              ? `${parsed.subtitleHtml}\n${parsed.bodyHtml}`
              : parsed.bodyHtml,
            sortOrder: num,
          })
          .onConflictDoNothing()
          .run();
      }
    },
  },
  {
    // Scraped @20swithepennguy export (number/text/rawText/date/url). A null
    // date means the scraper couldn't resolve the tweet page (last few rows).
    name: 'tweets',
    tables: [schema.tweets],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'tweets.json'),
    seed(db, seedDir) {
      const tweets = readJsonOptional<Array<{ number: number; text: string; date: string | null; url: string | null }>>(seedDir, 'tweets.json') ?? [];
      for (const t of tweets) {
        db.insert(schema.tweets)
          .values({ number: t.number, text: t.text, postedAt: t.date, url: t.url ?? null, isSample: false })
          .onConflictDoNothing()
          .run();
      }
    },
  },
  {
    name: 'ugg',
    tables: [schema.uggEpisodes],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'ugg.json'),
    seed(db, seedDir) {
      const uggRows = readJsonOptional<UggSeedRow[]>(seedDir, 'ugg.json');
      for (const row of uggRows ?? []) {
        db.insert(schema.uggEpisodes)
          .values({
            episode: row.episode,
            title: row.title,
            name: row.name,
            caption: row.caption,
            postedAt: row.postedAt,
            year: row.year,
            filename: row.filename,
            durationSec: row.durationSec ?? null,
          })
          .onConflictDoNothing()
          .run();
      }
    },
  },
  {
    name: 'guitars',
    tables: [schema.guitars],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'guitars.json'),
    seed(db, seedDir) {
      const guitars = readJsonOptional<Array<{ name: string; year: string; imagePath: string; description: string }>>(seedDir, 'guitars.json') ?? [];
      guitars.forEach((g, i) => {
        db.insert(schema.guitars).values({ ...g, sortOrder: i }).run();
      });
    },
  },
  {
    // travel.json feeds both the map locations and the mug collection.
    name: 'travel',
    tables: [schema.locations, schema.mugs],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'travel.json'),
    seed(db, seedDir) {
      const travel = readJsonOptional<TravelSeed>(seedDir, 'travel.json') ?? {
        visitedLocations: [], mugStates: [], mugCities: [], mugCountries: [], mugSpecials: [],
      };
      for (const loc of travel.visitedLocations) {
        db.insert(schema.locations)
          .values({
            title: loc.title,
            lat: loc.lat ?? null,
            lng: loc.lng ?? null,
            notesJson: JSON.stringify(loc.notes ?? []),
            photosJson: JSON.stringify(loc.photos ?? []),
            state: loc.state ?? null,
            country: loc.country ?? null,
          })
          .run();
      }

      let mugOrder = 0;
      for (const [title, giftedBy] of travel.mugStates) {
        db.insert(schema.mugs).values({ title, giftedBy, category: 'state', sortOrder: mugOrder++ }).run();
      }
      for (const [city, giftedBy, country, state] of travel.mugCities) {
        db.insert(schema.mugs)
          .values({
            title: city,
            giftedBy,
            category: 'city',
            detail: [state, country].filter(Boolean).join(', '),
            sortOrder: mugOrder++,
          })
          .run();
      }
      for (const [title, giftedBy] of travel.mugCountries) {
        db.insert(schema.mugs).values({ title, giftedBy, category: 'country', sortOrder: mugOrder++ }).run();
      }
      for (const special of travel.mugSpecials) {
        db.insert(schema.mugs)
          .values({ title: special.title, giftedBy: special.gifted_by, category: 'special', sortOrder: mugOrder++ })
          .run();
      }
    },
  },
  {
    name: 'gallery',
    tables: [schema.galleryItems],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'gallery.json'),
    seed(db, seedDir) {
      const gallery = readJsonOptional<Array<{ title: string; description: string; imagePath: string; category: string }>>(seedDir, 'gallery.json') ?? [];
      gallery.forEach((item, i) => {
        db.insert(schema.galleryItems).values({ ...item, sortOrder: i }).run();
      });
    },
  },
  {
    name: 'timeline',
    tables: [schema.timelineEntries],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'timeline.json'),
    seed(db, seedDir) {
      const timeline = readJsonOptional<Array<{ role: string; company: string; dates: string; location: string; description: string }>>(seedDir, 'timeline.json') ?? [];
      timeline.forEach((entry, i) => {
        db.insert(schema.timelineEntries).values({ ...entry, sortOrder: i }).run();
      });
    },
  },
  {
    name: 'youtube',
    tables: [schema.youtubeVideos],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'youtube_videos.json'),
    seed(db, seedDir) {
      const videos = readJsonOptional<Array<{ videoId: string; title: string; date: string; description?: string }>>(seedDir, 'youtube_videos.json') ?? [];
      for (const v of videos) {
        db.insert(schema.youtubeVideos)
          .values({ videoId: v.videoId, title: v.title, description: v.description ?? '', publishedAt: v.date })
          .onConflictDoNothing()
          .run();
      }
    },
  },
  {
    // Music recommendations: playlists + their Spotify tracks (keyless preview
    // MP3s). The committed tracks are the never-blank fallback; the app
    // additively refreshes them at runtime. Regenerate with `npm run import:spotify`.
    name: 'recommendations',
    tables: [schema.recommendations, schema.recommendationTracks],
    fingerprint(seedDir) {
      const a = fileFingerprint(seedDir, 'recommendations.json');
      if (a === null) return null;
      const b = fileFingerprint(seedDir, 'recommendation-tracks.json') ?? '';
      return crypto.createHash('sha256').update(a).update(b).digest('hex');
    },
    seed(db, seedDir) {
      const playlists = readJsonOptional<Array<{ title: string; service: 'spotify' | 'apple'; playlistUrl: string; note?: string }>>(seedDir, 'recommendations.json') ?? [];
      const tracksByPlaylist = readJsonOptional<Record<string, Array<{ trackUri: string; title: string; artist: string; previewUrl: string }>>>(seedDir, 'recommendation-tracks.json') ?? {};
      playlists.forEach((p, i) => {
        const [row] = db
          .insert(schema.recommendations)
          .values({ title: p.title, service: p.service, playlistUrl: p.playlistUrl, note: p.note ?? '', sortOrder: i })
          .returning({ id: schema.recommendations.id })
          .all();
        if (p.service !== 'spotify') return;
        const id = playlistIdFromUrl(p.playlistUrl);
        const tracks = id ? tracksByPlaylist[id] ?? [] : [];
        tracks.forEach((t, j) => {
          db.insert(schema.recommendationTracks)
            .values({ recId: row.id, trackUri: t.trackUri, title: t.title, artist: t.artist, previewUrl: t.previewUrl, sortOrder: j })
            .run();
        });
      });
    },
  },
  {
    // SoundCloud resolves live via its widget; this row is the never-blank
    // fallback. No seed file, so the fingerprint is a constant version tag.
    name: 'soundcloud',
    tables: [schema.soundcloudTracks],
    fingerprint: () => 'soundcloud-fallback-v1',
    seed(db) {
      db.insert(schema.soundcloudTracks)
        .values({ title: 'The Side Project — open on SoundCloud', url: 'https://soundcloud.com/dipen-gupta/tracks', sortOrder: 0, isSample: true })
        .run();
    },
  },
  {
    name: 'links',
    tables: [schema.links],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'links.json'),
    seed(db, seedDir) {
      const links = readJsonOptional<Array<{ label: string; url: string }>>(seedDir, 'links.json') ?? [];
      links.forEach((link, i) => {
        db.insert(schema.links).values({ ...link, sortOrder: i }).run();
      });
    },
  },
  {
    // Concerts: an ordered array of year groups — an object keyed by year
    // would re-order integer-like keys ("2012") ahead of "2010/2011".
    name: 'concerts',
    tables: [schema.concerts],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'concerts.json'),
    seed(db, seedDir) {
      const concerts = readJsonOptional<Array<{ year: string; shows: string[] }>>(seedDir, 'concerts.json') ?? [];
      let concertOrder = 0;
      for (const group of concerts) {
        for (const name of group.shows) {
          db.insert(schema.concerts).values({ year: group.year, name, sortOrder: concertOrder++ }).run();
        }
      }
    },
  },
  {
    name: 'wifi',
    tables: [schema.wifiNames],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'wifi.json'),
    seed(db, seedDir) {
      const wifi = readJsonOptional<string[]>(seedDir, 'wifi.json') ?? [];
      wifi.forEach((name, i) => {
        db.insert(schema.wifiNames).values({ name, sortOrder: i }).run();
      });
    },
  },
  {
    name: 'list',
    tables: [schema.listItems],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'list.json'),
    seed(db, seedDir) {
      const listGroups = readJsonOptional<Array<{ category: 'ruining' | 'right'; items: string[] }>>(seedDir, 'list.json') ?? [];
      let listOrder = 0;
      for (const group of listGroups) {
        for (const name of group.items) {
          db.insert(schema.listItems).values({ category: group.category, name, sortOrder: listOrder++ }).run();
        }
      }
    },
  },
  {
    name: 'recipes',
    tables: [schema.recipes],
    fingerprint: (seedDir) => fileFingerprint(seedDir, 'recipes.json'),
    seed(db, seedDir) {
      const recipes = readJsonOptional<Array<{ title: string; category: 'food' | 'baking' | 'drinks' | 'tips'; body: string; sourceUrl?: string; sourceLabel?: string }>>(seedDir, 'recipes.json') ?? [];
      recipes.forEach((recipe, i) => {
        db.insert(schema.recipes)
          .values({
            title: recipe.title,
            category: recipe.category,
            body: recipe.body,
            sourceUrl: recipe.sourceUrl ?? null,
            sourceLabel: recipe.sourceLabel ?? null,
            sortOrder: i,
          })
          .run();
      });
    },
  },
];

export function isSeeded(db: Db): boolean {
  // Checkouts missing parts of the seed content shouldn't re-seed forever
  // (and double-insert what they do have) — any seeded table counts.
  return (
    db.select().from(schema.articles).limit(1).all().length > 0 ||
    db.select().from(schema.tweets).limit(1).all().length > 0 ||
    db.select().from(schema.uggEpisodes).limit(1).all().length > 0
  );
}

export function clearAll(db: Db): void {
  for (const unit of SEED_UNITS) {
    for (const table of unit.tables) db.delete(table).run();
  }
  db.delete(schema.fetchMeta).run();
  db.delete(schema.seedMeta).run();
}

/** Full seed from scratch — every unit, no fingerprint bookkeeping. */
export function seedDb(db: Db, seedDir: string = SEED_DIR): void {
  for (const unit of SEED_UNITS) unit.seed(db, seedDir);
}

/**
 * Idempotent, per-table seed used on every deploy. For each unit, compares the
 * current seed-source fingerprint against the one recorded in `seed_meta`:
 * unchanged units are skipped, new or changed ones are cleared and re-seeded.
 * A unit whose source is absent (partial checkout) is left untouched.
 * Returns the names of the units that were (re)seeded.
 */
export function syncSeed(db: Db, seedDir: string = SEED_DIR): string[] {
  const changed: string[] = [];
  for (const unit of SEED_UNITS) {
    const fingerprint = unit.fingerprint(seedDir);
    if (fingerprint === null) continue;
    const stored = db
      .select()
      .from(schema.seedMeta)
      .where(eq(schema.seedMeta.name, unit.name))
      .limit(1)
      .all()[0];
    if (stored?.fingerprint === fingerprint) continue;
    for (const table of unit.tables) db.delete(table).run();
    unit.seed(db, seedDir);
    db.insert(schema.seedMeta)
      .values({ name: unit.name, fingerprint })
      .onConflictDoUpdate({ target: schema.seedMeta.name, set: { fingerprint } })
      .run();
    changed.push(unit.name);
  }
  return changed;
}
