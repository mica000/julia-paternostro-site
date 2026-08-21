"use client";

/*
  CaseStudyCTA — "Have something in mind?" closing call-to-action
  --------------------------------------------------------------
  Figma node 423:2440. The last band on every case study, sitting directly
  below the All-projects footer:

      Have something              ──────────────────────────
      in mind?                    Tell me about your project  ↗
                                  ──────────────────────────
                                  Get to know me              ↗
                                  ──────────────────────────
                                  Instagram                   ↗
                                  ──────────────────────────
                                  Linkedin                    ↗
                                  ──────────────────────────

  Left: a Super-Large-Title headline (SF Bold 64/64), two lines. Right: a
  250px stack of four ruled arrow-links (shared ArrowLinks) — mail draft, the
  About route, and the two socials. 1200px centered column; sits below the
  All-projects footer. Vertical padding is symmetric (top mirrors bottom).
*/

import { useLang } from "@/lib/state";
import ArrowLinks, { type ArrowLink } from "@/components/ArrowLinks";

const STUDIO_EMAIL = "julia.paternostro@gmail.com";
const INSTAGRAM = "https://instagram.com/juliapaternostro";
const LINKEDIN = "https://www.linkedin.com/in/jupaternostro";

export default function CaseStudyCTA() {
  const { t } = useLang();
  const links: ArrowLink[] = [
    { label: t("cta.tellProject"), href: `mailto:${STUDIO_EMAIL}`, external: true },
    { label: t("cta.getToKnow"), href: "/about" },
    { label: "Instagram", href: INSTAGRAM, external: true },
    { label: "Linkedin", href: LINKEDIN, external: true },
  ];

  return (
    <section
      aria-label={t("cta.headline")}
      className="w-full px-6 md:px-[44px] pt-24 pb-24 md:pt-[160px] md:pb-[160px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 md:flex-row md:items-start md:justify-between md:gap-8">
        {/* Headline — Super Large Title (SF Bold 64/64), two lines. */}
        <h2 className="text-[#fbfbfb] font-bold tracking-normal leading-[1.02] text-[clamp(2.5rem,5vw,4rem)] md:max-w-[473px] [text-wrap:balance]">
          {t("cta.headline")}
        </h2>

        {/* Links — 250px stack of ruled arrow-links. */}
        <ArrowLinks links={links} className="w-full md:w-[250px] md:shrink-0" />
      </div>
    </section>
  );
}
