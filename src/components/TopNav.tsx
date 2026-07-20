"use client";

/*
  TopNav — adaptive-contrast, three-region navigation
  ---------------------------------------------------
  Layout matches the Figma spec (node 12:235):

    [ WORK ]                [ TORTO STUDIO ]                    [ ABOUT ]

  Three items only. WORK links to /, TORTO STUDIO is the wordmark (also
  links to /), ABOUT links to /about. The previous SERVICES link and
  COPY EMAIL button have been dropped — /services still exists as a
  route but is no longer surfaced.

  Desktop (md+): 3-column grid with WORK left, TORTO STUDIO centered,
  ABOUT right.

  Mobile (<md): wordmark on the left, MENU button on the right. Tapping
  MENU opens a full-screen overlay that stacks the same 3 items plus a
  PT/EN toggle so language switching is reachable even when the bottom
  chrome is scrolled out of view.

  - Uppercase, wide tracking, SF font (inherited from body).
  - `mix-blend-mode: difference` keeps every element legible over any
    canvas content — white text stays white on dark, flips to the
    complement on colored / light backgrounds. When a case study sets an
    explicit pageFg (site-wide dark palette), the blend is dropped in
    favor of that color.
  - Active link (matched via `usePathname`) shows a single-pixel
    underline. TORTO STUDIO deliberately has no underline treatment —
    it's the wordmark, not a section indicator.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang, usePageBg, type Lang } from "@/lib/state";

export default function TopNav() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLang();
  const { pageFg, pageBg } = usePageBg();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on route change so the reader lands on the next
  // page instead of behind an overlay.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // Shared type class for every nav item. Type scales down on mobile so
  // the logo + MENU button both fit at 390px without wrapping.
  const type =
    "pointer-events-auto cursor-pointer text-[18px] md:text-[26px] font-bold uppercase leading-[22px] md:leading-8 tracking-normal";

  // WORK is active only on the Work index (/). Case studies live under
  // /work/{slug} but they're their own context — no tab should read as
  // "you are here" from the top nav on a case study.
  const workActive = pathname === "/";
  const aboutActive = pathname.startsWith("/about");

  return (
    <nav
      className={`pointer-events-none fixed inset-x-0 top-0 ${menuOpen ? "z-50" : "z-40"}`}
      // Default treatment is `mix-blend-mode: difference` (auto-inverts
      // labels against the content behind the fixed nav). When a route
      // sets an explicit pageFg we paint labels in that color instead.
      // While the mobile overlay is open we also drop the blend so labels
      // sit cleanly on the solid overlay bg.
      style={
        pageFg || menuOpen
          ? { color: pageFg ?? "#ffffff" }
          : { mixBlendMode: "difference" }
      }
    >
      {/* ─── Desktop layout (md+) — 3-column grid ─── */}
      <div
        className="hidden md:grid grid-cols-3 items-center px-8 py-5"
        style={{ color: pageFg ?? "#ffffff" }}
      >
        <Link
          href="/"
          className={`${type} justify-self-start`}
          data-cursor-ring
        >
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

      {/* ─── Mobile top bar (<md) — wordmark + MENU button ─── */}
      <div
        className="flex md:hidden items-center justify-between px-5 py-4"
        style={{ color: pageFg ?? "#ffffff" }}
      >
        <Link href="/" className={type} data-cursor-ring>
          Torto Studio
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={type}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? "CLOSE" : "MENU"}
        </button>
      </div>

      {/* ─── Mobile menu overlay ─── */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="pointer-events-auto md:hidden fixed inset-x-0 top-[54px] bottom-0 z-30 flex flex-col px-5 pt-6 pb-10"
          style={{
            backgroundColor: pageBg ?? "#000000",
            color: pageFg ?? "#ffffff",
          }}
        >
          {/* Stacked links — only the 2 real destinations, since TORTO
              STUDIO already sits in the top bar as the home affordance. */}
          <ul className="flex flex-col gap-4">
            <li>
              <Link
                href="/"
                className="block text-[32px] font-bold uppercase leading-[1.1] tracking-normal"
              >
                <span
                  className={`inline-block pb-1 border-b-[3px] ${
                    workActive ? "border-current" : "border-transparent"
                  }`}
                >
                  {t("nav.work")}
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="block text-[32px] font-bold uppercase leading-[1.1] tracking-normal"
              >
                <span
                  className={`inline-block pb-1 border-b-[3px] ${
                    aboutActive ? "border-current" : "border-transparent"
                  }`}
                >
                  {t("nav.about")}
                </span>
              </Link>
            </li>
          </ul>

          {/* PT/EN pinned to the bottom of the overlay so language switch
              stays reachable even when the fixed BottomChrome is off. */}
          <div className="mt-auto flex items-center gap-6 text-[18px] font-bold uppercase tracking-normal">
            {(["pt", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l as Lang)}
                className={lang === l ? "opacity-100" : "opacity-50"}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
