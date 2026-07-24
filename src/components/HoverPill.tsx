"use client";

/*
  HoverPill
  ---------
  Frosted-glass badge that shows a tile's title + category when the cursor is
  over it. It's independent of the canvas components: on each pointermove it
  asks `elementFromPoint()` what's under the cursor, then looks for a
  `.tile-hover` ancestor with `data-title` / `data-category` attributes.

  Optimizations:
  - Position and rAF-driven transform stay in refs — no re-renders per frame.
  - React state only updates when the hovered *title* changes (moving within
    the same tile is free).
*/

import { useEffect, useRef, useState } from "react";
import { PILL } from "@/lib/glass";

// `line2` is the pill's second line: a surface can supply `data-subtitle`
// (e.g. the parallax stage → "Go to project"); tiles that only carry
// `data-category` fall back to that.
type Meta = { title: string; line2: string } | null;

// Offset from the cursor to the pill's anchor (which is vertically centered
// on the pill's left edge). Right and slightly below the pointer, matching
// the k95 style.
const OFFSET_X = 24;
const OFFSET_Y = 4;

export default function HoverPill() {
  const pillRef = useRef<HTMLDivElement>(null);
  /*
    Two pieces of state, deliberately: WHAT the pill says and WHETHER it's
    showing. They were one before, and that's where the stray "—" came from —
    leaving a tile cleared the content, so the pill had nothing to render
    while it faded and fell back to a placeholder dash.

    `shown` is never cleared: it keeps the last title through the fade-out, so
    the pill leaves saying what it said. `visible` is the only thing that
    changes when the cursor lands on nothing.
  */
  const [shown, setShown] = useState<Meta>(null);
  const [visible, setVisible] = useState(false);
  // Target = live cursor position; current = eased-toward-target position.
  // Keeping both in refs so the rAF loop reads/writes them without
  // triggering re-renders per frame.
  const target = useRef({ x: -9999, y: -9999 });
  const current = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      // `.tile-hover` covers the grid/list canvases; `[data-cursor-ring]`
      // lets other surfaces (e.g. the parallax stage) opt into the SAME tip
      // by carrying data-title / data-category. Anything matched without a
      // data-title (nav links, toggles) just clears the tip below.
      const tile = (el as HTMLElement | null)?.closest<HTMLElement>(
        ".tile-hover, [data-cursor-ring]"
      );
      if (tile && tile.dataset.title) {
        const title = tile.dataset.title;
        const line2 = tile.dataset.subtitle ?? tile.dataset.category ?? "";
        // Only re-render when the shown content actually changes — moving
        // within one tile is free.
        setShown((prev) =>
          prev?.title === title && prev?.line2 === line2
            ? prev
            : { title, line2 }
        );
        setVisible(true);
      } else {
        // Hide, but keep the text so it survives the fade-out.
        setVisible(false);
      }
    };

    const paint = () => {
      // Slight lerp so the pill trails the cursor with a soft, k95-style feel.
      current.current.x += (target.current.x - current.current.x) * 0.35;
      current.current.y += (target.current.y - current.current.y) * 0.35;
      const el = pillRef.current;
      if (el) {
        const x = current.current.x + OFFSET_X;
        const y = current.current.y + OFFSET_Y;
        // translate(0, -50%) vertically centers the pill on the anchor point.
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(0, -50%)`;
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={pillRef}
      data-native-cursor
      className="pointer-events-none fixed left-0 top-0 z-40 will-change-transform"
    >
      {/*
        Show / hide — blur, opacity and a small scale together, the way the
        interfaces.dev controls do it. Opacity alone made the pill a flat card
        switching on and off; blurring it out as it goes reads as the label
        RESOLVING rather than appearing, which suits something that tracks the
        cursor. 200ms ease-out: quick enough to keep up with the pointer,
        slow enough to see.

        This wrapper owns the whole visual state, so the outer element is left
        to positioning alone and the two can't fight over opacity.

        `filter: none` at rest, NOT `blur(0px)` — and the difference is not
        cosmetic. Any filter other than `none` makes an element a "backdrop
        root", which cuts its descendants off from the page behind them: the
        glass keeps its backdrop-filter but has nothing left to sample, so the
        pill goes flat. A zero blur is still a filter. `none` interpolates
        with `blur(4px)` exactly the same way, so the animation is unchanged
        and the backdrop survives at rest, which is when it's seen.
      */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          filter: visible ? "none" : "blur(4px)",
          transform: visible ? "scale(1)" : "scale(0.96)",
          transformOrigin: "left center",
          transition:
            "opacity 200ms ease-out, filter 200ms ease-out, transform 200ms ease-out",
        }}
      >
      {/* The same PILL as the "Show all" chip — material AND metrics. These
          two are the only floating pills on the site and they overlap on the
          index, where any difference in height reads as a mistake. Only the
          weight differs: this one is bold, the chip regular. */}
      <div
        className={`font-bold ${PILL}`}
        // White, always. The label used to measure the artwork underneath and
        // flip to black ink over anything pale; the glass now carries its own
        // black tint, so the backdrop is dark enough for white type wherever
        // the pill travels and the flip only made the label inconsistent.
        style={{ color: "#ffffff" }}
      >
        {/* 16px, the same box as the chip's glyph — it used to be a 14px icon
            centred in a 16px cell, which left it visibly smaller than the
            mark next to it. Takes the pill's ink via currentColor. */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
          className="shrink-0"
        >
          <path
            d="M3.5 10.5L10.5 3.5M10.5 3.5H4.5M10.5 3.5V9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {/* ONE line — the action, not the name. The project's title was the
            headline here and the action sat under it in a dimmer 65%; but the
            title is already on screen (the timeline names it, the list names
            it), so the pill was repeating what the reader could see and
            whispering the one thing they couldn't. Now it says only the
            action, in the weight the title used to have: 13/16 bold.

            Falls back to the title for any surface that supplies no subtitle,
            so a tile carrying just `data-title` still says something.

            Reads from `shown`, which outlives `visible` — see the note on the
            state above. */}
        <div className="whitespace-nowrap text-[13px] font-bold leading-4">
          {shown?.line2 || shown?.title || ""}
        </div>
      </div>
      </div>
    </div>
  );
}
