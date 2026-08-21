"use client";

/*
  About — Figma node 406:1209
  ---------------------------
  A centered block below the fixed TopNav: a 4:5 portrait on the left, and a
  bold bio + contact list (E-mail / Instagram / Linkedin) on the right. The
  block is capped at ~1164px (image 500 + 64 gap + text 600) and centered, so
  it sits inset on wide screens like the design. Stacks on mobile.

  Copy: the bio is Julia's real one (via the language context, EN/PT). The
  Figma's placeholder bio (another designer's) is intentionally NOT used.
*/

import Image from "next/image";
import { useLang } from "@/lib/state";

// Contact rows (Figma). Values link out where it makes sense.
const CONTACTS: { label: string; value: string; href: string; external?: boolean }[] = [
  {
    label: "E-mail",
    value: "julia.paternostro@gmail.com",
    href: "mailto:julia.paternostro@gmail.com",
  },
  {
    label: "Instagram",
    value: "@juliapaternostro",
    href: "https://instagram.com/juliapaternostro",
    external: true,
  },
  {
    label: "Linkedin",
    value: "@jupaternostro",
    href: "https://www.linkedin.com/in/jupaternostro",
    external: true,
  },
];

export default function AboutPage() {
  const { t } = useLang();
  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#000000", color: "#ffffff" }}
    >
      {/* Centered content block — image + gap + text, capped at 1164px so it
          reads inset on large screens (Figma left/right margins). */}
      <div className="mx-auto flex max-w-[1164px] flex-col gap-10 px-6 pb-24 pt-[120px] md:flex-row md:items-start md:gap-16 md:px-[44px] md:pb-32 md:pt-[156px]">
        {/* Portrait — 4:5, capped at 500px wide (Figma 500×625). */}
        <div className="relative aspect-[500/625] w-full max-w-[500px] shrink-0 overflow-hidden md:w-[500px]">
          <Image
            src="/Images/about/me.webp"
            alt="Julia Paternostro"
            fill
            sizes="(max-width: 768px) 100vw, 500px"
            priority
            className="object-cover"
          />
        </div>

        {/* Text column — bio (bold, one <p> per paragraph) then contacts. */}
        <div className="flex w-full flex-col md:max-w-[600px]">
          <div className="flex flex-col gap-5 text-[18px] font-bold leading-snug tracking-normal md:text-[22px] md:leading-[1.3]">
            {t("about.body")
              .split("\n\n")
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>

          <ul className="mt-10 flex flex-col gap-3 md:mt-[62px]">
            {CONTACTS.map((c) => (
              <li
                key={c.label}
                className="flex items-center gap-3 text-[13px] leading-4"
              >
                <span className="w-[84px] shrink-0 opacity-50">{c.label}</span>
                <a
                  href={c.href}
                  {...(c.external
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                  data-cursor-ring
                  className="uline"
                >
                  {c.value}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
