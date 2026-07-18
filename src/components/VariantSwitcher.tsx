"use client";

/*
  VariantSwitcher
  ---------------
  A small pill toggle for flipping between layout variants live. Lifts the
  whole "try variations" idea into the UI so you (or a client) can compare
  options without a rebuild.
*/

import { layoutVariants, type LayoutVariant } from "@/lib/layouts";

type Props = {
  active: LayoutVariant;
  onChange: (variant: LayoutVariant) => void;
};

export default function VariantSwitcher({ active, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-fit gap-1 rounded-full border border-border bg-surface p-1">
        {layoutVariants.map((variant) => {
          const isActive = variant.id === active.id;
          return (
            <button
              key={variant.id}
              onClick={() => onChange(variant)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? "bg-accent text-black"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {variant.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted">{active.description}</p>
    </div>
  );
}
