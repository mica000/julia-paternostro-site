"use client";

/*
  Home (Index)
  ------------
  One index treatment: ParallaxIndex. This page used to switch between seven
  experimental canvases driven by a control panel; that panel and the other
  six modes are gone. All that's left is the stage plus the hover pill that
  labels whatever the cursor is over. TopNav, BottomChrome and the custom
  cursor live in the root layout, so they aren't mounted here.
*/

import ParallaxIndex from "@/components/ParallaxIndex";
import HoverPill from "@/components/HoverPill";
import { useConfig } from "@/lib/state";

export default function Home() {
  const { config } = useConfig();

  return (
    <>
      <ParallaxIndex background={config.background} />
      <HoverPill />
    </>
  );
}
