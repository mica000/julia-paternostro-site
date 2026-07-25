"use client";

/*
  CaseStudyFooter — related projects at the bottom of every case study
  --------------------------------------------------------------------
  Same detail-list design as the index "Show all" sheet (ParallaxIndex →
  ShowAllList): one row per project —

      Name              short blurb                 ┌────┬────┬────┬────┐
      Category – Year                               │thumbnail strip …→ │
                                                    └────┴────┴────┴────┘

  Each row routes into that project's case study. The text block and the
  thumbnails are separate links so a horizontal swipe on the strip never
  registers as a tap on the row.

  This is intentionally a self-contained copy of the index list rather
  than a shared import: `ShowAllList` currently lives inside
  ParallaxIndex.tsx. Once that settles, both should collapse into one
  shared <ProjectList> — see the note at the call site.

  Colors match the index list (#fbfbfb text, #727272 hairlines) — the
  case study is always black bg + white fg, so they read cleanly here.
*/

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { projects, pick, projectImageSet } from "@/lib/projects";
import { useLang } from "@/lib/state";

// How many images each row puts in its scrollable strip — matches the
// index list's STRIP_IMAGES so the two read identically.
const STRIP_IMAGES = 4;
// Square side of the mobile "Go to project" tile that closes each strip.
const CTA_TILE = 100;
// Figma's landscape slot — held until an image's real ratio is known so
// the strip doesn't reflow in from zero width.
const DEFAULT_THUMB_RATIO = 162.946 / 100;

export default function CaseStudyFooter({ currentSlug }: { currentSlug: string }) {
  const { lang, t } = useLang();
  const others = projects.filter((p) => p.slug !== currentSlug);

  return (
    // 44px sides on every breakpoint — same frame as the case study body,
    // the nav and the index list. Top margin separates it from the meta
    // block; bottom padding clears the fixed bottom nav.
    <section
      aria-label="More projects"
      className="w-full px-6 md:px-[44px] mt-24 md:mt-[150px] pb-24 md:pb-32"
    >
      <ul className="w-full">
        {others.map((p) => {
          const thumbs = projectImageSet(p, STRIP_IMAGES);
          const href = `/work/${p.slug}`;
          return (
            // Divider rules are desktop-only: on a phone the thumbnail
            // strips and the vertical rhythm already separate the rows.
            <li key={p.slug} className="md:border-b-[0.5px] md:border-[#727272]">
              <div
                className="flex w-full flex-col gap-5 py-[30px] min-[1280px]:flex-row min-[1280px]:items-start min-[1280px]:justify-between min-[1280px]:gap-6 min-[1500px]:gap-8 min-[1700px]:gap-[112px]"
                style={{ color: "#fbfbfb" }}
              >
                {/* Text block — one link, so the strip below stays outside
                    the click target. */}
                <Link
                  href={href}
                  data-cursor-ring
                  className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 text-left min-[1280px]:flex-row min-[1280px]:items-start min-[1280px]:gap-6 min-[1500px]:gap-8 min-[1700px]:gap-[112px]"
                >
                  {/* Name + "category – year" beneath it, every breakpoint. */}
                  <div className="flex flex-col gap-1 min-[1280px]:w-[200px] min-[1280px]:shrink-0">
                    <span className="text-[15px] font-semibold leading-5">
                      {p.title}
                    </span>
                    <span className="text-[13px] leading-4">
                      {`${pick(p.category, lang)} – ${p.year}`}
                    </span>
                  </div>
                  {/* Blurb — desktop only; on a phone the row reads as
                      name / category – year and then the imagery. */}
                  <div className="text-[13px] leading-4 max-md:hidden md:max-w-[366px] md:min-w-0 min-[1280px]:w-[280px] min-[1280px]:shrink min-[1500px]:w-[366px]">
                    <span className="line-clamp-3">{pick(p.brief, lang)}</span>
                  </div>
                </Link>

                {/* Thumbnail strip — the project's images, scrolled
                    horizontally. On mobile the negative margin bleeds it to
                    the screen edges while the first thumb stays on the 44px
                    gutter, so the overflow reads as "there's more this way". */}
                <div className="-mx-6 flex gap-2 overflow-x-auto overscroll-x-contain px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:min-w-0 md:px-0">
                  {thumbs.map((src, i) => (
                    <Thumb key={i} src={src} href={href} />
                  ))}

                  {/* Strip-closing tile — MOBILE ONLY. There's no cursor on a
                      phone, so nothing else names the action. Removed from
                      flow on desktop (md:hidden) so the images close the band
                      instead of leaving a dead 100px slot + gap. */}
                  <Link
                    href={href}
                    data-cursor-ring
                    className="flex shrink-0 cursor-pointer flex-col items-start justify-between border-[0.5px] border-white/20 bg-white/[0.07] p-3 text-left text-[13px] font-normal leading-4 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-[20px] backdrop-saturate-150 transition-colors duration-200 hover:bg-white/[0.12] md:hidden"
                    style={{ width: CTA_TILE, height: CTA_TILE }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                      className="shrink-0"
                    >
                      <path
                        d="M4 12L12 4M12 4H5.5M12 4V10.5"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{t("parallax.goToProject")}</span>
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/*
  Thumb — one image in a row's strip. Height-locked at 100px; width follows
  the image's own ratio (read off naturalWidth/Height on load) so portrait
  shots stay tall and narrow instead of being cropped to a landscape box.
  A link, so tapping a thumb opens the same project as the row.
*/
function Thumb({ src, href }: { src: string; href: string }) {
  const boxRef = useRef<HTMLAnchorElement>(null);
  const [ratio, setRatio] = useState(DEFAULT_THUMB_RATIO);

  const readRatio = useCallback(() => {
    const img = boxRef.current?.querySelector("img");
    if (img && img.naturalHeight > 0) {
      setRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  // Cached images are decoded before React attaches onLoad, so their load
  // event has already fired — read the size once on mount for anything
  // already `complete`. Deferred so setState never runs synchronously in
  // the effect body.
  useEffect(() => {
    const img = boxRef.current?.querySelector("img");
    if (!img?.complete) return;
    const id = window.setTimeout(readRatio, 0);
    return () => window.clearTimeout(id);
  }, [readRatio]);

  return (
    <Link
      ref={boxRef}
      href={href}
      data-cursor-ring
      className="relative h-[100px] w-auto shrink-0 cursor-pointer overflow-hidden"
      style={{ aspectRatio: ratio }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="320px"
        draggable={false}
        unoptimized={src.endsWith(".gif")}
        loading="eager"
        onLoad={readRatio}
        className="object-contain"
      />
    </Link>
  );
}
