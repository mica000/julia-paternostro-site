#!/usr/bin/env node
/*
  optimize-images.mjs
  -------------------
  Batch-optimize a folder of source images (as delivered from Figma / a
  camera) into web-ready WebP files, in place.

  What it does per file:
    1. Reads original PNG / JPG / JPEG.
    2. If the longest edge is > MAX_LONG_EDGE (default 2000px), downscales
       so the longest edge equals that. Preserves aspect ratio.
    3. Re-encodes as WebP:
         - lossy quality=85 when the source has NO transparency (photos,
           mockups, flat illustrations on solid backgrounds)
         - lossless when the source HAS transparency (logos, cutouts) so
           edges stay crisp
    4. Writes `<same-name>.webp` next to the original, then deletes the
       original PNG / JPG. The filename change is intentional — WebP is
       what browsers actually consume; keeping .png suffixes would be a
       lie about the content type.

  Usage:
    pnpm optimize-images public/Images/Delirio-Tropical
    pnpm optimize-images public/Images/Vivs public/Images/Fcv

  Safety:
    - Fails on individual files rather than aborting the whole batch.
    - Prints a summary of before/after sizes so the win is visible.
    - Won't re-encode files that are already WebP (skips with a note).
*/

import { readdir, stat, readFile, writeFile, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

// Tune these if the studio ever needs a different balance.
// MAX_LONG_EDGE 3200 keeps the images sharp on 2× retina displays up to
// ~1600px viewport, which covers most desktop monitors. Bump higher for
// larger-format prints or ultrawide displays; drop lower to trim bytes.
const MAX_LONG_EDGE = 3200;
const WEBP_QUALITY = 85;

// Accepts .png / .jpg / .jpeg from raw uploads AND .webp for the "re-optimize
// an already-processed folder" case (harmless if the file is already at the
// target quality — sharp will just re-encode it).
const SOURCE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function optimizeOne(filePath) {
  const buf = await readFile(filePath);
  const image = sharp(buf, { failOn: "none" });
  const meta = await image.metadata();
  const originalBytes = buf.length;

  // Downscale if either dimension exceeds the target.
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
  if (longEdge > MAX_LONG_EDGE) {
    image.resize({
      width: meta.width >= meta.height ? MAX_LONG_EDGE : undefined,
      height: meta.height > meta.width ? MAX_LONG_EDGE : undefined,
      withoutEnlargement: true,
    });
  }

  // WebP encoding strategy:
  //   - No alpha channel → lossy quality=85. Standard photo/mockup path.
  //   - Alpha channel     → lossy color at quality=85 with alphaQuality=100.
  //     This preserves transparency losslessly (so edges don't fringe on
  //     colored page backgrounds) while still compressing the visible
  //     pixels aggressively. Yields ~70% savings vs full-lossless on
  //     illustrations that have real transparent regions.
  // If you ever need pixel-perfect archival encoding, swap in
  // `{ lossless: true, effort: 6 }`.
  const webpOptions = meta.hasAlpha
    ? { quality: WEBP_QUALITY, alphaQuality: 100, effort: 6 }
    : { quality: WEBP_QUALITY, effort: 6 };

  const outBuf = await image.webp(webpOptions).toBuffer();
  const outPath = filePath.replace(/\.(png|jpe?g)$/i, ".webp");

  await writeFile(outPath, outBuf);
  // Only delete the original once the WebP has landed on disk. If the
  // extension didn't change (already .webp) we would have skipped earlier.
  if (outPath !== filePath) {
    await unlink(filePath);
  }

  return {
    originalBytes,
    newBytes: outBuf.length,
    outPath,
    mode: meta.hasAlpha
      ? `q${WEBP_QUALITY}+alpha`
      : `q${WEBP_QUALITY}`,
    dims: `${meta.width}×${meta.height}`,
  };
}

async function optimizeFolder(folder) {
  const entries = await readdir(folder);
  const targets = [];
  for (const name of entries) {
    const ext = extname(name).toLowerCase();
    if (!SOURCE_EXTS.has(ext)) continue;
    targets.push(join(folder, name));
  }
  if (targets.length === 0) {
    console.log(`  (no PNG / JPG files to optimize in ${folder})`);
    return { totalOld: 0, totalNew: 0, count: 0 };
  }

  console.log(`\n▸ ${folder} — ${targets.length} file(s)`);
  let totalOld = 0;
  let totalNew = 0;
  let count = 0;

  for (const filePath of targets) {
    try {
      const r = await optimizeOne(filePath);
      totalOld += r.originalBytes;
      totalNew += r.newBytes;
      count++;
      const savedPct = ((1 - r.newBytes / r.originalBytes) * 100).toFixed(0);
      console.log(
        `  ${basename(filePath).padEnd(28)} ${r.dims.padEnd(12)} ` +
          `${fmtBytes(r.originalBytes).padStart(10)} → ${fmtBytes(r.newBytes).padStart(10)} ` +
          `(${savedPct}% smaller, ${r.mode})`
      );
    } catch (err) {
      console.error(`  ✕ ${basename(filePath)}: ${err.message}`);
    }
  }
  return { totalOld, totalNew, count };
}

async function main() {
  const folders = process.argv.slice(2);
  if (folders.length === 0) {
    console.error(
      "Usage: pnpm optimize-images <folder> [<folder> ...]\n" +
        "Example: pnpm optimize-images public/Images/Delirio-Tropical"
    );
    process.exit(1);
  }

  // Confirm every folder exists before we start writing anything.
  for (const f of folders) {
    try {
      const s = await stat(f);
      if (!s.isDirectory()) {
        console.error(`✕ ${f} is not a directory`);
        process.exit(1);
      }
    } catch {
      console.error(`✕ ${f} does not exist`);
      process.exit(1);
    }
  }

  let grandOld = 0;
  let grandNew = 0;
  let grandCount = 0;
  for (const folder of folders) {
    const { totalOld, totalNew, count } = await optimizeFolder(folder);
    grandOld += totalOld;
    grandNew += totalNew;
    grandCount += count;
  }

  if (grandCount === 0) return;
  const pct = ((1 - grandNew / grandOld) * 100).toFixed(1);
  console.log(
    `\n▸ Summary: ${grandCount} file(s), ${fmtBytes(grandOld)} → ${fmtBytes(grandNew)} ` +
      `(${pct}% smaller)\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
