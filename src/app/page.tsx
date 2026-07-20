"use client";

/*
  Home (Work)
  -----------
  Reads the shared canvas config from context (so BottomChrome's LIST/GRID
  toggle drives the same state) and renders the appropriate canvas. Overlays
  the Work-specific chrome: hover pill, custom cursor, control panel. TopNav
  and BottomChrome live in the root layout, so they aren't mounted here.
*/

import InfiniteCanvas from "@/components/InfiniteCanvas";
import ScrollGrid from "@/components/ScrollGrid";
import OrbitBelt from "@/components/OrbitBelt";
import MasonryGrid from "@/components/MasonryGrid";
import ControlPanel from "@/components/ControlPanel";
import HoverPill from "@/components/HoverPill";
import { useConfig } from "@/lib/state";

export default function Home() {
  const { config, setConfig } = useConfig();

  return (
    <>
      {config.mode === "grid" && (
        <InfiniteCanvas
          friction={config.friction}
          glide={config.glide}
          cell={config.cell}
          cols={config.cols}
          rows={config.rows}
          gap={config.gap}
          parallax={config.parallax}
          radius={config.radius}
          hoverScale={config.hoverScale}
          hoverSpeed={config.hoverSpeed}
          imageStyle={config.imageStyle}
          background={config.background}
          imageCrop={config.imageCrop}
          tileRatio={config.tileRatio}
        />
      )}
      {config.mode === "list" && (
        <ScrollGrid
          cols={config.cols}
          rows={config.rows}
          gap={config.gap}
          radius={config.radius}
          breathe={config.breathe}
          maxWidth={config.maxWidth}
          hoverScale={config.hoverScale}
          hoverSpeed={config.hoverSpeed}
          imageStyle={config.imageStyle}
          background={config.background}
          imageCrop={config.imageCrop}
          friction={config.friction}
          glide={config.glide}
          tileRatio={config.tileRatio}
        />
      )}
      {config.mode === "orbit" && (
        <OrbitBelt
          orbitRadius={config.orbitRadius}
          orbitTilt={config.orbitTilt}
          orbitArc={config.orbitArc}
          orbitCardSize={config.orbitCardSize}
          orbitPerspective={config.orbitPerspective}
          imageStyle={config.imageStyle}
          background={config.background}
          hoverScale={config.hoverScale}
          hoverSpeed={config.hoverSpeed}
          imageCrop={config.imageCrop}
          friction={config.friction}
          glide={config.glide}
        />
      )}
      {config.mode === "masonry" && (
        <MasonryGrid
          masonryCols={config.masonryCols}
          masonryGap={config.masonryGap}
          masonryMaxWidth={config.masonryMaxWidth}
          radius={config.radius}
          hoverScale={config.hoverScale}
          hoverSpeed={config.hoverSpeed}
          imageStyle={config.imageStyle}
          background={config.background}
          imageCrop={config.imageCrop}
          breathe={config.breathe}
        />
      )}
      <HoverPill accent={config.accent} />
      <ControlPanel config={config} onChange={setConfig} />
    </>
  );
}
