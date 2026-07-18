"use client";

/*
  Gallery
  -------
  The one interactive island on the homepage. It owns the active-variant
  state and composes the switcher + grid. Isolating interactivity here keeps
  the rest of the page a static server component (less JS, faster load).
*/

import { useState } from "react";
import { products } from "@/content/products";
import { defaultVariant, type LayoutVariant } from "@/lib/layouts";
import VariantSwitcher from "@/components/VariantSwitcher";
import ProductGrid from "@/components/ProductGrid";

export default function Gallery() {
  const [variant, setVariant] = useState<LayoutVariant>(defaultVariant);

  return (
    <section className="flex flex-col gap-6">
      <VariantSwitcher active={variant} onChange={setVariant} />
      <ProductGrid products={products} variant={variant} />
    </section>
  );
}
