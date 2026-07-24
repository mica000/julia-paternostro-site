/*
  GLASS — the one translucent material on the site.

  Three things wear it: the "Show all" chip in the nav, the same chip floating
  bottom-right on mobile, and the cursor pill that follows the pointer over a
  project. They used to be styled independently and had drifted to opposite
  ends of the range — the chip was a light wash (Figma's Materials/Thin, #F6F6F6
  at 36%, which read almost solid white against the black stage) while the
  cursor pill was black at 30% (which read as a dark hole). Side by side they
  looked like two different components.

  This lands between them: a white tint low enough that the artwork behind
  still shows through, and high enough to lift off black. Because the tint is
  white rather than black, it brightens over a dark stage and stays subtle over
  bright artwork, instead of flipping character depending on what's behind it.

  The saturation lift keeps colour passing through the blur (a plain blur
  greys it), and the drop shadow gives the shape an edge over busy images so
  the label never sits directly on top of a competing highlight.

    fill    white 14%
    border  white 28%, drawn at 0.5px — a drawn line, not a rim
    blur    20px + saturate(1.5)
*/
export const GLASS =
  "rounded-full border-[0.5px] border-white/[0.28] bg-white/[0.14] shadow-[inset_0_0.5px_0_rgba(255,255,255,0.2),0_8px_24px_rgba(0,0,0,0.32)] backdrop-blur-[20px] backdrop-saturate-150";
