/*
  Shared tap-vs-drag detection for tile canvases
  ----------------------------------------------
  All three canvases (grid / list / orbit) let the user drag or scroll, and
  every tile is a potential navigation link. We can't just use <button> or
  <a> because those would intercept the pan gesture on the first pixel.

  Instead each canvas tracks pointer down/up itself and calls
  `isTap()` to decide whether the interaction was a click. If so it calls
  `pickTileTarget()` — a helper that walks up from the released element to
  find the nearest `.tile-hover`, and extracts the target's rect + slug +
  bg color from data-* attributes. Any tile that expects to be clickable
  must therefore carry:

      className="tile-hover"
      data-title="…"       // used by the existing hover pill
      data-category="…"    // "
      data-slug="…"        // NEW: URL segment for /work/{slug}
      data-bg="#……"        // NEW: color to seed the transition overlay
*/

export const TAP_MAX_DIST = 8;     // px — anything larger is a pan
export const TAP_MAX_MS = 350;     // ms — anything longer is a press

export type TileTarget = {
  slug: string;
  color: string;
  rect: { x: number; y: number; width: number; height: number };
};

/** True if the pointer barely moved between down and up — a click. */
export function isTap(
  downX: number,
  downY: number,
  upX: number,
  upY: number,
  downTime: number,
  upTime: number
): boolean {
  const dx = upX - downX;
  const dy = upY - downY;
  const dist = Math.hypot(dx, dy);
  return dist <= TAP_MAX_DIST && upTime - downTime <= TAP_MAX_MS;
}

/**
 * Walk up from the event's target element to find a `.tile-hover` ancestor
 * (or use elementFromPoint as a fallback for cases where the pointer
 * capture pointed us at the canvas root). Returns null if we didn't land
 * on a tile that carries the required data-* attributes.
 */
export function pickTileTarget(clientX: number, clientY: number): TileTarget | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!(el instanceof Element)) return null;
  const tile = el.closest<HTMLElement>(".tile-hover");
  if (!tile) return null;
  const slug = tile.dataset.slug;
  const color = tile.dataset.bg;
  if (!slug || !color) return null;
  const rect = tile.getBoundingClientRect();
  return {
    slug,
    color,
    // Serialize just the numeric fields — DOMRect isn't a plain object
    // (has toJSON but not the exact shape we want) and React state prefers
    // plain data.
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  };
}
