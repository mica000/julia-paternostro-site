/*
  Grid helpers — shared by InfiniteCanvas and ScrollGrid
  ------------------------------------------------------
  A "block" is one repetition of the grid: cols × rows cells, each cell
  containing one tile. The block is what gets tiled infinitely in both modes.

  Uniform tiling: every tile is the same square, centered in its cell, with
  `gap` px of whitespace around it. No jitter, no size variation — the grid
  reads as a clean, regular layout.
*/

import { productMeta } from "@/lib/config";

export type Slot = {
  key: number;
  left: number;
  top: number;
  width: number;
  height: number;
  src: string;
  title: string;
  category: string;
  /** URL segment for /work/{slug} — threaded into data-slug on each tile. */
  slug: string;
  /** Case-study background color — seeds the click-through color-morph. */
  bg: string;
};

export function buildSlots(
  cell: number,
  cols: number,
  rows: number,
  gap: number,
  imageList: string[],
  tileRatio: number
): Slot[] {
  // Horizontal cell is `cell`; vertical is stretched by the ratio.
  // ratio > 1 → portrait cells; ratio < 1 → landscape.
  const cellW = cell;
  const cellH = cell * tileRatio;
  // Tile fills the cell minus the gap on each axis; keep a small minimum
  // so extreme gap values don't collapse tiles.
  const width = Math.max(40, cellW - gap);
  const height = Math.max(40, cellH - gap);
  const insetX = (cellW - width) / 2;
  const insetY = (cellH - height) / 2;

  const slots: Slot[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const meta = productMeta[i % productMeta.length];
    slots.push({
      key: i,
      left: col * cellW + insetX,
      top: row * cellH + insetY,
      width,
      height,
      src: imageList[i % imageList.length],
      title: meta.title,
      category: meta.category,
      slug: meta.slug,
      bg: meta.bg,
    });
  }
  return slots;
}
