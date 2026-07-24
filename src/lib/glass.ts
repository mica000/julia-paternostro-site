/*
  GLASS — the one translucent material on the site.

  Three things wear it: the "Show all" chip in the nav, the same chip floating
  bottom-right on mobile, and the cursor pill that follows the pointer over a
  project. They used to be styled independently and had drifted to opposite
  ends of the range — the chip was a light wash (Figma's Materials/Thin, #F6F6F6
  at 36%, which read almost solid white against the black stage) while the
  cursor pill was black at 30% (which read as a dark hole). Side by side they
  looked like two different components.

  It has to do two jobs at once, and doing only one of them is how the earlier
  attempts failed. A single flat white tint was bright enough to look like
  glass but too pale for white type. A single flat black tint held the type but
  went dead — a grey plate, no glass left in it.

  So the fill is LAYERED, the way real glass behaves:

    1. a dark base (black 20%) that carries the contrast for white type;
    2. a sheen over it — a top-down white gradient, a little stronger at the
       top and gone by the bottom. This is the part that reads as glass: light
       catches the upper curve of a physical lens and falls away;
    3. a white border at 0.5px describing the shape — it does the real work on
       the near-black stage, where a dark fill alone would be invisible.

  There WAS a fourth layer: a hairline white highlight inset along the top
  edge, the trick that gives a surface thickness. At this size it didn't read
  as thickness, it read as a glow sitting on top of the pill — a bright line
  drawing attention to itself. It's gone, and the sheen's top stop came down
  with it, from 16% to 7%. The gradient alone carries the light now, which is
  softer because it falls off over the whole height instead of concentrating
  in one pixel.

  Under all of it, a 24px backdrop blur with a saturation lift. The lift
  matters: a plain blur greys whatever is behind it, and the artwork on this
  site is the whole point.

    base      black 20%
    sheen     white 7% → 2%, top to bottom
    border    white 22% at 0.5px
    blur      24px + saturate(1.8)
*/
export const GLASS = [
  "rounded-full",
  "border-[0.5px] border-white/[0.22]",
  // background-color (base) and background-image (sheen) are separate
  // properties, so these two coexist rather than overwrite each other.
  "bg-black/[0.20]",
  "bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.035)_48%,rgba(255,255,255,0.02)_100%)]",
  // Drop shadow only — no inset highlight. See the note above.
  "shadow-[0_8px_24px_rgba(0,0,0,0.34)]",
  "backdrop-blur-[24px] backdrop-saturate-[1.8]",
].join(" ");

/*
  PILL — GLASS plus the shape it's poured into.

  The material was shared but the METRICS weren't, so the two pills drifted
  again: the chip sat at 40px tall and the cursor pill at 32, which is exactly
  the kind of difference you notice when they overlap on screen. Both now
  import this, so there is no second place to change a padding value.

  Figma node 197:312 sets the geometry: radius 100, py 12, pl 12, gap 8. The
  right padding is 20 rather than Figma's 16 — a leading icon carries its own
  visual margin, so equal numbers read tighter on the right than on the left.

  16px icon, 13/16 label, 12px above and below → 40px tall.
*/
export const PILL = `flex items-center gap-2 py-3 pl-3 pr-5 text-[13px] leading-4 tracking-normal ${GLASS}`;
