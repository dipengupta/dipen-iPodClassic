import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

// Fallback track list; the client tries the SoundCloud widget's live
// getSounds() first and only falls back to this when the widget fails.
export async function GET() {
  const items = getDb()
    .select()
    .from(schema.soundcloudTracks)
    .orderBy(asc(schema.soundcloudTracks.sortOrder))
    .all();
  return NextResponse.json({ items });
}
