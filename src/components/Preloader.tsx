"use client";

/*
  Preloader — first-load poster-ring intro (Figma node 120:472)
  -------------------------------------------------------------
  A full-screen black overlay that plays once on the first visit, then hands
  the page over. The eleven project posters (the same `NN-square.png` tiles
  the Work grid uses) run a single choreography:

      1. ASSEMBLE — each poster grows in around its own center and fades up,
         staggered by index, forming the tight ring.
      2. DISSIPATE — after a brief hold, each poster shrinks straight back out
         and fades, again staggered.
      3. REVEAL — only once every poster is gone does the black backdrop fade,
         uncovering the index. The page is never visible before then.

  Throughout 1–2 the ring spins continuously (each poster counter-spins to stay
  upright). The spin runs concurrently — it adds no time to the sequence.

  Everything above is driven by CSS animations (keyframes in globals.css:
  `posterIn`, `posterOut`, `overlayOut`) so it stays on the GPU. React only
  mounts the overlay, then unmounts it once the timeline is done.

  Once per session:
    Mounted in the root layout, so it does NOT remount on in-app navigation.
    A sessionStorage flag additionally stops it replaying on a hard reload
    within the same session — you see it on arrival, not on every refresh.

  Accessibility:
    Scroll is locked while the overlay is up. `prefers-reduced-motion`
    visitors skip the intro entirely (no motion, immediate reveal).
*/

import { useEffect, useState } from "react";

// TEMP (preview): replay the whole intro on a loop so it can be watched in the
// browser. Set back to false before committing so it plays exactly once.
const PREVIEW_LOOP = false;

// The eleven portfolio posters, in grid order. These are already cached by
// the time the index paints, so re-using them here costs no extra download.
const POSTERS = Array.from(
  { length: 11 },
  (_, i) => `/Images/${String(i + 1).padStart(2, "0")}-square.png`,
);

const SESSION_KEY = "torto:preloaded";

// Timeline (ms). One turn (ROUND) is bracketed by the assemble-in and
// dissipate-out phases. TOTAL is when the overlay unmounts and the site shows.
const SPIN_MS = 3200; // ms per full turn; runs continuously, adds no time
const ASSEMBLE_MS = 620; // how long a single poster takes to grow in
const MID_HOLD_MS = 300; // brief beat once the full cluster has loaded
const DISSIPATE_MS = 560; // how long a single poster takes to shrink away
const STAGGER_MS = 55; // gap between consecutive posters growing / shrinking
const REVEAL_MS = 500; // backdrop fade AFTER the posters are gone
// Both phases are per-image and staggered, so each "window" spans the first
// poster's start through the last (most-delayed) poster finishing.
const ASSEMBLE_WINDOW_MS = ASSEMBLE_MS + (POSTERS.length - 1) * STAGGER_MS;
const DISSIPATE_WINDOW_MS = DISSIPATE_MS + (POSTERS.length - 1) * STAGGER_MS;
// No rotation: the posters load in, hold for a beat, then shrink straight back
// out. The backdrop stays fully black through the whole sequence and only fades
// once every poster is gone — so the site is never visible before it ends.
const HOLD_MS = ASSEMBLE_WINDOW_MS + MID_HOLD_MS; // when the first poster leaves
const POSTERS_DONE_MS = HOLD_MS + DISSIPATE_WINDOW_MS; // last poster gone
const TOTAL_MS = POSTERS_DONE_MS + REVEAL_MS; // overlay unmounts, site shown

// Ring geometry, in vmin so it scales with the viewport. RADIUS is small
// enough that neighbouring posters overlap into one dense cluster.
const RADIUS = 20; // vmin

