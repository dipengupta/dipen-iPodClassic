import { asc, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { refreshSpotifyIfStale } from '@/lib/fetchers/spotify';

export const dynamic = 'force-dynamic';

/** Playlists with their (Spotify) tracks nested, ordered by sortOrder. */
function recommendations() {
  const db = getDb();
  const playlists = db
    .select()
    .from(schema.recommendations)
    .orderBy(asc(schema.recommendations.sortOrder))
    .all();
  return playlists.map((playlist) => ({
    ...playlist,
    tracks:
      playlist.service === 'spotify'
        ? db
            .select()
            .from(schema.recommendationTracks)
            .where(eq(schema.recommendationTracks.recId, playlist.id))
            .orderBy(asc(schema.recommendationTracks.sortOrder))
            .all()
        : [],
  }));
}

const sections = {
  recommendations,
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
  alison: () =>
    getDb().select().from(schema.galleryItems)
      .where(eq(schema.galleryItems.category, 'alison'))
      .orderBy(asc(schema.galleryItems.sortOrder)).all(),
  recipes: () =>
    getDb().select().from(schema.recipes).orderBy(asc(schema.recipes.sortOrder)).all(),
  concerts: () =>
    getDb().select().from(schema.concerts).orderBy(asc(schema.concerts.sortOrder)).all(),
  wifi: () =>
    getDb().select().from(schema.wifiNames).orderBy(asc(schema.wifiNames.sortOrder)).all(),
  list: () =>
    getDb().select().from(schema.listItems).orderBy(asc(schema.listItems.sortOrder)).all(),
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
  // Additive, keyless Spotify track refresh — failures fall back to the seed.
  if (section === 'recommendations') await refreshSpotifyIfStale(getDb());
  return NextResponse.json({ items: query() });
}
