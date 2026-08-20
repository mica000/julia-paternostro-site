"use client";

/*
  CaseStudyFooter — "more projects" table at the bottom of every case study
  -------------------------------------------------------------------------
  Figma node 403:1088. A compact table, one row per OTHER project:

      ┌────┐
      │thmb│  Project Name   A short description…   Branding      2024
      └────┘
      ────────────────────────────────────────────────────────────────

  Four columns on desktop — (thumbnail + name) · description · category ·
  year — each row 112px tall with a hairline divider beneath. On mobile the
  three text columns collapse and the row reads as thumbnail + name only, so
  it stays tappable without crushing the columns.

  Each row routes into that project's case study. Colors match the case study
  (always black bg + white fg), so #fbfbfb text on faint #2a2a2a hairlines
  reads cleanly.
*/

import Image from "next/image";
import Link from "next/link";
import { visibleProjects as projects, pick } from "@/lib/projects";
import { useLang } from "@/lib/state";

export default function CaseStudyFooter({ currentSlug }: { currentSlug: string }) {
  const { lang } = useLang();
  const others = projects.filter((p) => p.slug !== currentSlug);

  return (
    // Same 24/44px gutter as the case-study body. Top margin separates it from
    // the gallery; bottom padding clears the fixed bottom nav / lang toggle.
    <section
      aria-label="More projects"
      className="w-full px-6 md:px-[44px] mt-24 md:mt-[150px] pb-24 md:pb-32"
    >
      <ul className="w-full" style={{ color: "#fbfbfb" }}>
        {others.map((p) => (
          // Faint hairline under each row (and above the first), matching the
          // Figma table rules.
          <li
            key={p.slug}
            className="border-b-[0.5px] border-[#2a2a2a] first:border-t-[0.5px]"
          >
            <Link
              href={`/work/${p.slug}`}
              data-cursor-ring
              // Four even columns on desktop (Figma spaces them ~26/26/26/22);
              // one column on mobile so it's just thumbnail + name.
              className="grid grid-cols-1 items-center gap-4 py-4 cursor-pointer md:h-[112px] md:grid-cols-[1.4fr_1.4fr_1.4fr_1fr] md:gap-6 md:py-0"
            >
              {/* Col 1 — 80px square thumbnail + the project name. */}
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden md:h-20 md:w-20">
                  <Image
                    src={p.tileImage}
                    alt=""
                    fill
                    sizes="80px"
                    draggable={false}
                    unoptimized={p.tileImage.endsWith(".gif")}
                    className="object-cover"
                  />
                </div>
                {/* Figma "Title 3/Emphasized" — SF Pro Semibold ~15/20. */}
                <span className="truncate text-[15px] font-semibold leading-5">
                  {p.title}
                </span>
              </div>

              {/* Col 2 — a short description (tagline, or a clipped brief). */}
              <span className="hidden min-w-0 truncate text-[13px] leading-4 md:block">
                {pick(p.tagline ?? p.brief, lang)}
              </span>

              {/* Col 3 — category. */}
              <span className="hidden truncate text-[13px] leading-4 md:block">
                {pick(p.category, lang)}
              </span>

              {/* Col 4 — year. */}
              <span className="hidden text-[13px] leading-4 md:block">
                {p.year}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
