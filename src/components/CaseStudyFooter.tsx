"use client";

/*
  CaseStudyFooter — related projects list at the bottom of every case study
  --------------------------------------------------------------------------
  Renders every project except the current one as a row: 100×60 thumbnail
  (same image as the index tile), project name, short brief, category,
  year. Each row is a link into that project's case study.

  Interaction: at rest all rows sit at full opacity. When the reader
  hovers any row, the others dim to 0.35 so their attention is guided to
  the hovered target — a classic list-hover pattern (used well by
  design.cash.app and pentagram.com, among others). No dimming happens
  until the reader is actively on the list.

  Colors: the whole footer inherits `color` from the case study `<main>`,
  which is `project.fg` (or `invertHex(bg)`). Borders use `currentColor`
  via `color-mix` so they're a soft ~30% tinted rule that reads on both
  light and dark case study backgrounds without extra config.
*/

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { projects, pick } from "@/lib/projects";
import { useLang } from "@/lib/state";

const RULE = "0.5px solid color-mix(in srgb, currentColor 30%, transparent)";
// Subtle background tint so the footer reads as its own zone without
// changing the project bg. currentColor is the case study's fg, so this
// resolves to ~10% of the contrast color for every project — light veil
// on dark bgs, dark veil on light bgs — instead of a fixed 10% white
// that would wash out on light or warm-toned pages.
const FOOTER_TINT = "color-mix(in srgb, currentColor 10%, transparent)";

export default function CaseStudyFooter({ currentSlug }: { currentSlug: string }) {
  const { lang } = useLang();
  const [hovered, setHovered] = useState<string | null>(null);

  const others = projects.filter((p) => p.slug !== currentSlug);

  return (
    <section
      aria-label="More projects"
      className="w-full px-8 mt-[150px] pt-10 pb-24"
      style={{ borderTop: RULE, backgroundColor: FOOTER_TINT }}
    >
      <ul className="flex flex-col">
        {others.map((p) => {
          // dimmed = someone is hovered and it isn't me
          const dimmed = hovered !== null && hovered !== p.slug;
          return (
            <li key={p.slug} style={{ borderBottom: RULE }}>
              <Link
                href={`/work/${p.slug}`}
                data-cursor-ring
                onMouseEnter={() => setHovered(p.slug)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p.slug)}
                onBlur={() => setHovered(null)}
                // Fixed min-height locks every row at the same size regardless
                // of how much (or how little) description copy the row carries.
                // 80px thumb + 32px py-4 padding = 112px baseline.
                className="flex min-h-[112px] items-center justify-between gap-6 py-4 transition-opacity duration-300"
                style={{ opacity: dimmed ? 0.35 : 1 }}
              >
                {/* Column 1: thumbnail + title (Figma: 500px cluster) */}
                <div className="flex items-center gap-4 shrink-0 min-w-0 basis-[500px]">
                  <div className="relative h-[80px] w-[80px] flex-shrink-0 overflow-hidden">
                    <Image
                      src={p.tileImage}
                      alt=""
                      fill
                      sizes="80px"
                      // Same as the tile canvases — keep GIFs animated.
                      unoptimized={p.tileImage.endsWith(".gif")}
                      className="object-cover"
                    />
                  </div>
                  {/* Figma text style "Title 2/Emphasized": 17/22 Bold. */}
                  <p className="text-[17px] font-bold leading-[22px]">
                    {p.title}
                  </p>
                </div>

                {/*
                  Column 2: short brief.
                  - `line-clamp-2` truncates long copy at exactly two lines.
                  - `h-10` reserves those two lines even when the copy is
                    short (or empty), so every row's description column is
                    the same visual block. Combined with the row's
                    `min-h-[92px]`, this makes row heights identical across
                    projects — critical since hover-dimming makes any tiny
                    size mismatch very obvious.
                  - Widened from 261px → 440px per the studio's request.
                */}
                <p className="hidden md:block basis-[440px] shrink-0 h-10 text-[15px] leading-5 line-clamp-2 overflow-hidden">
                  {pick(p.brief, lang)}
                </p>

                {/* Column 3: category */}
                <p className="basis-[261px] shrink-0 text-right text-[15px] leading-5">
                  {pick(p.category, lang)}
                </p>

                {/* Column 4: year */}
                <p className="basis-[109px] shrink-0 text-right text-[15px] leading-5">
                  {p.year}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
