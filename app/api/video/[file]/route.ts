import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export const dynamic = 'force-dynamic';

/**
 * Streams the on-device UGG videos (data/videos/ugg, gitignored — see
 * scripts/import-ugg.ts) with HTTP Range support. Safari refuses to play
 * <video> from endpoints that can't serve 206 partial content, and Next's
 * public/ static serving doesn't reliably honor Range in dev — hence a
 * dedicated route. Missing files 404 and the video view degrades gracefully.
 */

function videosDir(): string {
  // Read per-request so tests (and Docker) can point elsewhere via env.
  return process.env.VIDEOS_DIR ?? path.join(process.cwd(), 'data', 'videos', 'ugg');
}

// Strict allowlist; also rules out any path traversal.
const FILENAME = /^ugg-\d{1,4}\.mp4$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!FILENAME.test(file)) {
    return new Response('not found', { status: 404 });
  }
  const filePath = path.join(videosDir(), file);

  let size: number;
  try {
    size = (await fs.promises.stat(filePath)).size;
  } catch {
    return new Response('not found', { status: 404 });
  }

  const baseHeaders = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    // Episodes are immutable once imported; let the browser cache chunks.
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (range && (range[1] !== '' || range[2] !== '')) {
    let start: number;
    let end: number;
    if (range[1] === '') {
      // Suffix range: last N bytes.
      const suffix = Math.min(parseInt(range[2], 10), size);
      start = size - suffix;
      end = size - 1;
    } else {
      start = parseInt(range[1], 10);
      end = range[2] === '' ? size - 1 : Math.min(parseInt(range[2], 10), size - 1);
    }
    if (start >= size || start > end) {
      return new Response('range not satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }
    const stream = Readable.toWeb(
      fs.createReadStream(filePath, { start, end }),
    ) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    status: 200,
    headers: { ...baseHeaders, 'Content-Length': String(size) },
  });
}
