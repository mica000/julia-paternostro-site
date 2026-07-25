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
import { projects, projectBg, projectImageSet, pick } from "@/lib/projects";
import {
  compositionFor,
  heroSrc,
  satelliteImagesFor,
  COMPOSITIONS_MOBILE,
} from "@/lib/compositions";
import { useTransition } from "@/components/PageTransition";
import ShowAllIcon, { CHIP_CLASS } from "@/components/ShowAllIcon";
import LangToggle from "@/components/LangToggle";
import { useLang, useConfig } from "@/lib/state";

type Props = {
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
// Touch equivalent of WHEEL_STEP_THRESHOLD: how far a thumb must travel
// (px) before it commits one project step. Bigger than the wheel threshold
// because a finger drag is coarser than a wheel notch.
const TOUCH_STEP_THRESHOLD = 40;
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
const REVEAL_GRACE_MS = 500;
// Timeline (left project list, Figma node 197:592). Row pitch = 16px
// line-height + 8px gap; the window shows ~9 rows and clips the rest.
const TIMELINE_PITCH = 24;
const TIMELINE_HEIGHT = 208;
// How many images each "Show all" row puts in its scrollable strip. Capped
// rather than unbounded: Delírio alone has 28 case-study images, and 12 rows
// of that would mount several hundred <Image>s.
//
// FOUR, not five, and the number is a layout decision as much as a budget one:
// four landscape thumbs plus the CTA tile is what lets the whole row — name,
// blurb and imagery side by side — fit a 13" laptop. At five the row couldn't
// close under ~1500px and had to stack.
const STRIP_IMAGES = 4;
// Side of the glass "Go to project" tile that closes each strip — square, and
// the same height as the thumbnails so the row reads as one band.
const CTA_TILE = 100;
/*
  Show-all sheet motion.

  Emil Kowalski's blueprint, applied:
  - The sheet is an element ENTERING and EXITING the viewport, so ease-out —
    it accelerates away from the top edge immediately and settles at the end,
    which is what makes it feel like a response to the click rather than a
    scheduled animation. The curve is the site's existing --ease-out token,
    already an ease-out-quint.
  - Drawers belong in the 200–300ms band. This one travels a whole viewport
    height, and duration should match distance, so it takes the top of it.
  - The exit runs ~20% faster. Leaving should never feel like waiting.
  - Only `transform` animates: it skips layout and paint and stays on the GPU.
    (Height or top would animate the same distance and jank the whole way.)

  No per-row stagger. Twelve rows at even 30ms apart is 360ms of cascade on
  top of the sheet's own 300 — past the point where it stops reading as
  responsive. The sheet arriving IS the animation; the rows are its content,
  not twelve separate events.
*/
const SHEET_IN_MS = 300;
const SHEET_OUT_MS = 240;
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
// On mobile there's no satellite mesh and no side list to clear, so the hero
// takes nearly the full width and dominates the top half of the screen.
const HERO_BOX =
  "aspect-[913/560] max-w-[1140px] w-[86vw] md:w-[min(58vw,88vh)] lg:w-[min(62vw,91vh)]";

/*
  Satellite compositions, asset maps and geometry helpers now live in
  @/lib/compositions (data in compositions.json) so the live stage and the
  ?edit=1 editor share one source. `SatSlot`, `compositionFor`,
  `SATELLITE_IMAGES` and `heroSrc` are imported at the top of this file.
*/

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

  // Mobile gets its own layout AND its own interaction model: images in the
  // top half, timeline pinned to the bottom, no footer, no cursor chrome, and
  // thumb swipes instead of a wheel. Matches Tailwind's `md` breakpoint so the
  // CSS and the JS agree on what "mobile" means.
  const [isMobile, setIsMobile] = useState(false);
  // Mirror for the rAF loop, whose effect is keyed on [N] and so can't read
  // the state directly without re-binding every breakpoint change.
  const isMobileRef = useRef(false);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    // Deferred so setState never fires synchronously in the effect body. A
    // timeout rather than rAF on purpose: rAF is paused in a backgrounded
    // tab, which would leave the layout stuck in its desktop default until
    // the tab is focused.
    const id = window.setTimeout(apply, 0);
    mq.addEventListener("change", apply);
    // Belt-and-braces: `change` is the right API, but a plain resize listener
    // costs nothing and keeps the flag honest in environments that resize the
    // viewport without emitting a media-query change (device emulators).
    window.addEventListener("resize", apply);
    return () => {
      window.clearTimeout(id);
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

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
  // "Show all" lives in shared config so the TopNav (rendered up in the
  // layout) can toggle the list this component renders. On mobile the nav
  // chip is gone, so we also WRITE it here from a floating button.
  const { config, setConfig } = useConfig();
  const showAll = config.parallaxShowAll;
  const showAllRef = useRef(showAll);
  useEffect(() => {
    showAllRef.current = showAll;
  }, [showAll]);

  /*
    The sheet outlives `showAll` by one animation: it has to stay in the DOM
    long enough to play its exit. So mounting is its own state, and the only
    thing it tracks is "is the element still needed".

    A keyframe ANIMATION, not a transition, and that choice is what keeps this
    simple. A transition needs the element to exist at a "from" value for one
    frame before you change it — which means mount, wait a frame, then open,
    and the usual way to wait a frame is requestAnimationFrame. But rAF does
    not fire while the document is hidden, so a toggle flipped in a
    backgrounded tab would mount a sheet that never opens. An animation runs
    from its own `from` the moment the element appears; no second render, no
    frame to wait for, nothing to miss.

    Both updates sit inside timeout callbacks rather than the effect body: a
    synchronous setState there cascades an extra render before paint.
  */
  const [sheetMounted, setSheetMounted] = useState(showAll);
  useEffect(() => {
    // Mounting on a 0ms timer rather than immediately keeps the state change
    // out of the effect body; timers, unlike rAF, still fire when hidden.
    const delay = showAll ? 0 : SHEET_OUT_MS;
    const timer = window.setTimeout(() => setSheetMounted(showAll), delay);
    return () => window.clearTimeout(timer);
  }, [showAll]);

  const rootRef = useRef<HTMLDivElement>(null);
  const heroRefs = useRef<Array<HTMLDivElement | null>>([]);
  const timelineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Which timeline row the pointer is over. A ref (not state) because the
  // rAF loop reads it every frame to blend the hover lift into the
  // distance-driven opacity — no re-render needed.
  const hoveredRow = useRef<number | null>(null);
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
  // This project's satellite arrangement (desktop Figma override, or the
  // portrait override on mobile) and the images that fill its slots.
  const composition = useMemo(
    () => compositionFor(active.slug, isMobile),
    [active.slug, isMobile]
  );
  // Whether the ACTIVE arrangement is a mobile (viewport-relative) one — the
  // rAF loop reads this to map dx/dy against the raw viewport instead of the
  // contained landscape frame. A ref so the frame-by-frame loop needn't re-run.
  const mobileCompActive = isMobile && !!COMPOSITIONS_MOBILE[active.slug];
  const mobileCompRef = useRef(mobileCompActive);
  useEffect(() => {
    mobileCompRef.current = mobileCompActive;
  }, [mobileCompActive]);
  const activeSatellites = useMemo(
    () => satelliteImagesFor(active, composition),
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
      // Mobile has no hover to wait for, so it counts as permanently
      // engaged: the complementary images bloom on their own once the
      // grace window passes, same soft trickle, no gesture required.
      if (!hovering && !isMobile) return;
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
  }, [hovering, isMobile, active.slug, revealEpoch]);

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
      //
      // The lock is REFRESHED on every swallowed event, not just held for a
      // fixed window. A trackpad flick keeps emitting inertial events for well
      // over a second, far longer than the cooldown; without the refresh the
      // lock expired mid-inertia and the very next tail event — over a 26px
      // threshold — fired a second step, so one flick advanced two projects.
      // Pushing the lock forward on each event means it only releases once the
      // wheel has actually gone quiet for a full cooldown, i.e. the inertia has
      // died. A deliberate second scroll comes after a real pause, so it still
      // registers.
      if (now < wheelLockUntil.current) {
        wheelAccum.current = 0;
        wheelLockUntil.current = now + WHEEL_COOLDOWN_MS;
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
    // Touch equivalent — a thumb drag advances projects the same way a wheel
    // does, reusing the same cooldown lock so one swipe = one project.
    // Dragging the finger UP (content moves up, i.e. "scrolling down") goes to
    // the NEXT project, matching native scroll direction.
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (showAllRef.current) return; // let the list scroll natively
      e.preventDefault();
      const now = performance.now();
      if (now < wheelLockUntil.current) return;
      const y = e.touches[0]?.clientY ?? touchY;
      const dy = touchY - y;
      if (Math.abs(dy) < TOUCH_STEP_THRESHOLD) return;
      touchY = y;
      wheelLockUntil.current = now + WHEEL_COOLDOWN_MS;
      target.current = Math.round(target.current) + (dy > 0 ? 1 : -1);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
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
        // Reference frame the Figma offsets are measured against.
        //
        // On desktop the viewport IS roughly the 1920×1314 frame, so dx/dy
        // read straight off vw/vh. On a phone that stretch is what threw the
        // composition apart: dy × 812px flung the top boxes a third of a
        // screen above the hero (hence the cropping) while dx × 375px left
        // them huddled near the middle horizontally. So on mobile we fit the
        // Figma frame INSIDE the viewport (contain) — the arrangement keeps
        // its own proportions and stays registered with the hero, which is
        // sized off vw by the same logic.
        let frameW = vw;
        let frameH = vh;
        if (isMobileRef.current && !mobileCompRef.current) {
          // Mobile, but this project has NO portrait override: fall back to
          // fitting the landscape frame inside the viewport (contain), which
          // keeps the desktop arrangement's proportions.
          const scale = Math.min(vw / 1920, vh / 1314);
          frameW = 1920 * scale;
          frameH = 1314 * scale;
        }
        // Mobile WITH a portrait override, and desktop, both fall through to
        // frameW = vw / frameH = vh: the override's dx/dy are already viewport
        // fractions, and on desktop the viewport ~IS the 1920×1314 frame.
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
          const baseX = dx * frameW;
          const baseY = dy * frameH;
          s.style.transform = `translate(-50%, -50%) translate(${(baseX + cx + floatX).toFixed(2)}px, ${(baseY + cy + floatY).toFixed(2)}px)`;
        }
      }

      // Timeline rows — same wrapped-distance placement as the heroes, so the
      // names scroll endlessly and the active one lands dead-centre (d = 0).
      // -50% pulls each row onto its own baseline before the offset.
      for (let i = 0; i < N; i++) {
        const el = timelineRefs.current[i];
        if (!el) continue;
        let d = (((i - c) % N) + N) % N;
        if (d > N / 2) d -= N;
        el.style.transform = `translate(0, calc(-50% + ${(d * TIMELINE_PITCH).toFixed(2)}px))`;
        // 40% at rest, easing up to 100% exactly on the centre line — this is
        // what marks the active row now that the opaque band is gone. Hover
        // lifts a row to 70% without ever overtaking the centre.
        const near = Math.max(0, 1 - Math.abs(d));
        let op = 0.4 + 0.6 * near;
        if (hoveredRow.current === i) op = Math.max(op, 0.7);
        el.style.opacity = op.toFixed(3);
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
      // No pointer-driven reveal on mobile — the satellite mesh and the
      // cursor chrome are desktop-only, so a stray touch never arms them.
      onMouseMove={showAll || isMobile ? undefined : onMouseMove}
      // Calm everything when the pointer leaves the window entirely.
      onMouseLeave={showAll || isMobile ? undefined : () => setHovering(false)}
      // The root never scrolls now — the sheet owns its own scrolling, so the
      // stage can stay put underneath it while it slides.
      className="fixed inset-0 select-none overflow-hidden"
      style={{
        backgroundColor: background,
        // Let the browser own touch only in Show-all (which scrolls
        // natively); on the stage we consume swipes to change project.
        // touch-action intersects down the ancestor chain, so `none` here
        // would block the sheet's scrolling too.
        touchAction: showAll ? "auto" : "none",
      }}
    >
      {/* The stage stays MOUNTED while the sheet is open — that's what makes
          it a sheet rather than a swap. Something has to be underneath for
          the sheet to slide over; unmounting it would leave the sheet
          descending over an empty background. Its own handlers already bail
          on `showAllRef`, so nothing reacts to a pointer it can't see. */}
      {
        <>
          {/* ─── Hero slide layer (behind everything, non-interactive).
                On mobile the whole layer lifts so the images sit in the TOP
                HALF of the screen, leaving the bottom for the timeline. The
                per-hero transforms are written by the rAF loop on the
                children, so this static offset never fights them. ─── */}
          {/* 14vh, not 20: the taller lift pushed the top satellites off the
              top edge. This still keeps the artwork clear of the timeline at
              the bottom while sitting closer to the middle of the screen. */}
          <div className="pointer-events-none absolute inset-0 -translate-y-[14vh] md:translate-y-0">
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

          {/* ─── Timeline (left) — Figma node 197:592. A fixed-height window
                the project names PASS THROUGH: each name is placed by its
                wrapped distance from the current index, so the strip scrolls
                endlessly. The active row is pinned to the window's centre —
                which is the page's vertical centre — and a black gradient
                band sits there, masking the moving list so the active name
                reads as a crisp line in the middle of the selector. ─── */}
          <div
            className="absolute bottom-6 left-6 z-10 w-[min(320px,72vw)] overflow-hidden md:bottom-auto md:left-[44px] md:top-1/2 md:w-[min(260px,34vw)] md:-translate-y-1/2"
            style={{
              height: TIMELINE_HEIGHT,
              color: "#fbfbfb",
              // MASK, not an occluding band: the rows themselves fade out
              // toward the top and bottom of the window, so the canvas shows
              // through everywhere and nothing paints a black bar over it.
              // The centre row is marked purely by opacity (set per frame in
              // the rAF loop), which is what makes it read as "the line".
              maskImage:
                "linear-gradient(to bottom, transparent 0%, #000 26%, #000 74%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, #000 26%, #000 74%, transparent 100%)",
            }}
          >
            {projects.map((p, i) => (
              <button
                key={p.slug}
                type="button"
                ref={(el) => {
                  timelineRefs.current[i] = el;
                }}
                onClick={() => {
                  // Index is unbounded (wrapping strip). Jump to the nearest
                  // copy of project `i` relative to where we are, so a click
                  // always takes the short way round the ring.
                  const base = Math.round(current.current);
                  let delta = (((i - base) % N) + N) % N;
                  if (delta > N / 2) delta -= N;
                  target.current = base + delta;
                }}
                onMouseEnter={() => {
                  hoveredRow.current = i;
                }}
                onMouseLeave={() => {
                  if (hoveredRow.current === i) hoveredRow.current = null;
                }}
                // Opacity is written per frame by the rAF loop (distance from
                // the centre line), so it can't live in a class here.
                className="absolute left-0 top-1/2 cursor-pointer whitespace-nowrap text-left text-[13px] font-normal leading-4 will-change-transform"
              >
                {p.title}
              </button>
            ))}
          </div>

          {/* ─── Timeline marker (Figma node 200:811) — a single rule at the
                page's left edge pointing at the active row. Sits OUTSIDE the
                timeline box on purpose: that box is masked + clipped, which
                would fade it away. Centred on the same line the active
                project sits on. ─── */}
          <div
            aria-hidden
            // Carries the SAME vertical positioning + height as the timeline
            // window, so its own centre is the timeline's centre — the rule
            // then lines up with the active row on both layouts for free,
            // with no duplicated offset maths to drift out of sync.
            className="pointer-events-none absolute bottom-6 left-0 z-10 md:bottom-auto md:top-1/2 md:-translate-y-1/2"
            style={{ height: TIMELINE_HEIGHT }}
          >
            <span
              // Width is breakpoint-aware so the rule stops short of the
              // active name at both gutters: 16px inside the 24px mobile
              // gutter, 30px inside the 44px desktop gutter. A fixed width
              // would overshoot the mobile gutter and cross into the text.
              className="absolute left-0 top-1/2 block w-4 -translate-y-1/2 md:w-[30px]"
              style={{
                height: 1,
                backgroundColor: "#fbfbfb",
              }}
            />
          </div>

          {/* ─── Active project category (right) — vertically centred on the
                page, right-aligned in a 160px column (Figma node 197:591).
                The year lives in the Show-all list; the footer tagline that
                used to sit at the bottom was removed. ─── */}
          <div
            // Desktop only — on mobile it collided with the artwork and the
            // category isn't worth the crowding.
            className="absolute right-[44px] top-1/2 z-10 hidden -translate-y-1/2 text-right md:block"
            style={{ width: 160, color: "#fbfbfb" }}
          >
            <p className="text-[13px] font-normal leading-4">
              {pick(active.category, lang)}
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
            // Desktop only: without these the global ring + name tip never
            // arm, so touch devices get no cursor chrome at all.
            {...(isMobile
              ? {}
              : {
                  "data-cursor-ring": true,
                  "data-title": active.title,
                  "data-subtitle": t("parallax.goToProject"),
                })}
            // Rides the same -14vh lift as the hero layer on mobile, so the
            // satellites AND the centred hit-box stay registered with the
            // artwork up top. (Without this the hit-box sat a fifth of a
            // screen below the image it was meant to open.)
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+14vh)] cursor-pointer md:cursor-none md:-translate-y-1/2"
            style={{ width: "88vw", height: "82vh" }}
            // Hover is driven by onMouseMove on the root (position-based), so
            // no enter/leave here — that's what made a stationary/already-
            // inside cursor fail to trigger.
          >
            {/* Centered hit-box over the hero → open the active project.
                Rendered BEFORE the satellites so the satellites paint (and
                take hover) above it where the big images overlap the hero —
                otherwise this button swallowed the hover and the overlapping
                image never lifted past its 85% resting state. Satellites carry
                their own click-to-open (below) so a click on them still opens
                the project even though they now cover this button. */}
            <button
              type="button"
              aria-label={`Open ${active.title}`}
              onClick={(e) => open(e, active)}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer md:cursor-none ${HERO_BOX}`}
            />

            {/* Satellites — active project's other images, bloom on hover. */}
            {/* Satellite mesh shows on every breakpoint. On desktop hovering
                arms it; on mobile it arms itself once the grace window passes
                (see the reveal effect), so touch users get the full
                composition without a gesture they can't perform. */}
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
                    className="pointer-events-auto absolute left-1/2 top-1/2 cursor-pointer md:cursor-none will-change-transform"
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
                        // Resting at 85% (canvas bleeds through slightly);
                        // a direct hover lifts THIS box to full 100%.
                        opacity: visible ? (isHovered ? 1 : 0.85) : 0,
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

          {/* ─── Footer (Figma node 197:570) — now just the language toggle,
                pinned bottom-right where the design places it (the tagline that
                used to share this row was removed). Desktop only: the bottom of
                a phone belongs to the timeline, and the mobile menu already
                carries the switch. The wrapper is click-through; only the
                toggle takes pointer events. Padding: 44 right, 44 bottom. ─── */}
          <div className="pointer-events-none absolute bottom-[44px] right-[44px] z-10 hidden md:flex">
            <LangToggle className="pointer-events-auto" />
          </div>
        </>
      }

      {/* ─── Show-all sheet ───────────────────────────────────────────────
            Slides down from the top edge over the stage and takes the whole
            screen. `translateY(-100%)` on a fixed inset-0 box is exactly one
            viewport height, so it starts parked just above the fold.

            It scrolls itself (`overflow-y-auto`) rather than relying on the
            root, which has to stay put so the stage doesn't move underneath.
            `overscroll-contain` stops a flick at the end of the list from
            chaining into the page behind it.

            Direction is read straight off `showAll`, so the moment it flips
            the element re-renders with the exit animation and the faster
            duration — while `sheetMounted` holds it in the DOM until that
            exit has actually played. `both` keeps the final frame instead of
            snapping back before the unmount. */}
      {sheetMounted && (
        <div
          className="fixed inset-0 z-20 overflow-y-auto overscroll-contain will-change-transform"
          style={{
            backgroundColor: background,
            animation: `${showAll ? "sheet-in" : "sheet-out"} ${
              showAll ? SHEET_IN_MS : SHEET_OUT_MS
            }ms var(--ease-out) both`,
          }}
        >
          <ShowAllList onOpen={open} />
        </div>
      )}

      {/* ─── Mobile "Show all" chip — bottom-right. Deliberately OUTSIDE the
            stage above so it survives into the open list; otherwise the
            only way back would be the hamburger. Mirrors the nav chip's
            styling (which is desktop-only). ─── */}
      <button
        type="button"
        onClick={() => setConfig({ ...config, parallaxShowAll: !showAll })}
        // 44px from the right AND the bottom — the same inset the nav, the
        // timeline and the project names use, so the whole mobile layout
        // sits inside one square frame. Material comes from the shared
        // CHIP_CLASS, so this and the desktop nav chip can't drift apart.
        className={`fixed bottom-6 right-6 z-30 md:hidden ${CHIP_CLASS}`}
        style={{ color: "#fbfbfb" }}
      >
        <ShowAllIcon open={showAll} />
        {showAll ? t("parallax.close") : t("parallax.showAll")}
      </button>
    </div>
  );
}

/*
  Thumb — one image in a "Show all" row's strip.

  The strip is height-locked at 100px on every breakpoint and each thumb
  takes whatever WIDTH its own image implies, so a portrait shot stays tall and
  narrow instead of being cropped into the landscape box the strip used to
  force on everything.

  The ratio can't be known before the image loads — these come from `projects`
  as bare URLs with no dimensions — so it's read off `naturalWidth/Height` on
  load and written to the container's `aspect-ratio`. Until then the box holds
  Figma's 162.946:100 landscape slot, which keeps the strip from reflowing from
  zero-width and is already the right answer for most of the set.
*/
const DEFAULT_THUMB_RATIO = 162.946 / 100; // Figma's landscape slot

function Thumb({
  src,
  onClick,
}: {
  src: string;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const boxRef = useRef<HTMLButtonElement>(null);
  const [ratio, setRatio] = useState(DEFAULT_THUMB_RATIO);

  const readRatio = useCallback(() => {
    const img = boxRef.current?.querySelector("img");
    if (img && img.naturalHeight > 0) {
      setRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  // `onLoad` alone is not enough: an image already in the browser cache is
  // decoded before React attaches the handler, so its load event has already
  // fired and the box would keep the default landscape ratio forever. (That's
  // exactly what happened to the portrait shots on a warm reload.) So also
  // read the size once on mount for anything already `complete`. Deferred via
  // a timeout so setState never runs synchronously in the effect body.
  useEffect(() => {
    const img = boxRef.current?.querySelector("img");
    if (!img?.complete) return;
    const id = window.setTimeout(readRatio, 0);
    return () => window.clearTimeout(id);
  }, [readRatio]);

  return (
    <button
      ref={boxRef}
      type="button"
      onClick={onClick}
      data-cursor-ring
      className="relative h-[100px] w-auto shrink-0 cursor-pointer overflow-hidden"
      style={{ aspectRatio: ratio }}
    >
      <Image
        src={src}
        alt=""
        fill
        // Widest a thumb can get is a very wide panorama at 100px tall; 320
        // covers that without over-fetching for the common landscape case.
        sizes="320px"
        draggable={false}
        unoptimized={src.endsWith(".gif")}
        // Eager on purpose. Each strip is its own horizontal scroll container
        // and `loading="lazy"` resolves against THAT container, which in
        // practice left whole rows as empty 100px boxes with nothing ever
        // fetched. At five thumbs a row the total is small enough that
        // loading them outright is the honest trade.
        loading="eager"
        onLoad={readRatio}
        // `contain`, not `cover`: the box now matches the image's own
        // proportion, so there's nothing to crop. It also keeps the image
        // whole during the brief window before the real ratio is known.
        className="object-contain"
      />
    </button>
  );
}

/*
  ShowAllList — the Figma "Show all" detail table. One row per project:
    Name · (category + short blurb) · year · thumbnail strip.
  Rows route to the case study on click. Scrolls natively inside the root
  (which is overflow-y-auto in this view).
*/
function ShowAllList({
  onOpen,
}: {
  onOpen: (e: React.MouseEvent<HTMLElement>, p: (typeof projects)[number]) => void;
}) {
  // Reads the language context directly rather than taking `lang` as a prop —
  // it needs `t` for the CTA tile anyway, and one source beats two.
  const { lang, t } = useLang();
  return (
    // 44px sides on every breakpoint, matching the nav / timeline / chip
    // frame. The vertical insets clear the fixed chrome: 80px mobile bar and
    // the floating Show-all chip (44 inset + 42 tall), each plus a 44 gap, so
    // the first and last rows aren't parked underneath them.
    <div className="min-h-full w-full px-6 md:px-[44px] pb-[130px] pt-[124px] md:pb-16 md:pt-36">
      <ul className="row-dim-list w-full">
        {projects.map((p) => {
          const thumbs = projectImageSet(p, STRIP_IMAGES);
          return (
            // Divider rules are desktop-only: on a phone the rows are already
            // separated by the thumbnail strips and the generous vertical
            // rhythm, and the lines just added noise. 0.5px hairline in
            // Figma's "Labels/Secondary" grey (node 120:685).
            <li key={p.slug} className="md:border-b-[0.5px] md:border-[#727272]">
              {/*
                The row goes horizontal at 1280 — a 13" laptop — and the
                measurements are what set that number: 200 (name) + 24 + 280
                (blurb at this width) + 24 + ~613 (four thumbs and the CTA)
                = 1141, inside the 1192 a 1280 viewport leaves after gutters.
                From 1500 the blurb opens to its full 366 and the gaps to 32;
                Figma's 112px gap waits for 1700.

                Below 1280 everything stacks and the strip sits UNDER the
                text. It used to flip to a row at 768, where the text block
                was squeezed far past its content width; because nothing
                clipped, the blurb and the meta simply overflowed their box
                and the thumbnails rendered straight over them.
              */}
              <div className="flex w-full flex-col gap-5 py-[30px] min-[1280px]:flex-row min-[1280px]:items-start min-[1280px]:justify-between min-[1280px]:gap-6 min-[1500px]:gap-8 min-[1700px]:gap-[112px]" style={{ color: "#fbfbfb" }}>
                {/* Text block. Its own button rather than wrapping the whole
                    row, so the horizontal thumbnail scroller below isn't
                    trapped inside a click target — a swipe there would
                    otherwise register as a tap on the project. */}
                <button
                  type="button"
                  onClick={(e) => onOpen(e, p)}
                  data-cursor-ring
                  // Figma's column gap is 112px, measured on an 1832px-wide
                  // frame, so it only arrives once the viewport can carry it.
                  className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 text-left min-[1280px]:flex-row min-[1280px]:items-start min-[1280px]:gap-6 min-[1500px]:gap-8 min-[1700px]:gap-[112px]"
                >
                  {/* Name with category – year directly beneath it, on every
                      breakpoint. The year used to sit in a far-right column of
                      its own on desktop; pulling it under the name gives the
                      row one clear left edge and removes the widest column
                      from the horizontal budget. */}
                  <div className="flex flex-col gap-1 min-[1280px]:w-[200px] min-[1280px]:shrink-0">
                    {/* Figma "Title 3/Emphasized" — SF Pro Semibold 15/20. */}
                    <span className="text-[15px] font-semibold leading-5">
                      {p.title}
                    </span>
                    {/* Figma "Body/Regular" — 13/16, same #fbfbfb as the rest
                        of the group (no dimming in the design). Category and
                        year read as one unit, en-dash separated. */}
                    <span className="text-[13px] leading-4">
                      {`${pick(p.category, lang)} – ${p.year}`}
                    </span>
                  </div>
                  {/* Blurb column — Figma "Body/Regular" 13/16, 366px wide
                      (node 120:856). Desktop-only: on a phone the row reads as
                      name / category – year and then the imagery, so the whole
                      column is hidden rather than left as an empty flex item
                      eating the parent's gap. */}
                  {/* 280 at 13", opening to Figma's 366 once there's room —
                      the blurb is the one column that can give up width
                      without breaking, so it's what pays for the row fitting
                      a smaller screen. */}
                  <div className="text-[13px] leading-4 max-md:hidden md:max-w-[366px] md:min-w-0 min-[1280px]:w-[280px] min-[1280px]:shrink min-[1500px]:w-[366px]">
                    <span className="line-clamp-3">{pick(p.brief, lang)}</span>
                  </div>
                </button>

                {/* Thumbnail strip — the project's images in reading order,
                    scrolled horizontally so the whole set is reachable
                    instead of being cut at the row's edge. On mobile the
                    negative margin lets it bleed to the screen edges while
                    the first thumb still lines up with the 44px gutter, so
                    the overflow reads as "there's more this way". */}
                <div
                  // 100px tall thumbs, 8px apart, then the CTA tile. No fixed
                  // width: it sizes to its content and MUST stay shrinkable
                  // (`min-w-0`, no `shrink-0`) — the strip already scrolls
                  // internally, so on a narrow viewport it should give up
                  // width and show fewer thumbs at once rather than push
                  // itself off the edge of the page.
                  className="-mx-6 flex gap-2 overflow-x-auto overscroll-x-contain px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:min-w-0 md:px-0"
                >
                  {thumbs.map((src, i) => (
                    <Thumb key={i} src={src} onClick={(e) => onOpen(e, p)} />
                  ))}

                  {/*
                    The tile closing the strip — MOBILE ONLY. A bordered glass
                    card with "Go to project" spelled out, because there's no
                    cursor on a phone and nothing else names the action.

                    `md:hidden` rather than a hidden-but-present element: the
                    strip is a flex row with a gap, so leaving the tile in the
                    layout would leave its 100px slot AND the gap before it as
                    dead space at the end of every row. Removing it from flow
                    lets the images close the band.

                    Desktop loses nothing. The cursor pill already reads "Go
                    to project" the moment the pointer is near the row, the
                    whole row is clickable, and the arrow was the only mark in
                    a band otherwise made of edge-to-edge images.
                  */}
                  <button
                    type="button"
                    onClick={(e) => onOpen(e, p)}
                    data-cursor-ring
                    className="flex shrink-0 cursor-pointer flex-col items-start justify-between border-[0.5px] border-white/20 bg-white/[0.07] p-3 text-left text-[13px] font-normal leading-4 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-[20px] backdrop-saturate-150 transition-colors duration-200 hover:bg-white/[0.12] md:hidden"
                    style={{ width: CTA_TILE, height: CTA_TILE }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                      className="shrink-0"
                    >
                      <path
                        d="M4 12L12 4M12 4H5.5M12 4V10.5"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{t("parallax.goToProject")}</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
