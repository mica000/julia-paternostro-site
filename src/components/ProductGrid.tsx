"use client";

/*
  ProductGrid — a "liquid" grid
  -----------------------------
  The grid reacts to the cursor like a soft surface. As the pointer moves over
  it, each tile measures its distance to the cursor and slides toward it +
  swells, with the effect falling off over a radius. Everything is driven by
  springs, so motion settles smoothly instead of snapping — that spring settle
  is what reads as "fluid/liquid."

  Performance:
  - One pointer listener on the container feeds two motion values (x/y).
  - Each tile derives its own transform from those values and animates only
    `x`, `y`, `scale` (GPU-composited). No React re-renders per frame.
  - A subtle idle drift keeps the grid alive at rest.
  - Fully disabled under prefers-reduced-motion.
*/

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import type { Product } from "@/content/products";
import type { LayoutVariant } from "@/lib/layouts";

const RADIUS = 340; // px — how far the cursor's influence reaches
const MAX_SHIFT = 28; // px — how far a tile slides toward the cursor at closest
const MAX_SCALE = 0.09; // extra scale at the cursor's center

type GridProps = { products: Product[]; variant: LayoutVariant };

export default function ProductGrid({ products, variant }: GridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Cursor position relative to the grid. Start far off so nothing is displaced.
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  function handleMove(e: React.PointerEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }
  function reset() {
    mouseX.set(-9999);
    mouseY.set(-9999);
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={`relative grid grid-cols-2 ${variant.columns} ${variant.gap}`}
    >
      {products.map((product, i) => (
        <LiquidTile
          key={product.slug}
          product={product}
          variant={variant}
          index={i}
          mouseX={mouseX}
          mouseY={mouseY}
        />
      ))}
    </div>
  );
}

type TileProps = {
  product: Product;
  variant: LayoutVariant;
  index: number;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
};

function LiquidTile({ product, variant, index, mouseX, mouseY }: TileProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const center = useRef({ x: 0, y: 0 });
  const reduce = useReducedMotion();

  // Measure this tile's center within the grid (recomputed on resize).
  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      center.current = {
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2,
      };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Distance-based falloff, recomputed each time the cursor moves.
  const falloff = () => {
    const dx = mouseX.get() - center.current.x;
    const dy = mouseY.get() - center.current.y;
    const dist = Math.hypot(dx, dy) || 1;
    const strength = Math.max(0, 1 - dist / RADIUS);
    return { dx, dy, dist, strength };
  };

  const txRaw = useTransform(() => {
    if (reduce) return 0;
    const { dx, dist, strength } = falloff();
    return (dx / dist) * strength * MAX_SHIFT;
  });
  const tyRaw = useTransform(() => {
    if (reduce) return 0;
    const { dy, dist, strength } = falloff();
    return (dy / dist) * strength * MAX_SHIFT;
  });
  const scaleRaw = useTransform(() => {
    if (reduce) return 1;
    return 1 + falloff().strength * MAX_SCALE;
  });

  // Springs give the liquid settle.
  const spring = { stiffness: 220, damping: 20, mass: 0.6 };
  const x = useSpring(txRaw, spring);
  const y = useSpring(tyRaw, spring);
  const scale = useSpring(scaleRaw, spring);

  const spans = variant.allowSpan && product.span === 2;

  return (
    <motion.a
      ref={ref}
      href={`#${product.slug}`}
      style={{ x, y, scale }}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
        delay: Math.min(index * 0.03, 0.4),
      }}
      className={`group relative block aspect-square overflow-hidden border border-border/50 bg-surface ${variant.radius} ${
        spans ? "sm:col-span-2 sm:aspect-[2/1]" : ""
      }`}
    >
      {/* Idle drift — a slow, staggered float so the grid feels alive at rest.
          Swap this block for next/image once real assets exist. */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: product.color }}
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{
          duration: 7 + (index % 5),
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.2,
        }}
        aria-hidden
      />

      {/* Label overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white backdrop-blur">
          {product.title}
        </span>
        <span className="text-xs uppercase tracking-wider text-white/70">
          {product.category}
        </span>
      </div>
    </motion.a>
  );
}
