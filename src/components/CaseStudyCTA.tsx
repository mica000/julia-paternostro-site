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

  Layout (1200px centered column, matching the body + the All-projects footer):
    - Left: a Super-Large-Title headline (SF Bold 64/64), wrapping to two lines.
    - Right: a 250px stack of two link rows, each a thin-ruled row with an
      up-right arrow. "Tell me about your project" opens a mail draft to the
      studio address; "Get to know me" routes to /about.

  Colors are the shared tokens: #fbfbfb text over the page color, Material
  dividers. The arrow nudges up-right on hover — a light touch, `ease`, 150ms.
*/

import Link from "next/link";
import { useLang, type TranslationKey } from "@/lib/state";

const STUDIO_EMAIL = "julia.paternostro@gmail.com";

function ArrowTopRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M4.5 11.5 11.5 4.5M11.5 4.5H5.5M11.5 4.5V10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Row({
  labelKey,
  href,
  external,
}: {
  labelKey: TranslationKey;
  href: string;
  external?: boolean;
}) {
  const { t } = useLang();
  const inner = (
    <>
      <span className="text-[13px] font-normal leading-4">{t(labelKey)}</span>
      <ArrowTopRight />
    </>
  );
  // Same peer-dim as the All-projects list: rows rest at 100%, and while the
  // links group is hovered the non-hovered row falls to 40% (hover wins).
  const cls =
    "flex h-[65px] items-center justify-between border-t-[0.5px] border-[#f6f6f61a] cursor-pointer text-[#fbfbfb] opacity-100 transition-opacity duration-150 ease-[ease] group-hover:opacity-40 hover:opacity-100 last:border-b-[0.5px]";

  return external ? (
    <a href={href} data-cursor-ring className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} data-cursor-ring className={cls}>
      {inner}
    </Link>
  );
}

export default function CaseStudyCTA() {
  const { t } = useLang();
  return (
    <section
      aria-label={t("cta.headline")}
      className="w-full px-6 md:px-[44px] pt-16 pb-24 md:pt-[60px] md:pb-[160px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 md:flex-row md:items-start md:justify-between md:gap-8">
        {/* Headline — Super Large Title (SF Bold 64/64), two lines. */}
        <h2 className="text-[#fbfbfb] font-bold tracking-normal leading-[1.02] text-[clamp(2.5rem,5vw,4rem)] md:max-w-[473px] [text-wrap:balance]">
          {t("cta.headline")}
        </h2>

        {/* Links — 250px stack, each row ruled top; the last also ruled bottom.
            `group` drives the peer-dim across the two rows. */}
        <div className="group w-full md:w-[250px] md:shrink-0">
          <Row labelKey="cta.tellProject" href={`mailto:${STUDIO_EMAIL}`} external />
          <Row labelKey="cta.getToKnow" href="/about" />
        </div>
      </div>
    </section>
  );
}
