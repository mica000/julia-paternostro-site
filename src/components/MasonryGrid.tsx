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
import { useMemo } from "react";
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
}: Props) {
  const imageList = getImages(imageStyle);
  const objectFit =
    imageStyle === "without-bg" ? "object-contain" : "object-cover";
  const { begin } = useTransition();

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
                <div
                  key={project.slug}
                  className="tile-hover relative w-full cursor-pointer overflow-hidden"
                  data-title={project.title}
                  data-category={project.category.en}
                  data-slug={project.slug}
                  data-bg={bgColor}
                  onClick={(e) => onTileClick(e, project.slug, bgColor)}
                  style={
                    {
                      // aspectRatio uses `w / h`, so a tile that's 1.4× taller
                      // than wide expresses as "1 / 1.4".
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
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
