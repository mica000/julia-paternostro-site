"use client";

/*
  CaseStudyFooter — "All projects" list at the bottom of every case study
  ------------------------------------------------------------------------
  Figma node 423:2095. A quiet index of EVERY visible project, one row each:

      ┌──────────┐
      │ landscape│  Project Name                                    Branding
      │  thumb   │  A very small description of the project…
      └──────────┘
      ──────────────────────────────────────────────────────────────────────

  Layout (full-bleed panel, 1200px content centered — matches the body width):
    - The whole footer sits on a subtle 10% white panel (Figma bg
      rgba(255,255,255,0.1)) over the project's page color, so it reads as a
      distinct "shelf" beneath the gallery.
    - Row is 120px tall on desktop:
        Col 1  landscape thumbnail (137×80, ~1.7:1) — the project's
               `indexImage` (landscape crop) when it has one, else the tile.
        Col 2  the project NAME with its short DESCRIPTION underneath.
        Col 3  the category, flush right.

  Opacity / hover:
    - Every row rests DIM (whole row at 40%) and only the hovered row lifts to
      a full 100% — thumbnail and all text together — so the reader's focus row
      is unambiguously bright and the rest recede. All text is full #fbfbfb;
      the single row-level opacity does the dimming (no per-element tokens), so
      "full" really means 100% on every part of the hovered row.
    - A gentle 150ms `ease` on the opacity, per the hover-easing rule.

  This is the same set the "Show all" index list shows — ALL visible projects
  (the current one included), so the footer reads as a full table of contents
  rather than a "more like this" strip.
*/

import Image from "next/image";
import Link from "next/link";
import { visibleProjects as projects, pick } from "@/lib/projects";
import { useLang } from "@/lib/state";

const SUB_REST = "#f6f6f699"; // Material/Medium (~60%) — the "All projects" label
// Row dividers use the Tailwind arbitrary class border-[#f6f6f61a] (faint,
// ~10%): a top line on every row (so the list opens with a rule and has one
// between each) plus a bottom line on the <ul> to close it.

export default function CaseStudyFooter({ currentSlug }: { currentSlug: string }) {
  const { t, lang } = useLang();
  void currentSlug; // list is the full index now — every visible project shows.

  return (
    // Full-bleed panel: the 10% white Figma fill spans the viewport width, with
    // the 1200px content centered inside. Top margin (transparent) separates it
    // from the gallery; the panel's own padding is the Figma 60px band.
    <section
      aria-label={t("footer.allProjects")}
      // The nav's "All projects" chip watches for this and steps aside once
      // the shelf appears — see TopNav. A data attribute rather than an id
      // because it is a hook for behaviour, not an anchor target.
      data-all-projects-shelf
      className="w-full bg-white/10 mt-24 md:mt-[120px] px-6 md:px-[44px] pt-14 pb-24 md:pt-[60px] md:pb-[80px]"
    >
      <div className="mx-auto w-full max-w-[1200px]">
        {/* Header label — Figma "All projects". */}
        <p
          className="mb-6 md:mb-[30px] text-[13px] font-normal leading-4"
          style={{ color: SUB_REST }}
        >
          {t("footer.allProjects")}
        </p>

        {/* `group` on the list drives the peer-dim: every row rests at 100%,
            and while the list is hovered the non-hovered rows fall to 40% —
            the hovered row overrides back to 100% (hover wins over
            group-hover). Bottom border closes the list; each row's top border
            opens it and separates the rest. */}
        <ul className="group w-full border-b-[0.5px] border-[#f6f6f61a]">
          {projects.map((p) => {
            const thumb = p.indexImage ?? p.tileImage;
            return (
              <li key={p.slug} className="border-t-[0.5px] border-[#f6f6f61a]">
                <Link
                  href={`/work/${p.slug}`}
                  data-cursor-ring
                  className="flex items-center gap-5 py-4 cursor-pointer text-[#fbfbfb] opacity-100 transition-opacity duration-150 ease-[ease] group-hover:opacity-40 hover:opacity-100 md:h-[120px] md:gap-10 md:py-0"
                >
                  {/* Col 1 — landscape thumbnail. */}
                  <div className="relative aspect-[137/80] w-[112px] shrink-0 overflow-hidden md:w-[137px]">
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      sizes="137px"
                      draggable={false}
                      unoptimized={thumb.endsWith(".gif")}
                      className="object-cover"
                    />
                  </div>

                  {/* Cols 2 + 3 — name/description stack on the left, category
                      pushed to the right by justify-between. */}
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-6">
                    <div className="min-w-0">
                      {/* Name in full #fbfbfb; the description sits under it in
                          Material/Medium gray (Figma). The row-level opacity
                          still lifts the whole row to 100% on hover — the gray
                          is a color, not an opacity, so "full" stays full. */}
                      <span className="block truncate text-[13px] font-normal leading-4">
                        {p.title}
                      </span>
                      <span className="mt-1 block truncate text-[13px] font-normal leading-4 text-[#f6f6f699]">
                        {pick(p.tagline ?? p.brief, lang)}
                      </span>
                    </div>

                    {/* Category — flush right (same Material/Medium gray),
                        hidden on mobile to keep the row readable as thumbnail
                        + name/description. */}
                    <span className="hidden shrink-0 whitespace-nowrap text-right text-[13px] font-normal leading-4 text-[#f6f6f699] md:block">
                      {pick(p.category, lang)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
