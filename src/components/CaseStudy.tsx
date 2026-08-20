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
import { pick, projectBg, type Project, type Section } from "@/lib/projects";
import { useLang, usePageBg, type Lang } from "@/lib/state";
import { useTransition } from "@/components/PageTransition";
import CaseStudyFooter from "@/components/CaseStudyFooter";
import LangToggle from "@/components/LangToggle";

// Meta-row labels (Figma node 403:1046) — mixed case, and sit BELOW their
// value. Kept local to this component; edit here if the designer changes the
// wording.
const META_LABEL: Record<
  "projectType" | "year" | "deliverables",
  Record<Lang, string>
> = {
  projectType: { en: "Project type", pt: "Tipo de projeto" },
  year: { en: "Year", pt: "Ano" },
  deliverables: { en: "Deliverables", pt: "Entregáveis" },
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
        // Full-width wrapper — content spans the viewport at every size.
        className="w-full"
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
      <div className="px-6 md:px-[44px] pt-[96px] md:pt-[156px]">
        {/* ────────────  header  ────────────
            Just the title now. Per Figma (node 12:286) the meta row
            (CATEGORIE / YEAR / CLIENT) and credits row have both moved
            to the bottom of the case study — see the meta block after
            the sections. */}
        <header className="mb-8 md:mb-[62px]">
          {/*
            Title — Figma "Super Large Title" token: SF Pro Bold, 80/80, 0%
            tracking on desktop (xl+). Scales down through the breakpoints for
            mobile readability. `leading-none` matches the 80/80 (line height =
            font size); tracking is normal (0%) per the style.
          */}
          <h1 className="text-[40px] sm:text-[56px] md:text-[64px] xl:text-[80px] font-bold leading-none tracking-normal break-words md:max-w-[60%]">
            {project.title}
          </h1>
        </header>

        {/* ────────────  meta row  ────────────
            Figma node 403:1046 — moved UP under the title (it used to sit at
            the very bottom). Each field is its VALUE with a dimmed LABEL below
            it, laid across the top: Project type (½) · Year (¼) · Deliverables
            (¼). Stacks to one column on mobile. */}
        <Reveal className="mb-12 md:mb-[62px]">
          <div className="flex flex-col gap-6 md:flex-row md:gap-0">
            <MetaTop label={META_LABEL.projectType[lang]} className="md:w-1/2">
              {pick(project.category, lang)}
            </MetaTop>
            <MetaTop label={META_LABEL.year[lang]} className="md:w-1/4">
              {project.year}
            </MetaTop>
            <MetaTop
              label={META_LABEL.deliverables[lang]}
              className="md:w-1/4"
            >
              {project.deliverables
                ? pick(project.deliverables, lang)
                : pick(project.category, lang)}
            </MetaTop>
          </div>
        </Reveal>

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
            <ContextParagraph
              context={pick(project.context, lang)}
              brief={pick(project.brief, lang)}
            />
            <Sections sections={project.sections.slice(1)} />
          </>
        ) : (
          <>
            <section className="mx-auto mb-16 md:mb-[62px] md:max-w-[70%]">
              <Frame
                src={project.gallery[0]}
                ratio="1440/484"
                priority
                sizes="100vw"
              />
            </section>
            <ContextParagraph
              context={pick(project.context, lang)}
              brief={pick(project.brief, lang)}
            />
            <section className="flex flex-col gap-3 md:gap-5">
              {/* 2×2 grid — each row staggers L (0) → R (80ms). Column
                  index in a 2-col grid is `j % 2`. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                <Frame src={project.gallery[1]} ratio="710/484" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 720px" delay={0} />
                <Frame src={project.gallery[2]} ratio="710/484" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 720px" delay={80} />
                <Frame src={project.gallery[3]} ratio="710/484" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 720px" delay={0} />
                <Frame src={project.gallery[4]} ratio="710/484" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 720px" delay={80} />
              </div>

              {/* 3-col strip — L (0) → M (80) → R (160). */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
                <Frame src={project.gallery[5]} ratio="468/292" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 33vw, 468px" delay={0} />
                <Frame src={project.gallery[6]} ratio="468/292" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 33vw, 468px" delay={80} />
                <Frame src={project.gallery[7]} ratio="468/292" sizes="(max-width: 768px) 100vw, (max-width: 1440px) 33vw, 468px" delay={160} />
              </div>

              {/* Solo hero — no delay. */}
              <Frame src={project.gallery[8]} ratio="1440/484" sizes="100vw" />
            </section>
          </>
        )}

      </div>

      {/* Related projects — full-viewport-width footer, sits inside the
          rise-in wrapper so it animates in with the rest of the content.
          Its own vertical padding replaces the max-w block's old
          pb-[194px], keeping the last row clear of the fixed bottom nav. */}
      <CaseStudyFooter currentSlug={project.slug} />
      </div>

      {/* Language toggle — pinned bottom-right, mirroring the index footer
          (Figma node 197:570). The case study nav matches the index (no
          switch up there); the switch lives here instead. Desktop only — on
          mobile it stays in the nav's MENU overlay. The wrapper is
          click-through so it never blocks the gallery beneath it. Sits
          OUTSIDE the rise-in wrapper so it's present immediately, like the
          fixed nav. */}
      <div className="pointer-events-none fixed bottom-[44px] right-[44px] z-30 hidden md:flex">
        <LangToggle className="pointer-events-auto" />
      </div>
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

  Load-in animation (inspired by metalab.com/work/pitch):
    - Slot starts at the project bg color (inherited via the transparent
      wrapper) — reader never sees a blank white flash while the image
      decodes.
    - Image starts at opacity 0, transitions to 1 over 600ms once
      next/image's onLoad fires. `priority` images that hydrate already-
      loaded are caught by the initial `img.complete` check so they don't
      stay invisible.
    - `ease-out` (not linear) so the fade decelerates into place, which
      reads as "landing" rather than a flat fade.
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
  /** ms delay before the mask reveal starts — used to stagger cols rows. */
  delay?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // next/image's onLoad can miss cached/priority images that finish
  // decoding before React attaches the handler. Belt-and-braces: query
  // the underlying <img> on mount and either flip loaded immediately
  // (if already complete) or attach a native `load` listener so we
  // catch the event no matter when it fires.
  useEffect(() => {
    const img = wrapRef.current?.querySelector("img");
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      return;
    }
    const onLoad = () => setLoaded(true);
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
  }, [src]);

  // Bottom-to-top reveal — the Frame acts as a mask with overflow-hidden,
  // and the image inside starts translated 100% down (fully below the
  // mask window). When the frame scrolls into view, the image slides up
  // into place, appearing to be "uncovered" from bottom to top. Matches
  // the Metalab.com case-study reveal.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Reduced-motion readers skip the mask entirely — no scanning eyes
    // over animated content, image appears immediately.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    // Synchronous first-check: if the frame is already in view at
    // mount, reveal immediately. IntersectionObserver's initial
    // callback is async, and in some conditions (throttled tabs,
    // strict-mode double-invoke edge cases) it doesn't fire fast
    // enough — so above-the-fold frames stayed permanently masked.
    // Doing a sync rect test first eliminates that race.
    const rect = el.getBoundingClientRect();
    const triggerLine = window.innerHeight * 0.9;
    if (rect.top < triggerLine && rect.bottom > 0) {
      setRevealed(true);
      return;
    }
    // Below-the-fold frames wait for scroll to bring them in.
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setRevealed(true);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            reveal();
            break;
          }
        }
      },
      // -10% at the bottom — fires as the frame enters the top 90% of
      // the viewport, so the mask starts opening just before the reader
      // consciously registers the tile.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 }
    );
    io.observe(el);
    // Scroll listener as a belt-and-suspenders backup — some browsers
    // and dev-mode strict-mode double-invokes miss the IO callback the
    // first time. Rect check is cheap and only runs until the frame is
    // revealed, then unsubscribes.
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) reveal();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden"
      style={{
        aspectRatio: ratio.replace("/", " / "),
        // Top-to-bottom mask reveal — the image stays put; the visible
        // window opens from the top edge down. `inset(0 0 100% 0)` hides
        // everything (bottom edge is inset 100% from the bottom); as
        // that bottom inset relaxes to 0, the window grows downward.
        // Matches the Metalab.com case-study reveal.
        clipPath: revealed ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
        // 900ms ease-in-out (easeInOutQuart) — slow entry, quick middle,
        // slow settle. Reads as intentional scan rather than snap.
        transition: `clip-path 900ms cubic-bezier(0.77, 0, 0.175, 1) ${delay}ms`,
        willChange: "clip-path",
      }}
    >
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
        // Opacity fade guards against slow-loading images popping into a
        // partially-open mask window.
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
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
    // The hero (main image) is capped and centered — it doesn't stretch the
    // full content width on large screens, matching the Figma where it sits
    // inset. The text blocks around it stay left-aligned / full-width.
    <section className="mx-auto mb-16 md:mb-[62px] md:max-w-[70%]">
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
  ContextParagraph — the large-format description below the intro hero.
  It MERGES the project's `brief` and `context` into one description block,
  rendered as two stacked paragraphs — `brief` first, then `context`.
  Duplicates and empties are dropped, so projects whose brief and context are
  the same (or blank) show just one line. Constrained to ~700px so lines wrap
  short and read like display copy rather than body text.
