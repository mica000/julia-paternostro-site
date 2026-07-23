"use client";

/*
  OrbitBelt — 3D carousel of project tiles on a rotating ring
  -----------------------------------------------------------
  Inspired by the fanning card belt on design.cash.app/products, built
  without GSAP. All the animation is a plain requestAnimationFrame loop
  writing per-frame transforms directly to each card's DOM node — the same
  pattern InfiniteCanvas and ScrollGrid use.

  Layout math (per card i of N total):
    p       = i/N + offset             // fractional position around ring
    θ       = p * 2π                   // angle in radians
    x       = R * sin(θ)               // horizontal position (px)
    z       = R * cos(θ)               // depth (px, positive = toward camera)
    rotY    = -θ * 180/π               // spin so cards face inward
    rotX    = tilt * sin(θ)            // slight bank; 0 at front/back, max at sides
    depth   = (z + R) / (2R)           // 0 at back, 1 at front
    scale   = 0.4 + 0.6 * depth        // shrink cards further away
    opacity = 0.15 + 0.85 * depth      // fade cards on the back half

  Input:
    - Vertical wheel → rotates the ring (same as InfiniteCanvas's wheel model).
    - Horizontal drag → rotates the ring in the direction of the drag.
    - Momentum glide after a drag release, with a friction ref so the panel's
      Friction / Glide sliders tune this mode too.

  Performance notes:
    - Zero React re-renders per frame; transforms/opacity/z-index written
      straight to `.style`.
    - `transform-style: preserve-3d` on the belt and on each card so the
      3D transforms actually flatten in the right order.
    - `perspective: 1440px` on the scene container matches the Cash App
      value we sampled; adjust with the perspective sensitivity if it ever
      needs to be tuned per viewport.
*/

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  getImages,
  productMeta,
  type CanvasConfig,
} from "@/lib/config";
import { useTransition } from "@/components/PageTransition";
import { isTap, pickTileTarget } from "@/lib/tileNav";

type Props = Pick<
  CanvasConfig,
  | "orbitRadius"
  | "orbitTilt"
  | "orbitArc"
  | "orbitCardSize"
  | "orbitPerspective"
  | "imageStyle"
  | "background"
  | "hoverScale"
  | "hoverSpeed"
  | "imageCrop"
  | "friction"
  | "glide"
>;

// Wheel/drag → offset scale factors. Tuned by feel; expose as sliders later
// if the studio wants to fine-tune.
const WHEEL_SENSITIVITY = 0.0012;
const DRAG_SENSITIVITY = 0.0015;


