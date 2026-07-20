"use client";

/*
  CaseStudy — case study page template
  ------------------------------------
  Follows the Figma spec at `/work/[slug]`:

    ┌─────────────────────────────────────────────┐
    │              DELIRIO TROPICAL               │  centered title
    │                                             │
    │  CATEGORIE   YEAR    ┌─brief──┐  ┌─context─┐│  4-column meta
    │  Branding    2024    │        │  │         ││
    ├─────────────────────────────────────────────┤
    │                     HERO                    │  1440×484
    │  ┌───────────┐   ┌───────────┐              │
    │  │  medium   │   │  medium   │              │  2 × (710×484)
    │  └───────────┘   └───────────┘              │
    │  ┌───────────┐   ┌───────────┐              │
    │  │  medium   │   │  medium   │              │  2 × (710×484)
    │  └───────────┘   └───────────┘              │
    │  ┌─────┐ ┌─────┐ ┌─────┐                    │  3 × (468×292)
    │  └─────┘ └─────┘ └─────┘                    │
    │                     HERO                    │  1440×484
    └─────────────────────────────────────────────┘

  Localization: uses `pick()` to resolve the current lang against each
  Localized field, with English fallback. The two column headers
  (CATEGORIE / YEAR) live in this file rather than the global dict since
  they're only ever used here — no need to pollute the shared dict.
*/

import Image from "next/image";
import { useEffect, useState } from "react";
import { pick, projectBg, type Project, type Section } from "@/lib/projects";
import { useLang, usePageBg, type Lang } from "@/lib/state";
import { useTransition } from "@/components/PageTransition";
import CaseStudyFooter from "@/components/CaseStudyFooter";

// Column labels — kept local to this component. Extend/edit here if the
// designer changes the wording.
const LABEL: Record<
  | "categorie"
  | "year"
  | "creativeDirection"
  | "illustrations"
  | "copywriting"
  | "client",
  Record<Lang, string>
> = {
  categorie: { en: "CATEGORIE", pt: "CATEGORIA" },
  year: { en: "YEAR", pt: "ANO" },
  creativeDirection: {
    en: "CREATIVE DIRECTION AND DESIGN",
    pt: "DIREÇÃO CRIATIVA E DESIGN",
  },
  illustrations: { en: "ILLUSTRATIONS", pt: "ILUSTRAÇÕES" },
  copywriting: { en: "COPYWRITING", pt: "COPYWRITING" },
  client: { en: "CLIENT", pt: "CLIENTE" },
};

// Placeholder shown when a credit field is missing on a project that
// otherwise has credits defined. Keeps the 4-column layout intact.
const CREDIT_PLACEHOLDER = "—";

