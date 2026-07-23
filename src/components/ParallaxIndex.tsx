"use client";

/*
  ParallaxIndex — full-width, one-project-at-a-time index (the "parallax" test)
  ----------------------------------------------------------------------------
  A distinct index treatment, separate from Index 2 / Editorial. Inspired by
  oddityfragrance.com and the Figma "Parallax test" frames.

  Two views, toggled by the bottom-center "Show all" button:

  1. STAGE (default) — a black canvas showing ONE project at a time:
       • A large hero image centered ("full-width" project reveal).
       • A vertical list of every project name on the left. The active one is
         emphasised (bold, larger, with a leading dash); the rest are dimmed.
       • The active project's category + year on the right.
       • HOVER over the hero: the project's OTHER images bloom in, scattered
         around the hero, and drift with the cursor — each at its own depth,
         so nearer images move more (parallax). A pill follows the cursor.
       • SCROLL down: the wheel advances to the next project. The heroes slide
         vertically (the current one leaves, the next arrives) — "off it goes."
       • CLICK the hero: routes to that project's case study via the shared
         color-morph transition.

  2. SHOW ALL — a scrollable detail list: name · category + short blurb · year
     · a strip of thumbnails. Clicking a row opens the case study.

  Motion model:
    A single wheel-driven fractional index `current` in [0, N-1] drives
    everything, lerped toward a `target`. A continuous rAF loop writes
    transforms/opacity straight to the DOM (no per-frame React state) — the
    same pattern the other canvas modes use. React only re-renders when the
    rounded active index changes. Cursor position feeds a lerped `mouse` ref
    that the same loop reads to drift the hero + satellites.

  Lenis:
    The root carries `data-lenis-prevent` so the global smooth-scroll never
    intercepts the wheel here (the stage drives its own motion). In Show-all
    the root becomes a native overflow-y-auto scroller, which Lenis also
    leaves alone for the same reason.
*/

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  projects,
  projectBg,
  projectImageSet,
  pick,
} from "@/lib/projects";
import type { ImageStyle } from "@/lib/config";
import { useTransition } from "@/components/PageTransition";
import { useLang, useConfig } from "@/lib/state";

type Props = {
  imageStyle: ImageStyle;
  background: string;
};

// ── Tuning knobs ───────────────────────────────────────────────────────────
// Scroll is SNAPPED, oddity-style: one gesture commits straight to the next
// whole project rather than parking the user in an in-between state.
// Accumulated |deltaY| (px) needed to fire one step — a small, deliberate
// scroll. Lower = flickier; higher = more effort per project.
const WHEEL_STEP_THRESHOLD = 26;
// After a step fires, ignore further wheel input for this long (ms) so a
// single mouse-wheel notch or a trackpad flick's momentum tail can't skip
// several projects at once. Roughly matches the slide's settle time.
const WHEEL_COOLDOWN_MS = 460;
// Progress lerp per frame (0..1). Higher = snappier settle onto a project.
// Bumped from 0.12 so the snap to the next project resolves quickly instead
// of drifting in slowly.
const SMOOTH = 0.18;
// Fraction of viewport height a hero travels per index step. ~1 keeps only
// the active hero on screen at rest, with neighbours parked just off-frame.
const SLIDE_TRAVEL = 0.92;
// Max cursor-drift (px) applied to the hero, and to satellites (scaled by
// each satellite's depth). Satellites move more than the hero → parallax.
const HERO_DRIFT = 16;
const SAT_DRIFT = 70;
// Cursor-follow lerp for the drift (0..1). Lower = softer, laggier drift.
const MOUSE_SMOOTH = 0.1;
// Grace period after a project change: the hero stands ALONE for this long
// before hovering can reveal the complementary images.
const REVEAL_GRACE_MS = 1500;
// Calm-down period after a shake dismissal before the images may return.
const SHAKE_CALM_MS = 1100;
// Shake detection (per mousemove event). Energy accumulates from cursor
// travel and decays each event; direction reversals count much more than
// straight travel, so a fast-but-straight swipe doesn't trigger while a
// vigorous back-and-forth shake does.
const SHAKE_DECAY = 0.86;
const SHAKE_REVERSAL_GAIN = 2.2;
const SHAKE_LINEAR_GAIN = 0.4;
const SHAKE_THRESHOLD = 260;
// Hero footprint — kept proportional to Figma (hero = 62.5% of frame width,
// ratio 913:560) and, crucially, SMALLER on narrower screens so it never
// grows wide enough to run under the project-name list on the left. Width is
// the smaller of a viewport-width fraction and a height-derived cap (so it
// can't get too tall either); 91vh ≈ 56vh × 913/560.
const HERO_BOX =
  "aspect-[913/560] max-w-[1140px] w-[min(54vw,84vh)] md:w-[min(58vw,88vh)] lg:w-[min(62vw,91vh)]";

