/*
  Composition data & asset maps for the parallax index — shared by the live
  stage (ParallaxIndex) and the in-browser editor (CompositionEditor, reached
  with ?edit=1).

  The tile COORDINATES live in compositions.json (writable by the editor's Save
  → /api/save-composition). Everything derived from them — which images fill
  which slots, the hero per project, the geometry helpers — lives here so both
  the stage and the editor read one source and can't drift.
*/

import { projects, projectImageSet, type Project } from "@/lib/projects";
import compositionData from "@/lib/compositions.json";

// A single satellite slot. dx/dy = box-centre offset from the frame centre;
// w = width fraction; ratio = the asset's own aspect ("W / H"); depth = cursor
// drift scale only (not a position). See compositions.json for what dx/dy are
// measured against per breakpoint.
export type SatSlot = {
  dx: number;
  dy: number;
  w: number;
  ratio: string;
  depth: number;
  // The tile's image. Baked into the slot (not a parallel list) so a tile is
  // one self-contained unit the editor can move, resize, OR delete. Optional
  // only for the FIGMA_COMPOSITION fallback, which has none — those projects
  // fall back to their gallery images.
  src?: string;
};

// Default arrangement for any project without its own entry (Figma node
// 120:385, hero excluded). Kept in code — it's a constant fallback, not
// something the editor writes.
export const FIGMA_COMPOSITION: SatSlot[] = [
  { dx: -0.2797, dy: -0.2256, w: 0.1522, ratio: "292 / 406", depth: 0.5 },
  { dx: -0.0618, dy: -0.291, w: 0.3201, ratio: "615 / 377", depth: 0.7 },
  { dx: 0.3125, dy: -0.2256, w: 0.1105, ratio: "212 / 295", depth: 0.6 },
  { dx: -0.287, dy: 0.2513, w: 0.25, ratio: "480 / 295", depth: 0.4 },
  { dx: 0.1665, dy: 0.214, w: 0.4756, ratio: "913 / 560", depth: 0.55 },
];

export const COMPOSITIONS = compositionData.desktop as Record<string, SatSlot[]>;
export const COMPOSITIONS_MOBILE = compositionData.mobile as Record<
  string,
  SatSlot[]
>;

export function compositionFor(slug: string, isMobile: boolean): SatSlot[] {
  if (isMobile && COMPOSITIONS_MOBILE[slug]) return COMPOSITIONS_MOBILE[slug];
  return COMPOSITIONS[slug] ?? FIGMA_COMPOSITION;
}

// Asset path for a satellite webp. Filenames are the slugified Figma layer
// names, so a re-export lands on the same path.
export const sat = (folder: string, name: string) =>
  `/Images/img-satelites/${folder}/${name}.webp`;

// Big hero image per project (the 1200×736 rectangle each frame is built
// around). Falls back to the project's own index/gallery image.
export const HERO_IMAGES: Record<string, string> = {
  "delirio-tropical": sat("delirio-tropical", "tropical-lettering-background"),
  "delirio-sao-joao": sat("sao-joao", "sao-joao-banner-solo"),
  fcv: sat("30-fcv", "festival-collage-eyes-and-stars"),
  vivs: sat("vivs", "rectangle-81"),
  "a-selva": sat("selva", "background"),
  // Animated, not a still: the logo + grafismos build themselves on the red
  // ground (6 frames, 1920x1080). Flat saturated colour, so it stays a GIF —
  // H.264's 4:2:0 chroma smears exactly these edges. The index renders it
  // through next/image with `unoptimized`, which is what keeps it moving.
  "budapest-forro": "/Images/img-satelites/budapest/bff-logo.gif",
  // Tenda Lab's hero is the animated cover, not a still. It's the one hero
  // that is video — the source GIF was 8.5MB, so it ships as H.264 and the
  // index renders it in a <video> instead of an <img>.
  "tenda-lab": "/Images/Tenda-Lab/01.mp4",
};

/**
 * Heroes whose artwork spills past the rectangle (a transparent PNG export of
 * the whole Figma group). Instead of cropping to the hero box, the image is
 * placed so its `rect` lands on the box and the rest overhangs it.
 * `rect` and `size` are in the export's own units — Figma's, not pixels.
 */
export type HeroBleed = {
  rect: { x: number; y: number; w: number; h: number };
  size: { w: number; h: number };
};

export const HERO_BLEED: Record<string, HeroBleed> = {
  // Figma 245:293 — the banner alone (1309×736), a touch wider than the
  // standard hero, so it's fitted whole rather than cropped. The flower and
  // heron that overlap it are satellites of their own (compositions.json), so
  // they drift and fade in like every other piece.
  "delirio-sao-joao": {
    rect: { x: 0, y: 0, w: 1309.06, h: 736.44 },
    size: { w: 1309.06, h: 736.44 },
  },
};

/** Big hero image for a project — its hero override, else index/gallery. */
export function heroSrc(p: Project): string {
  return HERO_IMAGES[p.slug] ?? p.indexImage ?? projectImageSet(p, 1)[0];
}

/*
  Image for each slot, in order. Each slot now carries its own `src`, so the
  image comes straight off the slot. For a project on the FIGMA_COMPOSITION
  fallback (no per-slot src), fill from its gallery in reading order.
*/
export function satelliteImagesFor(p: Project, slots: SatSlot[]): string[] {
  const gallery = projectImageSet(p, slots.length);
  return slots.map((s, i) => s.src ?? gallery[i]);
}

export { projects };
