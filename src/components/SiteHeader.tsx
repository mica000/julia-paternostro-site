/*
  SiteHeader
  ----------
  Sticky top nav mirroring the design-system-site pattern:
  a wordmark on the left, section links on the right. Server component —
  it ships zero JavaScript.
*/

import Link from "next/link";
import { categories } from "@/content/products";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm font-bold text-black">
            T
          </span>
          <span className="text-base font-semibold tracking-tight">Torto</span>
        </Link>

        <nav className="hidden gap-8 md:flex">
          {categories.map((category) => (
            <a
              key={category}
              href={`#${category.toLowerCase()}`}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {category}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
