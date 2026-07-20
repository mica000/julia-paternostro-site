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
import { useEffect, useMemo, useRef } from "react";
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

  /*
    Breathe scroll — same feel as ScrollGrid but driven by native page
    scroll instead of a hijacked wheel. Each scroll event charges an
    energy value; a rAF loop decays it and writes the resulting scale
    into a CSS variable on the grid container. Each tile's transform
    reads `var(--breathe-scale, 1)` so idle tiles are unaffected and
    hover still wins via `.tile-hover:hover`.
  */
  const gridRef = useRef<HTMLDivElement>(null);
  const energy = useRef(0);
  const currentScale = useRef(1);
  const lastScrollY = useRef(0);
  const reduce = useRef(false);
  const breatheRef = useRef(breathe);
  useEffect(() => {
    breatheRef.current = breathe;
  }, [breathe]);

  useEffect(() => {
    reduce.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;
      energy.current = Math.min(1, energy.current + Math.abs(dy) * 0.01);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let id = 0;
    const loop = () => {
      energy.current *= 0.9;
      if (reduce.current) energy.current = 0;
      const target = 1 + energy.current * breatheRef.current;
      currentScale.current += (target - currentScale.current) * 0.15;
      const el = gridRef.current;
      if (el) {
        el.style.setProperty("--breathe-scale", currentScale.current.toFixed(4));
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(id);
    };
  }, []);

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
      {/*
        Content column: capped at masonryMaxWidth, centered. pt-[120px]
        clears the fixed TopNav (75px chrome + breathing room). pb-[120px]
        keeps the last row above BottomChrome.
      */}
      <div
        ref={gridRef}
        className="mx-auto grid pt-[120px] pb-[120px] px-8"
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
                // Outer wrapper carries the breathe swell only. No
                // transition so the rAF loop's small per-frame changes
                // read instantly instead of lagging 300ms behind.
                <div
                  key={project.slug}
                  style={{
                    transform: "scale(var(--breathe-scale, 1))",
                    transformOrigin: "center center",
                    willChange: "transform",
                  }}
                >
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
