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

  Left: a Super-Large-Title headline (SF Bold 64/64) in a 630px block — wide
  enough that each of the two sentences holds its own line. Right: a 324px
  stack of four ruled arrow-links (shared ArrowLinks) — mail draft, the About
  route, and the two socials. 1200px centered column; sits below the
  All-projects footer. Vertical rhythm is 250px, symmetric, and the band is
  given the whole screen with the row centred in it.
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
      // The headline is two sentences on two lines; flatten the break for the
      // label so a screen reader announces one continuous sentence.
      aria-label={t("cta.headline").replace(/\n/g, " ")}
      /*
        Full screen, and the content rides the middle of it. This is the last
        thing on a case study — after the gallery and the All-projects shelf,
        the reader arrives here with nothing left to scroll to, and a band
        that only fills part of the screen leaves the previous section still
        showing above it, so the closing line has to share the frame with a
        list it has already finished with. Given the whole screen it lands on
        its own.

        `dvh`, not `vh`: on a phone `vh` is the tallest the viewport ever gets
        (address bar retracted), so the band would run a bar's height past the
        fold at rest. `min-h`, so the padding still wins on a screen too short
        to hold the headline and the four links comfortably — the section
        grows rather than cramping them.
      */
      className="flex w-full min-h-dvh items-center px-6 md:px-[44px] py-24 md:py-[250px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 md:flex-row md:items-center md:justify-between md:gap-8">
        {/* Headline — Super Large Title (SF Bold 64/64), two lines. */}
        <h2 className="text-[#fbfbfb] font-bold tracking-normal leading-[1] text-[clamp(2.5rem,5vw,4rem)] md:max-w-[630px] [text-wrap:balance]">
          {/* Two sentences, one per line — the question, then the answer. The
              break is authored in the copy rather than left to the wrap,
              because which words land together is the whole rhythm of it.
              Each line is still its own block, so it re-wraps on its own on a
              narrow screen instead of overflowing. */}
          {t("cta.headline")
            .split("\n")
            .map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
        </h2>

        {/* Links — 250px stack of ruled arrow-links. */}
        <ArrowLinks links={links} className="w-full md:w-[324px] md:shrink-0" />
      </div>
    </section>
  );
}
