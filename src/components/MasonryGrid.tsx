"use client";

/*
  MasonryGrid — scrollable Pinterest-style grid
  ---------------------------------------------
  A separate view mode from GRID / LIST / ORBIT. Unlike those, this one is
  a normal scrollable page — no infinite canvas, no wheel/drag hijack — so
  it can freely lay tiles out at varying heights without worrying about
  the block-repeat seam that constrains InfiniteCanvas.

  Layout: column-shortest packing.
    For each project, find the column whose running height total is
    smallest and drop the tile into it. Result: adjacent columns fall out
    of vertical sync — the whole point of masonry.

  Aspect ratios:
    Each project can define its own `tileAspect` (h/w) — set that in
    projects.ts for per-tile control. When unset, the DEFAULT_ASPECTS
    cycle picks a mix of tall / square / wide so the grid still reads as
    masonry without any data curation.

  Cropping note:
    The current tile PNGs are square. Non-1.0 aspects display them with
    `object-cover`, which crops the source. If a specific project loses
    important artwork at the crop, either set `tileAspect: 1.0` for that
    project or swap in a source image at the target aspect.

  Click-through:
    Tiles carry the same `.tile-hover` class + `data-*` attributes as the
    other canvases, so the hover pill and custom cursor keep working here.
    Navigation uses the standard `useTransition().begin(...)` — same
    color-morph transition that fires from GRID / LIST / ORBIT.
*/

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { getImages, type CanvasConfig } from "@/lib/config";
import { projects, projectBg } from "@/lib/projects";
import { useTransition } from "@/components/PageTransition";

type Props = Pick<
  CanvasConfig,
  | "masonryCols"
  | "masonryGap"
  | "masonryMaxWidth"
  | "radius"
  | "hoverScale"
  | "hoverSpeed"
  | "imageStyle"
  | "background"
  | "imageCrop"
  | "breathe"
>;

// Cycle of default aspect ratios used when a project omits `tileAspect`.
// Length 6 (coprime with most column counts) so successive tiles rarely
// share the same shape — reads as intentional variety, not a pattern.
const DEFAULT_ASPECTS = [1.0, 1.3, 0.85, 1.4, 1.0, 1.15];

function aspectFor(index: number, override?: number): number {
  return override ?? DEFAULT_ASPECTS[index % DEFAULT_ASPECTS.length];
}

type PackedTile = {
  project: (typeof projects)[number];
  src: string;
  aspect: number;
};

