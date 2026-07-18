/*
  Layout variants
  ---------------
  The "try a few variations" mechanism. Each variant is pure config that the
  ProductGrid reads — no duplicated markup. Add a variant here and it instantly
  becomes selectable in the UI (and shareable via ?v=<id>).

  This keeps experimentation cheap: you tune numbers, not components.
*/

export type LayoutVariant = {
  id: string;
  label: string;
  description: string;
  /** Tailwind grid-cols utility applied at the largest breakpoint */
  columns: string;
  /** Gap between tiles */
  gap: string;
  /** Whether tiles may span 2 columns (editorial) or stay uniform */
  allowSpan: boolean;
  /** Corner radius token for tiles */
  radius: string;
};

export const layoutVariants: LayoutVariant[] = [
  {
    id: "uniform",
    label: "Uniform",
    description: "Even, calm grid. Every piece gets equal weight.",
    columns: "sm:grid-cols-2 lg:grid-cols-4",
    gap: "gap-6",
    allowSpan: false,
    radius: "rounded-2xl",
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Mixed tile sizes create rhythm and focal points.",
    columns: "sm:grid-cols-2 lg:grid-cols-4",
    gap: "gap-8",
    allowSpan: true,
    radius: "rounded-3xl",
  },
  {
    id: "dense",
    label: "Dense",
    description: "Tight, poster-wall energy. More on screen at once.",
    columns: "grid-cols-2 md:grid-cols-4 lg:grid-cols-6",
    gap: "gap-2",
    allowSpan: false,
    radius: "rounded-xl",
  },
];

export const defaultVariant = layoutVariants[0];

export function getVariant(id: string | undefined): LayoutVariant {
  return layoutVariants.find((v) => v.id === id) ?? defaultVariant;
}