export default function Preloader() {
  // `done` unmounts the overlay for good. `cycle` restarts the CSS timeline
  // (only used by PREVIEW_LOOP). `done` starts false so the server HTML and
  // first client render both paint the overlay — no hydration mismatch.
  const [done, setDone] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    // Already shown this session → drop the overlay without replaying. Deferred
    // to a timer (not called straight from the effect body) to avoid a
    // synchronous setState-in-effect.
    if (!PREVIEW_LOOP && sessionStorage.getItem(SESSION_KEY)) {
      const seen = window.setTimeout(() => setDone(true), 0);
      return () => window.clearTimeout(seen);
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    sessionStorage.setItem(SESSION_KEY, "1");

    // Reduced motion → skip the whole animated intro.
    if (reduced && !PREVIEW_LOOP) {
      const skip = window.setTimeout(() => setDone(true), 0);
      return () => window.clearTimeout(skip);
    }

    // Lock scroll while the overlay covers the page.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let timer: number;
    if (PREVIEW_LOOP) {
      // Restart the timeline every TOTAL by bumping `cycle` (remounts the tree).
      timer = window.setInterval(() => setCycle((c) => c + 1), TOTAL_MS);
    } else {
      // Play once, then reveal the page and restore scrolling.
      timer = window.setTimeout(() => {
        document.body.style.overflow = prevOverflow;
        setDone(true);
      }, TOTAL_MS);
    }

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(timer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (done) return null;

  return (
    // `key={cycle}` restarts every CSS animation below when the preview loop
    // ticks. The backdrop stays black until every poster is gone, then fades to
    // reveal the page underneath.
    <div
      key={cycle}
      aria-hidden
      style={{
        // The covering styles are INLINE (not Tailwind classes) so the overlay
        // paints black over the whole viewport from the very first frame — even
        // before the stylesheet loads. Relying on classes let the index flash
        // through for a beat on load (a FOUC).
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#000",
        // Stays fully black through assemble + dissipate; only fades once every
        // poster has vanished, so the page is never seen early.
        animation: `overlayOut ${REVEAL_MS}ms var(--ease-out) ${POSTERS_DONE_MS}ms forwards`,
      }}
    >
      {/* Ring: a zero-size box at center that spins continuously the whole time
          (independent of the assemble/dissipate timing). */}
      <div
        className="relative"
        style={{ animation: `spin ${SPIN_MS}ms linear infinite` }}
      >
        {POSTERS.map((src, i) => {
          const angle = (360 / POSTERS.length) * i;
          // Poster 0 is Delírio Tropical — the studio's lead project. It sits at
          // the top of the ring (angle 0 = 12 o'clock) and gets the highest
          // z-index so the overlapping neighbours never cover it.
          const isLead = i === 0;
          return (
            // Positioner: place the poster on the ring, upright. Net rotation
            // zero — it only translates out to the radius.
            <div
              key={src}
              className="absolute left-0 top-0"
              style={{
                zIndex: isLead ? 2 : 1,
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${RADIUS}vmin) rotate(${-angle}deg)`,
              }}
            >
              {/* Counter-spin: mirrors the ring's continuous turn so the poster
                  orbits the center yet stays upright the whole time. */}
              <div
                style={{ animation: `spin ${SPIN_MS}ms linear infinite reverse` }}
              >
                {/* Grow-in wrapper — kept as its own element so the assemble
                    scale and the dissipate scale (on the img) compose instead of
                    overriding each other. Staggered by index. */}
                <div
                  style={{
                    animation: `posterIn ${ASSEMBLE_MS}ms var(--ease-out) ${i * STAGGER_MS}ms both`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    className="object-cover shadow-2xl"
                    style={{
                      // display/maxWidth inline: the ring box is 0×0, so the
                      // browser default `img { max-width: 100% }` would crush the
                      // poster to zero width before Tailwind's classes land.
                      display: "block",
                      maxWidth: "none",
                      width: "clamp(76px, 13.5vmin, 168px)",
                      aspectRatio: "233 / 300",
                      // Shrink away around its own center after the brief hold,
                      // staggered by index so they pop out one after another.
                      animation: `posterOut ${DISSIPATE_MS}ms var(--ease-out) ${HOLD_MS + i * STAGGER_MS}ms both`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
