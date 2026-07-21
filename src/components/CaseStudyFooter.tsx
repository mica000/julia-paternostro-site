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
      className="w-full px-5 md:px-8 mt-24 md:mt-[150px] pt-8 md:pt-10 pb-24"
      style={{ backgroundColor: FOOTER_TINT }}
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
                className="flex min-h-[92px] md:min-h-[112px] items-center gap-3 md:gap-6 py-3 md:py-4 transition-opacity duration-300"
                style={{ opacity: dimmed ? 0.35 : 1 }}
              >
                {/* Column 1: thumbnail + title. On mobile the thumb shrinks
                    to 56px and the title/meta stack vertically so a project
                    with a long brief still fits at 320px+ without pushing
                    the year off-screen. */}
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 md:flex-none md:shrink-0 md:basis-[500px]">
                  <div className="relative h-[56px] w-[56px] md:h-[80px] md:w-[80px] flex-shrink-0 overflow-hidden">
                    <Image
                      src={p.tileImage}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 56px, 80px"
                      // Same as the tile canvases — keep GIFs animated.
                      unoptimized={p.tileImage.endsWith(".gif")}
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Figma text style "Title 2/Emphasized": 17/22 Bold. */}
                    <p className="text-[15px] md:text-[17px] font-bold leading-[20px] md:leading-[22px] truncate">
                      {p.title}
                    </p>
                    {/* Mobile-only meta line: category · year, since the
                        dedicated columns are hidden below md. */}
                    <p className="md:hidden mt-1 text-[12px] leading-[14px] opacity-70 truncate">
                      {pick(p.category, lang)} · {p.year}
                    </p>
                  </div>
                </div>

                {/*
                  Column 2 (md+ only): short brief. `line-clamp-2` truncates
                  long copy at two lines; `h-10` reserves the space so every
                  row is the same height regardless of copy length.
                */}
                <p className="hidden md:block basis-[440px] shrink-0 h-10 text-[15px] leading-5 line-clamp-2 overflow-hidden">
                  {pick(p.brief, lang)}
                </p>

                {/* Column 3: category (md+ only — folded into the mobile meta line). */}
                <p className="hidden md:block basis-[261px] shrink-0 text-right text-[15px] leading-5">
                  {pick(p.category, lang)}
                </p>

                {/* Column 4: year (md+ only). */}
                <p className="hidden md:block basis-[109px] shrink-0 text-right text-[15px] leading-5">
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
