"use client";

/*
  PageTransition — tile → case study soft crossfade
  --------------------------------------------------
  A single fixed <div> that lives in the root layout so it survives Next.js
  route changes. On click the tile calls `beginTransition({color, slug})`:

    1. This provider stores the color and switches the overlay into
       `fadingIn` — the overlay covers the full viewport in that color and
       animates its opacity 0 → 1 over FADE_IN_MS.
    2. `router.push(/work/{slug})` fires at the same time. Because Next.js
       app-router transitions run inside ~100ms, the case study is usually
       mounted behind an opaque plate before the reader notices.
    3. CaseStudy's mount effect calls `end()`. The overlay switches to
       `fadingOut` (opacity 1 → 0 over FADE_OUT_MS). During this fade the
       case study runs its own content-rise-in animation, so the eye
       transfers from the flat color to the settling content instead of
       hitting a hard hand-off.

  No rect-to-viewport morph any more — the older version had a "flick"
  because the overlay was removed in a single frame the moment the case
  study mounted, revealing a 1–2 frame paint gap under the plate.
  Opacity ramps in both directions kill that: even if the case study is
  imperfectly ready, the fade smooths the discontinuity out.

  Note on View Transitions API: Next.js 16 App Router support is uneven
  and we want reliable timing across the route change. A hand-rolled
  opacity plate is boring but bullet-proof.
*/

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Rect = { x: number; y: number; width: number; height: number };

type TransitionState =
  | { kind: "idle" }
  | { kind: "fadingIn"; color: string }
  | { kind: "opaque"; color: string }
  | { kind: "fadingOut"; color: string };

type Ctx = {
  // rect is accepted so existing call sites don't have to change, but the
  // opacity-only overlay ignores it. Kept for future ergonomics.
  begin: (opts: { color: string; rect?: Rect; slug: string }) => void;
  end: () => void;
};

const TransitionContext = createContext<Ctx | null>(null);

// Timings — tuned by feel. Short enough not to feel gated, long enough
// that neither ramp reads as a hard cut.
const FADE_IN_MS = 180;
const FADE_OUT_MS = 280;

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TransitionState>({ kind: "idle" });
  const router = useRouter();
  const pathname = usePathname();
  // Path the user is navigating toward — used by the "did we arrive?"
  // fallback safety net so a stuck overlay can never orphan the app.
  const targetPath = useRef<string | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const begin = useCallback(
    ({ color, slug }: { color: string; rect?: Rect; slug: string }) => {
      clearTimers();
      targetPath.current = `/work/${slug}`;
      setState({ kind: "fadingIn", color });
      router.push(`/work/${slug}`);

      // After the fade-in lands, hold on `opaque` — the case study's mount
      // effect will kick us into fadingOut.
      const holdTimer = window.setTimeout(() => {
        setState((s) => (s.kind === "fadingIn" ? { kind: "opaque", color: s.color } : s));
      }, FADE_IN_MS + 20);
      timers.current.push(holdTimer);
    },
    [router]
  );

  const end = useCallback(() => {
    clearTimers();
    setState((s) => {
      if (s.kind === "idle") return s;
      return { kind: "fadingOut", color: s.color };
    });
    // After the fade-out completes, fully unmount the overlay.
    const doneTimer = window.setTimeout(() => {
      setState({ kind: "idle" });
      targetPath.current = null;
    }, FADE_OUT_MS + 20);
    timers.current.push(doneTimer);
  }, []);

  // Safety net: if navigation completes but CaseStudy never called end()
  // (a route that doesn't know about the overlay, back button, etc.),
  // release the overlay so it can't get stuck.
  useEffect(() => {
    if (!targetPath.current) return;
    if (pathname !== targetPath.current) return;
    const fallback = window.setTimeout(() => {
      setState((s) => (s.kind === "idle" ? s : { kind: "idle" }));
      targetPath.current = null;
    }, 700);
    return () => window.clearTimeout(fallback);
  }, [pathname]);

  useEffect(() => () => clearTimers(), []);

  return (
    <TransitionContext.Provider value={{ begin, end }}>
      {children}
      <Overlay state={state} />
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error("useTransition must be used inside <TransitionProvider>");
  return ctx;
}

function Overlay({ state }: { state: TransitionState }) {
  // Double-rAF to guarantee the browser sees opacity: 0 before it sees
  // opacity: 1 — without this the two states can coalesce and skip the
  // transition entirely.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (state.kind !== "fadingIn") {
      setReady(false);
      return;
    }
    setReady(false);
    const id1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(id1);
  }, [state]);

  if (state.kind === "idle") return null;

  const opacity =
    state.kind === "fadingIn"
      ? ready
        ? 1
        : 0
      : state.kind === "opaque"
        ? 1
        : 0; // fadingOut

  const duration =
    state.kind === "fadingIn"
      ? FADE_IN_MS
      : state.kind === "fadingOut"
        ? FADE_OUT_MS
        : 0;

  return (
    <div
      aria-hidden
      // pointer-events off so the overlay never eats clicks after it
      // reaches full opacity (nothing to click through TO yet, but the
      // user's next tap should reach the settled case study).
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{
        backgroundColor: state.color,
        opacity,
        transition: duration
          ? `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
          : "none",
        willChange: "opacity",
      }}
    />
  );
}