export default function OrbitBelt({
  orbitRadius,
  orbitTilt,
  orbitArc,
  orbitCardSize,
  orbitPerspective,
  imageStyle,
  background,
  hoverScale,
  hoverSpeed,
  imageCrop,
  friction,
  glide,
}: Props) {
  const images = getImages(imageStyle);
  const N = images.length;
  const objectFit = imageStyle === "without-bg" ? "object-contain" : "object-cover";

  const containerRef = useRef<HTMLDivElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Live-tunable knobs → refs so the rAF loop always reads the current value
  // without needing to be torn down and rebuilt on every slider change.
  const radiusRef = useRef(orbitRadius);
  const tiltRef = useRef(orbitTilt);
  const arcRef = useRef(orbitArc);
  const frictionRef = useRef(friction);
  const glideRef = useRef(glide);
  useEffect(() => { radiusRef.current = orbitRadius; }, [orbitRadius]);
  useEffect(() => { tiltRef.current = orbitTilt; }, [orbitTilt]);
  useEffect(() => { arcRef.current = orbitArc; }, [orbitArc]);
  useEffect(() => { frictionRef.current = friction; }, [friction]);
  useEffect(() => { glideRef.current = glide; }, [glide]);

  // Animation state.
  const offset = useRef(0);          // fractional position: full revolution = 1
  const velocity = useRef(0);        // momentum after drag release
  const dragging = useRef(false);
  const lastPointerX = useRef(0);
  const reduce = useRef(false);      // prefers-reduced-motion

  // Tap-vs-drag detection — a short, small-motion release triggers navigation.
  const downX = useRef(0);
  const downY = useRef(0);
  const downT = useRef(0);
  const { begin } = useTransition();

  // Wheel handler — manual so we can pass { passive: false } and hijack scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Combine axes so trackpads that report deltaX-only still drive the ring.
      const delta = e.deltaY + e.deltaX;
      offset.current += delta * WHEEL_SENSITIVITY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Continuous rAF: apply momentum, compute per-card transform, paint.
  useEffect(() => {
    let id = 0;
    const loop = () => {
      // Momentum glide when the user isn't touching the belt.
      if (!dragging.current && Math.abs(velocity.current) > 0.0001) {
        offset.current += velocity.current;
        velocity.current *= frictionRef.current;
      }

      const R = radiusRef.current;
      const tilt = tiltRef.current;
      const twoPi = Math.PI * 2;
      // Half-arc in radians. Cards whose angle sits outside ±halfArc from
      // the front (θ = 0) fade out — that turns the full 360° ring into a
      // front-facing fan, matching the Cash App treatment.
      const halfArc = (arcRef.current * Math.PI) / 360;
      // Feather zone where visibility ramps from 1 → 0 (avoids hard cutoff).
      const feather = Math.min(0.35, halfArc * 0.25);

      for (let i = 0; i < N; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;

        const p = i / N + offset.current;
        const theta = p * twoPi;

        const x = R * Math.sin(theta);
        const z = R * Math.cos(theta);

        const rotY = -theta * (180 / Math.PI);
        const rotX = tilt * Math.sin(theta);

        // 0 (back of ring) → 1 (front of ring)
        const depth = (z + R) / (2 * R);
        const scale = 0.4 + 0.6 * depth;
        const depthOpacity = 0.15 + 0.85 * depth;

        // Arc mask: angle from the front, wrapped into [0, π].
        const wrapped = ((theta % twoPi) + twoPi) % twoPi;
        const angleFromFront = Math.min(wrapped, twoPi - wrapped);
        let arcVis: number;
        if (angleFromFront <= halfArc - feather) arcVis = 1;
        else if (angleFromFront >= halfArc) arcVis = 0;
        else arcVis = 1 - (angleFromFront - (halfArc - feather)) / feather;

        const opacity = depthOpacity * arcVis;

        // z-index so painter's-algorithm sorting keeps the back cards
        // behind the front ones even though they're all in 3D space.
        card.style.transform =
          `translate3d(${x.toFixed(2)}px, 0, ${(z - R).toFixed(2)}px) ` +
          `rotateY(${rotY.toFixed(2)}deg) ` +
          `rotateX(${rotX.toFixed(2)}deg) ` +
          `scale(${scale.toFixed(3)})`;
        card.style.opacity = opacity.toFixed(3);
        card.style.zIndex = String(Math.round(depth * 100));
        // Fully-hidden cards should not block hover hit-testing.
        card.style.pointerEvents = arcVis < 0.02 ? "none" : "auto";
      }

      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [N]);

  // Drag → rotate the ring horizontally.
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    velocity.current = 0; // kill any active glide the moment a new grab starts
    lastPointerX.current = e.clientX;
    downX.current = e.clientX;
    downY.current = e.clientY;
    downT.current = performance.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPointerX.current;
    // Drag right → ring turns left (cards move toward the pointer), matching
    // the tactile expectation of "grabbing the belt and pulling it."
    const step = -dx * DRAG_SENSITIVITY;
    offset.current += step;
    velocity.current = velocity.current * 0.6 + step * 0.4;
    lastPointerX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    velocity.current *= glideRef.current;
    if (reduce.current) velocity.current = 0;

    // Tap? Look up the tile under the pointer and start the color-morph
    // transition. isTap keeps this from firing at the end of a drag.
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
        // Kill any residual velocity so the ring doesn't keep spinning
        // behind the growing overlay.
        velocity.current = 0;
        begin({ color: target.color, rect: target.rect, slug: target.slug });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      // Opt out of Lenis smooth scroll — this belt drives its own
      // wheel/drag motion; Lenis must not intercept the wheel here.
      data-lenis-prevent
      className="fixed inset-0 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
      style={{
        backgroundColor: background,
        // Shallower perspective origin sits the vanishing point above the
        // belt's center, which mimics the eye-level view Cash App uses.
        perspective: `${orbitPerspective}px`,
        perspectiveOrigin: "center 42%",
      }}
    >
      {/*
        Belt — centered in the viewport. `preserve-3d` is critical: without
        it, the child transforms would flatten and every card would end up
        in the same plane, killing the depth entirely.
      */}
      <div
        ref={beltRef}
        className="absolute left-1/2 top-1/2"
        style={{
          transformStyle: "preserve-3d",
          transform: "translate(-50%, -50%)",
        }}
      >
        {images.map((src, i) => {
          const meta = productMeta[i];
          return (
            <div
              key={src}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute will-change-transform"
              style={{
                left: -orbitCardSize / 2,
                top: -orbitCardSize / 2,
                width: orbitCardSize,
                height: orbitCardSize,
                transformStyle: "preserve-3d",
                // Filled in every rAF tick — set an initial value so the
                // card starts in a sane spot before the first frame runs.
                transform: "translate3d(0,0,0)",
              }}
            >
              {/*
                Inner div carries `.tile-hover` so the hover pill and custom
                cursor still work here (they use `elementFromPoint` +
                `data-title` / `data-category`). Hover scale lives on this
                node so it composes cleanly with the 3D transform on the
                outer node — no conflict.
              */}
              <div
                className="tile-hover absolute inset-0 cursor-pointer overflow-hidden"
                data-title={meta.title}
                data-category={meta.category}
                data-slug={meta.slug}
                data-bg={meta.bg}
                style={{
                  transformOrigin: "center center",
                  transition: `transform ${hoverSpeed}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  ["--tile-hover-scale" as string]: hoverScale,
                } as React.CSSProperties}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  draggable={false}
                  sizes={`${Math.round(orbitCardSize)}px`}
                  unoptimized={src.endsWith(".gif")}
                  className={objectFit}
                  style={{ transform: `scale(${imageCrop})` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
