/**
 * One-shot image optimizer for the iPod screen.
 *
 * The screen's largest physical rendering is ~800px wide (380px device at
 * ~2x DPR), so every photo is converted to WebP at max 800px on the long
 * edge, quality 80, and the heavy original is deleted (originals live on in
 * the old personal-website repo).
 *
 * Workflow for new images: drop them under public/images/, run
 * `npm run optimize:images`, and reference the resulting .webp path in seed
 * data. Idempotent — existing .webp files are left alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const MAX_EDGE = 800;
const QUALITY = 80;
const CONVERTIBLE = new Set(['.jpg', '.jpeg', '.png']);

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function main() {
  let converted = 0;
  let savedBytes = 0;
  for (const file of walk(IMAGES_DIR)) {
    const ext = path.extname(file).toLowerCase();
    if (!CONVERTIBLE.has(ext)) continue;
    const target = file.slice(0, -ext.length) + '.webp';
    if (fs.existsSync(target)) {
      fs.unlinkSync(file);
      continue;
    }
    const before = fs.statSync(file).size;
    await sharp(file)
      .rotate() // bake in EXIF orientation before metadata is stripped
      .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(target);
    const after = fs.statSync(target).size;
    fs.unlinkSync(file);
    converted++;
    savedBytes += before - after;
    console.log(
      `${path.relative(IMAGES_DIR, file)}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`,
    );
  }
  console.log(`\n${converted} images converted, ${(savedBytes / 1024 / 1024).toFixed(1)}MB saved`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
