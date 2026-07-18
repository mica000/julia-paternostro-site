"use client";

/*
  BottomChrome — bottom-left view toggle + bottom-right language toggle
  --------------------------------------------------------------------
  Sits at the bottom edge of the viewport with the same adaptive-contrast
  `mix-blend-mode: difference` treatment as TopNav. Two clusters:

    LIST | GRID           (bottom-left)      PT | EN             (bottom-right)

  View toggle (LIST/GRID):
    - GRID  → CanvasConfig.mode = "grid"  → renders InfiniteCanvas (draggable)
    - LIST  → CanvasConfig.mode = "list"  → renders ScrollGrid (wheel/vertical)
    - Only meaningful on the Work page (`/`); hidden on About/Services so the
      toggle doesn't imply it does something there.

  Language toggle (PT/EN):
    - Always visible so users can switch language from any route.
    - Persisted to localStorage inside LanguageProvider.
*/

import { usePathname } from "next/navigation";
import { useConfig, useLang, usePageBg, type Lang } from "@/lib/state";
import type { Mode } from "@/lib/config";

export default function BottomChrome() {
  const pathname = usePathname();
  const { config, setConfig } = useConfig();
  const { lang, setLang, t } = useLang();
  const { pageFg } = usePageBg();

  const isWork = pathname === "/";

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
      // Same treatment logic as TopNav — see comments there.
      style={
        pageFg
          ? { color: pageFg }
          : { mixBlendMode: "difference" }
      }
    >
      <div
        className="flex items-center justify-between px-5 md:px-8 py-3 md:py-5"
        style={{ color: pageFg ?? "#ffffff" }}
      >
        {/* Bottom-left: view toggle (Work page only) */}
        <div className="pointer-events-auto">
          {isWork ? (
            <SegmentedToggle
              options={[
                { value: "list", label: t("view.list") },
                { value: "grid", label: t("view.grid") },
                { value: "orbit", label: t("view.orbit") },
                { value: "masonry", label: t("view.masonry") },
              ]}
              value={config.mode}
              onChange={(v) => setConfig({ ...config, mode: v as Mode })}
            />
          ) : (
            // Empty placeholder keeps the PT/EN cluster pinned to the right
            // even when the LIST/GRID toggle is hidden.
            <span />
          )}
        </div>

        {/* Bottom-right: language toggle */}
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
  SegmentedToggle
  ---------------
  Two labels side by side. The active label stays fully white; the inactive
  label dims to 50%. No pill background, no chip — matches the Figma flat
  treatment where the only affordance is the opacity change on hover/active.
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
