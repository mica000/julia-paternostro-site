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
import { useConfig, useLang, usePageBg, type Lang } from "@/lib/state";
import { getProject } from "@/lib/projects";

export default function TopNav() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLang();
  const { pageFg, pageBg } = usePageBg();
  const { config, setConfig } = useConfig();
  const [menuOpen, setMenuOpen] = useState(false);

  // Center-nav has three jobs depending on route:
  //   - Home ("/")   → a MODE TOGGLE flipping between the masonry "grid"
  //                    view and the split-screen "list" (index2) view.
  //                    Label reads GRID in list mode, LIST otherwise.
  //   - Case study   → the PROJECT NAME, revealed only once the big page
  //                    title has scrolled up behind the nav (see the reveal
  //                    effect below). Before that it's blank so the name
  //                    doesn't duplicate the on-page title.
  //   - Anything else → empty. The old "WORK" link was removed; the
  //                    wordmark already returns the reader home.
  const isHome = pathname === "/";
  const inListMode = config.mode === "index2";
  const centerLabel = inListMode ? "GRID" : "LIST"; // only used on Home
  const onCenterClick = (e: React.MouseEvent) => {
    if (!isHome) return; // let the <Link> navigate normally
    e.preventDefault();
    setConfig({ ...config, mode: inListMode ? "masonry" : "index2" });
  };

  // Parallax mode uses the Figma "parallax frame" nav spec: 17px, mixed-case,
  // with "Show all" as the center item (toggles the detail list) and an
  // "About · Contact" pair on the right. Only affects Home in parallax mode;
  // every other mode/route keeps the existing chrome untouched.
  const isParallax = isHome && config.mode === "parallax";
  const showAllOpen = config.parallaxShowAll;
  const toggleShowAll = (e: React.MouseEvent) => {
    e.preventDefault();
    setConfig({ ...config, parallaxShowAll: !config.parallaxShowAll });
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
  const REVEAL_AT = 72; // px — approx. fixed-nav height (py-5 + line-height)
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

  // Shared type class for every nav item. In parallax mode it's the Figma
  // 17px mixed-case treatment; otherwise the standard 18/26px uppercase.
  const type = isParallax
    ? "pointer-events-auto cursor-pointer text-[17px] font-bold leading-[22px] tracking-normal"
    : "pointer-events-auto cursor-pointer text-[18px] md:text-[26px] font-bold uppercase leading-[22px] md:leading-8 tracking-normal";

  // ABOUT underlines only on the /about route. The center toggle is a plain
  // action (GRID/LIST) with no active state, and case studies get no active
  // tab either — they're their own context, reached from the grid.
  const aboutActive = pathname.startsWith("/about");

  return (
    <nav
      className={`pointer-events-none fixed inset-x-0 top-0 ${menuOpen ? "z-50" : "z-40"}`}
      // Cash App-style adaptive contrast: `mix-blend-mode: difference`
      // on white labels means the browser subtracts the layer below from
      // white and paints the result — over a black bg you get white,
      // over white you get black, and over any colored image you get
      // the exact chromatic inverse. Labels stay legible over ANY
      // content that scrolls beneath the fixed nav without us picking
      // per-route colors.
      //
      // Exception: while the mobile menu overlay is open, drop the
      // blend so labels sit as clean solid white on the overlay bg
      // (the overlay itself is opaque, so blend would produce an
      // unwanted inversion against it).
      style={
        menuOpen
          ? { color: "#ffffff" }
          : { color: "#ffffff", mixBlendMode: "difference" }
      }
    >
      {/* ─── Desktop layout (md+) — 3-column grid ───
          Per Figma (node 12:236): wordmark LEFT, WORK CENTER,
          ABOUT RIGHT. WORK sitting dead-center gives the nav its
          balance point — it's the primary destination. */}
      <div
        className="hidden md:grid grid-cols-3 items-center px-8 py-5"
      >
        <Link
          href="/"
          className={`${type} justify-self-start`}
          data-cursor-ring
        >
          Julia Paternostro
        </Link>

        {/* Center cell — always rendered (even when empty) so the 3-col
            grid keeps ABOUT pinned to the right. Contents depend on route:
            Home = mode toggle, case study = scroll-revealed project name. */}
        <div className="justify-self-center">
          {isParallax ? (
            // Parallax: center item toggles the detail list — labelled
            // "Menu" when closed and "Close" when open. No underline; the
            // label change alone signals the state.
            <button
              type="button"
              onClick={toggleShowAll}
              className={type}
              data-cursor-ring
            >
              {showAllOpen ? t("parallax.close") : t("parallax.menu")}
            </button>
          ) : isHome ? (
            // Center toggle — a plain ACTION, no active/underline state.
            // The label always names the view you'll switch TO: in list
            // (index2) view it reads GRID, in grid (masonry) view it reads
            // LIST. So it never indicates "you are here" — it's a button.
            <Link
              href="/"
              onClick={onCenterClick}
              className={type}
              data-cursor-ring
            >
              {centerLabel}
            </Link>
          ) : project ? (
            <span
              className={type}
              aria-hidden={!nameRevealed}
              style={{
                display: "inline-block",
                // Fade + slight rise-in, echoing the case study's own reveal
                // language. Non-interactive — it's a label, not a link.
                opacity: nameRevealed ? 1 : 0,
                transform: nameRevealed
                  ? "translateY(0)"
                  : "translateY(6px)",
                transition:
                  "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1), transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
                pointerEvents: "none",
              }}
            >
              {project.title}
            </span>
          ) : null}
        </div>

        <div className="justify-self-end flex items-center gap-4 md:gap-5">
          <Link href="/about" className={type} data-cursor-ring>
            <span
              className={`inline-block pb-1 border-b-[3px] ${
                aboutActive ? "border-current" : "border-transparent"
              }`}
            >
              {t("nav.about")}
            </span>
          </Link>
          {/* Contact — parallax spec only. No dedicated route yet, so it
              points at /about (where contact info will live). */}
          {isParallax && (
            <Link href="/about" className={type} data-cursor-ring>
              <span className="inline-block pb-1 border-b-[3px] border-transparent">
                {t("nav.contact")}
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* ─── Mobile top bar (<md) — wordmark + MENU button ─── */}
      <div
        className="flex md:hidden items-center justify-between px-5 py-4"
      >
        <Link href="/" className={type} data-cursor-ring>
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
          className="pointer-events-auto md:hidden fixed inset-x-0 top-[54px] bottom-0 z-30 flex flex-col px-5 pt-6 pb-10"
          style={{
            backgroundColor: pageBg ?? "#000000",
            color: pageFg ?? "#ffffff",
          }}
        >
          {/* Stacked links — only the 2 real destinations, since TORTO
              STUDIO already sits in the top bar as the home affordance. */}
          <ul className="flex flex-col gap-4">
            {/* Center toggle only appears on Home (GRID/LIST). On case
                studies and other routes the old WORK link is gone — the
                wordmark up top returns the reader home. */}
            {isHome && (
              <li>
                {isParallax ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      toggleShowAll(e);
                      setMenuOpen(false);
                    }}
                    className="block text-[32px] font-bold uppercase leading-[1.1] tracking-normal"
                  >
                    {showAllOpen ? t("parallax.close") : t("parallax.menu")}
                  </button>
                ) : (
                  <Link
                    href="/"
                    onClick={onCenterClick}
                    className="block text-[32px] font-bold uppercase leading-[1.1] tracking-normal"
                  >
                    {centerLabel}
                  </Link>
                )}
              </li>
            )}
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
            {isParallax && (
              <li>
                <Link
                  href="/about"
                  className="block text-[32px] font-bold uppercase leading-[1.1] tracking-normal"
                >
                  {t("nav.contact")}
                </Link>
              </li>
            )}
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