export default function CaseStudy({ project }: { project: Project }) {
  const { lang } = useLang();
  const { end } = useTransition();
  const { setPageBg, setPageFg } = usePageBg();
  // Site-wide dark treatment: every case study renders on a darkened
  // version of the project's signature color, with white text. The
  // per-project `fg` overrides are ignored so nothing on the site fights
  // the dark palette; the hue survives just enough to identify the project.
  const bg = projectBg(project);
  const fg = "#ffffff";
  // Nav + fixed chrome pick up this same explicit white so they never
  // fall back to mix-blend-mode (which would compute a colored inverse
  // against the darkened bg).
  const explicitFg: string = fg;

  // Push page bg + fg into the shared context so NavFade matches the page
  // and the nav labels pick up the right treatment. Reset on unmount so
  // navigating back to Work restores the canvas defaults.
  useEffect(() => {
    setPageBg(bg);
    setPageFg(explicitFg);
    return () => {
      setPageBg(null);
      setPageFg(null);
    };
  }, [bg, explicitFg, setPageBg, setPageFg]);

  // Mount-in animation state: start below and transparent, then rise + fade
  // in as the transition overlay is fading out. `entered` flips on the
  // second animation frame so the browser sees the initial styles before
  // the target styles, guaranteeing the CSS transition actually runs.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Two rAFs: first frame paints the initial (translated + transparent)
    // state, second frame flips to the settled state.
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setEntered(true));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = id2;
    });
    // Case study is now mounted and painted — kick off the overlay's
    // fade-out at the same time our rise-in starts. Reader's eye tracks the
    // motion across the seam instead of hitting a hard hand-off.
    const releaseOverlay = requestAnimationFrame(() => end());
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(releaseOverlay);
    };
  }, [end]);

  return (
    <main
      className="min-h-screen"
      // Per-project bg/fg — this is the color the click-through transition
      // lands on. NavFade already reads config.background from context, so
      // if you want the top scrim to match a specific project you'd wire
      // that too; for now the scrim just fades against the shared canvas bg.
      style={{ backgroundColor: bg, color: fg }}
    >
      {/*
        Full-width animated wrapper — the max-w content block AND the
        edge-to-edge footer both live inside so both ride the rise-in
        animation together. Vertical rhythm:
          - inner pt-[225px]  = 75px nav (measured, with py-5 + line-height
                                 32) + 150px gap → title sits 150px below
                                 nav bottom edge
          - inner pt-[95px]   is Figma's space above the credits row
          - footer's own pt/pb replaces the old page-level pb-[194px]
      */}
      <div
        style={{
          // Rise-in: content starts 24px lower and transparent, settles as
          // the overlay above is fading out. Same 480ms ease-out feels
          // aligned with the 280ms overlay fade — the reader sees the
          // content emerging into position rather than snapping.
          transform: entered ? "translateY(0)" : "translateY(24px)",
          opacity: entered ? 1 : 0,
          transition:
            "transform 480ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform, opacity",
        }}
      >
      {/*
        No max-width — content spans full viewport per user request.
        Padding scales down on mobile so tight viewports keep breathing room.
      */}
      <div className="px-5 md:px-8 pt-[120px] md:pt-[225px]">
        {/* ────────────  header  ──────────── */}
        <header className="mb-16 md:mb-[62px]">
          {/*
            Title — Figma "Super Large Title" token: SF Pro Bold, target
            124/124 on desktop (xl+). Scales down through breakpoints for
            mobile readability. `leading-[1.05]` keeps proportional line
            height at any size instead of a fixed 124px value that would
            over-space a 44px mobile title.
          */}
          <h1 className="mb-16 md:mb-[86px] text-[44px] sm:text-[64px] md:text-[96px] xl:text-[124px] font-bold leading-[1.05] tracking-normal break-words">

            {project.title}
          </h1>

          {/*
            3-column meta row per Figma (node 12:235): CATEGORIE / YEAR /
            CLIENT. Brief and context no longer live here — context
            surfaces as the large paragraph below the intro hero. Stacks
            to a single column on mobile so labels don't crush at 390px.
            If a project has no `credits.client` set, the third column
            still renders (with an em-dash) so the layout stays consistent.
          */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 md:gap-x-10 lg:gap-x-16 xl:gap-x-[132px] gap-y-6">

            <MetaField label={LABEL.categorie[lang]}>
              {pick(project.category, lang)}
            </MetaField>
            <MetaField label={LABEL.year[lang]}>{project.year}</MetaField>
            <MetaField label={LABEL.client[lang]}>
              {project.credits?.client ?? CREDIT_PLACEHOLDER}
            </MetaField>
          </div>
        </header>

        {/* ────────────  intro hero + context paragraph  ────────────
          Per new Figma: the first gallery image renders on its own as
          an intro hero, then a large 26px bold paragraph with the
          project context sits below it. This introduces the project
          before the fuller gallery grid unfolds.

          Sources:
          - Sections mode → sections[0] is pulled out as the intro; the
            remaining sections render after the paragraph.
          - Legacy gallery mode → gallery[0] is the intro; the remaining
            8 slots render in the classic 2×2 / 3-col / hero pattern.
        */}
        {project.sections && project.sections.length > 0 ? (
          <>
            <IntroHero section={project.sections[0]} />
            <ContextParagraph text={pick(project.context, lang)} />
            <Sections sections={project.sections.slice(1)} />
          </>
        ) : (
          <>
            <section className="mb-16 md:mb-[86px]">
              <Frame
                src={project.gallery[0]}
                ratio="1440/484"
                priority
                sizes="100vw"
              />
            </section>
            <ContextParagraph text={pick(project.context, lang)} />
            <section className="flex flex-col gap-3 md:gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                <Frame src={project.gallery[1]} ratio="710/484" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 720px" />
                <Frame src={project.gallery[2]} ratio="710/484" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 720px" />
                <Frame src={project.gallery[3]} ratio="710/484" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 720px" />
                <Frame src={project.gallery[4]} ratio="710/484" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 720px" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
                <Frame src={project.gallery[5]} ratio="468/292" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 33vw, 468px" />
                <Frame src={project.gallery[6]} ratio="468/292" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 33vw, 468px" />
                <Frame src={project.gallery[7]} ratio="468/292" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 33vw, 468px" />
              </div>

              <Frame src={project.gallery[8]} ratio="1440/484" sizes="100vw" />
            </section>
          </>
        )}

        {/* ────────────  credits  ────────────
            Rendered only when the project has any credit info set.
            Same 4-column geometry as the meta row so the columns line up
            visually with CATEGORIE / YEAR / brief / context above.
            The ~95px top padding matches Figma's empty space above the
            credits row (7px structural + 88px inner padding). */}
        {project.credits && (
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6 pt-16 md:pt-[95px] md:gap-x-10 lg:gap-x-16 xl:gap-x-[132px]">
            <MetaField label={LABEL.creativeDirection[lang]}>
              {project.credits.creativeDirection ?? CREDIT_PLACEHOLDER}
            </MetaField>
            <MetaField label={LABEL.illustrations[lang]}>
              {project.credits.illustrations ?? CREDIT_PLACEHOLDER}
            </MetaField>
            <MetaField label={LABEL.copywriting[lang]}>
              {project.credits.copywriting ?? CREDIT_PLACEHOLDER}
            </MetaField>
            <MetaField label={LABEL.client[lang]}>
              {project.credits.client ?? CREDIT_PLACEHOLDER}
            </MetaField>
          </section>
        )}
      </div>

      {/* Related projects — full-viewport-width footer, sits inside the
          rise-in wrapper so it animates in with the rest of the content.
          Its own vertical padding replaces the max-w block's old
          pb-[194px], keeping the last row clear of the fixed bottom nav. */}
      <CaseStudyFooter currentSlug={project.slug} />
      </div>
    </main>
  );
}

