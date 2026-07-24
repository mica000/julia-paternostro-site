/*
  ShowAllIcon — the leading glyph inside the "Show all" / "Close" chip.

  Two states, one component, because the chip is rendered twice: by TopNav on
  desktop and by ParallaxIndex as the floating mobile button. Keeping the
  glyph here means the two can't drift apart.

    open = false → layers-behind (the detail list is closed; this opens it)
    open = true  → X            (the list is open; this dismisses it)

  Stroke weight matches the chip's hairline border so the icon reads as part
  of the same thin-line drawing rather than sitting heavier than its frame.
*/

import { GLASS } from "@/lib/glass";

/*
  The chip's own geometry, shared for the same reason as the glyph — it is
  rendered in two places and must not drift.

  Figma node 197:312 "Show all" gives the metrics: radius 100, pl-12 / pr-16 /
  py-12, gap 8, Body/Regular 13/16. The MATERIAL comes from GLASS instead of
  Figma's Materials/Thin — see the note there; the 36% fill in the design read
  as near-solid white next to the cursor pill.
*/
export const CHIP_CLASS = `flex cursor-pointer items-center justify-center gap-2 py-3 pl-3 pr-4 text-[13px] font-normal leading-4 tracking-normal transition-colors duration-200 hover:bg-white/[0.2] ${GLASS}`;

const STROKE = 1.1;

export default function ShowAllIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      {open ? (
        <path
          d="M4 4L12 12M12 4L4 12"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
      ) : (
        <>
          <rect
            x="1.75"
            y="5.75"
            width="8.5"
            height="8.5"
            rx="1.75"
            stroke="currentColor"
            strokeWidth={STROKE}
          />
          <path
            d="M5 5V4a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
