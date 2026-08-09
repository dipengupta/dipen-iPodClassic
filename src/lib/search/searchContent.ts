/**
 * Global search across every iTunes-reachable content source. Runs on the
 * server against the same SQLite DB the content routes use, plus the handful of
 * static pages (About / Octavium / Vinyls / Magnets).
 *
 * Matching is a simple case-insensitive substring scan in JS — the whole corpus
 * is a few thousand short rows, so this is fast and avoids SQL LIKE-escaping and
 * an FTS index. Each result carries the iTunes catalog `entryId` to open and a
 * `focusId` (`id`) matching that view's item id (see src/lib/itunes/loaders.ts),
 * so the UI can open the exact item.
 *
 * `locations` (the travel map) is intentionally excluded: iTunes has no map view
 * to open a location in.
 */

import { asc, desc, eq } from 'drizzle-orm';
import type { Db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { ABOUT_TEXT, MAGNETS_PHOTO, OCTAVIUM_PHOTO, VINYLS_PHOTO } from '@/lib/itunes/static';

export interface SearchResult {
  /** focusId — matches the destination view's item id. */
  id: string;
  /** iTunes catalog entry to select when opening this result. */
  entryId: string;
  title: string;
  snippet?: string;
}

export interface SearchGroup {
  type: string;
  label: string;
  results: SearchResult[];
}

export interface SearchResponse {
  query: string;
  total: number;
  groups: SearchGroup[];
}

const MIN_QUERY = 2;
const PER_GROUP_CAP = 25;
const SNIPPET_LEN = 120;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First field (in order) that contains `q`, else null — used to build a snippet. */
function firstMatch(q: string, fields: Array<string | null | undefined>): string | null {
  for (const f of fields) {
    if (f && f.toLowerCase().includes(q)) return f;
  }
  return null;
}

/** A ~SNIPPET_LEN window of `text` centered on the first match of `q`. */
function snippet(text: string, q: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const at = clean.toLowerCase().indexOf(q);
  if (at < 0) return clean.slice(0, SNIPPET_LEN) + (clean.length > SNIPPET_LEN ? '…' : '');
  const start = Math.max(0, at - Math.floor((SNIPPET_LEN - q.length) / 2));
  const end = Math.min(clean.length, start + SNIPPET_LEN);
  return (start > 0 ? '…' : '') + clean.slice(start, end) + (end < clean.length ? '…' : '');
}

export function searchContent(db: Db, rawQuery: string): SearchResponse {
  const query = rawQuery.trim();
  const q = query.toLowerCase();
  if (q.length < MIN_QUERY) return { query, total: 0, groups: [] };

  const groups: SearchGroup[] = [];
  const add = (type: string, label: string, results: SearchResult[]) => {
    if (results.length) groups.push({ type, label, results: results.slice(0, PER_GROUP_CAP) });
  };

  // Tweets
  const tweetRows = db.select().from(schema.tweets).orderBy(desc(schema.tweets.number)).all();
  add(
    'tweets',
    'Tweets',
    tweetRows
      .filter((t) => t.text.toLowerCase().includes(q))
      .map((t) => ({
        id: `tweet-${t.number ?? t.id}`,
        entryId: 'wri-tweets',
        title: t.number != null ? `pennguytweet #${t.number}` : 'pennguytweet',
        snippet: snippet(t.text, q),
      })),
  );

  // Articles (strip HTML for body matching + snippet)
  const articleRows = db.select().from(schema.articles).orderBy(asc(schema.articles.sortOrder)).all();
  add(
    'articles',
    'Articles',
    articleRows
      .map((a) => ({ a, body: stripHtml(a.bodyHtml) }))
      .filter(({ a, body }) => a.title.toLowerCase().includes(q) || body.toLowerCase().includes(q))
      .map(({ a, body }) => ({
        id: a.slug,
        entryId: 'wri-articles',
        title: a.title,
        snippet: snippet(a.title.toLowerCase().includes(q) ? a.title : body, q),
      })),
  );

  // Recipes
  const recipeRows = db.select().from(schema.recipes).orderBy(asc(schema.recipes.sortOrder)).all();
  add(
    'recipes',
    'Recipes',
    recipeRows
      .filter((r) => firstMatch(q, [r.title, r.body]))
      .map((r) => ({
        id: `recipe-${r.id}`,
        entryId: 'col-recipes',
        title: r.title,
        snippet: snippet(r.title.toLowerCase().includes(q) ? r.title : r.body, q),
      })),
  );

  // Videos — YouTube + UGG (available text only; no transcripts stored)
  const ytRows = db.select().from(schema.youtubeVideos).orderBy(desc(schema.youtubeVideos.publishedAt)).all();
  const uggRows = db.select().from(schema.uggEpisodes).orderBy(desc(schema.uggEpisodes.episode)).all();
  const videoResults: SearchResult[] = [
    ...ytRows
      .filter((v) => firstMatch(q, [v.title, v.description]))
      .map((v) => ({
        id: `yt-${v.videoId}`,
        entryId: 'mus-youtube',
        title: v.title,
        snippet: snippet(v.title.toLowerCase().includes(q) ? v.title : v.description, q),
      })),
    ...uggRows
      .filter((e) => firstMatch(q, [e.name, e.caption, e.title]))
      .map((e) => ({
        id: `ugg-${e.episode}`,
        entryId: 'mus-instagram',
        title: `Ep. ${e.episode} | ${e.name}`,
        snippet: snippet(e.caption || e.title, q),
      })),
  ];
  add('videos', 'Videos', videoResults);

  // Guitars
  const guitarRows = db.select().from(schema.guitars).orderBy(asc(schema.guitars.sortOrder)).all();
  add(
    'guitars',
    'Guitars',
    guitarRows
      .filter((g) => firstMatch(q, [g.name, g.description, g.year]))
      .map((g) => ({
        id: `guitar-${g.id}`,
        entryId: 'mus-guitars',
        title: g.name,
        snippet: snippet(g.name.toLowerCase().includes(q) ? g.name : g.description, q),
      })),
  );

  // Photos / Kitchen Wins / Alison (all gallery_items, different sidebar entries)
  const galleryRows = db.select().from(schema.galleryItems).orderBy(asc(schema.galleryItems.sortOrder)).all();
  const galleryCfg: Record<string, { prefix: string; entryId: string }> = {
    profile: { prefix: 'photo', entryId: 'pho-photos' },
    kitchen: { prefix: 'dish', entryId: 'pho-kitchen' },
    alison: { prefix: 'alison', entryId: 'col-alison' },
  };
  add(
    'photos',
    'Photos',
    galleryRows
      .filter((p) => galleryCfg[p.category] && firstMatch(q, [p.title, p.description]))
      .map((p) => {
        const cfg = galleryCfg[p.category];
        return {
          id: `${cfg.prefix}-${p.id}`,
          entryId: cfg.entryId,
          title: p.title || p.description,
          snippet: snippet(p.description || p.title, q),
        };
      }),
  );

  // Mugs
  const mugRows = db.select().from(schema.mugs).orderBy(asc(schema.mugs.sortOrder)).all();
  add(
    'mugs',
    'Mugs',
    mugRows
      .filter((m) => firstMatch(q, [m.title, m.detail, m.giftedBy]))
      .map((m) => ({
        id: `mug-${m.id}`,
        entryId: 'col-mugs',
        title: m.title,
        snippet: [m.detail, m.giftedBy && `from ${m.giftedBy}`].filter(Boolean).join(' · ') || undefined,
      })),
  );

  // Timeline / Professional
  const timelineRows = db.select().from(schema.timelineEntries).orderBy(asc(schema.timelineEntries.sortOrder)).all();
  add(
    'timeline',
    'Work History',
    timelineRows
      .filter((t) => firstMatch(q, [t.role, t.company, t.location, t.description]))
      .map((t) => ({
        id: `job-${t.id}`,
        entryId: 'abt-professional',
        title: `${t.role} · ${t.company}`,
        snippet: snippet(t.description || `${t.role} ${t.company} ${t.location}`, q),
      })),
  );

  // Concerts
  const concertRows = db.select().from(schema.concerts).orderBy(asc(schema.concerts.sortOrder)).all();
  add(
    'concerts',
    'Concerts',
    concertRows
      .filter((c) => firstMatch(q, [c.name, c.year]))
      .map((c) => ({ id: `concert-${c.id}`, entryId: 'odd-concerts', title: c.name, snippet: c.year })),
  );

  // Playlists (recommendations + their tracks) — open the playlist
  const recRows = db.select().from(schema.recommendations).orderBy(asc(schema.recommendations.sortOrder)).all();
  const playlistResults: SearchResult[] = [];
  const seenPlaylists = new Set<string>();
  for (const rec of recRows) {
    const tracks =
      rec.service === 'spotify'
        ? db.select().from(schema.recommendationTracks).where(eq(schema.recommendationTracks.recId, rec.id)).all()
        : [];
    const trackHit = tracks.find((tr) => firstMatch(q, [tr.title, tr.artist]));
    const hit = firstMatch(q, [rec.title, rec.note]) || trackHit;
    if (!hit) continue;
    const id = `pl-${rec.id}`;
    if (seenPlaylists.has(id)) continue;
    seenPlaylists.add(id);
    playlistResults.push({
      id,
      entryId: id,
      title: rec.title,
      snippet: trackHit ? `${trackHit.title}${trackHit.artist ? ` — ${trackHit.artist}` : ''}` : rec.note || undefined,
    });
  }
  add('playlists', 'Playlists', playlistResults);

  // Links
  const linkRows = db.select().from(schema.links).orderBy(asc(schema.links.sortOrder)).all();
  add(
    'links',
    'Links',
    linkRows
      .filter((l) => firstMatch(q, [l.label, l.url]))
      .map((l) => ({
        id: `link-${l.id}`,
        entryId: 'odd-links',
        title: l.label,
        snippet: l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
      })),
  );

  // Wi-Fi names
  const wifiRows = db.select().from(schema.wifiNames).orderBy(asc(schema.wifiNames.sortOrder)).all();
  add(
    'wifi',
    'Wi-Fi Names',
    wifiRows
      .filter((w) => w.name.toLowerCase().includes(q))
      .map((w) => ({ id: `wifi-${w.id}`, entryId: 'odd-wifi', title: w.name })),
  );

  // List
  const listRows = db.select().from(schema.listItems).orderBy(asc(schema.listItems.sortOrder)).all();
  add(
    'list',
    'List',
    listRows
      .filter((li) => li.name.toLowerCase().includes(q))
      .map((li) => ({ id: `list-${li.id}`, entryId: 'odd-list', title: li.name })),
  );

  // Static pages (About / Octavium / Vinyls / Magnets)
  const pages: Array<{ id: string; entryId: string; title: string; text: string }> = [
    { id: 'about', entryId: 'abt-about', title: 'About', text: ABOUT_TEXT },
    { id: '', entryId: 'mus-octavium', title: OCTAVIUM_PHOTO.title, text: OCTAVIUM_PHOTO.text },
    { id: '', entryId: 'col-vinyls', title: VINYLS_PHOTO.title, text: VINYLS_PHOTO.text },
    { id: '', entryId: 'col-magnets', title: MAGNETS_PHOTO.title, text: MAGNETS_PHOTO.text },
  ];
  add(
    'pages',
    'Pages',
    pages
      .filter((p) => firstMatch(q, [p.title, p.text]))
      .map((p) => ({ id: p.id, entryId: p.entryId, title: p.title, snippet: snippet(p.text, q) })),
  );

  const total = groups.reduce((n, g) => n + g.results.length, 0);
  return { query, total, groups };
}
