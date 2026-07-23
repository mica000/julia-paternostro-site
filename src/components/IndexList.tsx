"use client";

/*
  IndexList (Index 2) — full-bleed counter-scroll project index
  -------------------------------------------------------------
  Layout: images full-bleed, names overlaid on top.
    - Background: vertical list of project images, each spanning the FULL
                  viewport width. The currently-selected image sits at the
                  vertical center and nearly fills the screen.
    - Overlay:    vertical list of project names painted ON TOP of the
                  images, blended with mix-blend-mode: difference (the same
                  effect as the top nav) so the white text inverts against
                  whatever photo is behind it. The selected name is
                  centered; the rest are dimmed.

  Counter-scroll:
    The two lists move in OPPOSITE directions as the reader scrolls.
    - Names container (NATURAL order) translates UP as the selection
      advances — normal reading motion, top-to-bottom project order.
    - Images container (REVERSED order) translates DOWN as the selection
      advances — the image column scrolls downward.
    Both are still anchored on the SAME active project (they show the
    same slug at the center) — the opposite motion is achieved by
    reversing the order of the IMAGES on the right. See the `imagesOrder`
    definition below.

  Scroll model:
    Native page scroll doesn't work here because we need the viewport
    to remain fixed while we drive two independent transforms. Instead
    we hijack the wheel: each wheel event feeds a fractional `progress`
    accumulator [0, N-1]. That drives translations plus which item is
    "selected" for highlight.

  Click:
    Tapping the centered image (or the centered name) routes through
    the shared color-morph transition to that project's case study.
*/

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { projects, projectBg, projectPreviewImages } from "@/lib/projects";
import { getImages, type ImageStyle } from "@/lib/config";
import { useTransition } from "@/components/PageTransition";

type Props = {
  imageStyle: ImageStyle;
  background: string;
};

// Tuning knobs — surface these later if we want per-viewport tweaking.
// Height of each row on the left column, in px. The name text is 40px
// (line-height 40), so a 64px row leaves a 24px gap between names — the
// tight spacing from the Figma index design.
const NAME_ROW_H = 64;
// Image slot aspect ratio — matches Delírio Tropical's hero (913 × 560,
// ~1.63:1 landscape). Every project image is placed in a slot of this
// exact aspect, and displayed with `object-contain` so nothing crops
// regardless of the source image's native ratio. The letterbox space
// falls back to the project's bg color for a clean framed look.
const IMAGE_ASPECT_W = 913;
const IMAGE_ASPECT_H = 560;
// How many pixels of wheel delta advance one full project step. Higher
// = slower / more deliberate; lower = flicky.
const WHEEL_PER_STEP = 250;
// Smoothing factor for the progress lerp (0..1). Higher = snappier.
const SMOOTH = 0.16;
// Preview reel — ms each image is shown before crossfading to the next
// while an image-rich project is the active selection.
const REEL_MS = 1400;
// How many of a project's first images the reel cycles through.
const REEL_COUNT = 4;

