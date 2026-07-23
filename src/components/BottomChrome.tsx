"use client";

/*
  BottomChrome — bottom-right language toggle
  -------------------------------------------
  Historically also hosted the LIST / GRID / ORBIT / MASONRY view toggle,
  but Masonry is the only public view now so only PT/EN remains. Hidden
  entirely on case study pages, which have their own long-scroll layout.
*/

import { usePathname } from "next/navigation";
import { useConfig, useLang, usePageBg, type Lang } from "@/lib/state";

export default function BottomChrome() {
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const { pageFg } = usePageBg();
  const { config } = useConfig();

  const isCaseStudy = pathname?.startsWith("/work/") ?? false;
  if (isCaseStudy) return null;

  // Parallax mode uses the Figma footer spec: "English · Portuguese",
  // centered, 13px. Every other mode keeps the compact PT/EN toggle at the
  // bottom-right.
  const isParallax = pathname === "/" && config.mode === "parallax";

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
      style={
        pageFg
          ? { color: pageFg }
          : { mixBlendMode: "difference" }
      }
    >
      <div
        className={`flex items-center px-5 md:px-8 py-3 md:py-5 ${
          isParallax ? "justify-center" : "justify-end"
        }`}
        style={{ color: pageFg ?? "#ffffff" }}
      >
        <div className="pointer-events-auto">
          <SegmentedToggle
            compact={isParallax}
            options={
              isParallax
                ? [
                    { value: "en", label: "English" },
                    { value: "pt", label: "Portuguese" },
                  ]
                : [
                    { value: "pt", label: "PT" },
                    { value: "en", label: "EN" },
                  ]
            }
            value={lang}
            onChange={(v) => setLang(v as Lang)}
          />
        </div>
      </div>
    </nav>
  );
}

/*
  SegmentedToggle — labels side by side; active label full opacity,
  inactive dims to 50%. Flat treatment, no pill.
*/
function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** Parallax footer variant — 13px, mixed-case, active semibold. */
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex items-center gap-3 text-[13px] leading-4 tracking-normal"
          : "flex items-center gap-3 md:gap-6 text-[18px] md:text-[26px] font-bold uppercase leading-6 md:leading-8 tracking-normal"
      }
    >
      {options.map(({ value: v, label }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            data-cursor-ring
            className={`cursor-pointer transition-opacity ${
              compact
                ? active
                  ? "opacity-100 font-semibold"
                  : "opacity-40 hover:opacity-70"
                : active
                  ? "opacity-100"
                  : "opacity-50 hover:opacity-80"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
