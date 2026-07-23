"use client";

/*
  EditorialIndex — asymmetric editorial project index
  ---------------------------------------------------
  Inspired by pedroveneziano.com's home index. A light, native-scroll page
  where each project is a single image placed asymmetrically — varying width
  (roughly a third to two-thirds of the viewport) and horizontal alignment
  (hugging the left margin, the right margin, or centered), separated by
  generous, uneven whitespace. Occasionally two projects share a row,
  side by side. Each image carries its project name in small type below it,
  left-aligned to the image.

  It's a hand-composed rhythm rather than a strict grid: a repeating
  COMPOSITION of block templates (single / pair, each with its own width,
  alignment and top gap) is walked over the project list, so the layout
  reads as curated but works for any number of projects.

  Palette is deliberately light (off-white bg, near-black text) to match the
  reference's editorial feel — distinct from the studio's dark canvas views.
  The fixed TopNav sits on top via mix-blend-mode: difference, so its labels
  stay legible over this light background without any per-route wiring.

  Click behaviour matches every other view: tapping an image (or its caption)
  routes through the shared color-morph transition to the case study.
*/

import Image from "next/image";
import { useMemo } from "react";
import { projects, projectBg, type Project } from "@/lib/projects";
import { useTransition } from "@/components/PageTransition";

// Editorial palette — kept local so this view owns its light look.
const BG = "#e9e8e4";
const FG = "#141414";

// Source-image aspect ratios (w / h). The three hero projects use their
// dedicated landscape Index2 exports; every other project falls back to its
// tile PNG, which is a 960×1232 portrait (~0.78). Matching each frame's
// aspect to its source means object-cover never crops.
const TILE_RATIO = 960 / 1232; // ~0.78 portrait
const HERO_RATIO: Record<string, number> = {
  "delirio-tropical": 2740 / 1682, // ~1.63 landscape
  "delirio-sao-joao": 2739 / 1542, // ~1.78 landscape
  fcv: 2740 / 1682, // ~1.63 landscape
};

type Align = "left" | "right" | "center";

// One entry per vertical band. `single` places one project; `pair` places
// two side by side. `w` / `a` / `b` are viewport-width percentages (desktop);
// `gap` is the top margin above the block, in vw so whitespace scales with
// the viewport. First block's gap is small (it clears the nav padding).
type BlockTpl =
  | { kind: "single"; w: number; align: Align; gap: number }
  | { kind: "pair"; a: number; b: number; gap: number };

const COMPOSITION: BlockTpl[] = [
  { kind: "single", w: 60, align: "left", gap: 0 },
  { kind: "single", w: 34, align: "right", gap: 15 },
  { kind: "single", w: 48, align: "right", gap: 9 },
  { kind: "pair", a: 40, b: 40, gap: 13 },
  { kind: "single", w: 40, align: "left", gap: 12 },
  { kind: "single", w: 32, align: "right", gap: 10 },
  { kind: "pair", a: 38, b: 50, gap: 14 },
  { kind: "single", w: 34, align: "right", gap: 10 },
  { kind: "single", w: 56, align: "center", gap: 12 },
];

const ALIGN_CLASS: Record<Align, string> = {
  left: "md:mr-auto",
  right: "md:ml-auto",
  center: "md:mx-auto",
};

type Block =
  | { kind: "single"; project: Project; w: number; align: Align; gap: number }
  | { kind: "pair"; a: Project; b: Project; aw: number; bw: number; gap: number };

export default function EditorialIndex() {
  // Walk the COMPOSITION over the project list, consuming one project per
  // `single` and two per `pair`. Cycles the template when projects remain,
  // and degrades a trailing `pair` to a single if only one project is left.
  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = [];
    let pi = 0;
    let ci = 0;
    while (pi < projects.length) {
      const tpl = COMPOSITION[ci % COMPOSITION.length];
      ci++;
      if (tpl.kind === "pair" && pi + 1 < projects.length) {
        out.push({
          kind: "pair",
          a: projects[pi],
          b: projects[pi + 1],
          aw: tpl.a,
          bw: tpl.b,
          gap: tpl.gap,
        });
        pi += 2;
      } else if (tpl.kind === "pair") {
        // Only one project left — render it as a medium single instead.
        out.push({
          kind: "single",
          project: projects[pi],
          w: 50,
          align: "left",
          gap: tpl.gap,
        });
        pi += 1;
      } else {
        out.push({
          kind: "single",
          project: projects[pi],
          w: tpl.w,
          align: tpl.align,
          gap: tpl.gap,
        });
        pi += 1;
      }
    }
    return out;
  }, []);

  return (
    <div
      className="min-h-screen w-full px-2 md:px-3 pt-[120px] md:pt-[150px] pb-[160px]"
      style={{ backgroundColor: BG, color: FG }}
    >
      {blocks.map((block, i) =>
        block.kind === "single" ? (
          <div
            key={i}
            // Full width on mobile; the composed width + alignment only kick
            // in at md+. --w feeds the arbitrary md width utility below.
            className={`w-full md:w-[var(--w)] ${ALIGN_CLASS[block.align]}`}
            style={
              {
                marginTop: i === 0 ? undefined : `${block.gap}vw`,
                ["--w" as string]: `${block.w}%`,
              } as React.CSSProperties
            }
          >
            <Photo project={block.project} />
          </div>
        ) : (
          <div
            key={i}
            // Pair — stacked on mobile, side by side at md+.
            className="flex flex-col md:flex-row md:justify-between gap-y-10 md:gap-y-0"
            style={{ marginTop: i === 0 ? undefined : `${block.gap}vw` }}
          >
            <div
              className="w-full md:w-[var(--w)]"
              style={{ ["--w" as string]: `${block.aw}%` } as React.CSSProperties}
            >
              <Photo project={block.a} />
            </div>
            <div
              className="w-full md:w-[var(--w)]"
              style={{ ["--w" as string]: `${block.bw}%` } as React.CSSProperties}
            >
              <Photo project={block.b} />
            </div>
          </div>
        )
      )}
    </div>
  );
}

/*
  Photo — a single editorial image + its caption. The image sits in an
  aspect-ratio box matched to its source so object-cover never crops.
  Both the image and the caption route to the case study on click.
*/
function Photo({ project }: { project: Project }) {
  const { begin } = useTransition();
  const src = project.indexImage ?? project.tileImage;
  const ratio = HERO_RATIO[project.slug] ?? TILE_RATIO;

  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    begin({
      color: projectBg(project),
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      slug: project.slug,
    });
  };

  return (
    <figure className="m-0">
      <div
        onClick={onClick}
        data-cursor-ring
        className="relative w-full cursor-pointer overflow-hidden"
        style={{ aspectRatio: ratio, backgroundColor: projectBg(project) }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes="(max-width: 768px) 92vw, 55vw"
          draggable={false}
          unoptimized={src.endsWith(".gif")}
          className="object-cover"
        />
      </div>
      <figcaption
        onClick={onClick}
        data-cursor-ring
        className="mt-3 cursor-pointer text-[15px] md:text-[17px] leading-tight"
      >
        {project.title}
      </figcaption>
    </figure>
  );
}
