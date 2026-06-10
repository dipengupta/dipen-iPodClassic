import { asc, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const sections = {
  guitars: () => getDb().select().from(schema.guitars).orderBy(asc(schema.guitars.sortOrder)).all(),
  mugs: () => getDb().select().from(schema.mugs).orderBy(asc(schema.mugs.sortOrder)).all(),
  locations: () => getDb().select().from(schema.locations).orderBy(asc(schema.locations.title)).all(),
  gallery: () =>
    getDb().select().from(schema.galleryItems)
      .where(inArray(schema.galleryItems.category, ['vinyl', 'mug', 'magnet', 'pin']))
      .orderBy(asc(schema.galleryItems.sortOrder)).all(),
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
  reels: () => getDb().select().from(schema.reels).orderBy(asc(schema.reels.sortOrder)).all(),
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