/*
  Satellite compositions — the hover-revealed complementary images.

  Positions are transcribed EXACTLY from the Figma "Parallax index + hover on
  project" frame (node 120:385, 1920×1314): each slot is the box's center
  offset from the frame center, as fractions of frame width (dx) and height
  (dy), plus its width as a fraction of frame width (w) and its exact aspect
  ratio. No rotation — boxes sit straight, as drawn.

  `depth` scales the cursor drift only (bigger = drifts more px); it never
  moves a box away from its Figma anchor by more than SAT_DRIFT.

  Per-project compositions:
    Every project can have its own arrangement. `COMPOSITIONS` maps a project
    slug to its slot list; anything not listed uses the default Figma
    composition below. To add one, draw the frame in Figma and transcribe the
    boxes the same way (center offset + width fraction + ratio).
*/
type SatSlot = { dx: number; dy: number; w: number; ratio: string; depth: number };

// Node 120:385 "Images" layer, hero (Rectangle 1) excluded:
//   Rectangle 57  → 276.93,157.73  292.19×405.53   (portrait, top-left)
//   Frame 11      → 534,86         614.64×377.20   (landscape, top-center)
//   Rectangle 56  → 1453.87,213.21 212.25×294.58   (small portrait, top-right)
//   Rectangle 55  → 168.84,839.93  480×294.58      (landscape, bottom-left)
//   Frame 10      → 823,658        913.22×560.45   (large landscape,
//                    BOTTOM-RIGHT, overlapping the hero's corner — in the
//                    Figma tree it's nested inside the "05" wrapper at
//                    (712,453) + (111,205), i.e. absolute 823,658)
const FIGMA_COMPOSITION: SatSlot[] = [
  { dx: -0.2797, dy: -0.2256, w: 0.1522, ratio: "292 / 406", depth: 0.5 },
  { dx: -0.0618, dy: -0.291, w: 0.3201, ratio: "615 / 377", depth: 0.7 },
  { dx: 0.3125, dy: -0.2256, w: 0.1105, ratio: "212 / 295", depth: 0.6 },
  { dx: -0.287, dy: 0.2513, w: 0.25, ratio: "480 / 295", depth: 0.4 },
  { dx: 0.1665, dy: 0.214, w: 0.4756, ratio: "913 / 560", depth: 0.55 },
];

// Per-slug overrides — add entries as their Figma frames are drawn, e.g.:
//   "tenda-lab": [ { dx: ..., dy: ..., w: ..., ratio: "...", depth: ... }, ... ]
const COMPOSITIONS: Record<string, SatSlot[]> = {};

function compositionFor(slug: string): SatSlot[] {
  return COMPOSITIONS[slug] ?? FIGMA_COMPOSITION;
}

/*
  Per-project satellite IMAGES, in slot order — the SPECIFIC complementary
  images the Figma hover frame places around the hero, transcribed from the
  design (NOT just the first few gallery images). A project without an entry
  falls back to `projectImageSet` (its gallery in reading order).

  Delírio Tropical (node 120:385), slot order = FIGMA_COMPOSITION:
    0 top-left portrait      → 05 (palm)
    1 top-center landscape   → 02 (Delírio Tropical lettering)
    2 top-right portrait     → 04 (green/coral squiggle)
    3 bottom-left landscape  → 03 (icon grid)
    4 bottom-right landscape → 01 (Tropical lettering detail)
*/
const dt = (n: string) => `/Images/Delirio-Tropical/${n}.webp`;

/*
  Main hero image per project (the big center image). Falls back to the
  project's indexImage / first gallery image when it isn't listed here.
*/
const HERO_IMAGES: Record<string, string> = {
  "delirio-tropical": dt("01"), // TROP lettering crop
};

const SATELLITE_IMAGES: Record<string, string[]> = {
  // Slot order = FIGMA_COMPOSITION:
  //   0 TL portrait  → 05 palm
  //   1 TC landscape → 11 drink
  //   2 TR portrait  → 04 squiggle
  //   3 BL landscape → 03 icon grid
  //   4 BR landscape → 10 green "Delírio Tropical" lettering
  // Uses the already-optimized webp files — the /parallax index/ PNG
  // exports the studio added are exact duplicates of these, so they're
  // safe to delete (see the naming map that confirmed the 1:1 match).
  "delirio-tropical": [dt("05"), dt("11"), dt("04"), dt("03"), dt("10")],
};

/** Big hero image for a project — prefer its landscape index image, then the
    first case-study image, then the square tile. */
