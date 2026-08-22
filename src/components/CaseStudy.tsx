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
import { useEffect, useRef, useState } from "react";
import { pick, type Project, type Section } from "@/lib/projects";
import { useLang, usePageBg, type Lang } from "@/lib/state";
import { useTransition } from "@/components/PageTransition";
import CaseStudyFooter from "@/components/CaseStudyFooter";
import CaseStudyCTA from "@/components/CaseStudyCTA";

// Meta-row labels (Figma node 403:1046) — mixed case, and sit BELOW their
// value. Kept local to this component; edit here if the designer changes the
// wording.
const META_LABEL: Record<
  "projectType" | "year" | "deliverables" | "client",
  Record<Lang, string>
> = {
  projectType: { en: "Project type", pt: "Tipo de projeto" },
  year: { en: "Year", pt: "Ano" },
  deliverables: { en: "Deliverables", pt: "Entregáveis" },
  client: { en: "Client", pt: "Cliente" },
};

export default function CaseStudy({ project }: { project: Project }) {
  const { lang } = useLang();
  const { end } = useTransition();
  const { setPageBg, setPageFg } = usePageBg();
  // Uniform site-wide palette: black bg + white text on every case
  // study. Per-project colors are ignored so the visual language stays
  // consistent regardless of which project the reader lands on.
  const bg = "#000000";
  const fg = "#ffffff";
  // Left-panel description — brief + context merged (deduped), the same
  // copy the old full-width ContextParagraph showed, now living beside the
  // gallery. Empty/duplicate entries are dropped.
  const descParas = [pick(project.brief, lang), pick(project.context, lang)].filter(
    (t, i, arr) => t && arr.indexOf(t) === i
  );
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
  // Once the rise-in finishes we drop the wrapper's transform + will-change.
  // Keeping `will-change: transform` alive forever is a needless compositing
  // hint, and a lingering transform establishes a containing block that would
  // trap any future `position: fixed`/`sticky` descendant — so we clean both
  // up after the animation settles.
  const [settled, setSettled] = useState(false);

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

  useEffect(() => {
    if (!entered) return;
    // After the 480ms transform transition (+ buffer), drop transform/
    // will-change so sticky positioning is measured against the viewport.
    const id = window.setTimeout(() => setSettled(true), 600);
    return () => window.clearTimeout(id);
  }, [entered]);

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
        // Full-width wrapper — content spans the viewport at every size.
        className="w-full"
        style={{
          // Rise-in: content starts 24px lower and transparent, settles as
          // the overlay above is fading out. Same 480ms ease-out feels
          // aligned with the 280ms overlay fade — the reader sees the
          // content emerging into position rather than snapping. Once
          // `settled`, transform + will-change are dropped (cleanup — see the
          // state declaration above).
          transform: settled
            ? undefined
            : entered
              ? "translateY(0)"
              : "translateY(24px)",
          opacity: entered ? 1 : 0,
          transition: settled
            ? undefined
            : "transform 480ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: settled ? undefined : "transform, opacity",
        }}
      >
      {/* Centered content column (Figma 422:1766) — caps at 1200px and
          centres, with gutter padding on smaller screens. Holds the
          title/description header and, below it, the full-width gallery. */}
      <div className="px-6 md:px-[44px] pt-[96px] md:pt-[156px]">
        <div className="mx-auto w-full max-w-[1200px]">
          {/* Header (Figma 423:2049): TITLE on the left, the merged
              DESCRIPTION + meta on the right, with a band of WHITE SPACE
              between them. `justify-between` opens that gap; each column is
              ~38.3% of the 1200px width (Figma 460px) so the middle ~23% is
              empty. Stacks vertically below md. */}
          <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-0">
            {/* Title — up to 64px. `text-wrap: balance` evens the line
                lengths so a long title breaks into tidy lines instead of
                leaving a single orphan word dangling on the last line. */}
            <h1 className="md:w-[38.3%] text-[clamp(2.5rem,4vw,4rem)] font-bold leading-[1.05] tracking-normal [text-wrap:balance]">
              {project.title}
            </h1>

            {/* Right column — just the description now; the credits row moved
                below the gallery (Figma 423:2302). */}
            <div className="md:w-[38.3%]">
              {/* Description — brief + context merged (deduped). `text-wrap:
                  pretty` stops the last line from dropping to a lone orphan
                  word. */}
              <div className="flex flex-col gap-4">
                {descParas.map((t, i) => (
                  <p
                    key={i}
                    className="text-[13px] font-normal leading-4 tracking-normal [text-wrap:pretty]"
                  >
                    {t}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Gallery — full width of the centred column, below the header
              (Figma 422:1886). */}
          <div className="mt-12 md:mt-[72px]">
            {project.sections && project.sections.length > 0 ? (
              <Sections sections={project.sections} />
            ) : (
              <section className="flex flex-col gap-3 md:gap-[18px]">
                <Frame
                  src={project.gallery[0]}
                  ratio="1200/700"
                  priority
                  sizes="(max-width: 768px) 100vw, 1200px"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[18px]">
                  <Frame src={project.gallery[1]} ratio="590/485" sizes="(max-width: 768px) 100vw, 590px" delay={0} />
                  <Frame src={project.gallery[2]} ratio="590/485" sizes="(max-width: 768px) 100vw, 590px" delay={80} />
                  <Frame src={project.gallery[3]} ratio="590/485" sizes="(max-width: 768px) 100vw, 590px" delay={0} />
                  <Frame src={project.gallery[4]} ratio="590/485" sizes="(max-width: 768px) 100vw, 590px" delay={80} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[18px]">
                  <Frame src={project.gallery[5]} ratio="388/292" sizes="(max-width: 768px) 100vw, 388px" delay={0} />
                  <Frame src={project.gallery[6]} ratio="388/292" sizes="(max-width: 768px) 100vw, 388px" delay={80} />
                  <Frame src={project.gallery[7]} ratio="388/292" sizes="(max-width: 768px) 100vw, 388px" delay={160} />
                </div>
                <Frame src={project.gallery[8]} ratio="1200/485" sizes="(max-width: 768px) 100vw, 1200px" />
              </section>
            )}
          </div>

          {/* Credits row — below the gallery (Figma 423:2302). One field per
              credit (Julia's shared Notion credits): the person on top, the
              role beneath (MetaTop). Laid out as a column grid so a long role
              wraps in its own cell and the fields stay aligned. When a project
              has no detailed credits, the row falls back to its Deliverables.
              Client + Year always close the row. 128px of breathing room above
              and below on desktop; the gallery carries no bottom spacing, so
              this padding is the ONLY gap. */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 py-16 md:grid-cols-4 md:gap-x-10 md:py-[128px]">
            {project.credits?.items?.length ? (
              project.credits.items.map((c, i) => (
                <MetaTop key={i} label={pick(c.role, lang)}>
                  {c.people}
                </MetaTop>
              ))
            ) : (
              <MetaTop label={META_LABEL.deliverables[lang]}>
                {project.deliverables
                  ? pick(project.deliverables, lang)
                  : pick(project.category, lang)}
              </MetaTop>
            )}
            {project.credits?.client && (
              <MetaTop label={META_LABEL.client[lang]}>
                {project.credits.client}
              </MetaTop>
            )}
            <MetaTop label={META_LABEL.year[lang]}>{project.year}</MetaTop>
          </div>
        </div>
      </div>

      {/* Related projects — full-viewport-width footer, sits inside the
          rise-in wrapper so it animates in with the rest of the content.
          Its own vertical padding replaces the max-w block's old
          pb-[194px], keeping the last row clear of the fixed bottom nav. */}
      <CaseStudyFooter currentSlug={project.slug} />
      {/* Closing CTA — "Have something in mind?" (Figma 423:2440), the last
          band, sitting directly below the All-projects footer. */}
      <CaseStudyCTA />
      </div>
      {/* No on-page language switch here — the toggle now lives in the top nav
          (Figma 397:542), reachable on every route, so the case study footer
          no longer carries its own. */}
    </main>
  );
}

/*
  MetaTop — one field in the top meta row (Figma node 403:1046): the VALUE on
  top at full opacity, a dimmed LABEL directly beneath it. Both SF Regular
  13/16. The width (½ / ¼ / ¼) is passed in via `className`.
*/
function MetaTop({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[13px] font-normal leading-4">{children}</div>
      <div className="mt-1 text-[13px] font-normal leading-4 opacity-50">
        {label}
      </div>
    </div>
  );
}

/*
  Frame — a gallery image slot. Uses `next/image` with `fill` inside an
  aspect-ratio box so the source image (any size) crops cleanly to the
  designed slot without hardcoded dimensions.

  Load-in animation (mirrors portorocha.com — e.g. /robinhood-market):
    - Slot starts at the project bg color (inherited via the transparent
      wrapper) — reader never sees a blank white flash while the image
      decodes.
    - Image starts at opacity 0 and fades to 1 over 500ms once it finishes
      loading (Porto Rocha's `.preload` → `.loaded`, opacity 0 → 1, 0.5s).
      There is NO directional wipe/clip-path reveal — just the fade. next/
      image lazy-loads below-the-fold slots as they approach the viewport,
      so each tile fades in right as it arrives. `priority`/cached images
      that hydrate already-loaded are caught by the initial `img.complete`
      check so they don't stay invisible.
*/
function Frame({
  src,
  ratio,
  sizes,
  priority,
  delay = 0,
}: {
  src: string;
  /** CSS aspect-ratio expression, e.g. "1440/484". */
  ratio: string;
  sizes: string;
  priority?: boolean;
  /** ms delay before the fade-in starts — used to stagger cols rows. */
  delay?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Some slots are animations. They were authored as GIFs and transcoded to
  // H.264 (a 8.5MB GIF lands around 0.5MB), so a slot is a video purely by
  // extension — everything else about the frame is identical.
  const isVideo = /\.mp4$/i.test(src);

  // next/image's onLoad can miss cached/priority images that finish
  // decoding before React attaches the handler. Belt-and-braces: query
  // the underlying media node on mount and either flip loaded immediately
  // (if already ready) or attach a native listener so we catch the event
  // no matter when it fires.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    if (isVideo) {
      const video = wrap.querySelector("video");
      if (!video) return;
      // readyState >= 2 (HAVE_CURRENT_DATA) means the first frame is painted.
      if (video.readyState >= 2) {
        setLoaded(true);
        return;
      }
      const onData = () => setLoaded(true);
      video.addEventListener("loadeddata", onData);
      return () => video.removeEventListener("loadeddata", onData);
    }

    const img = wrap.querySelector("img");
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      return;
    }
    const onLoad = () => setLoaded(true);
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
  }, [src, isVideo]);

  // Honour reduced-motion by holding the video on its first frame. Done
  // after mount rather than via the autoPlay attribute so the server and
  // client render identical markup.
  useEffect(() => {
    if (!isVideo) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const video = wrapRef.current?.querySelector("video");
    video?.pause();
  }, [src, isVideo]);

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden"
      style={{ aspectRatio: ratio.replace("/", " / ") }}
    >
      {isVideo ? (
        /* Decorative animation: muted + playsInline so iOS plays it inline
           rather than going fullscreen, and aria-hidden because it carries
           no information the surrounding copy doesn't already give. */
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: loaded ? 1 : 0,
            transition: `opacity 500ms ease ${delay}ms`,
            willChange: "opacity",
          }}
        />
      ) : (
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
        // Inline style (not a Tailwind class) because Tailwind v4's JIT
        // can't reliably detect opacity-0/opacity-100 inside a template
        // ternary — the utility rule wasn't emitted and images stayed at
        // computed opacity 0 forever. Inline styles bypass that entirely.
        //
        // Plain fade-in on load, mirroring portorocha.com (their `.preload`
        // → `.loaded`: opacity 0 → 1 over 0.5s, no directional wipe). The
        // optional `delay` still lets a cols row stagger its tiles; it's 0
        // for most images, so they simply fade as they finish loading.
        style={{
          opacity: loaded ? 1 : 0,
          transition: `opacity 500ms ease ${delay}ms`,
          willChange: "opacity",
        }}
      />
      )}
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
          // Frame owns its own fade-in-on-load now, so we don't wrap it in
          // <Reveal> (that would double up two fades on the same element).
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
              // Stagger the fade across cols: left frame fades first, each
              // subsequent frame 80ms later. Subtle enough to read as one
              // motion. Solo hero rows get delay=0 (no stagger).
              <Frame
                key={j}
                src={src}
                ratio={s.ratio ?? defaultRatio}
                sizes={sizes}
                delay={j * 80}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
