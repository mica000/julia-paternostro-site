"use client";

/*
  CustomCursor — adaptive stroke ring, tile-only
  ----------------------------------------------
  A small hollow ring that appears only when the pointer is over a tile.
  The ring uses `mix-blend-mode: difference` (same technique as the top nav)
  so its outline always reads legibly against whatever image or background
  color sits underneath — you don't need to pick a cursor color.

  Trail behavior stays the same: rAF-driven translate on the outer element
  with a soft lerp so the ring visibly follows the pointer with a delay.
  Show/hide is React-state driven with a CSS opacity + scale transition,
  giving a k95-style "pop in" feel on tile enter.
*/

import { useEffect, useRef, useState } from "react";

const RING_SIZE = 36;      // px — ring diameter at rest
const RING_STROKE = 1.5;   // px — stroke width
const TRAIL_LERP = 0.15;   // lower = slower / more visible trail

export default function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -100, y: -100 });
  const current = useRef({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      // Show over tiles AND any element marked with `data-cursor-ring` —
      // nav links, view/lang toggles opt in that way. `elementFromPoint`
      // respects pointer-events:none (so the cursor element itself doesn't
      // count).
      const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      setVisible(!!under?.closest(".tile-hover, [data-cursor-ring]"));
    };

    const paint = () => {
      current.current.x += (target.current.x - current.current.x) * TRAIL_LERP;
      current.current.y += (target.current.y - current.current.y) * TRAIL_LERP;
      const half = RING_SIZE / 2;
      outer.style.transform =
        `translate3d(${current.current.x - half}px, ${current.current.y - half}px, 0)`;
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
      ref={outerRef}
      className="pointer-events-none fixed left-0 top-0 z-[60] transition-opacity duration-200 will-change-transform"
      style={{
        // Adaptive contrast — same trick the top nav uses. White stroke blends
        // to the complement of whatever is behind it, so it stays legible on
        // dark canvas, light backgrounds, and colored tiles alike.
        mixBlendMode: "difference",
        opacity: visible ? 1 : 0,
      }}
      aria-hidden
    >
      <div
        className="rounded-full"
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          border: `${RING_STROKE}px solid white`,
          backgroundColor: "transparent",
          transform: visible ? "scale(1)" : "scale(0.6)",
          transformOrigin: "center center",
          transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}
