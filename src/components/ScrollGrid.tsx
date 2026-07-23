"use client";

/*
  ScrollGrid — vertical infinite scroll with "breathe" scale
  ----------------------------------------------------------
  Wheel-driven grid that fills the viewport width with exactly `cols` columns
  and loops infinitely on the Y axis. Unlike InfiniteCanvas, this mode does not
  tile horizontally — `cols` means "columns visible on screen," so cell size is
  derived (viewport width ÷ cols) and horizontal wheel input is ignored.

  The "breathe" effect (k95-style): each wheel event charges a scroll-energy
  value that decays every frame. That energy drives a small scale swell on the
  plane's wrapper, so the grid subtly zooms while scrolling and settles back
  to 1.0 when you stop.

  Performance: single continuous rAF loop, two composited transforms
  (translate on the plane, scale on its wrapper), no React state per frame.
  Wheel listener is non-passive so we can preventDefault and take over scroll.
*/

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { getImages, type CanvasConfig } from "@/lib/config";
import { buildSlots } from "@/lib/grid";
import { useTransition } from "@/components/PageTransition";
import { isTap, pickTileTarget } from "@/lib/tileNav";

type Props = Pick<
  CanvasConfig,
  | "cols" | "rows" | "gap" | "radius" | "breathe" | "maxWidth"
  | "hoverScale" | "hoverSpeed" | "imageStyle" | "background" | "imageCrop"
  | "friction" | "glide" | "tileRatio"
>;

