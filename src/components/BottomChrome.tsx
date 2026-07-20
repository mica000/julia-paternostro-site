"use client";

/*
  BottomChrome — bottom-right language toggle
  -------------------------------------------
  Historically also hosted the LIST / GRID / ORBIT / MASONRY view toggle,
  but Masonry is the only public view now so only PT/EN remains. Hidden
  entirely on case study pages, which have their own long-scroll layout.
*/

import { usePathname } from "next/navigation";
import { useLang, usePageBg, type Lang } from "@/lib/state";

export default function BottomChrome() {
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const { pageFg } = usePageBg();

  const isCaseStudy = pathname?.startsWith("/work/") ?? false;
  if (isCaseStudy) return null;

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
        className="flex items-center justify-end px-5 md:px-8 py-3 md:py-5"
        style={{ color: pageFg ?? "#ffffff" }}
      >
        <div className="pointer-events-auto">
          <SegmentedToggle
            options={[
              { value: "pt", label: "PT" },
              { value: "en", label: "EN" },
            ]}
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
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-3 md:gap-6 text-[18px] md:text-[26px] font-bold uppercase leading-6 md:leading-8 tracking-normal">
      {options.map(({ value: v, label }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            data-cursor-ring
            className={`cursor-pointer transition-opacity ${
              active ? "opacity-100" : "opacity-50 hover:opacity-80"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
