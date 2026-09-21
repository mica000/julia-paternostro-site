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

  Mobile (<md): the same three controls as desktop, just tighter — wordmark
  left, language switch + About right (Figma node 463:7432). There is no MENU
  button and no overlay; with only two destinations up here, hiding them
  behind a menu cost a tap and bought nothing.
*/

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConfig, useLang, usePageBg } from "@/lib/state";
import ShowAllIcon, { CHIP_CLASS } from "@/components/ShowAllIcon";
import LangToggle from "@/components/LangToggle";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();
  const { pageFg } = usePageBg();
  const { config, setConfig } = useConfig();

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

  /*
    A case study ends on the All-projects shelf, which carries its own
    "All projects" heading — so as soon as that shelf scrolls up, the label
    was on screen twice: once in the nav chip, once at the top of the shelf.
    The chip steps aside for the real thing.

    It hides from the moment the shelf's top edge enters the viewport and
    stays hidden for everything below (the shelf itself, then the closing
    CTA). Deliberately one-way per scroll position rather than keyed to the
    heading alone: the heading leaves through the top of the screen long
    before the shelf does, and popping the chip back over the middle of the
    list would read as a glitch.
  */
  const [shelfInView, setShelfInView] = useState(false);
  useEffect(() => {
    let raf = 0;
    let tries = 0;
    let shelf: Element | null = null;

    // "Has the shelf reached the screen?" — true from the moment its top edge
    // crosses the bottom of the viewport, and true for everything below it
    // (the shelf itself, then the closing CTA). Being a plain comparison
    // against the live rect rather than remembered state, it is correct at
    // ANY scroll position, including one arrived at by a jump.
    const measure = () => {
      if (!shelf) return;
      setShelfInView(shelf.getBoundingClientRect().top < window.innerHeight);
    };
    // One rect read per frame at most, and only while scrolling.
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    // TopNav lives in the root layout and never remounts, so on a client
    // navigation this effect can run a frame or two before the new route's
    // shelf is in the DOM. Look again for a few frames before giving up.
    const attach = () => {
      shelf = document.querySelector("[data-all-projects-shelf]");
      if (!shelf) {
        if (tries++ < 30) raf = requestAnimationFrame(attach);
        return;
      }
      measure();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    };
    raf = requestAnimationFrame(attach);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      // Clear on the way OUT rather than on the way in: the next route may
      // have no shelf at all (the index, About), and nothing would then be
      // left to report the chip back into view.
      setShelfInView(false);
    };
  }, [pathname]);

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
    router.push("/");
  };

  // The wordmark is the way back to the index — and "the index" means the
  // stage, not the detail list. On another route the href does the work; ON
  // the index a click navigates nowhere, so without this the open Show-all
  // list would just sit there and the wordmark would look broken.
  const goHome = () => {
    // Explicit trip to the index stage — drop any remembered origin so a
    // later close doesn't bounce back to a stale route.
    showAllOriginRef.current = null;
    if (config.parallaxShowAll) setConfig({ ...config, parallaxShowAll: false });
  };

  // ONE type scale for the whole bar — Figma "Body/Regular" (node 122:1145):
  // SF Pro Regular 13 / 16, no tracking. The wordmark, About, the language
  // switch, Copy email, the chip label and the case-study project name are all
  // this size; nothing up here is emphasised over anything else.
  const type =
    "pointer-events-auto cursor-pointer text-[13px] font-normal leading-4 tracking-normal";

  return (
    <nav
      // z-41, one above the cursor's HoverPill (z-40): the nav now renders
      // before the page (for Tab order), so it can't win the tie on DOM order.
      className="pointer-events-none fixed inset-x-0 top-0 z-[41]"
      style={{
        // Case studies push an explicit foreground into the page-bg context;
        // the index and the secondary routes use Figma's near-white.
        color: pageFg ?? "#fbfbfb",
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
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          // Fades rather than vanishing — the chip is glass over moving
          // artwork, and a hard cut reads as a rendering fault. 200ms
          // ease-out, the same curve as the rest of the site's chrome.
          style={{
            opacity: shelfInView ? 0 : 1,
            visibility: shelfInView ? "hidden" : "visible",
            transition:
              "opacity 200ms ease-out, visibility 0ms linear " +
              (shelfInView ? "200ms" : "0ms"),
          }}
          aria-hidden={shelfInView}
        >
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

      {/* ─── Mobile top bar (<md) — wordmark + language switch + About ───
          Figma node 463:7432. Same three controls as desktop, only tighter:
          24px sides (lining the wordmark up with the project names in the
          timeline below) and a 10px gap between the switch and About, versus
          desktop's 56px. */}
      <div className="flex md:hidden items-center justify-between px-6 pt-6 pb-4">
        <Link href="/" className={type} onClick={goHome} data-cursor-ring>
          Julia Paternostro
        </Link>
        <div className="flex items-center gap-[10px]">
          <LangToggle className="pointer-events-auto" />
          <Link href="/about" className={type} data-cursor-ring>
            {t("nav.about")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
