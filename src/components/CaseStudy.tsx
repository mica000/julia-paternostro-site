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
import { defaultBg, invertHex, pick, type Project } from "@/lib/projects";
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
  const bg = project.bg ?? defaultBg;
  // Auto-derive fg via invertHex (same shade the nav's mix-blend-mode
  // renders) UNLESS the project explicitly overrides. The override exists
  // for saturated warm bgs where the auto-invert lands on a complement
  // with poor contrast — Delírio's coral being the poster child.
  const fg = project.fg ?? invertHex(bg);
  // When fg is explicit, we also want the top/bottom nav to render in that
  // color instead of its usual mix-blend-mode invert. The context signals
  // this to TopNav + BottomChrome — they swap treatments accordingly.
  const explicitFg = project.fg ?? null;

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
      <div className="mx-auto max-w-[1440px] px-5 md:px-8 pt-[120px] md:pt-[225px]">
        {/* ────────────  header  ──────────── */}
        <header className="mb-16 md:mb-24">
          {/*
            Title — Figma "super large text" style. Scales from a mobile-
            friendly 44px up to the 120px desktop masthead. Left-aligned on
            mobile so it reads as a headline rather than a compressed banner;
            centered from md up per the original spec.
          */}
          <h1 className="mb-16 md:mb-[150px] text-left md:text-center text-[44px] sm:text-[64px] md:text-[96px] xl:text-[120px] font-bold leading-[1.05] tracking-[-0.02em] break-words">
            {project.title}
          </h1>

          {/*
            Meta row. Stacks to 1 column on mobile, becomes the 4-column
            Figma layout from md up. Gap scales up so the tightest desktop
            spacing lands at xl+.
          */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 md:gap-x-10 lg:gap-x-16 xl:gap-x-[132px] gap-y-6">
            <MetaField label={LABEL.categorie[lang]}>
              {pick(project.category, lang)}
            </MetaField>
            <MetaField label={LABEL.year[lang]}>{project.year}</MetaField>
            <p className="text-sm leading-relaxed">
              {pick(project.brief, lang)}
            </p>
            <p className="text-sm leading-relaxed">
              {pick(project.context, lang)}
            </p>
          </div>
        </header>

        {/* ────────────  gallery  ──────────── */}
        {/*
          The five-row layout below matches Figma exactly. Row heights are
          expressed as aspect ratios so the whole grid scales fluidly with
          viewport width without any media queries.
        */}
        <section className="flex flex-col gap-3 md:gap-5">
          <Frame src={project.gallery[0]} ratio="1440/484" priority sizes="100vw" />

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
