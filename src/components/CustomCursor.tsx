"use client";

/*
  CustomCursor — dot that expands into a ring (Metalab-style)
  -----------------------------------------------------------
  Replaces the native cursor on fine-pointer (mouse / trackpad) devices:

    • At rest        → a small FILLED dot that tracks the pointer exactly.
    • Over anything  → the dot grows into a larger HOLLOW ring, the way
      clickable         metalab.com rings interactive elements. The ring
                        follows with a soft trail so it floats to the pointer.

  "Clickable" = links, buttons, tiles, and anything explicitly opted in with
  `data-cursor-ring` (nav items, toggles, the index hit-box, gallery images).

  The circle uses `mix-blend-mode: difference` (same trick as the top nav) so
  white always inverts to a legible contrast against whatever image or color
  sits beneath it — no need to choose a cursor color per surface.

  The native cursor is hidden site-wide via a `.cursor-hidden` class this
  component sets on <html> while active (see globals.css), so if JS never runs
  the real cursor is still there.
*/

import { useEffect, useRef, useState } from "react";

const DOT_SIZE = 8; // px — filled dot at rest
const RING_SIZE = 40; // px — hollow ring over clickables
const RING_STROKE = 1.5; // px — ring stroke
const TRAIL_LERP = 0.18; // ring trail (lower = more float). Dot tracks exactly.

// What counts as "clickable" — the dot rings these.
const CLICKABLE = "a, button, [role='button'], .tile-hover, [data-cursor-ring]";

export default function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -100, y: -100 });
  const current = useRef({ x: -100, y: -100 });
  // Mirror of `hovering` for the rAF loop, which can't read state directly.
  const hoveringRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [onscreen, setOnscreen] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Fine-pointer only. Touch devices keep no cursor and never show the dot.
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    hoveringRef.current = hovering;
  }, [hovering]);

  useEffect(() => {
    if (!enabled) return;
    const outer = outerRef.current;
    if (!outer) return;

    // Hide the native cursor while the custom one is live. Scoped to a class
    // so it only applies once this component has mounted (JS-off = real
    // cursor stays).
    const root = document.documentElement;
    root.classList.add("cursor-hidden");

    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      setOnscreen(true);
      // `elementFromPoint` respects pointer-events:none, so the cursor node
      // itself never counts. `closest` walks up to catch children of a link.
      const under = document.elementFromPoint(
        e.clientX,
        e.clientY
      ) as HTMLElement | null;
      setHovering(!!under?.closest(CLICKABLE));
    };
    const onLeave = () => setOnscreen(false);

    const paint = () => {
      // The dot tracks the pointer exactly; the ring floats in with a trail.
      const lerp = hoveringRef.current ? TRAIL_LERP : 1;
      current.current.x += (target.current.x - current.current.x) * lerp;
      current.current.y += (target.current.y - current.current.y) * lerp;
      outer.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      root.classList.remove("cursor-hidden");
    };
  }, [enabled]);

  if (!enabled) return null;

  const size = hovering ? RING_SIZE : DOT_SIZE;
  return (
    <div
      ref={outerRef}
      className="pointer-events-none fixed left-0 top-0 z-[60] will-change-transform"
      style={{
        mixBlendMode: "difference",
        opacity: onscreen ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
      aria-hidden
    >
      {/* Centered on the pointer via translate(-50%,-50%) so the circle stays
          registered on the hotspot as it grows from dot to ring. */}
      <div
        className="rounded-full"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size,
          height: size,
          transform: "translate(-50%, -50%)",
          backgroundColor: hovering ? "transparent" : "#ffffff",
          border: hovering
            ? `${RING_STROKE}px solid #ffffff`
            : "0px solid transparent",
          transition:
            "width 300ms cubic-bezier(0.22,1,0.36,1), height 300ms cubic-bezier(0.22,1,0.36,1), background-color 200ms ease, border-width 200ms ease",
        }}
      />
    </div>
  );
}
