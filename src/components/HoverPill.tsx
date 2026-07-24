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
import { GLASS } from "@/lib/glass";

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
  const [meta, setMeta] = useState<Meta>(null);
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
        // Only re-render when the shown content actually changes.
        setMeta((prev) =>
          prev?.title === title && prev?.line2 === line2
            ? prev
            : { title, line2 }
        );
      } else {
        setMeta((prev) => (prev ? null : prev));
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
      className={`pointer-events-none fixed left-0 top-0 z-40 transition-opacity duration-200 will-change-transform ${
        meta ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Same material as the "Show all" chip (see lib/glass) — these two are
          the only floating pills on the site and they sit next to each other
          on the index, so they share one surface. Only the metrics differ:
          this one carries two lines of text, so it's a touch tighter
          vertically and wider horizontally. */}
      <div className={`flex items-center gap-2 py-2 pl-4 pr-5 ${GLASS}`}>
        <div className="grid h-4 w-4 flex-shrink-0 place-items-center">
          {/* Arrow icon on its own — no accent-filled circle. Stroke is
              white to sit cleanly on the dark pill bg. */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
          >
            <path
              d="M3.5 10.5L10.5 3.5M10.5 3.5H4.5M10.5 3.5V9.5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="whitespace-nowrap">
          {/* Both lines sit at the index's one type size — Body/Regular 13/16.
              The title used to be 17/22 bold, which made the pill shout next
              to a nav where nothing is larger than 13px. The hierarchy now
              comes from WEIGHT and opacity instead of size: bold at full
              white for the title, regular at 70% for the line under it. */}
          <div className="text-[13px] font-bold leading-4 text-white">
            {meta?.title ?? "—"}
          </div>
          <div className="text-[13px] font-normal leading-4 text-white/70">
            {meta?.line2 ?? ""}
          </div>
        </div>
      </div>
    </div>
  );
}
