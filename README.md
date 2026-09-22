# Julia Paternostro — portfolio

The portfolio of **Julia Paternostro**, a Brazilian visual designer and
illustrator: visual identities, graphic systems and illustration for brands,
festivals and cultural projects.

**Live:** [julia-paternostro.com](https://julia-paternostro.com)

Designed and built by [Mica Sugui](https://github.com/mica000), with
Julia as the client and editor.

## What's in it

- **Home:** one project at a time, its artwork floating around a hero image.
  The pieces drift with the cursor, each at its own depth. Scroll, swipe, the
  arrow keys or Tab move between projects.
- **All projects:** a sheet that slides down over the home with every
  project's crops.
- **Case studies** (`/work/[slug]`): the project's gallery, then a closing
  call to action.
- **About** and **Services**, in English and Portuguese.

## Stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Motion | CSS keyframes and a hand-written `requestAnimationFrame` loop; Lenis for smooth scroll |
| Images | `next/image`, WebP exports converted with `sharp` |
| Hosting | Vercel |

No backend, no database. Every page is prerendered.

## Where things live

| Path | What |
| --- | --- |
| `src/lib/projects.ts` | Every project: copy (EN/PT), galleries, list crops |
| `src/lib/compositions.json` | Where each floating piece sits on the home, per project, desktop and mobile |
| `src/lib/state.tsx` | Interface text in both languages, and the About bio |
| `src/components/ParallaxIndex.tsx` | The home: stage, motion loop, keyboard, All-projects sheet |
| `src/components/CaseStudy.tsx` | Case study pages |
| `public/Images/` | All artwork |

## Run it

```bash
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Add `?edit=1` to the home URL
to open the composition editor, which drags the floating pieces into place
and saves them to `compositions.json`. It only works locally.

## Editing content (for Julia)

1. Make a branch and change the copy in `src/lib/projects.ts` or `src/lib/state.tsx`.
2. Open a pull request. Vercel builds a preview link for it.
3. Check the preview, then merge. The site updates on its own.

**Images:** export as WebP and give a replaced image a **new file name**.
Vercel caches images by name, so reusing a name can keep showing the old
picture.

## Rights

The artwork in `public/Images/` and the project copy belong to Julia
Paternostro and her clients, all rights reserved. See [LICENSE](LICENSE) for
the code.