/*
  MetaField — a small stacked label/value used in the header.
  Label is dimmed uppercase, value below at full opacity. Kept as a local
  component so any future spacing/type tweak lives in one place.
*/
function MetaField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-60">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/*
  Frame — a gallery image slot. Uses `next/image` with `fill` inside an
  aspect-ratio box so the source image (any size) crops cleanly to the
  designed slot without hardcoded dimensions.
*/
function Frame({
  src,
  ratio,
  sizes,
  priority,
}: {
  src: string;
  /** CSS aspect-ratio expression, e.g. "1440/484". */
  ratio: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ aspectRatio: ratio.replace("/", " / ") }}
    >
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}

// Figma defaults for section aspect ratios. Override on a per-section
// basis via `ratio` when a specific tile needs to differ.
//   - heroDefault  → 913 × 560   (~1.63:1 landscape). Full-width feature.
//   - cols2Default → 447 × 560   (~0.80:1 portrait). Half-width portrait.
//   - cols3Default → 292 × 405   (~0.72:1 portrait). Third-width portrait.
const HERO_RATIO_DEFAULT = "913 / 560";
const COLS2_RATIO_DEFAULT = "447 / 560";
const COLS3_RATIO_DEFAULT = "292 / 405";

/*
  IntroHero — the first section rendered on its own with priority image
  loading (LCP-eligible). Sits between the meta row and the context
  paragraph per the new Figma. Only supports `hero`-kind sections — if
  the first section happens to be a `cols` row, we still render it here
  as a multi-column strip to preserve author intent.
*/
function IntroHero({ section }: { section: Section }) {
  return (
    <section className="mb-16 md:mb-[86px]">
      {section.kind === "hero" ? (
        <Frame
          src={section.src}
          ratio={section.ratio ?? HERO_RATIO_DEFAULT}
          priority
          sizes="(max-width: 1440px) 100vw, 1440px"
        />
      ) : (
        <Sections sections={[section]} />
      )}
    </section>
  );
}

/*
  ContextParagraph — the large-format paragraph that introduces the
  project below the intro hero. Figma style: SF Pro Bold 26/32,
  constrained to ~700px so lines wrap short and read like display copy
  rather than body text.
*/
function ContextParagraph({ text }: { text: string }) {
  return (
    <p className="mb-16 md:mb-[156px] max-w-[700px] text-[18px] md:text-[26px] font-bold leading-snug md:leading-8 tracking-normal">
      {text}
    </p>
  );
}

/*
  Sections — flexible case-study layout driven by project.sections.

  Each section is one row:
    - hero:    a single full-width image
    - cols(2): two images side by side
    - cols(3): three images side by side
  Aspect ratios default to the Figma tile geometry but can be overridden
  per section (useful for wide-strip images like Delírio's Frame 6/7,
  which are ~1905×585 → ratio "1905 / 585").

  Gap between sections and within a section = 18px, matching the Figma
  Delírio artboard.
*/
function Sections({ sections }: { sections: readonly Section[] }) {
  return (
    <section className="flex flex-col gap-3 md:gap-[18px]">
      {sections.map((s, i) => {
        if (s.kind === "hero") {
          return (
            <Frame
              key={i}
              src={s.src}
              ratio={s.ratio ?? HERO_RATIO_DEFAULT}
              // First image benefits from priority for LCP; the rest lazy-load.
              priority={i === 0}
              sizes="(max-width: 1440px) 100vw, 1440px"
            />
          );
        }
        // cols variant — N images in a horizontal strip.
        // Cols stay at their target count even on mobile; images are portrait
        // aspect so N-cols-side-by-side reads fine down to 390px viewports.
        const defaultRatio =
          s.cols === 2 ? COLS2_RATIO_DEFAULT : COLS3_RATIO_DEFAULT;
        const gridCols = s.cols === 2 ? "grid-cols-2" : "grid-cols-3";
        const sizes =
          s.cols === 2
            ? "(max-width: 1440px) 50vw, 720px"
            : "(max-width: 1440px) 33vw, 480px";
        return (
          <div key={i} className={`grid ${gridCols} gap-3 md:gap-[18px]`}>
            {s.images.map((src, j) => (
              <Frame
                key={j}
                src={src}
                ratio={s.ratio ?? defaultRatio}
                sizes={sizes}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
