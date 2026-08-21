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

  // Title 3/Emphasized — SF Semibold 15/20.
  const emph = "text-[15px] font-semibold leading-5 tracking-normal";

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#000000", color: "#ffffff" }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-[120px] md:px-[44px] md:pb-32 md:pt-[156px]">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between md:gap-8">
          {/* LEFT — bio, then the location line + aerial landscape lower down. */}
          <div className="flex flex-col md:w-[29%]">
            <div className={`flex flex-col gap-5 ${emph}`}>
              {t("about.body")
                .split("\n\n")
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>

            <div className="mt-12 md:mt-[120px]">
              <p className={emph}>{t("about.location")}</p>
              {/* Aerial landscape of Vila Velha (Figma 432:2669). */}
              <div className="relative mt-4 aspect-[349/208] w-full overflow-hidden">
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

          {/* CENTER — portrait (reuses the existing about photo). */}
          <div className="relative aspect-[550/590] w-full overflow-hidden md:w-[46%] md:shrink-0">
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
            <p className={emph}>{t("about.contactIntro")}</p>
            <ArrowLinks links={links} className="mt-6" />
          </div>
        </div>
      </div>
    </main>
  );
}
