/*
  Shared canvas config
  --------------------
  One source of truth for the tuning parameters exposed in the control panel.
  Both the InfiniteCanvas and the ScrollGrid read this shape, so nothing gets
  out of sync when a slider moves.
*/

export type Mode = "grid" | "list" | "orbit" | "masonry";
export type ImageStyle = "with-bg" | "without-bg";

export type CanvasConfig = {
  mode: Mode;
  /** Which set of source PNGs to render. */
  imageStyle: ImageStyle;
  /** Decay per frame while gliding after release. Higher = longer glide. */
  friction: number;
  /** Multiplier applied to release velocity. 0 = no momentum, 2 = extra flick. */
  glide: number;
  /** Grid cell size in px. Tile sizes are jittered around this value. */
  cell: number;
  /** Columns per block (infinite mode) or across the page (scroll mode). */
  cols: number;
  /** Rows per block. Infinite mode only. */
  rows: number;
  /** Whitespace between tiles in px. Larger = more breathing room. */
  gap: number;
  /** Max plane shift (px) as the cursor moves around the viewport. */
  parallax: number;
  /** Corner radius of each tile in px. 0 = sharp corners. */
  radius: number;
  /** Max scale swell while scrolling. 0 = off, 0.1 = subtle 10% zoom on fast scroll. */
  breathe: number;
  /** Max grid width in scroll mode. Grid is centered when viewport is wider. */
  maxWidth: number;
  /** How much a tile grows on hover. 1 = no effect, 1.2 = 20% bigger. */
  hoverScale: number;
  /** Hover grow/shrink animation duration in ms. */
  hoverSpeed: number;
  /** Canvas background color (hex). Shows through the gaps between tiles
      and, in No-bg mode, through the transparent PNGs themselves. */
  background: string;
  /** Scale applied to the image inside each tile. Useful for cropping out
      a rounded-corner artifact baked into the source PNGs. 1 = no crop. */
  imageCrop: number;
  /** Accent color (hex) — tints the custom cursor dot and the hover pill's
      icon so they can match a brand color. */
  accent: string;
  /** Tile aspect ratio (height ÷ width). 1 = square, > 1 = portrait, < 1 = landscape. */
  tileRatio: number;
  /** Backdrop-blur radius (px) behind the nav fade regions.
      0 = disabled (recommended — no per-frame filter cost during drag/scroll).
      Higher values = more frosted-glass but progressively more GPU work. */
  navBlur: number;
  /** Orbit mode — radius of the 3D ring in px. Larger = wider fan, more
      space between adjacent cards. */
  orbitRadius: number;
  /** Orbit mode — tilt of cards (degrees) on the sides of the ring.
      0 = flat facing camera, higher = more banked/fanned look. */
  orbitTilt: number;
  /** Orbit mode — visible arc span in degrees. 360 = full ring visible,
      180 = only the front half fans across the viewport (Cash App look),
      lower values compress the fan tighter. Cards outside the arc fade out. */
  orbitArc: number;
  /** Orbit mode — card size (px, square). */
  orbitCardSize: number;
  /** Orbit mode — perspective depth (px). Lower = stronger 3D distortion. */
  orbitPerspective: number;
  /** Masonry mode — number of columns (Pinterest-style scrollable grid). */
  masonryCols: number;
  /** Masonry mode — gap between tiles in px. */
  masonryGap: number;
  /** Masonry mode — max content width in px; grid centers when viewport is wider. */
  masonryMaxWidth: number;
};

export const defaultConfig: CanvasConfig = {
  mode: "masonry",
  imageStyle: "with-bg",
  friction: 0.93,
  glide: 1.0,
  cell: 260,
  cols: 5,
  rows: 4,
  gap: 20,
  parallax: 30,
  radius: 0,
  breathe: 0.06,
  maxWidth: 1400,
  hoverScale: 1.06,
  hoverSpeed: 300,
  background: "#0a0a0a",
  imageCrop: 1,
  accent: "#e8ff59",
  tileRatio: 1,
  navBlur: 0,
  orbitRadius: 720,
  orbitTilt: 18,
  orbitArc: 180,
  orbitCardSize: 240,
  orbitPerspective: 1440,
  masonryCols: 3,
  masonryGap: 20,
  masonryMaxWidth: 1400,
};

/**
 * Metadata for each tile — used to populate the hover pill and drive the
 * order of images on the Work grid. Derived from the single `projects`
 * array in `./projects.ts`, so editing project titles/categories/slugs
 * there flows through to the Work tiles here without duplication.
 *
 * `slug` is threaded through so future click-to-navigate work can send
 * users directly to /work/{slug} without a second lookup.
 */
import { projects, projectBg } from "./projects";

export const productMeta: {
  title: string;
  category: string;
  slug: string;
  /** Case-study background — seeds the click-through color-morph transition.
      Uses the darkened project bg so the transition lands on the same
      color the case study actually paints. */
  bg: string;
}[] = projects.map((p) => ({
  title: p.title,
  category: p.category.en,
  slug: p.slug,
  bg: projectBg(p),
}));

/**
 * Tile images, derived from projects[] so adding a new project (or a GIF)
 * in `projects.ts` automatically extends the grid rotation without a second
 * edit here.
 */
export const images: string[] = projects.map((p) => p.tileImage);

/**
 * Background-free variants for the existing PNG tiles live in
 * `/public/Images/without bg/` as 01.png … 11.png. We map by pattern —
 * `/Images/NN-square.png` → `/Images/without%20bg/NN.png` — so the toggle
 * behavior stays identical for the original 11 projects. Anything else
 * (GIFs, future tiles that don't follow the pattern) falls back to the
 * same tileImage — there's no No-bg variant to swap in.
 */
export const imagesNoBg: string[] = projects.map((p) => {
  const m = p.tileImage.match(/^\/Images\/(\d+)-square\.png$/);
  return m ? `/Images/without%20bg/${m[1].padStart(2, "0")}.png` : p.tileImage;
});

export function getImages(style: ImageStyle): string[] {
  return style === "without-bg" ? imagesNoBg : images;
}
