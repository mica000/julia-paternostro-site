"use client";

/*
  TopNav — adaptive-contrast, three-region navigation
  ---------------------------------------------------
  Layout matches the Figma spec (node 12:235):

    [ WORK ]                [ TORTO STUDIO ]                    [ ABOUT ]

  Three items, evenly spaced in a 3-column grid. WORK links to /,
  TORTO STUDIO is a home affordance (also links to /), ABOUT links to
  /about. The previous SERVICES link and COPY EMAIL button have been
  dropped — /services still exists as a route but is no longer surfaced
  in the nav.

  - Uppercase, wide tracking, SF font (inherited from body).
  - `mix-blend-mode: difference` keeps every element legible over any
    canvas content — white text stays white on dark, flips to the
    complement on colored / light backgrounds. When a case study sets an
    explicit pageFg the blend is dropped in favor of that color.
  - Active link (matched via `usePathname`) shows a single-pixel
    underline. No color or weight change — the underline IS the active
    affordance. TORTO STUDIO deliberately has no underline treatment
    since it's the wordmark, not a section indicator.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang, usePageBg } from "@/lib/state";

export default function TopNav() {
  const pathname = usePathname();
  const { t } = useLang();
  const { pageFg } = usePageBg();

  // Shared type class for every nav item.
  const type =
    "pointer-events-auto cursor-pointer text-[26px] font-bold uppercase leading-8 tracking-normal";

  // WORK is active only on the Work index (/). Case studies live under
  // /work/{slug} but they're their own context — no tab should read as
  // "you are here" from the top nav on a case study.
  const workActive = pathname === "/";
  const aboutActive = pathname.startsWith("/about");

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 top-0 z-40"
      style={pageFg ? { color: pageFg } : { mixBlendMode: "difference" }}
    >
      {/*
        3-column grid, one nav item per column.
          - Column 1 (WORK):         justify-self-start
          - Column 2 (TORTO STUDIO): justify-self-center — exactly the
            viewport's middle column, so the wordmark lands at horizontal
            center regardless of the label widths on either side.
          - Column 3 (ABOUT):        justify-self-end
      */}
      <div
        className="grid grid-cols-3 items-center px-8 py-5"
        style={{ color: pageFg ?? "#ffffff" }}
      >
        <Link
          href="/"
          className={`${type} justify-self-start`}
          data-cursor-ring
        >
          {/*
            Underline reservation same as before — always render 3px so
            the label doesn't jump 3px vertically when switching routes.
          */}
          <span
            className={`inline-block pb-1 border-b-[3px] ${
              workActive ? "border-current" : "border-transparent"
            }`}
          >
            {t("nav.work")}
          </span>
        </Link>

        <Link
          href="/"
          className={`${type} justify-self-center`}
          data-cursor-ring
        >
          Torto Studio
        </Link>

        <Link
          href="/about"
          className={`${type} justify-self-end`}
          data-cursor-ring
        >
          <span
            className={`inline-block pb-1 border-b-[3px] ${
              aboutActive ? "border-current" : "border-transparent"
            }`}
          >
            {t("nav.about")}
          </span>
        </Link>
      </div>
    </nav>
  );
}
