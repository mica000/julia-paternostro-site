"use client";

/*
  SmoothScroll — Lenis-powered smooth scrolling for native-scroll surfaces
  ------------------------------------------------------------------------
  Wraps the whole app in a root Lenis instance (via lenis/react). Lenis
  drives the real document scroll with momentum/lerp, so long pages — case
  studies, the Editorial index, Masonry, About — get a smooth, weighted
  feel. Because Lenis moves the actual scroll position (not a transform),
  fixed chrome (TopNav, BottomChrome) and IntersectionObserver reveals keep
  working normally.

  Canvas modes opt OUT:
    The Grid / List / Orbit / Index2 views drive their OWN wheel-based motion
    (custom rAF + inertia). Their root elements carry `data-lenis-prevent`,
    which makes Lenis ignore wheel events inside them entirely — no conflict,
    no double-handling. It's declarative; nothing is toggled per-mode here.

  Reduced motion:
    Readers with `prefers-reduced-motion: reduce` get `smoothWheel: false`,
    so the wheel falls back to instant native scroll. Passing it through the
    options prop lets ReactLenis re-init cleanly when the setting flips.

  Route changes:
    On navigation we jump to the top immediately, so a new page never
    inherits the previous page's scroll offset through Lenis.
*/

import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function LenisRouteReset() {
  const lenis = useLenis();
  const pathname = usePathname();
  useEffect(() => {
    if (!lenis) return;
    // Jump to the top so a new page never inherits the previous scroll offset.
    lenis.scrollTo(0, { immediate: true });
    // CRITICAL: re-measure the page on every route change.
    //
    // Lenis (root mode) caches the scrollable height from a ResizeObserver on
    // <html>. But our <html> is `h-full` (height: 100%), so its box is pinned
    // to the viewport and NEVER changes size on navigation — the observer
    // doesn't fire, and Lenis keeps the previous route's measurement. Coming
    // from the index (a fixed, non-scrolling parallax → limit ≈ 0), a case
    // study would then refuse to wheel-scroll at all. `resize()` forces Lenis
    // to re-read document.documentElement.scrollHeight so the limit is right.
    lenis.resize();
    // Belt-and-suspenders: re-measure once more after the new page's layout
    // has settled (image aspect-ratio boxes, wrapped text) in case the first
    // measurement ran a frame too early.
    const id = requestAnimationFrame(() => lenis.resize());
    return () => cancelAnimationFrame(id);
  }, [lenis, pathname]);
  return null;
}

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  // Track prefers-reduced-motion on the client. Starts false so server and
  // first client render agree (no hydration mismatch); the effect corrects
  // it, and ReactLenis re-inits with smoothWheel off if reduce is set.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <ReactLenis
      root
      options={{
        // Smoothing factor per frame (0..1). Lower = longer, softer glide;
        // higher = snappier. 0.1 is Lenis's balanced default.
        lerp: 0.1,
        // How much a wheel notch moves the page. 1 = default feel.
        wheelMultiplier: 1,
        // Smooth the mouse wheel on native-scroll surfaces. Canvas modes opt
        // out via data-lenis-prevent; reduced-motion turns it off here.
        smoothWheel: !reduced,
        // Leave touch scrolling native — feels better on mobile than synced.
        syncTouch: false,
      }}
    >
      <LenisRouteReset />
      {children}
    </ReactLenis>
  );
}
