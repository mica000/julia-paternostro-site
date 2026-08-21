"use client";

/*
  About — Figma node 432:2557
  ---------------------------
  A three-column editorial layout below the fixed TopNav:

    ┌ bio (2 paragraphs) ┐   ┌            ┐   ┌ "For new projects…" ┐
    │                    │   │  portrait  │   │  Tell me ↗          │
    │ Based in Vila…     │   │  (center)  │   │  Instagram ↗        │
    │ [aerial landscape] │   └            ┘   │  Linkedin ↗         │
    └────────────────────┘                    └─────────────────────┘

  Text is Figma "Title 3/Emphasized" (SF Semibold 15/20); the contact links
  are the shared ArrowLinks (Body/Regular 13, ruled rows + arrow, peer-dim).
  Colors match the case study: black bg, #fbfbfb text. Stacks on mobile.
*/

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useLang } from "@/lib/state";
import ArrowLinks, { type ArrowLink } from "@/components/ArrowLinks";

const STUDIO_EMAIL = "julia.paternostro@gmail.com";
const INSTAGRAM = "https://instagram.com/juliapaternostro";
const LINKEDIN = "https://www.linkedin.com/in/jupaternostro";

export default function AboutPage() {
  const { t } = useLang();

  const links: ArrowLink[] = [
    { label: t("cta.tellProject"), href: `mailto:${STUDIO_EMAIL}`, external: true },
    { label: "Instagram", href: INSTAGRAM, external: true },
    { label: "Linkedin", href: LINKEDIN, external: true },
  ];

  // Body/Regular — SF Regular 13/16 (Figma node 432:2704), the same scale the
  // nav and case studies use.
  const body = "text-[13px] font-normal leading-4 tracking-normal";

  // Cursor-drift parallax on the IMAGES only — the same feel as the index
  // satellites. Each image eases toward a small offset that tracks the pointer,
  // at its OWN depth so the portrait (big, anchored) drifts less than the small
  // aerial. Written straight to the DOM via refs in a rAF loop, so it never
  // re-renders. Disabled for reduced-motion and non-fine pointers (touch).
  const portraitRef = useRef<HTMLDivElement>(null);
  const aerialRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduce || !fine) return;
    const DRIFT = 20; // max px pull at the screen edge
    const targets = [
      { el: portraitRef.current, depth: 0.45 },
      { el: aerialRef.current, depth: 0.9 },
    ].filter((t): t is { el: HTMLDivElement; depth: number } => !!t.el);
    let rx = 0, ry = 0, cx = 0, cy = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      rx = (e.clientX / window.innerWidth - 0.5) * 2;
      ry = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      cx += (rx - cx) * 0.08; // ease toward the pointer (soft, index-like)
      cy += (ry - cy) * 0.08;
      for (const { el, depth } of targets) {
        el.style.transform = `translate3d(${(cx * DRIFT * depth).toFixed(2)}px, ${(cy * DRIFT * depth).toFixed(2)}px, 0)`;
      }
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
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-[120px] md:px-[44px] md:pb-32 md:pt-[156px]">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between md:gap-8">
          {/* LEFT — bio, then the location line + aerial landscape lower down. */}
          <div className="flex flex-col md:w-[29%]">
            <div className={`flex flex-col gap-4 ${body}`}>
              {t("about.body")
                .split("\n\n")
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>

            <div className="mt-12 md:mt-[120px]">
              <p className={body}>{t("about.location")}</p>
              {/* Aerial landscape of Vila Velha (Figma 432:2669) — drifts with
                  the cursor (higher depth → moves more than the portrait). */}
              <div
                ref={aerialRef}
                className="relative mt-4 aspect-[349/208] w-full overflow-hidden will-change-transform"
              >
                <Image
                  src="/Images/about/vila-velha.webp"
                  alt="Aerial view of Vila Velha, Brazil"
                  fill
                  sizes="(max-width: 768px) 100vw, 350px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* CENTER — portrait (reuses the existing about photo). Drifts with
              the cursor at a lower depth so it stays the anchored plane. */}
          <div
            ref={portraitRef}
            className="relative aspect-[550/590] w-full overflow-hidden will-change-transform md:w-[46%] md:shrink-0"
          >
            <Image
              src="/Images/about/me.webp"
              alt="Julia Paternostro"
              fill
              sizes="(max-width: 768px) 100vw, 550px"
              priority
              className="object-cover"
            />
          </div>

          {/* RIGHT — contact intro + links, dropped down to sit beside the
              portrait's midline like the Figma. */}
          <div className="flex flex-col md:w-[19%] md:pt-[120px]">
            <p className={body}>{t("about.contactIntro")}</p>
            <ArrowLinks links={links} className="mt-6" />
          </div>
        </div>
      </div>
    </main>
  );
}
