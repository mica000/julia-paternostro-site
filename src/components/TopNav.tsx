"use client";

/*
  TopNav — one navigation, every route
  ------------------------------------
  Layout (Figma node 397:542):

    [ Julia Paternostro ]   [ Show all ]   [ English  About ]

  The wordmark stands alone on the left; the language switch and About sit
  together on the right; the center belongs to the Show-all chip. The email
  is no longer in the nav — it lives in the footer CTA.

  This treatment used to be scoped to the parallax index while every other
  route got a louder 18/26px uppercase bar with a difference blend. The index
  is now the only index, so the parallax spec IS the site nav — case studies
  included. That means one type scale (SF Regular 13/16, mixed case), one
  padding (44 sides / 30 vertical desktop, 44 all round on mobile) and one
  color rule, everywhere.

  Only the CENTER cell changes by route:
    - Index ("/")   → the "Show all" glass chip, toggling the detail list.
    - Case study    → the PROJECT NAME, revealed only once the big page title
                      has scrolled up behind the nav. Before that it's blank
                      so the name doesn't duplicate the on-page title.
    - Anything else → empty. The wordmark already returns the reader home.

  Color: a case study pushes an explicit white into the page-bg context and
  the nav uses it; everywhere else the nav paints Figma's #fbfbfb. The old
  `mix-blend-mode: difference` trick is gone — it inverted the Show-all chip's
  translucent fill into mush, and every surface the nav sits over is dark.

  Mobile (<md): wordmark left, MENU right. MENU opens a full-screen overlay
  with About / Contact plus a PT/EN toggle, so language stays reachable.
*/

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConfig, useLang, usePageBg } from "@/lib/state";
import ShowAllIcon, { CHIP_CLASS } from "@/components/ShowAllIcon";
import LangToggle from "@/components/LangToggle";

const STUDIO_EMAIL = "julia.paternostro@gmail.com";