export default function ScrollGrid({
  cols, rows, gap, radius, breathe, maxWidth, hoverScale, hoverSpeed,
  imageStyle, background, imageCrop, friction, glide, tileRatio,
}: Props) {
  const imageList = getImages(imageStyle);
  const objectFit = imageStyle === "without-bg" ? "object-contain" : "object-cover";
  const [viewportW, setViewportW] = useState(0);

  // The content column is capped at maxWidth and centered in the viewport.
  // Cell size is derived from that content width, so `cols` still means
  // "columns visible on screen."
  const contentW = viewportW > 0 ? Math.min(viewportW, maxWidth) : 0;
  const cell = contentW > 0 ? contentW / cols : 0;
  const blockH = rows * cell * tileRatio;

  const slots = useMemo(
    () => (cell > 0 ? buildSlots(cell, cols, rows, gap, imageList, tileRatio) : []),
    [cell, cols, rows, gap, imageList, tileRatio]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const scaleWrapperRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const [repeatY, setRepeatY] = useState(2);

  // Live-tunable knobs — refs so the rAF loop reads current values without
  // needing to be torn down and rebuilt on every slider change.
  const breatheRef = useRef(breathe);
  const frictionRef = useRef(friction);
  const glideRef = useRef(glide);
  useEffect(() => { breatheRef.current = breathe; }, [breathe]);
  useEffect(() => { frictionRef.current = friction; }, [friction]);
  useEffect(() => { glideRef.current = glide; }, [glide]);

  const pos = useRef(0); // vertical only — this mode does not pan horizontally
  const vel = useRef(0); // vertical velocity for drag momentum
  const energy = useRef(0);
  const currentScale = useRef(1);
  const reduce = useRef(false);

  // Drag state — same pattern as InfiniteCanvas, but Y-only.
  const dragging = useRef(false);
  const lastY = useRef(0);

  // Tap-vs-drag detection — a short, small-motion release navigates.
  const downX = useRef(0);
  const downY = useRef(0);
  const downT = useRef(0);
  const { begin } = useTransition();

  // Wheel listener: manual attach so we can pass { passive: false } and
  // preventDefault() — otherwise the browser tries to scroll the page too.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Only vertical. `deltaX` is dropped — there's no horizontal room to pan.
      pos.current -= e.deltaY;
      energy.current = Math.min(1, energy.current + Math.abs(e.deltaY) * 0.01);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => setViewportW(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (blockH > 0) {
      setRepeatY(Math.ceil(window.innerHeight / blockH) + 1);
    }
  }, [blockH]);

  // Continuous rAF: apply glide velocity, decay energy, ease scale, paint.
  useEffect(() => {
    if (blockH <= 0) return;
    let id = 0;
    const loop = () => {
      // Momentum glide: integrate velocity when not dragging, decay via friction.
      if (!dragging.current && Math.abs(vel.current) > 0.15) {
        pos.current += vel.current;
        vel.current *= frictionRef.current;
        // Feed a little breathe energy from the glide too, so momentum swells.
        energy.current = Math.min(1, energy.current + Math.abs(vel.current) * 0.005);
      }

      energy.current *= 0.9;
      if (reduce.current) energy.current = 0;

      const targetScale = 1 + energy.current * breatheRef.current;
      currentScale.current += (targetScale - currentScale.current) * 0.15;

      const plane = planeRef.current;
      if (plane) {
        let wy = pos.current % blockH;
        if (wy > 0) wy -= blockH;
        plane.style.transform = `translate3d(0, ${wy}px, 0)`;
      }
      const wrap = scaleWrapperRef.current;
      if (wrap) {
        wrap.style.transform = `scale(${currentScale.current})`;
      }

      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [blockH]);

  // Pointer drag — Y-only pan. Same feel as InfiniteCanvas but constrained
  // to a single axis so it composes naturally with the wheel/trackpad scroll.
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    vel.current = 0; // kill any active glide when a new grab begins
    lastY.current = e.clientY;
    downX.current = e.clientX;
    downY.current = e.clientY;
    downT.current = performance.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = e.clientY - lastY.current;
    pos.current += dy;
    vel.current = vel.current * 0.6 + dy * 0.4;
    lastY.current = e.clientY;
    // Feed breathe energy from drag motion too so the swell reacts to drags.
    energy.current = Math.min(1, energy.current + Math.abs(dy) * 0.01);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    vel.current *= glideRef.current;
    if (reduce.current) vel.current = 0;

    if (
      isTap(
        downX.current,
        downY.current,
        e.clientX,
        e.clientY,
        downT.current,
        performance.now()
      )
    ) {
      const target = pickTileTarget(e.clientX, e.clientY);
      if (target) {
        vel.current = 0;
        begin({ color: target.color, rect: target.rect, slug: target.slug });
      }
    }
  };

  // Blocks only tile vertically — the row of `cols` columns already fills the width.
  const blockRows: number[] = [];
  for (let j = 0; j <= repeatY; j++) blockRows.push(j);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      // Opt out of Lenis smooth scroll — this grid drives its own
      // wheel/drag motion; Lenis must not intercept the wheel here.
      data-lenis-prevent
      className="fixed inset-0 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
      style={{ backgroundColor: background }}
    >
      {/*
        Content column — width is capped at maxWidth and centered horizontally.
        No overflow-hidden here on purpose: the width sets the layout math
        (cell = contentW / cols) but hover-scaled or breathe-swelled tiles at
        the column edges are allowed to spill visually into the surrounding
        space. The outer container still clips at the viewport.
      */}
      <div
        className="absolute top-0 bottom-0"
        style={{ width: contentW, left: "50%", transform: "translateX(-50%)" }}
      >
        {/* Scale wrapper — the "breathe" happens here, from column center. */}
        <div
          ref={scaleWrapperRef}
          className="absolute inset-0 will-change-transform"
          style={{ transformOrigin: "center center" }}
        >
          {/* Plane — vertical pan translation happens here. */}
          <div ref={planeRef} className="absolute left-0 top-0 will-change-transform">
            {blockRows.map((j) => (
              <div
                key={j}
                className="absolute"
                style={{ left: 0, top: j * blockH, width: contentW, height: blockH }}
              >
              {slots.map((s) => (
                <div
                  key={s.key}
                  className="tile-hover absolute cursor-pointer overflow-hidden"
                  data-title={s.title}
                  data-category={s.category}
                  data-slug={s.slug}
                  data-bg={s.bg}
                  style={{
                    left: s.left,
                    top: s.top,
                    width: s.width,
                    height: s.height,
                    borderRadius: radius,
                    transformOrigin: "center center",
                    transition: `transform ${hoverSpeed}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                    ["--tile-hover-scale" as string]: hoverScale,
                  } as React.CSSProperties}
                >
                  <Image
                    src={s.src}
                    alt=""
                    fill
                    draggable={false}
                    sizes={`${Math.round(cell)}px`}
                    unoptimized={s.src.endsWith(".gif")}
                    className={objectFit}
                    style={{ transform: `scale(${imageCrop})` }}
                  />
                </div>
              ))}
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
