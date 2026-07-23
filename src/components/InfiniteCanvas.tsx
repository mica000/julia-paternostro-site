"use client";

/*
  InfiniteCanvas — draggable, infinitely-looping floating grid
  ------------------------------------------------------------
  Drag anywhere to pan; release for a spring-less momentum glide. The plane is
  one repeated "block" of tiles; the pan offset wraps modulo the block size,
  so content loops seamlessly in every direction.

  All tuning parameters now come in as props so the control panel can adjust
  them live. Friction and glide live in refs (read from the rAF loop without
  stale closures); cell/cols/rows drive a useMemo that recomputes tile slots.

  Performance:
  - The pan transform is written straight to the DOM in requestAnimationFrame.
    No React state changes per drag frame, so no re-renders.
  - One composited translate3d() on the plane moves everything (GPU).
  - Tiles use next/image with fill so we get AVIF/WebP + responsive sizes.
*/

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { getImages, type CanvasConfig } from "@/lib/config";
import { buildSlots } from "@/lib/grid";
import { useTransition } from "@/components/PageTransition";
import { isTap, pickTileTarget } from "@/lib/tileNav";

type Props = Pick<
  CanvasConfig,
  | "friction" | "glide" | "cell" | "cols" | "rows" | "gap"
  | "parallax" | "radius" | "hoverScale" | "hoverSpeed" | "imageStyle"
  | "background" | "imageCrop" | "tileRatio"
>;

export default function InfiniteCanvas({
  friction, glide, cell, cols, rows, gap, parallax, radius,
  hoverScale, hoverSpeed, imageStyle, background, imageCrop, tileRatio,
}: Props) {
  const imageList = getImages(imageStyle);
  const objectFit = imageStyle === "without-bg" ? "object-contain" : "object-cover";
  const blockW = cols * cell;
  const blockH = rows * cell * tileRatio;
  const slots = useMemo(
    () => buildSlots(cell, cols, rows, gap, imageList, tileRatio),
    [cell, cols, rows, gap, imageList, tileRatio]
  );

  const planeRef = useRef<HTMLDivElement>(null);
  const [repeat, setRepeat] = useState({ x: 2, y: 2 });

  // Live-tunable knobs — refs so the rAF loop reads the current value
  // without needing to be torn down and rebuilt on every slider change.
  const frictionRef = useRef(friction);
  const glideRef = useRef(glide);
  const parallaxRef = useRef(parallax);
  useEffect(() => { frictionRef.current = friction; }, [friction]);
  useEffect(() => { glideRef.current = glide; }, [glide]);
  useEffect(() => { parallaxRef.current = parallax; }, [parallax]);

  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const reduce = useRef(false);

  // Tap-vs-drag detection — a short, small-motion release navigates.
  const downX = useRef(0);
  const downY = useRef(0);
  const downT = useRef(0);
  const { begin } = useTransition();

  // Parallax state — target is set by mouse movement, current is eased toward it.
  const parallaxTarget = useRef({ x: 0, y: 0 });
  const parallaxCurrent = useRef({ x: 0, y: 0 });

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const calcRepeat = () => {
      setRepeat({
        x: Math.ceil(window.innerWidth / blockW) + 1,
        y: Math.ceil(window.innerHeight / blockH) + 1,
      });
    };
    calcRepeat();

    // Window-level pointermove drives the parallax target so hovering anywhere
    // on the viewport (including over the control panel) affects the plane.
    const onWindowMove = (e: PointerEvent) => {
      if (reduce.current) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1; // -1..1
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      // Negative for a "camera looking around" feel — plane drifts away from the cursor.
      parallaxTarget.current.x = -nx * parallaxRef.current;
      parallaxTarget.current.y = -ny * parallaxRef.current;
    };

    window.addEventListener("resize", calcRepeat);
    window.addEventListener("pointermove", onWindowMove);
    return () => {
      window.removeEventListener("resize", calcRepeat);
      window.removeEventListener("pointermove", onWindowMove);
    };
  }, [blockW, blockH]);

  // One continuous rAF loop: applies glide velocity, eases parallax, paints.
  // Kept alive for the lifetime of the component — cheap (one style write/frame).
  useEffect(() => {
    let id = 0;
    const loop = () => {
      // Glide: if velocity is above threshold, integrate and decay.
      const v = vel.current;
      if (!dragging.current && Math.hypot(v.x, v.y) > 0.15) {
        pos.current.x += v.x;
        pos.current.y += v.y;
        v.x *= frictionRef.current;
        v.y *= frictionRef.current;
      }
      // Parallax: ease toward the mouse-driven target.
      const p = parallaxCurrent.current;
      const t = parallaxTarget.current;
      p.x += (t.x - p.x) * 0.08;
      p.y += (t.y - p.y) * 0.08;

      // Paint: wrapped pan offset + parallax overlay.
      const el = planeRef.current;
      if (el) {
        let wx = pos.current.x % blockW;
        let wy = pos.current.y % blockH;
        if (wx > 0) wx -= blockW;
        if (wy > 0) wy -= blockH;
        el.style.transform = `translate3d(${wx + p.x}px, ${wy + p.y}px, 0)`;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [blockW, blockH]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    // Kill any in-flight momentum so a new grab starts fresh.
    vel.current = { x: 0, y: 0 };
    last.current = { x: e.clientX, y: e.clientY };
    downX.current = e.clientX;
    downY.current = e.clientY;
    downT.current = performance.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    pos.current.x += dx;
    pos.current.y += dy;
    vel.current.x = vel.current.x * 0.6 + dx * 0.4;
    vel.current.y = vel.current.y * 0.6 + dy * 0.4;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    // Apply the glide multiplier at release for a distinct "flick strength" knob.
    vel.current.x *= glideRef.current;
    vel.current.y *= glideRef.current;
    if (reduce.current) vel.current = { x: 0, y: 0 };

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
        vel.current = { x: 0, y: 0 };
        begin({ color: target.color, rect: target.rect, slug: target.slug });
      }
    }
  };

  const blocks: { i: number; j: number }[] = [];
  for (let i = 0; i <= repeat.x; i++) {
    for (let j = 0; j <= repeat.y; j++) {
      blocks.push({ i, j });
    }
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      // Opt out of Lenis smooth scroll — this canvas drives its own
      // wheel/drag motion; Lenis must not intercept the wheel here.
      data-lenis-prevent
      className="fixed inset-0 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
      style={{ backgroundColor: background }}
    >
      <div ref={planeRef} className="absolute left-0 top-0 will-change-transform">
        {blocks.map(({ i, j }) => (
          <div
            key={`${i}-${j}`}
            className="absolute"
            style={{ left: i * blockW, top: j * blockH, width: blockW, height: blockH }}
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
                  sizes="300px"
                  // Skip Next's optimizer on GIFs so animation frames survive —
                  // the optimizer would otherwise flatten them to a single frame.
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
  );
}
