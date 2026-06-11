import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as getVideo } from '@/../app/api/video/[file]/route';

const params = (file: string) => ({ params: Promise.resolve({ file }) });
const req = (range?: string) =>
  new Request('http://test.local/', { headers: range ? { range } : {} });

const BYTES = Buffer.from('0123456789'.repeat(20)); // 200 bytes
let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugg-route-'));
  fs.writeFileSync(path.join(dir, 'ugg-7.mp4'), BYTES);
  process.env.VIDEOS_DIR = dir;
});

afterAll(() => {
  delete process.env.VIDEOS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('/api/video/[file]', () => {
  it('serves the whole file without a Range header', async () => {
    const res = await getVideo(req(), params('ugg-7.mp4'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('video/mp4');
    expect(res.headers.get('accept-ranges')).toBe('bytes');
    expect(res.headers.get('content-length')).toBe('200');
    expect(Buffer.from(await res.arrayBuffer()).equals(BYTES)).toBe(true);
  });

  it('serves 206 partial content for a bounded range', async () => {
    const res = await getVideo(req('bytes=0-99'), params('ugg-7.mp4'));
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 0-99/200');
    expect(res.headers.get('content-length')).toBe('100');
    expect(Buffer.from(await res.arrayBuffer()).equals(BYTES.subarray(0, 100))).toBe(true);
  });

  it('serves an open-ended range to the end of the file', async () => {
    const res = await getVideo(req('bytes=150-'), params('ugg-7.mp4'));
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 150-199/200');
    expect(Buffer.from(await res.arrayBuffer()).equals(BYTES.subarray(150))).toBe(true);
  });

  it('416s an unsatisfiable range', async () => {
    const res = await getVideo(req('bytes=500-'), params('ugg-7.mp4'));
    expect(res.status).toBe(416);
    expect(res.headers.get('content-range')).toBe('bytes */200');
  });

  it('404s missing episodes and rejects traversal-shaped names', async () => {
    expect((await getVideo(req(), params('ugg-9999.mp4'))).status).toBe(404);
    expect((await getVideo(req(), params('../secret.mp4'))).status).toBe(404);
    expect((await getVideo(req(), params('ugg-7.mp4.bak'))).status).toBe(404);
  });
});
