"use client";

/*
  NavFade — eased scrim behind the top and bottom navigation
  ----------------------------------------------------------
  The naive way to fade a solid color to transparent is a 2-stop
  `linear-gradient(bg 0%, transparent 100%)`. It looks fine at a glance
  but leaves a subtle horizontal edge where the gradient terminates —
  because the eye is very sensitive to the discontinuity between "1% alpha"
  and "0% alpha," and a linear ramp reaches 0 abruptly.

  The industry technique for a "very soft, very subtle" fade is an
  **eased gradient**: many stops whose alpha values follow an ease-out
  curve, so the fade decays asymptotically and the eye can't detect a
  hard endpoint. This is the same trick Apple, Linear, and Stripe use
  behind their frosted headers.

  Implementation notes:
    - We use `mask-image` (rather than the alpha channel of a `background`
      gradient) so color and opacity are cleanly separated. Change the bg
      via the panel and only ONE color value moves — the mask is inert.
    - 11 stops on an ease-in-out cubic curve, hand-picked. Far more than 3
      but small enough to keep the CSS readable.
    - Optional `backdrop-filter: blur(...)` is applied to the element, so
      the blur strength naturally follows the mask: strong where the mask
      is opaque, invisible where it fades to 0. No hard edge on the blur
      either.

  Performance:
    - Gradients + masks are compositor-cheap. Not painted per drag/scroll
      frame — only when the container's box changes.
    - Backdrop-filter has a real cost during animation; disabled entirely
      when `navBlur === 0` (no CSS property emitted, no work scheduled).
*/

import type { CSSProperties } from "react";
import { useConfig, usePageBg } from "@/lib/state";

// Fade band height. ~1.7× the nav's ~68px height — enough distance for the
// eased curve to decay smoothly without invading the content area.
const FADE_HEIGHT = "120px";

/*
  Eased alpha stops — ease-in-out cubic, hand-picked so the curve
  asymptotes to 0. The last ~20% carry almost no alpha, which is what
  removes the perceived "line" at the terminus.
*/
const EASE_STOPS: [pct: number, alpha: number][] = [
  [0, 1.0],
  [10, 0.98],
  [20, 0.94],
  [30, 0.86],
  [40, 0.75],
  [50, 0.6],
  [60, 0.45],
  [70, 0.3],
  [80, 0.17],
  [90, 0.06],
  [100, 0],
];

const easedMask = (direction: "to bottom" | "to top"): string =>
  `linear-gradient(${direction}, ${EASE_STOPS.map(
    ([pct, a]) => `rgba(0,0,0,${a}) ${pct}%`
  ).join(", ")})`;

// Precomputed once — direction never changes, stops never change.
const TOP_MASK = easedMask("to bottom");
const BOTTOM_MASK = easedMask("to top");

// Time the fade takes to ease into a new page color. Same 320ms as the
// case study content fade-in so the whole thing settles in unison.
const COLOR_TRANSITION_MS = 320;

export default function NavFade() {
  const { config } = useConfig();
  const { pageBg } = usePageBg();
  // Prefer the page-scoped override (case study bg) when set; otherwise
  // follow the canvas config's own background. This is why navigating to
  // a cream case study no longer leaves a dark strip at the nav.
  const bg = pageBg ?? config.background;
  const blur = config.navBlur;

  const blurStyle: CSSProperties =
    blur > 0
      ? {
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
        }
      : {};

  const common: CSSProperties = {
    height: FADE_HEIGHT,
    backgroundColor: bg,
    transition: `background-color ${COLOR_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    ...blurStyle,
  };

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-30"
        style={{
          ...common,
          maskImage: TOP_MASK,
          WebkitMaskImage: TOP_MASK,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30"
        style={{
          ...common,
          maskImage: BOTTOM_MASK,
          WebkitMaskImage: BOTTOM_MASK,
        }}
      />
    </>
  );
}
