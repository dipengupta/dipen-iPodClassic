import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { refreshYoutubeIfStale } from '@/lib/fetchers/youtubeRss';

export const dynamic = 'force-dynamic';

export async function GET() {
  await refreshYoutubeIfStale(getDb());
  const items = getDb()
    .select()
    .from(schema.youtubeVideos)
    .orderBy(desc(schema.youtubeVideos.publishedAt))
    .all();
  return NextResponse.json({ items });
}
