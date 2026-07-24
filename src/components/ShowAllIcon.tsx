/*
  ShowAllIcon — the leading glyph inside the "Show all" / "Close" chip.

  Two states, one component, because the chip is rendered twice: by TopNav on
  desktop and by ParallaxIndex as the floating mobile button. Keeping the
  glyph here means the two can't drift apart.

    open = false → the bar-over-panel mark from public/Images/next.svg
                   (the detail list is closed; this opens it)
    open = true  → X (the list is open; this dismisses it)

  The two states are drawn differently on purpose: the closed mark is FILLED,
  straight from the source SVG, while the X stays a hairline stroke matched to
  the chip's border. Giving the X a filled treatment would mean redrawing it,
  and a thin X reads correctly as "dismiss" beside a solid mark.
*/

import { PILL } from "@/lib/glass";

/*
  The chip IS the shared pill (see lib/glass) — same material, same metrics as
  the cursor pill, so the two can't drift apart in size the way they did. All
  this adds is what's specific to a control: a pointer, a hover state, and the
  regular weight (the cursor pill's single line is bold).
*/
export const CHIP_CLASS = `cursor-pointer justify-center font-normal transition-colors duration-200 hover:bg-black/[0.36] ${PILL}`;

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
          {/* Straight from public/Images/next.svg — a filled bar over a filled
              panel. `fill` is currentColor rather than the source file's hard
              white so the glyph follows the chip's ink. */}
          <path
            d="M3.33398 2C2.96579 2 2.66732 2.29848 2.66732 2.66667C2.66732 3.03486 2.96579 3.33333 3.33398 3.33333H12.6673C13.0355 3.33333 13.334 3.03486 13.334 2.66667C13.334 2.29848 13.0355 2 12.6673 2H3.33398Z"
            fill="currentColor"
          />
          <path
            d="M2.00065 4.66667C1.63246 4.66667 1.33398 4.96514 1.33398 5.33333V12.6667C1.33398 13.0349 1.63246 13.3333 2.00065 13.3333H14.0007C14.3688 13.3333 14.6673 13.0349 14.6673 12.6667V5.33333C14.6673 4.96514 14.3688 4.66667 14.0007 4.66667H2.00065Z"
            fill="currentColor"
          />
        </>
      )}
    </svg>
  );
}
