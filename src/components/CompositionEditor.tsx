"use client";

/*
  CompositionEditor — the ?edit=1 mode.

  A dev-time canvas for placing the satellite tiles of the parallax index by
  hand instead of guessing coordinates. It renders the active project's hero
  (dimmed, as a reference) plus every satellite as a draggable / resizable box,
  and a "Save" that POSTs the layout to /api/save-composition, which writes it
  into compositions.json — the same file the live stage reads. So: drag, hit
  Save, and the real site is updated.

  Breakpoint: whichever the current window is. A wide window edits the DESKTOP
  layout; a narrow one edits the MOBILE (portrait) layout. Resize the window to
  switch which one you're tuning. The editor always maps dx/dy against the raw
  viewport and saves to the matching bucket — exactly how the live stage maps
  the desktop layout and any mobile override — so what you place is what ships.

  It is mounted only when the page detects ?edit=1, in place of the live stage,
  so none of the stage's scroll / hover / rAF machinery runs here.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { projects } from "@/lib/projects";
import {
  compositionFor,
  heroSrc,
  satelliteImagesFor,
  type SatSlot,
} from "@/lib/compositions";

// Same hero box the live stage uses, so tiles are placed against a hero the
// right size. (Kept in sync by hand — it's one line.)
const HERO_BOX =
  "aspect-[913/560] max-w-[1140px] w-[86vw] md:w-[min(58vw,88vh)] lg:w-[min(62vw,91vh)]";

// The width formula the stage renders with is min(w·100vw, w·146vh); factored,
// width_px = w · min(vw, 1.46·vh). This K is that shared factor, so a tile's
// pixel size and the inverse (a resize → new w) both use one number.
const kFactor = (vw: number, vh: number) => Math.min(vw, 1.46 * vh);

type DragState = {
  i: number;
  mode: "move" | "resize";
  startClientX: number;
  startClientY: number;
  startDx: number;
  startDy: number;
  startW: number;
};

const clone = (slots: SatSlot[]): SatSlot[] => slots.map((s) => ({ ...s }));

type Project = (typeof projects)[number];

/*
  Outer shell — owns the picks that DON'T reset the drag state: which project
  is shown, the live breakpoint, and the measured viewport. It hands those to a
  keyed <EditorCanvas>; changing project or breakpoint changes the key, so the
  canvas remounts and re-seeds its slots from the data (no reset effect needed).
*/
export default function CompositionEditor() {
  const [projectIdx, setProjectIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 767
  );
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const mq = window.matchMedia("(max-width: 767px)");
    const syncMq = () => setIsMobile(mq.matches);
    window.addEventListener("resize", measure);
    mq.addEventListener("change", syncMq);
    return () => {
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", syncMq);
    };
  }, []);

  const project = projects[projectIdx];
  const breakpoint = isMobile ? "mobile" : "desktop";
  const cycleProject = (d: number) =>
    setProjectIdx((i) => (i + projects.length + d) % projects.length);

  return (
    <EditorCanvas
      key={`${project.slug}-${breakpoint}`}
      project={project}
      isMobile={isMobile}
      vp={vp}
      breakpoint={breakpoint}
      onCycleProject={cycleProject}
    />
  );
}

