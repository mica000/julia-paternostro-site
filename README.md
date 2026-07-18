# Torto Studio

A design-system / brand-guidelines showcase site, inspired by the structure of
[design.cash.app](https://design.cash.app). It's a **static, image-first
gallery** organized into Foundations, Expressions, and Resources — built for
speed and for easily trying layout variations.

## Tech stack

| Concern    | Choice                        | Why |
|------------|-------------------------------|-----|
| Framework  | Next.js 16 (App Router)       | Static-first rendering, Vercel-native |
| Language   | TypeScript                    | Typed content model |
| Styling    | Tailwind CSS v4               | Token-driven, matches a design system |
| Animation  | Motion (Framer Motion)        | GPU-friendly entrance + hover motion |
| Images     | next/image                    | Auto AVIF/WebP, responsive, lazy-load |
| Hosting    | Vercel                        | Edge CDN + built-in image optimization |

There is **no backend and no database** — every page prerenders to static HTML.

## Getting started

```bash
pnpm dev      # dev server at http://localhost:3000
pnpm build    # production build (all routes prerender static)
pnpm lint     # eslint
```

## How it's organized

```
src/
  app/
    layout.tsx          # fonts, metadata
    page.tsx            # homepage (server component — static hero + gallery)
    globals.css         # design tokens (color, motion) — change once, applies everywhere
  content/
    products.ts         # ← the single source of truth for the gallery
  lib/
    layouts.ts          # ← layout VARIATIONS live here (config, not markup)
  components/
    SiteHeader.tsx      # nav (server component, zero JS)
    Gallery.tsx         # the one interactive island (holds active-variant state)
    VariantSwitcher.tsx # live layout toggle
    ProductGrid.tsx     # the only place tiles are drawn
```

### Add a piece to the gallery

Add one object to `products` in [`src/content/products.ts`](src/content/products.ts).
Drop the asset in `public/products/` and set `image: "/products/your-file.avif"`.
Until an image exists, the `color` field renders a placeholder tile — so you can
design layouts with zero assets.

### Try a layout variation

Add a variant object to `layoutVariants` in [`src/lib/layouts.ts`](src/lib/layouts.ts).
It instantly appears in the on-page switcher. Variations are pure config
(columns, gap, radius, whether tiles may span 2 columns) — no duplicated markup.

## Performance notes

- Homepage prerenders static; only the `Gallery` island ships JavaScript.
- Real images go through `next/image` (see the commented block in `ProductGrid.tsx`)
  for automatic AVIF/WebP, correct responsive sizes, and off-screen lazy-loading.
- Entrance animation is transform/opacity only, staggered, and disabled under
  `prefers-reduced-motion`.
