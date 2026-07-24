/*
  Site config
  -----------
  What used to be a large "canvas config" driving seven experimental index
  modes (grid / list / orbit / masonry / index2 / editorial / parallax) plus a
  control panel full of sliders. Only the parallax index shipped, so the mode
  switch, every mode-specific tuning knob, and the panel are gone — this now
  holds just the handful of values the live site actually reads.

  (The removed modes and their components live on in git history if a future
  experiment wants them back.)
*/

export type SiteConfig = {
  /** Canvas background color (hex). Painted behind the index stage. */
  background: string;
  /** Backdrop-blur radius (px) behind the nav fade region.
      0 = disabled (no per-frame filter cost). */
  navBlur: number;
  /** Whether the index's "Show all" detail list is open. Lives in shared
      state rather than local component state so the TopNav's chip — rendered
      up in the root layout — can toggle the list that ParallaxIndex renders
      down in the page. */
  parallaxShowAll: boolean;
};

export const defaultConfig: SiteConfig = {
  background: "#0a0a0a",
  navBlur: 0,
  parallaxShowAll: false,
};