/*
  Inner canvas — remounts per (project, breakpoint), so its `slots` seed once
  from the data via a useState initializer and are then edited by dragging.
*/
function EditorCanvas({
  project,
  isMobile,
  vp,
  breakpoint,
  onCycleProject,
}: {
  project: Project;
  isMobile: boolean;
  vp: { w: number; h: number };
  breakpoint: "desktop" | "mobile";
  onCycleProject: (d: number) => void;
}) {
  const slug = project.slug;
  // Seed once per mount (deep-cloned so edits never touch the imported JSON).
  const [slots, setSlots] = useState<SatSlot[]>(() =>
    clone(compositionFor(slug, isMobile))
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<{ kind: string; msg: string }>({
    kind: "idle",
    msg: "",
  });
  const dragRef = useRef<DragState | null>(null);

  const images = satelliteImagesFor(project, slots);

  // Delete the tile at index i (and clear the selection if it was that one).
  const deleteSlot = (i: number) =>
    setSlots((prev) => {
      const next = prev.filter((_, k) => k !== i);
      setSelected((sel) => (sel === i ? null : sel != null && sel > i ? sel - 1 : sel));
      return next;
    });

  // Placement math — the SAME origin/frame the live stage uses.
  const cx = vp.w / 2;
  const cy = isMobile ? (0.5 - 0.14) * vp.h : vp.h / 2; // mobile rides the −14vh lift
  const K = kFactor(vp.w, vp.h);

  // dx/dy are fractions of a CONTAINED 1920×1314 frame (the same one the hero is
  // sized against), centred on screen — NOT of the raw viewport. Mapping them to
  // vw/vh instead let the arrangement stretch away from the hero whenever the
  // window aspect drifted from 1920:1314. Scaling position by this frame (just
  // like tile size scales by K) keeps every satellite locked to the hero at any
  // window size.
  const frameScale = Math.min(vp.w / 1920, vp.h / 1314);
  const frameW = 1920 * frameScale;
  const frameH = 1314 * frameScale;

  const boxFor = (s: SatSlot) => {
    const [rw, rh] = s.ratio.split("/").map((n) => parseFloat(n));
    const width = s.w * K;
    const height = width * (rh / rw);
    return {
      width,
      height,
      left: cx + s.dx * frameW - width / 2,
      top: cy + s.dy * frameH - height / 2,
    };
  };

  // ── Drag / resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      setSlots((prev) => {
        const next = clone(prev);
        const s = next[d.i];
        if (!s) return prev;
        if (d.mode === "move") {
          s.dx = d.startDx + (e.clientX - d.startClientX) / frameW;
          s.dy = d.startDy + (e.clientY - d.startClientY) / frameH;
        } else {
          // Resize anchored to the TOP-LEFT corner (the one the handle is
          // diagonally opposite to), so the tile grows toward the cursor
          // instead of ballooning symmetrically around its centre. Because the
          // box is positioned by its centre (dx/dy), holding the top-left
          // fixed means the centre must shift by half of each size delta.
          const [rw, rh] = s.ratio.split("/").map((n) => parseFloat(n));
          const aspect = rh / rw;
          const startWidthPx = d.startW * K;
          const widthPx = Math.max(20, startWidthPx + (e.clientX - d.startClientX));
          const dW = widthPx - startWidthPx;
          const dH = dW * aspect;
          s.w = widthPx / K;
          s.dx = d.startDx + dW / 2 / frameW;
          s.dy = d.startDy + dH / 2 / frameH;
        }
        return next;
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [vp.w, vp.h, K, frameW, frameH]);

  // Delete/Backspace removes the selected tile (ignored while typing in a
  // field, though the editor has none today).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selected == null) return;
      e.preventDefault();
      deleteSlot(selected);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const startMove = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    setSelected(i);
    const s = slots[i];
    dragRef.current = {
      i,
      mode: "move",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDx: s.dx,
      startDy: s.dy,
      startW: s.w,
    };
  };

  const startResize = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(i);
    const s = slots[i];
    dragRef.current = {
      i,
      mode: "resize",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDx: s.dx,
      startDy: s.dy,
      startW: s.w,
    };
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    setStatus({ kind: "saving", msg: "Saving…" });
    try {
      const res = await fetch("/api/save-composition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakpoint, slug, slots }),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setStatus({ kind: "saved", msg: `Saved ${breakpoint} · ${slug}` });
      } else {
        setStatus({ kind: "error", msg: body.error || `HTTP ${res.status}` });
      }
    } catch (err) {
      setStatus({ kind: "error", msg: String(err) });
    }
  }, [breakpoint, slug, slots]);

  const btn =
    "cursor-pointer rounded-full border border-white/25 px-3 py-1 text-[13px] leading-4 text-white transition-colors hover:bg-white/10";

  return (
    <div className="fixed inset-0 z-0 select-none overflow-hidden bg-[#0a0a0a]">
      {/* Hero reference — dimmed, non-interactive. Rides the mobile −14vh lift
          so it sits where the live stage puts it. */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 ${
          isMobile ? "-translate-y-[calc(50%+14vh)]" : "-translate-y-1/2"
        }`}
      >
        <div className={`relative ${HERO_BOX} opacity-40`}>
          {/* Plain <img>, not next/image: this is a dev tool, and the raw file
              loads instantly and reliably. The dev image optimizer choked on
              several concurrent tiles + lazy-loading. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc(project)}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      </div>

      {/* Draggable satellites */}
      {vp.w > 0 &&
        slots.map((s, i) => {
          const b = boxFor(s);
          const src = images[i % images.length];
          const isSel = selected === i;
          return (
            <div
              key={i}
              onPointerDown={startMove(i)}
              className="absolute cursor-move touch-none"
              style={{
                left: b.left,
                top: b.top,
                width: b.width,
                height: b.height,
                outline: isSel
                  ? "1.5px solid rgba(120,200,255,0.95)"
                  : "1px solid rgba(255,255,255,0.35)",
                outlineOffset: 0,
              }}
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                />
              )}
              {/* index badge */}
              <span className="pointer-events-none absolute -left-1 -top-1 rounded-full bg-black/70 px-1.5 text-[11px] leading-4 text-white">
                {i}
              </span>
              {/* delete (top-right) — pointerdown stops the move drag from arming */}
              <button
                type="button"
                aria-label={`Delete tile ${i}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSlot(i);
                }}
                className="absolute -right-2 -top-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-white/60 bg-red-500 text-[12px] leading-none text-white hover:bg-red-400"
              >
                ×
              </button>
              {/* resize handle (bottom-right) */}
              <span
                onPointerDown={startResize(i)}
                className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border border-white/70 bg-sky-400"
              />
            </div>
          );
        })}

      {/* Toolbar — bottom-centre, clear of the top nav */}
      <div className="pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-black/70 px-4 py-2 backdrop-blur-md">
        <button type="button" onClick={() => onCycleProject(-1)} className={btn}>
          ‹
        </button>
        <span className="min-w-[150px] text-center text-[13px] leading-4 text-white">
          {project.title}
        </span>
        <button type="button" onClick={() => onCycleProject(1)} className={btn}>
          ›
        </button>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/80">
          {breakpoint}
        </span>
        <button
          type="button"
          onClick={() => setSlots(clone(compositionFor(slug, isMobile)))}
          className={btn}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={save}
          className="cursor-pointer rounded-full bg-white px-4 py-1 text-[13px] font-medium leading-4 text-black transition-opacity hover:opacity-90"
        >
          Save
        </button>
        <span
          className="min-w-[120px] text-[12px] leading-4"
          style={{
            color:
              status.kind === "error"
                ? "#ff8080"
                : status.kind === "saved"
                  ? "#8be28b"
                  : "rgba(255,255,255,0.7)",
          }}
        >
          {status.msg}
        </span>
      </div>
    </div>
  );
}