// Height of the mobile top bar (pt-6/24px + 16px line-height + pb-4/16px), used
// to park the menu overlay directly beneath it. Keep in sync with the index's
// Show-all top padding, which clears the same bar.
const MOBILE_BAR_H = 56;

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();
  const { pageFg, pageBg } = usePageBg();
  const { config, setConfig } = useConfig();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";
  const showAllOpen = config.parallaxShowAll;
  // Where the Show-all list was opened from. When you open it from a case
  // study (or any non-index route) we stash that path here, so closing the
  // list returns you to exactly where you were instead of dropping you on
  // the bare index stage. Opened on the index itself → stays null, and close
  // just toggles back to the stage. A ref (not state) because TopNav lives in
  // the root layout and never remounts across client navigations, so the
  // value survives the push to "/".
  const showAllOriginRef = useRef<string | null>(null);

  // The center "Show all" chip lives on EVERY route (Figma 422:1767). On the
  // index it toggles the detail list in place; from any other route it opens
  // the list and navigates home to it, remembering the origin so the reader
  // can be returned there on close.
  const handleShowAll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isHome) {
      if (config.parallaxShowAll) {
        // Closing — return to the opening route if there was one.
        const origin = showAllOriginRef.current;
        showAllOriginRef.current = null;
        setConfig({ ...config, parallaxShowAll: false });
        if (origin && origin !== "/") router.push(origin);
      } else {
        setConfig({ ...config, parallaxShowAll: true });
      }
      return;
    }
    showAllOriginRef.current = pathname;
    if (!config.parallaxShowAll) setConfig({ ...config, parallaxShowAll: true });
    setMenuOpen(false);
    router.push("/");
  };

  // The wordmark is the way back to the index — and "the index" means the
  // stage, not the detail list. On another route the href does the work; ON
  // the index a click navigates nowhere, so without this the open Show-all
  // list (or the mobile menu) would just sit there and the wordmark would
  // look broken. Closing both here covers every route with one handler.
  const goHome = () => {
    setMenuOpen(false);
    // Explicit trip to the index stage — drop any remembered origin so a
    // later close doesn't bounce back to a stale route.
    showAllOriginRef.current = null;
    if (config.parallaxShowAll) setConfig({ ...config, parallaxShowAll: false });
  };


  // Copy email — writes the studio address to the clipboard and flashes
  // "Copied" for 1.5s, so the click has a visible result without opening a
  // mail client the reader may not use.
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(STUDIO_EMAIL);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — stay silent
      // rather than flashing a success the reader didn't get.
    }
  };

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

  // ONE type scale for the whole bar — Figma "Body/Regular" (node 122:1145):
  // SF Pro Regular 13 / 16, no tracking. The wordmark, About, the language
  // switch, Copy email, the chip label and the case-study project name are all
  // this size; nothing up here is emphasised over anything else.
  const type =
    "pointer-events-auto cursor-pointer text-[13px] font-normal leading-4 tracking-normal";

  return (
    <nav
      className={`pointer-events-none fixed inset-x-0 top-0 ${menuOpen ? "z-50" : "z-40"}`}
      style={{
        // Case studies push an explicit foreground into the page-bg context;
        // the index and the secondary routes use Figma's near-white. The
        // mobile overlay is opaque, so it always gets plain white.
        color: menuOpen ? "#ffffff" : pageFg ?? "#fbfbfb",
      }}
    >
      {/* ─── Desktop layout (md+) ─── */}
      <div className="relative hidden md:flex items-center justify-between px-[44px] py-[30px]">
        {/* Left group — just the wordmark (Figma node 397:542). About moved to
            the right cell; the language switch never lived up here. */}
        <div className="flex items-center gap-[56px]">
          <Link href="/" className={type} onClick={goHome} data-cursor-ring>
            Julia Paternostro
          </Link>
        </div>

        {/* Center — positioned absolutely rather than as a flex/grid cell so
            it is pinned to the middle of the VIEWPORT no matter how wide the
            left and right groups grow. A 3-column grid only centers while
            those two happen to balance; translated labels break that. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* The Show-all chip lives on EVERY route now, case studies
              included (Figma 422:1767). On the index it toggles the detail
              list ("Show all" / "Parallax view"); from any other route it
              opens the list and navigates home to it. The old case-study
              behaviour — revealing the project name here on scroll — is
              gone; the chip takes that slot instead. */}
          <button
            type="button"
            onClick={handleShowAll}
            className={`pointer-events-auto ${CHIP_CLASS}`}
            data-cursor-ring
          >
            <ShowAllIcon open={isHome && showAllOpen} />
            {isHome && showAllOpen
              ? t("parallax.parallaxView")
              : t("parallax.showAll")}
          </button>
        </div>

        {/* Right — the language toggle + About (Figma node 397:542). The switch
            moved up here from the footer so it's reachable on every route; the
            email now lives only in the footer CTA, not the nav. Only these two
            take pointer events. */}
        <div className="flex items-center gap-[56px]">
          <LangToggle className="pointer-events-auto" />
          <Link href="/about" className={type} data-cursor-ring>
            {t("nav.about")}
          </Link>
        </div>
      </div>

      {/* ─── Mobile top bar (<md) — wordmark + MENU button ─── */}
      <div
        // 24px sides/top so the wordmark lines up with the project names in
        // the timeline below and with the Show-all chip bottom-right — one
        // frame for the whole mobile layout.
        className="flex md:hidden items-center justify-between px-6 pt-6 pb-4"
      >
        <Link href="/" className={type} onClick={goHome} data-cursor-ring>
          Julia Paternostro
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
          className="pointer-events-auto md:hidden fixed inset-x-0 bottom-0 z-30 flex flex-col px-6 pt-6 pb-10"
          style={{
            // Sits directly under the mobile bar.
            top: MOBILE_BAR_H,
            backgroundColor: pageBg ?? "#000000",
            color: pageFg ?? "#ffffff",
          }}
        >
          {/* About plus the email — the wordmark in the top bar is already the
              home affordance, and Show-all lives in a floating chip at the
              bottom-right (rendered by ParallaxIndex). */}
          <ul className="flex flex-col gap-4">
            <li>
              <Link
                href="/about"
                className="block text-[32px] font-bold uppercase leading-[1.1] tracking-normal"
              >
                {t("nav.about")}
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={copyEmail}
                className="block text-left text-[32px] font-bold uppercase leading-[1.1] tracking-normal"
              >
                {copied ? t("nav.copied") : t("nav.copyEmail")}
              </button>
            </li>
          </ul>

          {/* Language switch pinned to the bottom of the overlay so it stays
              reachable even when the fixed BottomChrome is off. Same iOS-style
              toggle as the desktop nav. */}
          <div className="mt-auto">
            <LangToggle />
          </div>
        </div>
      )}
    </nav>
  );
}
