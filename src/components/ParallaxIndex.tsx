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
  // The stage/timeline cycle through `indexProjects`; the Show-all sheet
  // lists everything visible, so it keeps the fuller `allProjects`.
  indexProjects as projects,
  visibleProjects as allProjects,
  projectBg,
  projectImageSet,
  LIST_IMAGES,
  type SheetImage,
  pick,
} from "@/lib/projects";
import {
  compositionFor,
  heroSrc,
  HERO_BLEED,
  satelliteImagesFor,
  type HeroBleed,
} from "@/lib/compositions";
import { useTransition } from "@/components/PageTransition";
import ShowAllIcon, { CHIP_CLASS } from "@/components/ShowAllIcon";
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
/*
  Telling a momentum tail apart from a hand
  -----------------------------------------
  One flick of a trackpad emits wheel events for well over a second: a short
  ramp, a peak, then a long decaying tail. Only the ramp is the user; the tail
  is physics, and letting it through advances several projects per flick.

  The previous guard blocked ALL input for 300ms after a step and then kept
  pushing that block forward by 110ms for as long as any event kept arriving.
  That does stop the tail — but it also swallows the user's NEXT real scroll,
  because a fresh gesture arriving while the old tail is still alive looks
  exactly like more tail. Two symptoms, both reported: scrolling again straight
  away did nothing, and a steadily-turned mouse wheel only advanced on every
  other notch, since its notches land inside the 300ms block.

  So the tail is now identified by its SHAPE rather than by the clock.
  Inertia has three properties a hand does not: it only ever gets weaker, it
  never turns around, and by the time it matters it is feeble. An event that
  holds its strength, grows, or reverses is a hand, and goes through
  immediately — no waiting for the tail to die.
*/
// Hard floor after a step: no input at all. Covers the one stretch the shape
// test cannot, namely the flick's own PEAK, which lands just after the ramp
// that fired the step and is by definition strong and growing. Kept below a
// steady mouse wheel's notch interval (~150ms+) so real notches clear it.
const WHEEL_SETTLE_MS = 140;
// Past the floor, an event is only weighed against its predecessor if one
// arrived within this long. A real pause ends the stream outright and the
// next event starts clean.
const WHEEL_TAIL_GAP_MS = 110;
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
// Hover repel — when a satellite is hovered, every OTHER box glides away from
// it. STRENGTH = the push (px) on a box sitting right next to the hovered one;
// RANGE = how far that push reaches before fading (bigger = more boxes move);
// LERP = per-frame easing so the scatter eases in on hover and eases back on
// leave. Purely a pointer effect — skipped under reduced motion / on touch.
const REPEL_STRENGTH = 185;
const REPEL_RANGE = 1000;
const REPEL_LERP = 0.02;
// Cursor-follow lerp for the drift (0..1). Lower = softer, laggier drift.
const MOUSE_SMOOTH = 0.1;
// Grace period after a project change before the complementary images may
// bloom. Set to 0 — the satellites come in right away (they still trickle via
// the per-image stagger below), instead of the hero standing alone first.
const REVEAL_GRACE_MS = 0;
// Timeline (left project list, Figma node 197:592). Row pitch = 16px
// line-height + 8px gap; the window shows ~9 rows and clips the rest.
const TIMELINE_PITCH = 24;
const TIMELINE_HEIGHT = 208;
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