export default function IndexList({ imageStyle, background }: Props) {
  const { begin } = useTransition();
  const images = getImages(imageStyle);
  const N = projects.length;

  // Wheel-driven fractional index (target) + smoothed value (current).
  // Both are refs (not state) so the rAF loop can mutate at 60fps
  // without triggering React re-renders per frame. React only re-renders
  // when `selectedIdx` (the closest integer index) changes.
  const target = useRef(0);
  const current = useRef(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const namesInnerRef = useRef<HTMLDivElement>(null);
  const imagesInnerRef = useRef<HTMLDivElement>(null);
  const viewportH = useRef(0);
  const viewportW = useRef(0);

  // Reversed order on the RIGHT so the images container translates DOWN
  // as the selection advances (image column scrolls downward), while the
  // (naturally-ordered) names container translates UP. Both still center
  // on the same active slug. Each entry keeps its ORIGINAL index `i` so we
  // can still look up the matching image source in the unreversed array.
  const imagesOrder = useMemo(
    () => projects.map((p, i) => ({ p, i })).reverse(),
    []
  );

  // Measure viewport height once on mount + on resize. Used to compute
  // the "center offset" so the active row sits in the vertical middle.
  useEffect(() => {
    const measure = () => {
      viewportH.current = window.innerHeight;
      viewportW.current = window.innerWidth;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Wheel hijack. Passive: false so we can preventDefault and stop the
  // page from scrolling underneath us.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      target.current += e.deltaY / WHEEL_PER_STEP;
      // Clamp to [0, N-1] with a tiny bounce-back margin so the ends
      // feel firm instead of infinite.
      target.current = Math.max(0, Math.min(N - 1, target.current));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [N]);

  // rAF loop: lerp `current` toward `target`, write transforms to both
  // inner columns, and update the selected index for highlight.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      current.current += (target.current - current.current) * SMOOTH;
      const idx = current.current;

      const vh = viewportH.current || window.innerHeight;
      const centerY = vh / 2;

      // Names: natural order. Active row is `idx`, so the container
      // translates UP as idx grows — standard reading motion — keeping the
      // active name centered. Row height is NAME_ROW_H.
      const namesTranslate = centerY - NAME_ROW_H / 2 - idx * NAME_ROW_H;
      if (namesInnerRef.current) {
        namesInnerRef.current.style.transform = `translate3d(0, ${namesTranslate.toFixed(2)}px, 0)`;
      }

      // Images: reversed order. The active slug sits at row (N-1) - idx in
      // the reversed list; as idx grows that row number shrinks, so the
      // container translates DOWN — the image column scrolls downward,
      // counter to the names. Each image slot is now FULL viewport width
      // with a Delírio-hero aspect (913:560), so its rendered height is
      // vw × (560/913). Both stay centered on the same slug.
      const vw = viewportW.current || window.innerWidth;
      const imageRowH = vw * (IMAGE_ASPECT_H / IMAGE_ASPECT_W);
      const imagesRow = N - 1 - idx;
      const imagesTranslate = centerY - imageRowH / 2 - imagesRow * imageRowH;
      if (imagesInnerRef.current) {
        imagesInnerRef.current.style.transform = `translate3d(0, ${imagesTranslate.toFixed(2)}px, 0)`;
      }

      // Only push state when the rounded active index changes — keeps
      // React out of the per-frame loop.
      const rounded = Math.max(0, Math.min(N - 1, Math.round(idx)));
      setSelectedIdx((prev) => (prev === rounded ? prev : rounded));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [N]);

  const active = projects[selectedIdx];

  // Preview reel — the first few gallery images of the active project.
  // Image-rich projects (those with `sections`) return a set; the others
  // return [] and the index keeps showing their single image. The cycling
  // itself lives in the <Reel> child (keyed by slug) so each new selection
  // restarts from image 01 on mount.
  const activePreview = useMemo(
    () => projectPreviewImages(active, REEL_COUNT),
    [active]
  );

  const onSelect = useCallback(
    (e: React.MouseEvent<HTMLElement>, slug: string, bg: string) => {
      const r = e.currentTarget.getBoundingClientRect();
      begin({
        color: bg,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        slug,
      });
    },
    [begin]
  );

  return (
    <div
      ref={rootRef}
      // Opt out of Lenis smooth scroll — this view drives its own
      // wheel-based motion; Lenis must not intercept the wheel here.
      data-lenis-prevent
      className="fixed inset-0 overflow-hidden select-none"
      style={{ backgroundColor: background }}
    >
      {/* ─── Images — full-bleed background layer (reversed order) ───
          Rendered FIRST so it paints behind the names. Each slot spans the
          full viewport width; the active image nearly fills the screen. */}
      <div className="absolute inset-0 overflow-hidden">
        <div ref={imagesInnerRef} className="w-full will-change-transform">
          {imagesOrder.map(({ p, i }) => {
            const isActive = p.slug === active.slug;
            // Prefer a dedicated landscape index image when the project has
            // one; otherwise fall back to the square tile (letterboxed).
            const single = p.indexImage ?? images[i];
            // When THIS project is the active selection and it's image-rich,
            // show the cycling preview reel of its first few gallery images
            // instead of a single frame. Everything else shows one image.
            const showReel = isActive && activePreview.length > 1;
            return (
              <div
                key={p.slug}
                onClick={(e) => onSelect(e, p.slug, projectBg(p))}
                data-cursor-ring
                className="relative w-full cursor-pointer overflow-hidden"
                style={{
                  // Full-width slot at the Delírio hero aspect (913:560);
                  // height is derived from the viewport width — matches the
                  // rAF math above (vw × 560/913).
                  aspectRatio: `${IMAGE_ASPECT_W} / ${IMAGE_ASPECT_H}`,
                  backgroundColor: projectBg(p),
                  // Non-selected images sit at 50% opacity so the
                  // active/centered one reads as the clear focal point.
                  opacity: isActive ? 1 : 0.5,
                  transition: "opacity 400ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {showReel ? (
                  // Keyed by slug so a fresh Reel mounts (restarting at
                  // image 01) each time the active project changes.
                  <Reel key={p.slug} srcs={activePreview} />
                ) : (
                  <Image
                    src={single}
                    alt=""
                    fill
                    sizes="100vw"
                    priority={i === 0}
                    draggable={false}
                    unoptimized={single.endsWith(".gif")}
                    // `object-contain` — no cropping; letterbox falls back
                    // to the project bg color.
                    className="object-contain"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Names — parallax list overlaid ON TOP of the images ───
          `mix-blend-mode: difference` (the same effect as the top nav)
          inverts the white text against whatever image sits behind it, so
          the names stay legible over any project photo. Natural order; the
          active name is centered, the rest dimmed via opacity. */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1/2 overflow-hidden"
        style={{ mixBlendMode: "difference" }}
      >
        <div ref={namesInnerRef} className="w-full will-change-transform">
          {projects.map((p) => {
            const isActive = p.slug === active.slug;
            return (
              <div
                key={p.slug}
                onClick={(e) => onSelect(e, p.slug, projectBg(p))}
                data-cursor-ring
                className="flex items-center px-5 md:px-8 cursor-pointer"
                style={{
                  height: NAME_ROW_H,
                  // Pure white so the difference blend inverts it cleanly
                  // against the backdrop; non-active rows dim via opacity.
                  color: "#ffffff",
                  opacity: isActive ? 1 : 0.35,
                  transition: "opacity 400ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {/* Truncate long titles so they never overflow the left
                    column. Typography per Figma: SF Pro Bold 40 / 40. */}
                <span
                  className="block w-full truncate font-bold"
                  style={{
                    fontSize: 40,
                    lineHeight: "40px",
                    letterSpacing: "0%",
                  }}
                >
                  {p.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/*
  Reel — auto-cycling preview of an image-rich project's first few gallery
  images, shown in the active slot of the index. Every frame is stacked
  absolutely (via next/image `fill`) and only the current one sits at
  opacity 1; the crossfade keeps all frames decoded so there's no
  flash-to-bg between images. `object-contain` — nothing ever crops.

  Mounted with a slug `key` by the parent, so switching projects remounts
  this fresh and the reel restarts from image 01. setState only ever fires
  inside the interval callback — never synchronously in an effect body.
*/
function Reel({ srcs }: { srcs: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (srcs.length <= 1) return;
    const id = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % srcs.length);
    }, REEL_MS);
    return () => window.clearInterval(id);
  }, [srcs.length]);
  return (
    <>
      {srcs.map((s, i) => (
        <Image
          key={i}
          src={s}
          alt=""
          fill
          sizes="100vw"
          draggable={false}
          unoptimized={s.endsWith(".gif")}
          className="object-contain"
          style={{
            opacity: i === idx ? 1 : 0,
            transition: "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      ))}
    </>
  );
}
