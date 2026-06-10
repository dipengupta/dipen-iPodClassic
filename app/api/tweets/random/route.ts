import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tweet = getDb()
    .select()
    .from(schema.tweets)
    .orderBy(sql`RANDOM()`)
    .limit(1)
    .get();
  if (!tweet) {
    return NextResponse.json({ error: 'no tweets seeded' }, { status: 404 });
  }
  return NextResponse.json({ tweet });
}
