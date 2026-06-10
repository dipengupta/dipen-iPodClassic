import fs from 'node:fs';
import path from 'node:path';
import type { Db } from '../db/client';
import * as schema from '../db/schema';
import { parseArticleTemplate } from './parseArticle';

const SEED_DIR = path.join(process.cwd(), 'src', 'data', 'seed');

function readJson<T>(seedDir: string, file: string): T {
  return JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8')) as T;
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

interface MusicSeed {
  instagramReels: Array<{ shortcode: string; title: string; caption?: string }>;
}

export function isSeeded(db: Db): boolean {
  return db.select().from(schema.articles).limit(1).all().length > 0;
}

export function clearAll(db: Db): void {
  for (const table of [
    schema.articles, schema.tweets, schema.reels, schema.guitars,
    schema.locations, schema.mugs, schema.galleryItems, schema.timelineEntries,
    schema.youtubeVideos, schema.soundcloudTracks, schema.links, schema.fetchMeta,
  ]) {
    db.delete(table).run();
  }
}

export function seedDb(db: Db, seedDir: string = SEED_DIR): void {
  // Articles: article1 (oldest) .. article10 (newest); list views sort by sortOrder desc.
  const articlesDir = path.join(seedDir, 'articles');
  const articleFiles = fs
    .readdirSync(articlesDir)
    .filter((f) => /^article\d+\.html$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
  for (const file of articleFiles) {
    const num = parseInt(file.match(/\d+/)![0]);
    const parsed = parseArticleTemplate(fs.readFileSync(path.join(articlesDir, file), 'utf8'));
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

  const tweets = readJson<Array<{ text: string; postedAt: string; url: string; isSample: boolean }>>(seedDir, 'tweets.json');
  for (const t of tweets) {
    db.insert(schema.tweets).values(t).run();
  }

  const music = readJson<MusicSeed>(seedDir, 'music.json');
  music.instagramReels.forEach((reel, i) => {
    db.insert(schema.reels)
      .values({
        shortcode: reel.shortcode,
        title: reel.title,
        caption: reel.caption ?? null,
        sortOrder: i,
      })
      .onConflictDoNothing()
      .run();
  });

  const guitars = readJson<Array<{ name: string; year: string; imagePath: string; description: string }>>(seedDir, 'guitars.json');
  guitars.forEach((g, i) => {
    db.insert(schema.guitars).values({ ...g, sortOrder: i }).run();
  });

  const travel = readJson<TravelSeed>(seedDir, 'travel.json');
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

  const gallery = readJson<Array<{ title: string; description: string; imagePath: string; category: string }>>(seedDir, 'gallery.json');
  gallery.forEach((item, i) => {
    db.insert(schema.galleryItems).values({ ...item, sortOrder: i }).run();
  });

  const timeline = readJson<Array<{ role: string; company: string; dates: string; location: string; description: string }>>(seedDir, 'timeline.json');
  timeline.forEach((entry, i) => {
    db.insert(schema.timelineEntries).values({ ...entry, sortOrder: i }).run();
  });

  const videos = readJson<Array<{ videoId: string; title: string; date: string; description?: string }>>(seedDir, 'youtube_videos.json');
  for (const v of videos) {
    db.insert(schema.youtubeVideos)
      .values({
        videoId: v.videoId,
        title: v.title,
        description: v.description ?? '',
        publishedAt: v.date,
      })
      .onConflictDoNothing()
      .run();
  }

  // SoundCloud resolves live via its widget; these rows are the never-blank fallback.
  const soundcloud = [
    { title: 'The Side Project — open on SoundCloud', url: 'https://soundcloud.com/dipen-gupta/tracks', sortOrder: 0, isSample: true },
  ];
  for (const track of soundcloud) {
    db.insert(schema.soundcloudTracks).values(track).run();
  }

  const links = readJson<Array<{ label: string; url: string }>>(seedDir, 'links.json');
  links.forEach((link, i) => {
    db.insert(schema.links).values({ ...link, sortOrder: i }).run();
  });
}
