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

import { useEffect, useState } from "react";
import ParallaxIndex from "@/components/ParallaxIndex";
import HoverPill from "@/components/HoverPill";
import CompositionEditor from "@/components/CompositionEditor";
import { useConfig } from "@/lib/state";

export default function Home() {
  const { config } = useConfig();

  // Dev-only composition editor: open "/?edit=1". The flag is read in an effect
  // (after mount) rather than during render, so the server HTML and the first
  // client render always match the normal stage — no hydration mismatch. When
  // editing, the editor swaps in on the next client tick; the stage's brief
  // mount is harmless. Normal visitors never take the editor path.
  const [edit, setEdit] = useState(false);
  useEffect(() => {
    setEdit(new URLSearchParams(window.location.search).get("edit") === "1");
  }, []);

  if (edit) return <CompositionEditor />;

  return (
    <>
      <ParallaxIndex background={config.background} />
      <HoverPill />
    </>
  );
}
