"use client";

/*
  TopNav — adaptive-contrast, three-region navigation
  ---------------------------------------------------
  Layout matches the Figma spec:

    [ TORTO STUDIO ]        [ WORK · SERVICES · ABOUT ]        [ COPY EMAIL ]

  - Uppercase, wide tracking, SF font (inherited from body).
  - `mix-blend-mode: difference` keeps every element legible over any canvas
    content — white text stays white on dark, flips to that color's complement
    on colored / light backgrounds.
  - Active link (matched via `usePathname`) shows a single-pixel underline.
    No color or weight change — the underline IS the active affordance.
  - COPY EMAIL writes a placeholder studio address to the clipboard and flashes
    "COPIED" for 1.5s. Swap the email string when the real one is ready.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLang, usePageBg } from "@/lib/state";

// TODO: replace with the real studio email once available.
const STUDIO_EMAIL = "hello@torto.studio";

export default function TopNav() {
  const pathname = usePathname();
  const { t } = useLang();
  const { pageFg } = usePageBg();
  const [copied, setCopied] = useState(false);

  const links: { href: string; labelKey: "nav.work" | "nav.services" | "nav.about" }[] = [
    { href: "/", labelKey: "nav.work" },
    { href: "/services", labelKey: "nav.services" },
    { href: "/about", labelKey: "nav.about" },
  ];

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(STUDIO_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail (permissions, insecure origin) — silently ignore.
    }
  };

  // Shared type class for every nav item — kept short so per-item
  // `justify-self-*` alignment can be composed in. `cursor-pointer` makes
  // the OS cursor a hand; `data-cursor-ring` (added on each item) makes
  // the CustomCursor ring appear.
  const type =
    "pointer-events-auto cursor-pointer text-[26px] font-bold uppercase leading-8 tracking-normal";

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 top-0 z-40"
      // Default treatment is `mix-blend-mode: difference` — auto-inverts
      // labels against whatever content sits behind the fixed nav
      // (canvas tiles, gallery images, page bg). When a route sets an
      // explicit pageFg (see PageBackgroundProvider), we drop the blend
      // and paint labels in that color, so saturated case study bgs like
      // coral can pick a legible tone that low-contrast auto-invert can't.
      style={
        pageFg
          ? { color: pageFg }
          : { mixBlendMode: "difference" }
      }
    >
      {/*
        5-column grid, one nav item per column.

        Alignment strategy:
          - Column 1 (TORTO STUDIO): `justify-self-start` — flush against the
            left `px-8` padding, so it lines up vertically with LISTA/GRELHA
            in the bottom chrome.
          - Column 5 (COPY EMAIL): `justify-self-end` — flush against the
            right `px-8` padding, lining up with PT/EN.
          - Columns 2–4 (WORK / SERVICES / ABOUT): `justify-self-center` — each
            sits at the middle of its 1fr column. Column 3 is exactly the
            viewport's middle column, so SERVICES lands at horizontal center
            regardless of label widths.

        Trade-off: the strictly equal center-to-center spacing between all
        five items can't coexist with edge alignment unless the outer labels
        happen to be the same width. Flushing to the edges makes the outer
        gaps a touch wider than the inner ones — an intentional choice for
        vertical alignment with the bottom chrome.
      */}
      {/* text-white is the default; overridden by `color: pageFg` set on
          the parent nav when a case study specifies an explicit fg. */}
      <div
        className="grid grid-cols-5 items-center px-8 py-5"
        style={{ color: pageFg ?? "#ffffff" }}
      >
        <Link
          href="/"
          className={`${type} justify-self-start`}
          data-cursor-ring
        >
          Torto Studio
        </Link>

        {links.map(({ href, labelKey }) => {
          // WORK is active only on the Work index (/). Case studies live
          // under /work/{slug} but they're their own context — no tab
          // should read as "you are here" from the top nav on a case study.
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`${type} justify-self-center`}
              data-cursor-ring
            >
              {/*
                Underline sits under the text via a bordered inner span so it
                hugs the text width, not the padded parent link. Border color
                is currentColor so blend-difference flips it in sync.

                Always render a 3px border — transparent when inactive,
                `currentColor` when active — so the layout reserves the same
                vertical space on every route. Without this, switching from
                WORK to SERVICES nudged the text by 3px on click.
              */}
              <span
                className={`inline-block pb-1 border-b-[3px] ${
                  active ? "border-current" : "border-transparent"
                }`}
              >
                {t(labelKey)}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onCopy}
          className={`${type} justify-self-end`}
          data-cursor-ring
        >
          {copied ? t("nav.copied") : t("nav.copyEmail")}
        </button>
      </div>
    </nav>
  );
}
