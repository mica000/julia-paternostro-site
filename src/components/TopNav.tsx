"use client";

/*
  TopNav — one navigation, every route
  ------------------------------------
  Layout (Figma node 122:1145):

    [ Julia Paternostro  About  English ]   [ center ]   [ Copy email ]

  Everything the reader can act on now sits in ONE group on the left — the
  wordmark, About, and the language switch — with Copy email alone on the
  right. The center belongs to the Show-all chip.

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
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useConfig, useLang, usePageBg, type Lang } from "@/lib/state";
import { getProject } from "@/lib/projects";
import ShowAllIcon, { CHIP_CLASS } from "@/components/ShowAllIcon";

// TODO: replace with the real studio email once available.
const STUDIO_EMAIL = "hello@torto.studio";

// Height of the mobile top bar (pt-[44px] + 16px line-height + pb-4), used to
// park the menu overlay directly beneath it. Keep in sync with the index's
// Show-all top padding, which clears the same bar.
const MOBILE_BAR_H = 76;

export default function TopNav() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLang();
  const { pageFg, pageBg } = usePageBg();
  const { config, setConfig } = useConfig();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";
  const showAllOpen = config.parallaxShowAll;
  const toggleShowAll = (e: React.MouseEvent) => {
    e.preventDefault();
    setConfig({ ...config, parallaxShowAll: !config.parallaxShowAll });
  };

  // The wordmark is the way back to the index — and "the index" means the
  // stage, not the detail list. On another route the href does the work; ON
  // the index a click navigates nowhere, so without this the open Show-all
  // list (or the mobile menu) would just sit there and the wordmark would
  // look broken. Closing both here covers every route with one handler.
  const goHome = () => {
    setMenuOpen(false);
    if (config.parallaxShowAll) setConfig({ ...config, parallaxShowAll: false });
  };

  // Which case study are we on? Slug is the 2nd path segment of /work/[slug].
  const caseStudySlug = pathname.startsWith("/work/")
    ? pathname.split("/")[2] ?? null
    : null;
  const project = caseStudySlug ? getProject(caseStudySlug) : null;

  // Reveal the project name in the nav center once the case study's <h1>
  // title has scrolled up behind the fixed nav. A scroll listener
  // re-measures the title's bottom edge; when it passes the nav band we flip
  // `nameRevealed`, which drives the fade/slide-in. Scrolling back to the top
  // hides it again, so the name never shows while the on-page title is still
  // in its opening position. The check reads a single getBoundingClientRect
  // and setState no-ops when the boolean is unchanged, so running it on every
  // scroll event is cheap — same pattern as the gallery Frame reveal.
  const REVEAL_AT = 76; // px — fixed-nav height (30 + 16 + 30)
  const [nameRevealed, setNameRevealed] = useState(false);
  useEffect(() => {
    // Off a case study there's no title to track and the name span isn't
    // rendered, so we skip wiring listeners. Returning to a case study
    // re-runs this effect and check() recomputes from scratch.
    if (!caseStudySlug) return;
    const check = () => {
      const h1 = document.querySelector("main h1");
      if (!h1) {
        setNameRevealed(false);
        return;
      }
      setNameRevealed(h1.getBoundingClientRect().bottom <= REVEAL_AT);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [caseStudySlug]);

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
        {/* Left group — Figma's 56px gap. The wordmark, About and the language
            switch travel together; nothing else lives on this side. */}
        <div className="flex items-center gap-[56px]">
          <Link href="/" className={type} onClick={goHome} data-cursor-ring>
            Julia Paternostro
          </Link>
          <Link href="/about" className={type} data-cursor-ring>
            {t("nav.about")}
          </Link>
          {/* Language reads as the CURRENT language and swaps on click — a
              single word rather than a PT | EN pair, matching the design. */}
          <button
            type="button"
            onClick={() => setLang((lang === "en" ? "pt" : "en") as Lang)}
            className={type}
            data-cursor-ring
          >
            {lang === "en" ? "English" : "Português"}
          </button>
        </div>

        {/* Center — positioned absolutely rather than as a flex/grid cell so
            it is pinned to the middle of the VIEWPORT no matter how wide the
            left and right groups grow. A 3-column grid only centers while
            those two happen to balance; translated labels break that. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {isHome ? (
            // Index: a chip (Figma node 197:312) that toggles the detail
            // list — "Show all" when closed, "Close" when open.
            <button
              type="button"
              onClick={toggleShowAll}
              className={`pointer-events-auto ${CHIP_CLASS}`}
              data-cursor-ring
            >
              <ShowAllIcon open={showAllOpen} />
              {showAllOpen ? t("parallax.close") : t("parallax.showAll")}
            </button>
          ) : project ? (
            <span
              className={type}
              aria-hidden={!nameRevealed}
              style={{
                display: "inline-block",
                // Fade + slight rise-in, echoing the case study's own reveal
                // language. Non-interactive — it's a label, not a link.
                opacity: nameRevealed ? 1 : 0,
                transform: nameRevealed ? "translateY(0)" : "translateY(6px)",
                transition:
                  "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1), transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
                pointerEvents: "none",
              }}
            >
              {project.title}
            </span>
          ) : null}
        </div>

        {/* Right — Copy email, alone. No underline rule anywhere on the bar:
            the Figma spec has no active state up here, and the wordmark is
            the only "you are here" cue. */}
        <button type="button" onClick={copyEmail} className={type} data-cursor-ring>
          {copied ? t("nav.copied") : t("nav.copyEmail")}
        </button>
      </div>

      {/* ─── Mobile top bar (<md) — wordmark + MENU button ─── */}
      <div
        // 44px on every side so the wordmark lines up with the project names
        // in the timeline below and with the Show-all chip bottom-right —
        // one frame for the whole mobile layout.
        className="flex md:hidden items-center justify-between px-[44px] pt-[44px] pb-4"
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
          className="pointer-events-auto md:hidden fixed inset-x-0 bottom-0 z-30 flex flex-col px-[44px] pt-6 pb-10"
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
