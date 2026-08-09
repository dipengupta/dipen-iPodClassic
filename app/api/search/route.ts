import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { searchContent } from '@/lib/search/searchContent';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  return NextResponse.json(searchContent(getDb(), q));
}