function heroSrc(p: (typeof projects)[number]): string {
  return HERO_IMAGES[p.slug] ?? p.indexImage ?? projectImageSet(p, 1)[0];
}

/*
  Deterministic 0..1 "jitter" from a string seed (FNV-1a hash). Used to give
  each satellite a randomized-looking reveal delay that's STABLE across
  renders — so the order is consistent for a given project (no reshuffle on
  every frame) and identical on server and client (no hydration mismatch).
*/
function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export default function ParallaxIndex({ background }: Props) {
  const { begin } = useTransition();
  const { lang, t } = useLang();
  const N = projects.length;

  // Fractional scroll index (target) and its lerped value (current). Refs so
  // the rAF loop mutates them at 60fps without re-rendering.
  const target = useRef(0);
  const current = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  // Snap-scroll bookkeeping: accumulate wheel delta until it crosses the
  // step threshold, then commit exactly one whole-project step and lock out
  // further input for a short cooldown.
  const wheelAccum = useRef(0);
  const wheelLockUntil = useRef(0);

  // Cursor drift — normalized [-1,1] from viewport center, lerped for softness.
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCur = useRef({ x: 0, y: 0 });

  const [hovering, setHovering] = useState(false);
  // WHOSE satellites are revealed (null = nobody's). Keyed by slug rather
  // than a boolean so the instant the active project changes, the derived
  // `reveal` below flips false in the SAME render — the incoming project's
  // satellites mount hidden and can never flash for a frame while the arm
  // effect is still pending. Lags `hovering` via the arm effect so the
  // opacity/transform transitions actually play instead of snapping.
  const [revealedSlug, setRevealedSlug] = useState<string | null>(null);
  // Satellite index the cursor is directly over — that one lifts to 100%.
  const [hoveredSat, setHoveredSat] = useState<number | null>(null);
  // Ambient cycling while revealed — indices of boxes currently faded out.
  // Rotates on an interval so some images softly disappear while others
  // return (what oddity's own code calls its "random" layer).
  const [cycleHidden, setCycleHidden] = useState<ReadonlySet<number>>(
    () => new Set()
  );
  // Earliest time the reveal is allowed to arm. Pushed forward 3s on every
  // project change (hero stands alone first) and ~1.1s after a shake.
  const revealReadyAt = useRef(0);
  // Bumped by a shake dismissal to force the arm effect to re-run (drop the
  // satellites now, then bring them back once the calm period has passed).
  const [revealEpoch, setRevealEpoch] = useState(0);
  // Mirror of the derived `reveal` (defined below, after `active`) readable
  // inside the mousemove handler without re-binding it on every flip.
  const revealRef = useRef(false);
  // Shake detector state — last cursor sample + accumulated energy.
  const shakeState = useRef({ x: 0, y: 0, dx: 0, dy: 0, energy: 0 });
  // "Show all" now lives in shared config so the TopNav (rendered up in the
  // layout) can toggle the list this component renders. We only READ it here.
  const { config } = useConfig();
  const showAll = config.parallaxShowAll;
  const showAllRef = useRef(showAll);
  useEffect(() => {
    showAllRef.current = showAll;
  }, [showAll]);

  const rootRef = useRef<HTMLDivElement>(null);
  const heroRefs = useRef<Array<HTMLDivElement | null>>([]);
  const satsRef = useRef<HTMLDivElement>(null);
  const viewportH = useRef(0);
  const viewportW = useRef(0);
  const reduce = useRef(false);

  const active = projects[activeIdx];
  // True only while the ACTIVE project's own satellites are revealed —
  // false from the very first render after a project change.
  const reveal = revealedSlug === active.slug;
  useEffect(() => {
    revealRef.current = reveal;
  }, [reveal]);
  // This project's satellite arrangement (Figma default or per-slug override)
  // and the images that fill its slots, in reading order.
  const composition = useMemo(() => compositionFor(active.slug), [active.slug]);
  const activeSatellites = useMemo(
    () =>
      SATELLITE_IMAGES[active.slug] ??
      projectImageSet(active, composition.length),
    [active, composition]
  );

  // Arm the soft reveal. Runs when hovering starts OR when the active project
  // changes while hovering: we first drop the satellites to hidden, then a
  // frame later flip them back on, so each image's opacity/transform
  // transition (with its own randomized delay) plays from scratch. This is
  // what makes the images trickle in — softly, in a scrambled order — every
  // time they appear (on hover, and when scrolling to the next project),
  // rather than snapping in all at once. setState only fires inside rAF
  // callbacks (never synchronously in the effect body).
  // Every project change restarts the grace clock: the newly-arrived hero
  // stands alone for REVEAL_GRACE_MS before hovering may bloom the images.
  // Declared BEFORE the arm effect below so the fresh deadline is already
  // in place when that effect reads it on the same slug change.
  useEffect(() => {
    revealReadyAt.current = performance.now() + REVEAL_GRACE_MS;
  }, [active.slug]);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;
    raf1 = requestAnimationFrame(() => {
      setRevealedSlug(null);
      setCycleHidden(new Set()); // fresh cycle for the new reveal
      setHoveredSat(null); // stale hover index from the previous set
      if (!hovering) return;
      // Wait out whatever remains of the grace window (0 once it has
      // passed — then the reveal arms on the next frame as before).
      const wait = Math.max(0, revealReadyAt.current - performance.now());
      timer = window.setTimeout(() => {
        raf2 = requestAnimationFrame(() => setRevealedSlug(active.slug));
      }, wait);
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, [hovering, active.slug, revealEpoch]);

  // Ambient cycle: while the satellites are revealed, every beat pick 1–2
  // boxes at random to fade out; everything else stays (or softly returns).
  // Each flip animates through the same 780ms ease + per-box jittered delay
  // as the entrance, so the set feels alive without ever popping.
  useEffect(() => {
    if (!reveal) return;
    const n = composition.length;
    if (n < 2) return;
    const id = window.setInterval(() => {
      setCycleHidden(() => {
        const next = new Set<number>();
        const count = 1 + Math.round(Math.random()); // 1 or 2 at a time
        while (next.size < Math.min(count, n - 1)) {
          next.add(Math.floor(Math.random() * n));
        }
        return next;
      });
    }, 1600);
    return () => window.clearInterval(id);
  }, [reveal, composition.length]);

  // Measure viewport + reduced-motion once, and on resize.
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      viewportH.current = window.innerHeight;
      viewportW.current = window.innerWidth;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Wheel hijack — advances the fractional index. Skipped entirely in Show-all
  // so that view scrolls natively. Non-passive so we can preventDefault.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (showAllRef.current) return; // let the list scroll natively
      e.preventDefault();
      const now = performance.now();
      // During the post-step cooldown, swallow input (and its accumulation)
      // so a wheel notch's momentum tail can't roll into a second step.
      if (now < wheelLockUntil.current) {
        wheelAccum.current = 0;
        return;
      }
      wheelAccum.current += e.deltaY;
      if (Math.abs(wheelAccum.current) < WHEEL_STEP_THRESHOLD) return;
      // Commit exactly one step from the current *target* (snapped to a whole
      // index), so we always land on a project, never in between. The index is
      // UNBOUNDED (no 0…N-1 clamp) — the hero loop below maps it back with a
      // wrapped modulo, so scrolling past the last project loops seamlessly
      // into the first, and up from the first into the last.
      const dir = wheelAccum.current > 0 ? 1 : -1;
      wheelAccum.current = 0;
      wheelLockUntil.current = now + WHEEL_COOLDOWN_MS;
      target.current = Math.round(target.current) + dir;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [N]);

  // Cursor tracking — feeds the drift, the follow-pill position, and the
  // shake detector (a strong back-and-forth shake dismisses the images).
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const vw = viewportW.current || window.innerWidth;
    const vh = viewportH.current || window.innerHeight;
    mouseTarget.current = {
      x: (e.clientX / vw) * 2 - 1,
      y: (e.clientY / vh) * 2 - 1,
    };
    // Derive hover from the pointer's ACTUAL position inside the interaction
    // region (centered 88vw × 82vh) rather than from mouseenter/leave. Those
    // only fire on a boundary crossing, so a cursor already sitting inside at
    // load — or after the window regains focus — never triggered the reveal
    // until you crossed the edge or clicked. Checking position on every move
    // means the first pointer movement anywhere inside arms it. setHovering
    // no-ops when the value is unchanged, so this only re-renders on a real
    // in/out transition.
    setHovering(
      Math.abs(e.clientX - vw / 2) <= (vw * 0.88) / 2 &&
        Math.abs(e.clientY - vh / 2) <= (vh * 0.82) / 2
    );

    // Shake detection. Travel feeds an energy accumulator that decays every
    // event; a direction reversal (the signature of shaking, vs. a fast
    // straight swipe) is weighted much higher. Crossing the threshold while
    // the images are revealed dismisses them all and schedules a calm-down
    // before they may return.
    const st = shakeState.current;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    const dist = Math.hypot(dx, dy);
    const flipped = dx * st.dx < 0 || dy * st.dy < 0;
    st.energy =
      st.energy * SHAKE_DECAY +
      dist * (flipped ? SHAKE_REVERSAL_GAIN : SHAKE_LINEAR_GAIN);
    st.x = e.clientX;
    st.y = e.clientY;
    st.dx = dx;
    st.dy = dy;
    if (st.energy > SHAKE_THRESHOLD && revealRef.current) {
      st.energy = 0; // don't re-trigger off the same burst
      revealReadyAt.current = performance.now() + SHAKE_CALM_MS;
      // Bump the epoch: the arm effect re-runs, drops the satellites now,
      // and re-reveals only after the calm window (if still hovering).
      setRevealEpoch((n) => n + 1);
    }
  }, []);

  // rAF loop — lerps progress + mouse, paints hero slide/opacity/drift and
  // satellite parallax. React state only updates when the rounded index moves.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      // Settle progress (instant if reduced motion).
      current.current += (target.current - current.current) * (reduce.current ? 1 : SMOOTH);
      const c = current.current;

      const vh = viewportH.current || window.innerHeight;
      const vw = viewportW.current || window.innerWidth;
      const travel = vh * SLIDE_TRAVEL;

      // Lerp the drift toward the cursor (zeroed under reduced motion).
      if (reduce.current) {
        mouseCur.current = { x: 0, y: 0 };
      } else {
        mouseCur.current.x += (mouseTarget.current.x - mouseCur.current.x) * MOUSE_SMOOTH;
        mouseCur.current.y += (mouseTarget.current.y - mouseCur.current.y) * MOUSE_SMOOTH;
      }
      const mx = mouseCur.current.x;
      const my = mouseCur.current.y;

      // Hero slide layer — every hero positioned by its WRAPPED distance from
      // `c`. Each hero is placed at whichever copy of itself (…, i-N, i, i+N, …)
      // sits nearest the current index, so the strip behaves as an endless
      // ring: the last project slides straight into the first with no rewind.
      for (let i = 0; i < N; i++) {
        const el = heroRefs.current[i];
        if (!el) continue;
        // d ∈ (-N/2, N/2] — signed nearest-wrapped offset from the viewport.
        let d = (((i - c) % N) + N) % N;
        if (d > N / 2) d -= N;
        const dist = Math.abs(d);
        const slideY = d * travel;
        const scale = 1 - Math.min(dist, 1) * 0.06;
        // Drift only the near-active hero; fades to 0 by one step away.
        const near = Math.max(0, 1 - dist);
        const hx = mx * HERO_DRIFT * near;
        const hy = my * HERO_DRIFT * near;
        el.style.transform = `translate3d(${hx.toFixed(2)}px, ${(slideY + hy).toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
        // No cross-fade — heroes stay fully opaque and simply slide past each
        // other (they're a full viewport apart at every step, so they never
        // visibly overlap). The old distance-based opacity dissolve is what
        // made the transition feel laggy. Cull the far ones for paint cost.
        el.style.opacity = "1";
        el.style.visibility = dist > 1.25 ? "hidden" : "visible";
      }

      // Satellites — the active project's complementary images. The whole
      // container RIDES the same slide as its hero (oddity keeps its hover
      // images inside the product's slide container, so they inherit the
      // exit motion — this reproduces that) and washes out fast once a
      // scroll starts, so the hover never lingers behind while the next
      // project arrives. Individual boxes then add their depth-scaled
      // cursor drift on top — straight, never rotated.
      const sats = satsRef.current;
      if (sats) {
        // Unbounded now (index wraps) — dScroll is just the local fractional
        // offset from the nearest whole project, so the ride math is unchanged.
        const rounded = Math.round(c);
        const dScroll = rounded - c; // how far we've scrolled off this project
        sats.style.transform = `translate3d(0, ${(dScroll * travel).toFixed(2)}px, 0)`;
        // Fully gone within ~1/7 of a step — the moment a scroll starts the
        // satellites vanish, so no trace of them ever bleeds into the next
        // project's arrival.
        sats.style.opacity = Math.max(0, 1 - Math.abs(dScroll) * 7).toFixed(3);
        // Per-element eased follow ("mesh" feel): every box chases the RAW
        // cursor target, but each with its OWN per-axis lag (from seeds
        // data-s1/s2), its own depth, and its own idle float. Because they
        // arrive at different times, travel different distances, and drift
        // on their own rhythm, the arrangement deforms softly like a fabric
        // mesh instead of sliding around as one rigid grid. Each box's
        // smoothed offset persists on the element itself (data-cx/cy) so
        // the loop stays free of React state.
        const rawX = reduce.current ? 0 : mouseTarget.current.x;
        const rawY = reduce.current ? 0 : mouseTarget.current.y;
        const t = performance.now() / 1000;
        for (let k = 0; k < sats.children.length; k++) {
          const s = sats.children[k] as HTMLElement;
          const dx = Number(s.dataset.dx) || 0;
          const dy = Number(s.dataset.dy) || 0;
          const depth = Number(s.dataset.depth) || 0;
          // Two independent per-box seeds (0..1) drive everything below, so
          // no two boxes share timing, easing OR idle rhythm.
          const s1 = Number(s.dataset.s1) || 0;
          const s2 = Number(s.dataset.s2) || 0;
          // Independent easing PER AXIS — x and y chase the cursor at
          // different rates, so a box's path bends rather than sliding
          // straight, and no box tracks like its neighbour.
          const lagX = 0.045 + s1 * 0.12;
          const lagY = 0.045 + s2 * 0.12;
          const tx = rawX * depth * SAT_DRIFT;
          const ty = rawY * depth * SAT_DRIFT;
          const cx = (Number(s.dataset.cx) || 0) + (tx - (Number(s.dataset.cx) || 0)) * lagX;
          const cy = (Number(s.dataset.cy) || 0) + (ty - (Number(s.dataset.cy) || 0)) * lagY;
          s.dataset.cx = cx.toFixed(3);
          s.dataset.cy = cy.toFixed(3);
          // Gentle idle float — small, slow, on each box's own phase/speed.
          // Independent of the cursor, so the mesh stays quietly alive and
          // each image drifts on its own even when the pointer is still.
          const floatX = reduce.current ? 0 : Math.sin(t * (0.3 + s1 * 0.5) + s1 * 6.283) * (4 + s1 * 9);
          const floatY = reduce.current ? 0 : Math.cos(t * (0.28 + s2 * 0.5) + s2 * 6.283) * (4 + s2 * 9);
          const baseX = dx * vw;
          const baseY = dy * vh;
          s.style.transform = `translate(-50%, -50%) translate(${(baseX + cx + floatX).toFixed(2)}px, ${(baseY + cy + floatY).toFixed(2)}px)`;
        }
      }

      // Map the unbounded index back into 0…N-1 for the active project.
      const idx = (((Math.round(c) % N) + N) % N);
      setActiveIdx((prev) => (prev === idx ? prev : idx));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [N]);

  // Navigate to a project's case study through the shared color-morph fade.
  const open = useCallback(
    (e: React.MouseEvent<HTMLElement>, p: (typeof projects)[number]) => {
      const r = e.currentTarget.getBoundingClientRect();
      begin({
        color: projectBg(p),
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        slug: p.slug,
      });
    },
    [begin]
  );

  return (
    <div
      ref={rootRef}
      data-lenis-prevent
      onMouseMove={showAll ? undefined : onMouseMove}
      // Calm everything when the pointer leaves the window entirely.
      onMouseLeave={showAll ? undefined : () => setHovering(false)}
      className={`fixed inset-0 select-none ${showAll ? "overflow-y-auto" : "overflow-hidden"}`}
      style={{ backgroundColor: background }}
    >
      {showAll ? (
        <ShowAllList lang={lang} onOpen={open} />
      ) : (
        <>
          {/* ─── Hero slide layer (behind everything, non-interactive) ─── */}
          <div className="pointer-events-none absolute inset-0">
            {projects.map((p, i) => (
              <div
                key={p.slug}
                ref={(el) => {
                  heroRefs.current[i] = el;
                }}
                className="absolute inset-0 flex items-center justify-center will-change-transform"
              >
                <div className={`relative overflow-hidden ${HERO_BOX}`}>
                  <Image
                    src={heroSrc(p)}
                    alt={p.title}
                    fill
                    sizes="74vw"
                    priority={i === 0}
                    draggable={false}
                    unoptimized={heroSrc(p).endsWith(".gif")}
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ─── Names list (left) — difference blend keeps it legible over
                the hero. The whole list is dimmed to 50% (opacity-50 on the
                wrapper) so the component reads lighter overall, while the per-
                item active/hover opacities below keep their relationship —
                active still the brightest, hover still lifts. ─── */}
          <div
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 pl-5 opacity-50 md:pl-8"
            style={{ mixBlendMode: "difference", color: "#ffffff" }}
          >
            <ul className="flex flex-col gap-2">
              {projects.map((p, i) => {
                const isActive = i === activeIdx;
                return (
                  <li key={p.slug} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        // Index is unbounded (wrapping strip). Jump to the
                        // nearest copy of project `i` relative to where we are,
                        // so a click always takes the short way round the ring.
                        const base = Math.round(current.current);
                        let delta = (((i - base) % N) + N) % N;
                        if (delta > N / 2) delta -= N;
                        target.current = base + delta;
                      }}
                      // Active = full white + bold + larger. Inactive dims to
                      // 40% and lifts to 70% on hover (never overtakes active).
                      // Opacity lives in classes (not inline) so :hover wins.
                      className={`cursor-pointer text-left transition-opacity duration-300 ${
                        isActive ? "opacity-100" : "opacity-40 hover:opacity-70"
                      }`}
                      // Title 3/Emphasized — SF Pro Semibold 15 / 20, 0%.
                      // Uniform size for every name; only opacity marks the
                      // selection (100% active, 40% otherwise).
                      style={{
                        fontSize: 15,
                        lineHeight: "20px",
                        fontWeight: 600,
                        letterSpacing: 0,
                      }}
                    >
                      {p.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ─── Active project meta (right) ─── */}
          <div
            className="absolute right-5 top-1/2 z-10 -translate-y-1/2 text-right md:right-8"
            style={{ mixBlendMode: "difference", color: "#ffffff" }}
          >
            {/* Title 3/Emphasized — SF Pro Semibold 15 / 20. */}
            <p className="text-[15px] font-semibold leading-5">
              {pick(active.category, lang)}
            </p>
            <p className="text-[15px] font-semibold leading-5 opacity-40">
              {active.year}
            </p>
          </div>

          {/* ─── Interaction layer — hover reveals + drifts the satellites,
                and the centered hit-box opens the active project. Native
                cursor hidden here (`cursor-none`); the SAME global cursor as
                the grid/list drives the ring (CustomCursor) and the name tip
                (HoverPill), both of which watch `[data-cursor-ring]` and read
                `data-title` / `data-category` off this element. They move
                independently of each other — that's the whole behaviour. The
                data-* update automatically as the active project changes. ─── */}
          <div
            data-cursor-ring
            data-title={active.title}
            data-subtitle={t("parallax.goToProject")}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-none"
            style={{ width: "88vw", height: "82vh" }}
            // Hover is driven by onMouseMove on the root (position-based), so
            // no enter/leave here — that's what made a stationary/already-
            // inside cursor fail to trigger.
          >
            {/* Centered hit-box over the hero → open the active project.
                Rendered BEFORE the satellites so the satellites paint (and
                take hover) above it where the big images overlap the hero —
                otherwise this button swallowed the hover and the overlapping
                image never lifted past its 90% resting state. Satellites carry
                their own click-to-open (below) so a click on them still opens
                the project even though they now cover this button. */}
            <button
              type="button"
              aria-label={`Open ${active.title}`}
              onClick={(e) => open(e, active)}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-none ${HERO_BOX}`}
            />

            {/* Satellites — active project's other images, bloom on hover. */}
            <div ref={satsRef} className="pointer-events-none absolute inset-0">
              {composition.map((s, i) => {
                const src = activeSatellites[i % activeSatellites.length];
                // Randomized-but-stable per-image delay so they don't all
                // reveal at once — they trickle in, in a scrambled order.
                // Range ≈ 140–600ms (the base 140 is the "give it a beat"
                // pause before anything appears).
                const delay = 140 + Math.round(jitter(`${active.slug}-${i}`) * 460);
                // Two independent per-box seeds — drive the rAF loop's
                // per-axis easing and idle float, so each box moves on its
                // own rather than as one rigid grid.
                const s1 = jitter(`${active.slug}-a-${i}`);
                const s2 = jitter(`${active.slug}-b-${i}`);
                // Visible unless the ambient cycle has this box on its
                // fade-out beat (only ever applies while revealed).
                // The box you're hovering is exempt from the ambient cycle —
                // it stays on screen until the pointer leaves it, even if the
                // cycle picked it to fade out this beat.
                const isHovered = hoveredSat === i;
                const visible = reveal && (!cycleHidden.has(i) || isHovered);
                return (
                  <div
                    key={`${active.slug}-${i}`}
                    data-dx={s.dx}
                    data-dy={s.dy}
                    data-depth={s.depth}
                    data-s1={s1.toFixed(4)}
                    data-s2={s2.toFixed(4)}
                    // pointer-events re-enabled (parent container is none)
                    // so the box can take a direct hover; it has no click of
                    // its own, and the hero's hit-box still paints above it
                    // where the two overlap.
                    onMouseEnter={() => setHoveredSat(i)}
                    onMouseLeave={() =>
                      setHoveredSat((v) => (v === i ? null : v))
                    }
                    // The box now paints above the hero hit-box, so give it
                    // its own click-to-open — otherwise a click landing on a
                    // satellite (rather than the bare hero) would do nothing.
                    onClick={(e) => open(e, active)}
                    className="pointer-events-auto absolute left-1/2 top-1/2 cursor-none will-change-transform"
                    style={{
                      // Width is a fraction of the viewport width, exactly
                      // as the box relates to the 1920px Figma frame — but
                      // capped by a height-proportional term so the whole
                      // composition scales down together on short screens
                      // (13" laptops), the same way the hero does. 146 =
                      // 100 × 1920/1314, the Figma frame's width:height —
                      // when the vh term wins, every box keeps its exact
                      // Figma size relative to the (height-limited) hero.
                      width: `min(${(s.w * 100).toFixed(2)}vw, ${(s.w * 146).toFixed(2)}vh)`,
                      aspectRatio: s.ratio,
                    }}
                  >
                    {/* Inner wrapper carries the soft reveal — oddity-style
                        scale-up + fade (their images animate scale ~0.8→1
                        with opacity 0→1, each on its own phase). Kept
                        separate from the outer node so the rAF-driven drift
                        transform never fights this transform. The same
                        opacity/scale pair also plays the ambient cycle's
                        out-and-back-in flips. */}
                    <div
                      className="relative h-full w-full overflow-hidden"
                      style={{
                        // Resting at 90% (canvas bleeds through slightly);
                        // a direct hover lifts THIS box to full 100%.
                        opacity: visible ? (isHovered ? 1 : 0.9) : 0,
                        // A direct hover lifts to full 100% and grows the box
                        // a hair (1.04) for a subtle "come forward" feel;
                        // resting = none; not-yet-revealed = 0.88.
                        transform: visible
                          ? isHovered
                            ? "scale(1.04)"
                            : "none"
                          : "scale(0.88)",
                        // Hover lift responds fast (240ms, no delay); reveal/
                        // cycle fades keep the long soft ease with a per-box
                        // jittered delay while revealed (entrance + cycle
                        // flips). The delay is baked into the `transition`
                        // shorthand (4th slot) rather than a separate
                        // `transitionDelay` — mixing the two conflicts and
                        // React warns about it.
                        transition: isHovered
                          ? "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1) 0ms, transform 780ms cubic-bezier(0.22, 1, 0.36, 1) 0ms"
                          : `opacity 780ms cubic-bezier(0.22, 1, 0.36, 1) ${reveal ? delay : 0}ms, transform 780ms cubic-bezier(0.22, 1, 0.36, 1) ${reveal ? delay : 0}ms`,
                        willChange: "opacity, transform",
                      }}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes={`${Math.ceil(s.w * 100)}vw`}
                        draggable={false}
                        unoptimized={src.endsWith(".gif")}
                        // `object-contain` — every image keeps its OWN
                        // proportion inside the Figma slot; nothing crops.
                        // The letterbox space is invisible against the
                        // black canvas, so the slot still anchors the
                        // composition exactly where Figma puts it.
                        className="object-contain"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/*
  ShowAllList — the Figma "Show all" detail table. One row per project:
    Name · (category + short blurb) · year · thumbnail strip.
  Rows route to the case study on click. Scrolls natively inside the root
  (which is overflow-y-auto in this view).
*/
function ShowAllList({
  lang,
  onOpen,
}: {
  lang: "en" | "pt";
  onOpen: (e: React.MouseEvent<HTMLElement>, p: (typeof projects)[number]) => void;
}) {
  return (
    <div className="min-h-full w-full px-5 pb-16 pt-28 md:px-8 md:pt-36">
      <ul className="w-full">
        {projects.map((p) => {
          const thumbs = projectImageSet(p, 4);
          return (
            <li key={p.slug} className="border-b border-white/40">
              <button
                type="button"
                onClick={(e) => onOpen(e, p)}
                data-cursor-ring
                className="group flex w-full cursor-pointer flex-col gap-6 py-7 text-left text-white md:flex-row md:items-start md:justify-between"
              >
                {/* Left: name · category + blurb · year */}
                <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:gap-16 lg:gap-28">
                  <span className="text-[17px] font-bold leading-[22px] md:w-[200px] md:shrink-0">
                    {p.title}
                  </span>
                  <div className="flex flex-col gap-2 text-[15px] leading-5 md:max-w-[420px]">
                    <span>{pick(p.category, lang)}</span>
                    <span className="line-clamp-3 opacity-70">
                      {pick(p.brief, lang)}
                    </span>
                  </div>
                  <span className="text-[15px] leading-5 opacity-70 md:ml-auto md:pr-8">
                    {p.year}
                  </span>
                </div>

                {/* Right: thumbnail strip */}
                <div className="flex shrink-0 gap-2 overflow-hidden">
                  {thumbs.map((src, i) => (
                    <div
                      key={i}
                      className="relative hidden h-[92px] w-[150px] shrink-0 overflow-hidden sm:block"
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="150px"
                        draggable={false}
                        unoptimized={src.endsWith(".gif")}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  ))}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