// Places a bleed hero (see HERO_BLEED) so its banner `rect` covers the hero
// box edge to edge in width, centred vertically, with everything else in the
// export overhanging. Percentages of the box, so it scales with HERO_BOX.
const HERO_ASPECT = 913 / 560;
// On a phone the hero is nearly full-width, so a one-sided overhang (São
// João's heron, left only) would run off the screen. There the whole
// artwork is centred instead of the banner: shift right by half the
// difference between the left and right overhangs.
function bleedShift({ rect, size }: HeroBleed): string {
  const right = size.w - rect.x - rect.w;
  return `${((rect.x - right) / 2 / rect.w) * 100}%`;
}
function bleedStyle({ rect, size }: HeroBleed): React.CSSProperties {
  const rectH = (HERO_ASPECT * rect.h) / rect.w; // rect height, box heights
  return {
    left: `${(-rect.x / rect.w) * 100}%`,
    width: `${(size.w / rect.w) * 100}%`,
    top: `${((1 - rectH) / 2 - (HERO_ASPECT * rect.y) / rect.w) * 100}%`,
    height: `${((HERO_ASPECT * size.h) / rect.w) * 100}%`,
  };
}

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
  // Hard floor after a step (see WHEEL_SETTLE_MS) — also what a touch drag
  // uses, since a finger has no momentum tail to sort out.
  const wheelSettleUntil = useRef(0);
  // Extends for as long as events keep looking like a decaying tail.
  const wheelTailUntil = useRef(0);
  // Previous event's shape, which is what the tail test compares against.
  const wheelPrevAbs = useRef(0);
  const wheelPrevDir = useRef(0);

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
  // Right-side category labels — one per project, scrolling in lock-step with
  // the left timeline (same wrapped-distance placement in the rAF loop) so the
  // active project's category always lands on the centre line next to its
  // marker. A parallel array to the timeline names.
  const categoryRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  // Which timeline row the pointer is over. A ref (not state) because the
  // rAF loop reads it every frame to blend the hover lift into the
  // distance-driven opacity — no re-render needed.
  const hoveredRow = useRef<number | null>(null);
  // True while the pointer is anywhere over the project-name list (the
  // "menu"). The rAF loop reads it to push every satellite away from the
  // menu's region, so the imagery clears out of the way while you read the
  // list — the same repel physics as the per-satellite hover, just sourced
  // from the menu box instead of one image. Paired with `timelineBoxRef`,
  // whose rect gives the menu's centre each frame.
  const hoveredMenuRef = useRef(false);
  const timelineBoxRef = useRef<HTMLDivElement>(null);
  // Which satellite the pointer is over. A ref (not the `hoveredSat` state)
  // because the rAF loop reads it every frame to compute the repel — the state
  // still drives the hovered box's own opacity/scale in render.
  const hoveredSatRef = useRef<number | null>(null);
  // Live-tunable repel params — the dev slider panel writes here and the rAF
  // loop reads the ref every frame, so dragging a slider retunes the effect
  // instantly. Seeded from the REPEL_* defaults above.
  const [repel, setRepel] = useState({
    strength: REPEL_STRENGTH,
    range: REPEL_RANGE,
    lerp: REPEL_LERP,
  });
  const repelRef = useRef(repel);
  repelRef.current = repel;
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
      // Reveal is NOT hover-gated: the active project's satellites bloom on
      // their own as soon as it lands on the index — no gesture required, on
      // desktop and mobile alike. (Hover still lifts an individual box to
      // 100% + a hair of scale; it just no longer decides whether the set
      // shows at all.)
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
  }, [active.slug, revealEpoch]);

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
      const abs = Math.abs(e.deltaY);
      const dir = e.deltaY > 0 ? 1 : -1;

      // 1. Settle floor — the flick that fired the last step is still at full
      //    strength. Nothing gets through, and the tail window opens.
      if (now < wheelSettleUntil.current) {
        wheelAccum.current = 0;
        wheelPrevAbs.current = abs;
        wheelPrevDir.current = dir;
        wheelTailUntil.current = now + WHEEL_TAIL_GAP_MS;
        return;
      }

      // 2. Past the floor and events are still arriving: tail, or a hand?
      //    Momentum is strictly downhill — every event weaker than the one
      //    before it, never turning around. That is the whole test. A steady
      //    mouse wheel repeats the SAME delta and a gesture ramps UP, so both
      //    fail it and go straight through; only a genuine decay is swallowed.
      //    Each swallowed event also clears the accumulator, so a tail that
      //    briefly plateaus can't quietly add up to a phantom step.
      const streaming = now < wheelTailUntil.current;
      const inertia =
        streaming && dir === wheelPrevDir.current && abs < wheelPrevAbs.current;
      wheelPrevAbs.current = abs;
      wheelPrevDir.current = dir;
      wheelTailUntil.current = now + WHEEL_TAIL_GAP_MS;
      if (inertia) {
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
      const stepDir = wheelAccum.current > 0 ? 1 : -1;
      wheelAccum.current = 0;
      wheelSettleUntil.current = now + WHEEL_SETTLE_MS;
      wheelTailUntil.current = now + WHEEL_TAIL_GAP_MS;
      target.current = Math.round(target.current) + stepDir;
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
      // A finger stops when it is lifted — there is no inertia to sort out, so
      // the settle floor is the whole guard here.
      if (now < wheelSettleUntil.current) return;
      const y = e.touches[0]?.clientY ?? touchY;
      const dy = touchY - y;
      if (Math.abs(dy) < TOUCH_STEP_THRESHOLD) return;
      touchY = y;
      wheelSettleUntil.current = now + WHEEL_SETTLE_MS;
      target.current = Math.round(target.current) + (dy > 0 ? 1 : -1);
    };

    // Keyboard — ↓ next project, ↑ previous, same loop as the wheel. Holding a
    // key auto-repeats, and the settle floor paces that to one project per
    // WHEEL_SETTLE_MS instead of a blur. Left alone in Show-all (the arrows
    // scroll the list there), with a modifier held (browser shortcuts), and
    // while typing in a field.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (showAllRef.current) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      const now = performance.now();
      if (now < wheelSettleUntil.current) return;
      wheelSettleUntil.current = now + WHEEL_SETTLE_MS;
      target.current = Math.round(target.current) + (e.key === "ArrowDown" ? 1 : -1);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
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
        // dx/dy are fractions of a CONTAINED 1920×1314 frame (the same frame the
        // hero is sized against), centred in the viewport — so the whole scatter
        // stays locked to the hero at ANY window size or aspect. Mapping them to
        // raw vw/vh instead let the arrangement stretch away from the hero as the
        // window aspect drifted from 1920:1314 (the resize/reposition drift).
        //
        // EVERY breakpoint, portrait overrides included. A mobile override used
        // to opt out and read its dx/dy as raw viewport fractions, which was a
        // leftover from when the desktop path did the same: the switch to a
        // contained frame moved desktop and the editor together and left this
        // one branch behind. Nothing ever authored viewport fractions —
        // compositions come from the ?edit=1 editor, which has always measured
        // against the contained frame — so the override was being read in a
        // basis it was never written in. On a 390×844 phone the frame is 267px
        // tall against the viewport's 844, so every dy landed a bit over three
        // times too far and the arrangement flew off the top and bottom of the
        // screen while the editor showed it hugging the hero.
        const scale = Math.min(vw / 1920, vh / 1314);
        const frameW = 1920 * scale;
        const frameH = 1314 * scale;
        //
        // Hovered box's resting anchor — the point every OTHER box is pushed
        // away from. Read from the ref so the loop needs no re-render; skipped
        // under reduced motion since repel is a pure pointer flourish.
        const hv = hoveredSatRef.current;
        let hAnchorX = 0;
        let hAnchorY = 0;
        let hasHover = false;
        if (hv != null && !reduce.current) {
          const hs = sats.children[hv] as HTMLElement | undefined;
          if (hs) {
            hAnchorX = (Number(hs.dataset.dx) || 0) * frameW;
            hAnchorY = (Number(hs.dataset.dy) || 0) * frameH;
            hasHover = true;
          }
        }
        // Menu repel anchor — the project-name list's centre, in the SAME
        // viewport-centred space the satellite baseX/baseY live in (each box
        // is `left-1/2 top-1/2` inside a viewport-centred layer, so 0,0 is the
        // viewport centre). While the pointer is over the list, every box is
        // pushed away from this point. Desktop only: on a phone the list sits
        // at the bottom and the layer is lifted 14vh, so the spaces don't line
        // up — and there's no hover there anyway. One rect read per frame,
        // only while hovering, so it's cheap.
        let menuAX = 0;
        let menuAY = 0;
        let hasMenu = false;
        if (
          hoveredMenuRef.current &&
          !reduce.current &&
          !isMobileRef.current
        ) {
          const box = timelineBoxRef.current;
          if (box) {
            const r = box.getBoundingClientRect();
            menuAX = r.left + r.width / 2 - vw / 2;
            menuAY = r.top + r.height / 2 - vh / 2;
            hasMenu = true;
          }
        }
        const rp = repelRef.current;
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
          // Repel — push this box away from the hovered one along the line
          // between their resting anchors, with a force that fades
          // exponentially with distance (nearest neighbours move most). The
          // hovered box itself (k === hv) gets none, so it stays put and only
          // scales up (see render).
          let trx = 0;
          let tryv = 0;
          if (hasHover && k !== hv) {
            let vx = baseX - hAnchorX;
            let vy = baseY - hAnchorY;
            let dist = Math.hypot(vx, vy);
            if (dist < 1) {
              // Anchors overlap — pick a stable per-box direction so the pair
              // still separates instead of dividing by ~zero.
              const a = s1 * 6.2832;
              vx = Math.cos(a);
              vy = Math.sin(a);
              dist = 1;
            }
            const mag = rp.strength * Math.exp(-dist / rp.range);
            trx = (vx / dist) * mag;
            tryv = (vy / dist) * mag;
          } else if (hasMenu) {
            // Hovering the project-name list: push EVERY box away from the
            // menu's centre, same exponential falloff so the boxes nearest the
            // list clear out the most and the far ones barely move.
            let vx = baseX - menuAX;
            let vy = baseY - menuAY;
            let dist = Math.hypot(vx, vy);
            if (dist < 1) {
              const a = s1 * 6.2832;
              vx = Math.cos(a);
              vy = Math.sin(a);
              dist = 1;
            }
            const mag = rp.strength * Math.exp(-dist / rp.range);
            trx = (vx / dist) * mag;
            tryv = (vy / dist) * mag;
          }
          // Ease the repel offset on the box itself, so the scatter glides in
          // on hover and glides back to zero on leave.
          const rx =
            (Number(s.dataset.rx) || 0) +
            (trx - (Number(s.dataset.rx) || 0)) * rp.lerp;
          const ry =
            (Number(s.dataset.ry) || 0) +
            (tryv - (Number(s.dataset.ry) || 0)) * rp.lerp;
          s.dataset.rx = rx.toFixed(3);
          s.dataset.ry = ry.toFixed(3);
          s.style.transform = `translate(-50%, -50%) translate(${(baseX + cx + floatX + rx).toFixed(2)}px, ${(baseY + cy + floatY + ry).toFixed(2)}px)`;
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

      // Category labels (right) — the exact same wrapped-distance scroll as the
      // timeline, mirrored to the right edge. The active project's category
      // rides to the centre line (d = 0) at full strength while the rest scroll
      // past dimmed, so the category tracks the project instead of snapping.
      for (let i = 0; i < N; i++) {
        const el = categoryRefs.current[i];
        if (!el) continue;
        let d = (((i - c) % N) + N) % N;
        if (d > N / 2) d -= N;
        el.style.transform = `translate(0, calc(-50% + ${(d * TIMELINE_PITCH).toFixed(2)}px))`;
        const near = Math.max(0, 1 - Math.abs(d));
        el.style.opacity = (0.4 + 0.6 * near).toFixed(3);
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
                <div
                  className={`relative ${HERO_BLEED[p.slug] ? "max-md:translate-x-[var(--bleed-shift)]" : "overflow-hidden"} ${HERO_BOX}`}
                  style={
                    HERO_BLEED[p.slug]
                      ? ({ "--bleed-shift": bleedShift(HERO_BLEED[p.slug]) } as React.CSSProperties)
                      : undefined
                  }
                >
                  {/* A hero can be an animation. Tenda Lab's is video (the
                      GIF was 8.5MB); everything else is a still or a GIF,
                      which an <img> handles as-is. A bleed hero overhangs
                      the box instead of being cropped to it. */}
                  {HERO_BLEED[p.slug] ? (
                    <div className="absolute" style={bleedStyle(HERO_BLEED[p.slug])}>
                      <Image
                        src={heroSrc(p)}
                        alt={p.title}
                        fill
                        sizes="86vw"
                        priority={i === 0}
                        draggable={false}
                        className="object-contain"
                      />
                    </div>
                  ) : /\.mp4$/i.test(heroSrc(p)) ? (
                    <video
                      src={heroSrc(p)}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload={i === 0 ? "auto" : "metadata"}
                      aria-label={p.title}
                      tabIndex={-1}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
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
                  )}
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
            ref={timelineBoxRef}
            onMouseEnter={() => {
              hoveredMenuRef.current = true;
            }}
            onMouseLeave={() => {
              hoveredMenuRef.current = false;
            }}
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
            // category isn't worth the crowding. Same fixed-height masked
            // window as the timeline, mirrored right: the categories PASS
            // THROUGH it, the active one pinned to the centre line, and the
            // mask fades the rest toward the top and bottom edges.
            className="absolute right-[44px] top-1/2 z-10 hidden -translate-y-1/2 overflow-hidden text-right md:block"
            style={{
              height: TIMELINE_HEIGHT,
              width: 220,
              color: "#fbfbfb",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, #000 26%, #000 74%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, #000 26%, #000 74%, transparent 100%)",
            }}
          >
            {projects.map((p, i) => (
              <p
                key={p.slug}
                ref={(el) => {
                  categoryRefs.current[i] = el;
                }}
                // Opacity + Y offset are written per frame by the rAF loop
                // (distance from the centre line), so they can't live here.
                className="absolute right-0 top-1/2 whitespace-nowrap text-[13px] font-normal leading-4 will-change-transform"
              >
                {p.year}
              </p>
            ))}
          </div>

          {/* ─── Right marker — mirrors the left timeline rule on the category
                side: a matching 30px rule at the page's right edge, centred on
                the same middle line, pointing in toward the category label.
                Desktop only, same as the category itself. ─── */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 md:block"
            style={{ height: TIMELINE_HEIGHT }}
          >
            <span
              className="absolute right-0 top-1/2 block w-[30px] -translate-y-1/2"
              style={{
                height: 1,
                backgroundColor: "#fbfbfb",
              }}
            />
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
                // Range ≈ 12–122ms: small base so the images start appearing
                // almost immediately, with just enough spread to still trickle
                // rather than snap in as one block.
                const delay = 12 + Math.round(jitter(`${active.slug}-${i}`) * 110);
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
                    onMouseEnter={() => {
                      setHoveredSat(i);
                      hoveredSatRef.current = i;
                    }}
                    onMouseLeave={() => {
                      if (hoveredSatRef.current === i)
                        hoveredSatRef.current = null;
                      setHoveredSat((v) => (v === i ? null : v));
                    }}
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
                          : `opacity 520ms cubic-bezier(0.22, 1, 0.36, 1) ${reveal ? delay : 0}ms, transform 520ms cubic-bezier(0.22, 1, 0.36, 1) ${reveal ? delay : 0}ms`,
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

          {/* ─── Footer (Figma node 397:550) — a desktop-only bottom bar for
                the ACTIVE project: its tagline (left) and deliverables (right).
                Both are bottom-aligned 44px above the page edge and painted in
                #fbfbfb at 40% opacity (Figma's muted footer tone); the tagline
                grows upward over two lines. Fully click-through, so it never
                blocks the satellite hover. ─── */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[44px] z-10 hidden md:block"
            style={{ color: "#fbfbfb" }}
          >
            {/* Left — the active project's tagline (skipped when it has none). */}
            {active.tagline && (
              <p className="absolute bottom-0 left-[44px] max-w-[210px] text-[13px] font-normal leading-4 opacity-40">
                {pick(active.tagline, lang)}
              </p>
            )}
            {/* Right — the active project's deliverables (Figma 397:550). The
                language toggle used to sit here; it moved up to the nav, so the
                footer is now just tagline (left) + deliverables (right). */}
            {active.deliverables && (
              <p className="absolute bottom-0 right-[44px] whitespace-nowrap text-right text-[13px] font-normal leading-4 opacity-40">
                {pick(active.deliverables, lang)}
              </p>
            )}
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
          className="fixed inset-0 z-20 overflow-y-auto overscroll-contain"
          style={{
            backgroundColor: background,
            willChange: "transform, filter",
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
        {showAll ? t("parallax.parallaxView") : t("parallax.showAll")}
      </button>

      {/* Dev-only live tuner for the hover-repel. The sliders write into the
          repel state (mirrored into `repelRef`, which the rAF loop reads each
          frame), so dragging retunes the effect in real time. Gated to
          non-production, so it never appears on the built/deployed site. */}
      {process.env.NODE_ENV !== "production" && (
        <RepelControls value={repel} onChange={setRepel} />
      )}
    </div>
  );
}

/*
  ShowAllList — the Figma "List view" (node 401:916). A full-bleed editorial
  gallery: one block per project, each a small title label on the gutter above
  a band of four landscape images that bleed edge-to-edge across the viewport
  (two-up on mobile). Every image opens that project's case study through the
  shared colour-morph. Scrolls natively inside the sheet (overflow-y-auto).

  Replaces the old detail table (name · category · blurb · thumbnail strip):
  the design drops all the meta and lets the imagery carry the index.
*/
// Images per project band (Figma shows four across on desktop).
const GALLERY_IMAGES = 4;

function ShowAllList({
  onOpen,
}: {
  onOpen: (e: React.MouseEvent<HTMLElement>, p: (typeof projects)[number]) => void;
}) {
  const { t, lang } = useLang();
  return (
    // Same 24/44px gutter as the rest of the site (nav, timeline, case study),
    // so the image bands line up with everything else instead of bleeding to
    // the screen edges. Top/bottom insets clear the fixed chrome (nav up top,
    // the floating mobile chip at the bottom).
    <div className="min-h-full w-full px-6 pb-[120px] pt-[76px] md:px-[44px] md:pb-16 md:pt-[100px]">
      <ul className="w-full">
        {/* Every visible project, including any kept off the index stage. */}
        {allProjects.map((p) => {
          // Prefer the dedicated all-projects sheet imagery (Figma 459:6397),
          // in its designed left→right order; fall back to the project's own
          // gallery (default landscape ratio) for any slug without a sheet set.
          const imgs: SheetImage[] =
            LIST_IMAGES[p.slug] ??
            projectImageSet(p, GALLERY_IMAGES).map((src) => ({
              src,
              ratio: 1.627,
              // No measured colour for a fallback crop — a neutral near-black
              // reads as "not loaded yet" against the sheet's black ground.
              color: "#1a1a1a",
            }));
          return (
            <li key={p.slug} className="mb-[30px] last:mb-0">
              {/* Title label — the project name, with a short description
                  underneath (Figma 401:926), the same treatment as the
                  case-study footer: name in #fbfbfb, tagline in Material/Medium
                  gray. Sits flush on top of the image band. */}
              <div className="pb-5 pt-[30px]">
                <span
                  className="block text-[13px] font-normal leading-4"
                  style={{ color: "#fbfbfb" }}
                >
                  {p.title}
                </span>
                <span
                  className="mt-1 block text-[13px] font-normal leading-4"
                  style={{ color: "#f6f6f699" }}
                >
                  {pick(p.tagline ?? p.brief, lang)}
                </span>
              </div>

              {/* Full-bleed image band — a "justified" row: each image keeps
                  its OWN proportion (width ∝ ratio, one shared height per row),
                  so nothing is cropped and the row still fills edge-to-edge on
                  desktop. Two-up on mobile. Each image is its own button. */}
              <div className="flex flex-wrap md:flex-nowrap">
                {imgs.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => onOpen(e, p)}
                    data-cursor-ring
                    data-title={p.title}
                    data-subtitle={t("parallax.goToProject")}
                    aria-label={`Open ${p.title}`}
                    className="relative block basis-1/2 min-w-0 cursor-pointer overflow-hidden md:basis-0"
                    // `aspectRatio` is the crop's REAL proportion, so the box
                    // is the exact size the image will be — reserving it costs
                    // nothing in accuracy and buys a stable layout. The colour
                    // is the crop's own average, so the empty box already
                    // looks like the picture that is coming.
                    style={{
                      flexGrow: img.ratio,
                      aspectRatio: String(img.ratio),
                      backgroundColor: img.color,
                    }}
                  >
                    {/* Absolutely filling a box that already has the image's
                        proportion, so `object-cover` has nothing to crop. It
                        used to be a plain in-flow `h-auto` img, which meant
                        the row had NO height until the files arrived and the
                        whole sheet reflowed as they did. Already-optimized
                        WebP, so next/image would add nothing.

                        Still eager, deliberately. `loading="lazy"` looked like
                        the obvious partner for a placeholder, but the sheet
                        slides in from ABOVE the viewport, so a lazy row would
                        not begin fetching until the entrance finished — and
                        the whole set is 32 crops at ~78KB, 2.5MB total, which
                        is the sheet's entire content. Requesting them all at
                        once and letting each appear as it lands beats holding
                        rows back; the placeholder is what makes that arrival
                        read as progress instead of as a page assembling
                        itself. Fading in rather than snapping — 300ms ease-out
                        reads as the colour resolving into the photograph. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt=""
                      draggable={false}
                      loading="eager"
                      decoding="async"
                      onLoad={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                      // Already-cached files decode before React can attach
                      // onLoad, and a missed event would leave the image
                      // invisible forever. `ref` runs after the element is in
                      // the DOM and can ask `complete` directly.
                      ref={(el) => {
                        if (el?.complete) el.style.opacity = "1";
                      }}
                      className="absolute inset-0 block h-full w-full object-cover opacity-0 transition-opacity duration-300 ease-out motion-reduce:transition-none"
                    />
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


/*
  RepelControls — dev-only live tuner for the satellite hover-repel. Three
  sliders write straight into the parent's repel state (mirrored into the ref
  the rAF loop reads), so dragging retunes the effect in real time. Rendered
  only in development (gated at the call site), so it never ships. Use "Copy
  values" to grab the numbers, then bake them into the REPEL_* defaults.
*/
type RepelValue = { strength: number; range: number; lerp: number };

function RepelControls({
  value,
  onChange,
}: {
  value: RepelValue;
  onChange: (v: RepelValue) => void;
}) {
  // Collapsed by choice — minimises to a small "control" pill so it stays out
  // of the way, click to expand the sliders again.
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-4 left-4 z-[70] rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[11px] uppercase tracking-wide text-white shadow-xl backdrop-blur-md hover:bg-black/80"
        style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
      >
        control
      </button>
    );
  }
  const rows: {
    key: keyof RepelValue;
    label: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: "strength", label: "Strength (px)", min: 0, max: 240, step: 5 },
    { key: "range", label: "Range (px)", min: 80, max: 1000, step: 10 },
    { key: "lerp", label: "Ease", min: 0.02, max: 0.4, step: 0.01 },
  ];
  return (
    <div
      className="pointer-events-auto fixed bottom-4 left-4 z-[70] w-60 rounded-lg border border-white/15 bg-black/70 p-3 text-[11px] text-white shadow-xl backdrop-blur-md"
      style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
    >
      <div className="mb-2 flex items-center justify-between font-semibold uppercase tracking-wide opacity-90">
        <span>Repel · dev</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Minimize"
          className="ml-2 flex h-5 w-5 items-center justify-center rounded text-sm leading-none hover:bg-white/10"
        >
          –
        </button>
      </div>
      {rows.map((r) => (
        <label key={r.key} className="mb-2 block cursor-pointer">
          <div className="mb-1 flex justify-between">
            <span>{r.label}</span>
            <span className="tabular-nums opacity-70">{value[r.key]}</span>
          </div>
          <input
            type="range"
            min={r.min}
            max={r.max}
            step={r.step}
            value={value[r.key]}
            onChange={(e) =>
              onChange({ ...value, [r.key]: Number(e.target.value) })
            }
            className="w-full accent-white"
          />
        </label>
      ))}
      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(
            `const REPEL_STRENGTH = ${value.strength};\nconst REPEL_RANGE = ${value.range};\nconst REPEL_LERP = ${value.lerp};`,
          )
        }
        className="mt-1 w-full rounded border border-white/20 py-1 text-center hover:bg-white/10"
      >
        Copy values
      </button>
    </div>
  );
}
