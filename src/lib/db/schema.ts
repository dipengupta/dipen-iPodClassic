import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  sourceUrl: text('source_url').notNull(),
  sourceLabel: text('source_label').notNull(),
  publishedLabel: text('published_label').notNull(),
  publishedAt: text('published_at'),
  bodyHtml: text('body_html').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const tweets = sqliteTable('tweets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // The account numbers its tweets ("N/x"); shown as the detail title.
  // Unique so re-running the seed can't duplicate the archive.
  number: integer('number').unique(),
  text: text('text').notNull(),
  postedAt: text('posted_at').notNull(),
  url: text('url'),
  isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false),
});

// UGG Chronicles episodes: local videos served by /api/video/[file].
export const uggEpisodes = sqliteTable('ugg_episodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  episode: integer('episode').notNull().unique(),
  title: text('title').notNull(),
  // The song/jam name after "UGG Chronicles Ep. N | ".
  name: text('name').notNull(),
  caption: text('caption').notNull().default(''),
  postedAt: text('posted_at').notNull(),
  year: integer('year').notNull(),
  filename: text('filename').notNull(),
  durationSec: integer('duration_sec'),
});

export const guitars = sqliteTable('guitars', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  year: text('year').notNull().default(''),
  imagePath: text('image_path').notNull(),
  description: text('description').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  notesJson: text('notes_json').notNull().default('[]'),
  photosJson: text('photos_json').notNull().default('[]'),
  state: text('state'),
  country: text('country'),
});

export const mugs = sqliteTable('mugs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  giftedBy: text('gifted_by').notNull().default(''),
  category: text('category', { enum: ['state', 'city', 'country', 'special'] }).notNull(),
  detail: text('detail').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const galleryItems = sqliteTable('gallery_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  imagePath: text('image_path').notNull(),
  category: text('category').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Recipes: full ones carry the whole recipe in body; link-backed ones keep
// the original URL for the "View Original" footer.
export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  category: text('category', { enum: ['food', 'baking', 'drinks', 'tips'] }).notNull(),
  body: text('body').notNull(),
  sourceUrl: text('source_url'),
  sourceLabel: text('source_label'),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Spice blends & marinades: cuisine-specific flavour bases. A flat list (no
// category grouping); link-backed ones keep the source URL for the footer.
export const spiceBlends = sqliteTable('spice_blends', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  sourceUrl: text('source_url'),
  sourceLabel: text('source_label'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const timelineEntries = sqliteTable('timeline_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  role: text('role').notNull(),
  company: text('company').notNull(),
  dates: text('dates').notNull(),
  location: text('location').notNull().default(''),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const youtubeVideos = sqliteTable('youtube_videos', {
  videoId: text('video_id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  publishedAt: text('published_at').notNull(),
});

export const soundcloudTracks = sqliteTable('soundcloud_tracks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false),
});

// Music recommendations shown above Octavium. Spotify playlists open a native
// track list (recommendationTracks) that plays through the Now Playing card;
// Apple Music playlists deep-link out (no keyless control path).
export const recommendations = sqliteTable('recommendations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  service: text('service', { enum: ['spotify', 'apple'] }).notNull(),
  // Canonical open.spotify.com / music.apple.com playlist URL.
  playlistUrl: text('playlist_url').notNull(),
  note: text('note').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Tracks of a Spotify recommendation playlist. Seeded as the never-blank
// fallback and additively refreshed from the keyless embed feed. previewUrl is
// the 30s MP3 the hidden <audio> player streams.
export const recommendationTracks = sqliteTable('recommendation_tracks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recId: integer('rec_id').notNull(),
  trackUri: text('track_uri').notNull(),
  title: text('title').notNull(),
  artist: text('artist').notNull().default(''),
  previewUrl: text('preview_url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const links = sqliteTable('links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const concerts = sqliteTable('concerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Display year-group, e.g. "2010/2011" — kept as text on purpose.
  year: text('year').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const wifiNames = sqliteTable('wifi_names', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// The running "List": deadpan entries split into two groups.
export const listItems = sqliteTable('list_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category', { enum: ['ruining', 'right'] }).notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Tracks when each live fetcher last succeeded, for staleness checks.
export const fetchMeta = sqliteTable('fetch_meta', {
  key: text('key').primaryKey(),
  lastFetchedAt: integer('last_fetched_at', { mode: 'timestamp' }),
});

// Per-table seed fingerprints so deploys re-seed only the tables whose
// committed seed source changed (see syncSeed in src/lib/seed/seedDb.ts).
export const seedMeta = sqliteTable('seed_meta', {
  name: text('name').primaryKey(),
  fingerprint: text('fingerprint').notNull(),
});
