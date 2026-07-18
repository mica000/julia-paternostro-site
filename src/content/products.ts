/*
  Content model
  -------------
  This is the single source of truth for the gallery. To add a new piece,
  add one object to the `products` array below and drop its image in
  /public/products/. No layout code needs to change.

  When you have real assets, set `image` to e.g. "/products/neon-eye.avif"
  and the grid will render it through next/image (auto AVIF/WebP + lazy load).
  Until then, `color` renders a lightweight placeholder tile so you can
  design the layout with zero assets.
*/

export type Category = "Foundations" | "Expressions" | "Resources";

export type Product = {
  slug: string;
  title: string;
  category: Category;
  /** Optional path under /public, e.g. "/products/neon-eye.avif" */
  image?: string;
  /** Placeholder tint used until a real image exists */
  color: string;
  /** Relative tile size — lets a variant build an editorial, non-uniform grid */
  span?: 1 | 2;
};

export const products: Product[] = [
  { slug: "logo", title: "Logo", category: "Foundations", color: "#c8501f", span: 1 },
  { slug: "moire", title: "Moiré Field", category: "Expressions", color: "#f2f2f2", span: 1 },
  { slug: "gummy", title: "Gummy", category: "Expressions", color: "#d63aa8", span: 1 },
  { slug: "eye", title: "The Eye", category: "Foundations", color: "#1ea54a", span: 1 },
  { slug: "device", title: "Device Render", category: "Expressions", color: "#0e7a3a", span: 2 },
  { slug: "check", title: "Check", category: "Foundations", color: "#22c55e", span: 1 },
  { slug: "tap", title: "Tap to Pay", category: "Expressions", color: "#2a2a2a", span: 1 },
  { slug: "spots", title: "Best Spots", category: "Resources", color: "#efefef", span: 1 },
  { slug: "card", title: "Signature Card", category: "Expressions", color: "#3a3a3a", span: 1 },
  { slug: "can", title: "Liquidity Can", category: "Expressions", color: "#141414", span: 1 },
  { slug: "grid", title: "Grid System", category: "Foundations", color: "#b6f23a", span: 1 },
  { slug: "receipt", title: "Local Receipt", category: "Resources", color: "#c9c9c9", span: 2 },
];

export const categories: Category[] = ["Foundations", "Expressions", "Resources"];
