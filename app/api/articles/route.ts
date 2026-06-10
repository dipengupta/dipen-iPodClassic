import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { refreshArticlesIfStale } from '@/lib/fetchers/substack';

export const dynamic = 'force-dynamic';

export async function GET() {
  await refreshArticlesIfStale(getDb());
  const items = getDb()
    .select({
      slug: schema.articles.slug,
      title: schema.articles.title,
      publishedLabel: schema.articles.publishedLabel,
      sourceLabel: schema.articles.sourceLabel,
      sourceUrl: schema.articles.sourceUrl,
    })
    .from(schema.articles)
    .orderBy(desc(schema.articles.sortOrder))
    .all();
  return NextResponse.json({ items });
}