export default function MasonryGrid({
  masonryCols,
  masonryGap,
  masonryMaxWidth,
  radius,
  hoverScale,
  hoverSpeed,
  imageStyle,
  background,
  imageCrop,
  breathe,
}: Props) {
  const imageList = getImages(imageStyle);
  const objectFit =
    imageStyle === "without-bg" ? "object-contain" : "object-cover";
  const { begin } = useTransition();

  // Breathe-scroll disabled for now — the grid stays static as the reader
  // scrolls. Retained gridRef so the ref-based DOM access below still
  // resolves without conditional logic; nothing writes to its transform.
  const gridRef = useRef<HTMLDivElement>(null);

  // Column-shortest packing. Running column heights are tracked in units of
  // "column widths" (each tile contributes `aspect` — since width is fixed
  // at 1 column, the aspect ratio equals its normalized height).
  const columns = useMemo(() => {
    const cols: PackedTile[][] = Array.from({ length: masonryCols }, () => []);
    const heights = new Array(masonryCols).fill(0);
    projects.forEach((p, i) => {
      const aspect = aspectFor(i, p.tileAspect);
      let shortest = 0;
      for (let c = 1; c < masonryCols; c++) {
        if (heights[c] < heights[shortest]) shortest = c;
      }
      cols[shortest].push({ project: p, src: imageList[i], aspect });
      heights[shortest] += aspect;
    });
    return cols;
  }, [masonryCols, imageList]);

  const onTileClick = (
    e: React.MouseEvent<HTMLDivElement>,
    slug: string,
    bgColor: string
  ) => {
    // Route through the shared color-morph transition, same as GRID / LIST /
    // ORBIT. The rect kicks off the overlay at the tile's exact position.
    const r = e.currentTarget.getBoundingClientRect();
    begin({
      color: bgColor,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      slug,
    });
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: background }}
    >
      {/* Hero reel — flashes through every project's tile image on mount
          (portorocha.com-style intro tease), then settles on the first
          project. Sits inside the same maxWidth column as the grid so
          it aligns with the tiles below. */}
      <HeroReel projects={projects} imageList={imageList} maxWidth={masonryMaxWidth} onTileClick={onTileClick} />

      {/*
        Content column: capped at masonryMaxWidth, centered. pt-[120px]
        clears the fixed TopNav (75px chrome + breathing room). pb-[120px]
        keeps the last row above BottomChrome.
      */}
      <div
        ref={gridRef}
        className="mx-auto grid pb-[120px] px-8"
        style={{
          maxWidth: masonryMaxWidth,
          gridTemplateColumns: `repeat(${masonryCols}, 1fr)`,
          columnGap: masonryGap,
        }}
      >
        {columns.map((col, ci) => (
          <div
            key={ci}
            className="flex flex-col"
            style={{ rowGap: masonryGap }}
          >
            {col.map(({ project, src, aspect }) => {
              const bgColor = projectBg(project);
              return (
                <div key={project.slug}>
                  <div
                    className="tile-hover relative w-full cursor-pointer overflow-hidden"
                    data-title={project.title}
                    data-category={project.category.en}
                    data-slug={project.slug}
                    data-bg={bgColor}
                    onClick={(e) => onTileClick(e, project.slug, bgColor)}
                    style={
                      {
                        aspectRatio: `1 / ${aspect}`,
                        borderRadius: radius,
                        transformOrigin: "center center",
                        transition: `transform ${hoverSpeed}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                        ["--tile-hover-scale" as string]: hoverScale,
                      } as React.CSSProperties
                    }
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      draggable={false}
                      sizes={`${Math.round(masonryMaxWidth / masonryCols)}px`}
                      unoptimized={src.endsWith(".gif")}
                      className={objectFit}
                      style={{ transform: `scale(${imageCrop})` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/*
  HeroReel — portorocha.com-style intro tease.

  On mount, cycles rapidly through every project's tile image (one
  image every FRAME_MS, total ≈ N × FRAME_MS ~= 1s for a typical
  10-project set) then settles on the first project. The cycling
  itself is what makes the reader register "there's a lot in here" —
  it's not a gallery, it's a flash of every canvas the site can offer.

  Uses <Image priority> for the first frame so it lands on the LCP path;
  subsequent frames swap `src` in place on the same node so the browser
  reuses its decoded frame. `unoptimized` on GIFs so they animate.

  Clickable — same navigation as tiles below via the shared color-morph
  transition. `data-cursor-ring` + `data-title`/`data-category` mean the
  HoverPill picks up the currently-visible project.
*/
function HeroReel({
  projects,
  imageList,
  maxWidth,
  onTileClick,
}: {
  projects: readonly (typeof import("@/lib/projects").projects)[number][];
  imageList: string[];
  maxWidth: number;
  onTileClick: (
    e: React.MouseEvent<HTMLDivElement>,
    slug: string,
    bgColor: string
  ) => void;
}) {
  // 3s per photo — slow enough to actually read the project, and the
  // reel loops forever so it doubles as an ambient rotating hero.
  const FRAME_MS = 3000;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Loop through every project indefinitely. Modulo wrap so we come
    // back around to the first project after the last one.
    const id = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % projects.length);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [projects.length]);

  const active = projects[idx];
  const src = imageList[idx];
  const bgColor = projectBg(active);

  return (
    <div
      className="mx-auto pt-[120px] pb-[140px] px-8"
      style={{ maxWidth }}
    >
      <div
        // No `.tile-hover` and no `data-*` cursor attrs — the reel is a
        // passive rotating hero, not a hoverable tile. Clicking still
        // routes through the color-morph transition to the currently-
        // shown project's case study.
        className="relative w-full cursor-pointer overflow-hidden"
        onClick={(e) => onTileClick(e, active.slug, bgColor)}
        style={{
          aspectRatio: "16 / 9",
          backgroundColor: bgColor,
          // Smooth color crossfade between projects so the bg swap
          // between images doesn't hard-cut.
          transition: "background-color 400ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Stack every project image absolutely inside the frame; only
            the active one sits at opacity 1. Prevents the flash-to-bg
            you'd get from swapping a single `<img>` src per interval,
            because the browser has all frames decoded and ready — the
            transition is just a CSS opacity change. */}
        {imageList.map((imgSrc, i) => (
          <Image
            key={projects[i]?.slug ?? i}
            src={imgSrc}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            draggable={false}
            unoptimized={imgSrc.endsWith(".gif")}
            className="object-cover"
            style={{
              opacity: i === idx ? 1 : 0,
              transition: "opacity 400ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
