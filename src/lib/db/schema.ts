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
  text: text('text').notNull(),
  postedAt: text('posted_at'),
  url: text('url'),
  isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false),
});

export const reels = sqliteTable('reels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shortcode: text('shortcode').notNull().unique(),
  title: text('title').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').notNull().default(0),
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

export const links = sqliteTable('links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Tracks when each live fetcher last succeeded, for staleness checks.
export const fetchMeta = sqliteTable('fetch_meta', {
  key: text('key').primaryKey(),
  lastFetchedAt: integer('last_fetched_at', { mode: 'timestamp' }),
});