*/
function ContextParagraph({
  context,
  brief,
}: {
  context: string;
  brief: string;
}) {
  const paras = [brief, context].filter(
    (t, i, arr) => t && arr.indexOf(t) === i
  );
  return (
    <Reveal>
      <div className="mb-16 md:mb-[156px] flex max-w-[700px] flex-col gap-4 md:gap-5">
        {paras.map((t, i) => (
          <p
            key={i}
            className="text-[16px] font-semibold leading-snug tracking-normal md:text-[18px] md:leading-6"
          >
            {t}
          </p>
        ))}
      </div>
    </Reveal>
  );
}

/*
  Reveal — scroll-triggered reveal wrapper (inspired by metalab.com).

  Content starts at opacity 0 + translateY(24px) and settles into place
  once the wrapper's top edge crosses the viewport. Uses a single shared
  IntersectionObserver-per-mount with a 15% top-inset root margin so
  reveals fire slightly before the element hits the bottom of the
  viewport, not the moment it appears — which reads as "already there
  when the eye lands" rather than "popping in late".

  - `once: true` (default) — once revealed, stays revealed even on
    scroll-out. Reveals repeating on every scroll-back feels twitchy.
  - `delay` (optional) — stagger reveals inside a grid row. Metalab
    doesn't stagger; keep at 0 unless the design specifically calls for
    it.
  - Falls back to visible immediately on browsers without
    IntersectionObserver (or during SSR hydration) so nothing stays
    invisible for readers on old engines.
*/
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      // rootMargin: reveal fires when the element's top is 15% into the
      // viewport from the bottom — the reader sees the reveal *just* as
      // it enters, not after it's already fully on screen.
      { rootMargin: "0px 0px -15% 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Metalab-style easing: expo-out over ~1.1s. Motion covers a long
  // distance quickly at the start then settles very slowly — the "premium"
  // reveal feel. Distance is larger than the earlier 24px to give the
  // curve room to breathe.
  const EASE = "cubic-bezier(0.19, 1, 0.22, 1)";
  const DURATION = 1100;
  const DISTANCE = 40;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${DISTANCE}px)`,
        transition: `opacity ${DURATION}ms ${EASE} ${delay}ms, transform ${DURATION}ms ${EASE} ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
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
          // Frame owns its own bottom-to-top mask reveal now, so we
          // don't wrap it in <Reveal> (that would fade the whole row
          // in on top of the mask slide and muddy the effect).
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
              // Stagger the mask reveal across cols: left frame opens
              // first, each subsequent frame 80ms later. Subtle enough
              // to read as one motion, distinct enough to feel authored.
              // Solo hero rows get delay=0 (no stagger).
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
