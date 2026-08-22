"use client";

/*
  About — Figma node 458:6351
  ---------------------------
  A two-column editorial layout, centered under the fixed TopNav:

    ┌ bio (3 blocks) ┐        ┌            ┐
    │                │        │            │
    │ Based in Vila… │        │  portrait  │
    │                │        │   (4:5)    │
    │ Tell me      ↗ │        │            │
    │ Instagram    ↗ │        └            ┘
    │ Linkedin     ↗ │
    └────────────────┘

  Left: the bio (Body/Regular 13/16, node 459:6392) — the location sign-off is
  now the bio's last block — then the shared ArrowLinks (mail draft + socials).
  Right: a single portrait. The portrait drifts with the cursor (the same feel
  as the index satellites), text stays put. Black bg, #fbfbfb text; stacks on
  mobile.
*/

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useLang } from "@/lib/state";
import ArrowLinks, { type ArrowLink } from "@/components/ArrowLinks";

const STUDIO_EMAIL = "julia.paternostro@gmail.com";
const INSTAGRAM = "https://instagram.com/juliapaternostro";
const LINKEDIN = "https://www.linkedin.com/in/jupaternostro";
// Bare profile URL — the link Julia shared carried Behance's own
// `tracking_source` / `isProfilePanel` search params, which describe the panel
// she copied it from and mean nothing to a visitor arriving from here.
const BEHANCE = "https://www.behance.net/juliapaternostro";

export default function AboutPage() {
  const { t } = useLang();

  const links: ArrowLink[] = [
    { label: t("cta.tellProject"), href: `mailto:${STUDIO_EMAIL}`, external: true },
    { label: "Instagram", href: INSTAGRAM, external: true },
    { label: "Linkedin", href: LINKEDIN, external: true },
    { label: "Behance", href: BEHANCE, external: true },
  ];

  // Body/Regular — SF Regular 13/16 (Figma node 459:6392).
  const body = "text-[13px] font-normal leading-4 tracking-normal";

  // Cursor-drift parallax on the portrait — the same soft ease as the index
  // satellites. Written straight to the DOM via a ref in a rAF loop (no
  // re-render). Disabled for reduced-motion and non-fine pointers (touch).
  const portraitRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const el = portraitRef.current;
    if (reduce || !fine || !el) return;
    const DRIFT = 20; // max px pull at the screen edge
    let rx = 0, ry = 0, cx = 0, cy = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      rx = (e.clientX / window.innerWidth - 0.5) * 2;
      ry = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      cx += (rx - cx) * 0.08; // ease toward the pointer
      cy += (ry - cy) * 0.08;
      el.style.transform = `translate3d(${(cx * DRIFT).toFixed(2)}px, ${(cy * DRIFT).toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#000000", color: "#ffffff" }}
    >
      <div className="mx-auto w-full max-w-[928px] px-6 pb-24 pt-[120px] md:px-[44px] md:pb-32 md:pt-[180px]">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between md:gap-8">
          {/* LEFT — bio (its last block is the location) + contact links. */}
          <div className="flex flex-col md:w-[291px] md:shrink-0">
            <div className={`flex flex-col gap-4 ${body}`}>
              {t("about.body")
                .split("\n\n")
                .map((block, i) => (
                  <p key={i}>
                    {block.split("\n").map((line, j, lines) => (
                      <span key={j}>
                        {line}
                        {j < lines.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                ))}
            </div>
            <ArrowLinks links={links} className="mt-12" />
          </div>

          {/* RIGHT — portrait (4:5), drifts with the cursor. */}
          <div
            ref={portraitRef}
            className="relative aspect-[380/475] w-full overflow-hidden will-change-transform md:w-[380px] md:shrink-0"
          >
            <Image
              src="/Images/about/me.webp"
              alt="Julia Paternostro"
              fill
              sizes="(max-width: 768px) 100vw, 380px"
              priority
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
