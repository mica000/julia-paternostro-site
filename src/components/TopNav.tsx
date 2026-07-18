"use client";

/*
  TopNav — adaptive-contrast, three-region navigation
  ---------------------------------------------------
  Desktop layout:

    [ TORTO STUDIO ]        [ WORK · SERVICES · ABOUT ]        [ COPY EMAIL ]

  Mobile (<md): logo on the left, MENU button on the right. Tapping MENU
  opens a full-screen overlay with the links stacked, plus COPY EMAIL and
  the language toggle so nothing on the desktop nav is unreachable.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang, usePageBg } from "@/lib/state";

// TODO: replace with the real studio email once available.
const STUDIO_EMAIL = "hello@torto.studio";

export default function TopNav() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLang();
  const { pageFg, pageBg } = usePageBg();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close the mobile menu on route change so the reader lands cleanly on
  // the next page instead of behind the overlay.
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

  // Shared type class for every nav item. Type scales down on mobile so the
  // logo + MENU button both fit at 390px without wrapping. `cursor-pointer`
  // makes the OS cursor a hand; `data-cursor-ring` (added on each item)
  // makes the CustomCursor ring appear.
  const type =
    "pointer-events-auto cursor-pointer text-[18px] md:text-[26px] font-bold uppercase leading-[22px] md:leading-8 tracking-normal";

  return (
    <nav
      className={`pointer-events-none fixed inset-x-0 top-0 ${menuOpen ? "z-50" : "z-40"}`}
      // Default treatment is `mix-blend-mode: difference` — auto-inverts
      // labels against whatever content sits behind the fixed nav.
      // When a route sets an explicit pageFg, we paint labels in that
      // color instead. While the mobile menu overlay is open we also drop
      // the blend so the labels sit cleanly on the solid overlay.
      style={
        pageFg || menuOpen
          ? { color: pageFg ?? "#ffffff" }
          : { mixBlendMode: "difference" }
      }
    >
      {/* ─── Desktop layout (md+) ─── */}
      <div
        className="hidden md:grid grid-cols-5 items-center px-8 py-5"
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
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`${type} justify-self-center`}
              data-cursor-ring
            >
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

      {/* ─── Mobile layout (<md) ─── */}
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
          style={{ backgroundColor: pageBg ?? "#000000", color: pageFg ?? "#ffffff" }}
        >
          <ul className="flex flex-col gap-4">
            {links.map(({ href, labelKey }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="block text-[32px] font-bold uppercase leading-[1.1] tracking-normal"
                  >
                    <span
                      className={`inline-block pb-1 border-b-[3px] ${
                        active ? "border-current" : "border-transparent"
                      }`}
                    >
                      {t(labelKey)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto flex flex-col gap-6">
            <button
              type="button"
              onClick={onCopy}
              className="text-left text-[18px] font-bold uppercase tracking-normal"
            >
              {copied ? t("nav.copied") : t("nav.copyEmail")}
            </button>
            <div className="flex items-center gap-6 text-[18px] font-bold uppercase tracking-normal">
              <button
                type="button"
                onClick={() => setLang("pt")}
                className={lang === "pt" ? "opacity-100" : "opacity-50"}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={lang === "en" ? "opacity-100" : "opacity-50"}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
