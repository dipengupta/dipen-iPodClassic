import { asc, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const sections = {
  guitars: () => getDb().select().from(schema.guitars).orderBy(asc(schema.guitars.sortOrder)).all(),
  mugs: () => getDb().select().from(schema.mugs).orderBy(asc(schema.mugs.sortOrder)).all(),
  photos: () =>
    getDb().select().from(schema.galleryItems)
      .where(eq(schema.galleryItems.category, 'profile'))
      .orderBy(asc(schema.galleryItems.sortOrder)).all(),
  kitchen: () =>
    getDb().select().from(schema.galleryItems)
      .where(eq(schema.galleryItems.category, 'kitchen'))
      .orderBy(asc(schema.galleryItems.sortOrder)).all(),
  concerts: () =>
    getDb().select().from(schema.concerts).orderBy(asc(schema.concerts.sortOrder)).all(),
  wifi: () =>
    getDb().select().from(schema.wifiNames).orderBy(asc(schema.wifiNames.sortOrder)).all(),
  timeline: () => getDb().select().from(schema.timelineEntries).orderBy(asc(schema.timelineEntries.sortOrder)).all(),
  links: () => getDb().select().from(schema.links).orderBy(asc(schema.links.sortOrder)).all(),
  // Most recent episode first; the menu groups these into year sub-lists.
  ugg: () =>
    getDb().select().from(schema.uggEpisodes).orderBy(desc(schema.uggEpisodes.episode)).all(),
  // Scraped pennguytweets, newest first. Ordered by the account's own
  // numbering — a few scraped rows have no resolvable date.
  tweets: () =>
    getDb().select().from(schema.tweets).orderBy(desc(schema.tweets.number)).all(),
} satisfies Record<string, () => unknown[]>;

export type ContentSection = keyof typeof sections;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params;
  const query = sections[section as ContentSection];
  if (!query) {
    return NextResponse.json({ error: `unknown section: ${section}` }, { status: 404 });
  }
  return NextResponse.json({ items: query() });
}
