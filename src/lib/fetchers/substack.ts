import { XMLParser } from 'fast-xml-parser';
import { desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import * as schema from '../db/schema';
import { isStale, markFetched } from './youtubeRss';

export const SUBSTACK_FEED_URL = 'https://dipengupta.substack.com/feed';

const STALE_MS = 24 * 60 * 60 * 1000;
const META_KEY = 'substack';

/** Feed posts that should never appear (e.g. Substack's default inaugural post). */
const EXCLUDED_SLUGS = new Set(['coming-soon']);

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface FeedArticle {
  slug: string;
  title: string;
  sourceUrl: string;
  publishedLabel: string;
  publishedAt: string | null; // ISO date
  bodyHtml: string;
}

function slugFromLink(link: string): string | null {
  const match = link.match(/\/p\/([^/?#]+)/);
  return match ? match[1] : null;
}

function publishedLabel(pubDate: string): { label: string; iso: string | null } {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return { label: '', iso: null };
  const label = `Published ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
  return { label, iso: date.toISOString().slice(0, 10) };
}

/** Parses a Substack RSS 2.0 feed into article entries (full HTML bodies). */
export function parseSubstackFeed(xml: string): FeedArticle[] {
  const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata' });
  const doc = parser.parse(xml);
  let items = doc?.rss?.channel?.item ?? [];
  if (!Array.isArray(items)) items = [items];
  const articles: FeedArticle[] = [];
  for (const item of items) {
    const link = String(unwrapCdata(item?.link) ?? '');
    const slug = slugFromLink(link);
    const title = unwrapCdata(item?.title);
    const body = String(unwrapCdata(item?.['content:encoded']) ?? '').trim();
    if (!slug || !title || !body) continue;
    const { label, iso } = publishedLabel(String(unwrapCdata(item?.pubDate) ?? ''));
    articles.push({
      slug,
      title: String(title),
      sourceUrl: link.split('?')[0],
      publishedLabel: label,
      publishedAt: iso,
      bodyHtml: body,
    });
  }
  return articles;
}

function unwrapCdata(value: unknown): unknown {
  if (value && typeof value === 'object' && '__cdata' in value) {
    return (value as { __cdata: unknown }).__cdata;
  }
  return value;
}

/**
 * Pulls new Substack posts into the articles table. Strictly additive: posts
 * whose URL or slug already exist (including the 10 seeded ones) are skipped,
 * so a thin or truncated feed can never clobber saved article text.
 */
export async function refreshArticlesIfStale(
  db: Db,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!isStale(db, META_KEY, STALE_MS)) return;
  try {
    const res = await fetchImpl(SUBSTACK_FEED_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const feed = parseSubstackFeed(await res.text());
    if (feed.length === 0) return;

    const existing = db
      .select({
        slug: schema.articles.slug,
        sourceUrl: schema.articles.sourceUrl,
        title: schema.articles.title,
      })
      .from(schema.articles)
      .all();
    const known = new Set<string>();
    for (const row of existing) {
      known.add(row.slug);
      known.add(row.sourceUrl.split('?')[0]);
      // Cross-posts (e.g. Medium originals republished on Substack) have a
      // different URL and slug but the same title.
      known.add(normalizeTitle(row.title));
    }

    let maxOrder =
      db.select({ sortOrder: schema.articles.sortOrder })
        .from(schema.articles)
        .orderBy(desc(schema.articles.sortOrder))
        .limit(1)
        .get()?.sortOrder ?? 0;

    // Feed is newest-first; insert oldest-first so sortOrder keeps date order.
    for (const article of [...feed].reverse()) {
      if (EXCLUDED_SLUGS.has(article.slug)) continue;
      if (
        known.has(article.slug) ||
        known.has(article.sourceUrl) ||
        known.has(normalizeTitle(article.title))
      ) continue;
      db.insert(schema.articles)
        .values({
          slug: article.slug,
          title: article.title,
          sourceUrl: article.sourceUrl,
          sourceLabel: 'View original source on Substack',
          publishedLabel: article.publishedLabel,
          publishedAt: article.publishedAt,
          bodyHtml: article.bodyHtml,
          sortOrder: ++maxOrder,
        })
        .onConflictDoNothing()
        .run();
    }
    markFetched(db, META_KEY);
  } catch {
    // Seeded articles remain the baseline; retry on next stale check.
  }
}
