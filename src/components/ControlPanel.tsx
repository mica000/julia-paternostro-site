"use client";

/*
  ControlPanel
  ------------
  Fixed to the right side. Holds the mode toggle (Grid ↔ List) and all the
  tuning sliders. Sits above the canvas so its own pointer events don't
  trigger a pan.

  Sliders that only apply to grid mode (parallax) or list mode (breathe,
  maxWidth) are disabled in the other mode, so it's obvious which knobs do
  nothing.

  Hide/show: a small "×" collapses the panel to a floating icon-button in
  the same corner, so the panel can get out of the way when reviewing the
  canvas without losing access to it.
*/

import { useState } from "react";
import type { CanvasConfig, ImageStyle, Mode } from "@/lib/config";

type Props = {
  config: CanvasConfig;
  onChange: (next: CanvasConfig) => void;
};

export default function ControlPanel({ config, onChange }: Props) {
  const set = <K extends keyof CanvasConfig>(key: K, value: CanvasConfig[K]) =>
    onChange({ ...config, [key]: value });

  const isGrid = config.mode === "grid";
  const isList = config.mode === "list";
  const isOrbit = config.mode === "orbit";
  const isMasonry = config.mode === "masonry";
  const [open, setOpen] = useState(true);

  // Panel heading tracks the active mode so it's obvious which set of
  // sliders you're looking at.
  const heading = isOrbit
    ? "Orbit Controls"
    : isMasonry
      ? "Masonry Controls"
      : isList
        ? "List Controls"
        : "Grid Controls";

  // Collapsed state — a single icon-button in the same top-right position.
  // Clicking it reopens the panel with all state preserved (React keeps the
  // useState above intact; only the aside DOM unmounts).
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Show controls"
        aria-label="Show controls"
        className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-md shadow-2xl transition-colors hover:bg-black/80"
      >
        {/* Sliders icon — two horizontal tracks with knobs, matches "Controls". */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="4" y1="8" x2="20" y2="8" />
          <circle cx="10" cy="8" r="2.2" fill="black" />
          <line x1="4" y1="16" x2="20" y2="16" />
          <circle cx="15" cy="16" r="2.2" fill="black" />
        </svg>
      </button>
    );
  }

  return (
    <aside className="fixed right-4 top-4 z-50 flex max-h-[calc(100vh-2rem)] w-72 flex-col overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-5 text-white backdrop-blur-md shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/60">
          {heading}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Hide controls"
          aria-label="Hide controls"
          className="flex h-6 w-6 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {/* Close × */}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="2" y1="2" x2="10" y2="10" />
            <line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>

      <ModeToggle mode={config.mode} onChange={(m) => set("mode", m)} />

      <div className="mt-3">
        <ImageStyleToggle
          value={config.imageStyle}
          onChange={(s) => set("imageStyle", s)}
        />
      </div>

      <div className="mt-4">
        <ColorPicker
          label="Background"
          value={config.background}
          onChange={(hex) => set("background", hex)}
        />
      </div>

      <div className="mt-3">
        <ColorPicker
          label="Accent"
          value={config.accent}
          onChange={(hex) => set("accent", hex)}
          presets={["#e8ff59", "#ff2ecd", "#00d8ff", "#ff4e2b", "#ffffff"]}
        />
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Slider
          label="Friction"
          hint="Lower = quicker stop, higher = longer glide"
          min={0.8}
          max={0.99}
          step={0.005}
          value={config.friction}
          onChange={(v) => set("friction", v)}
          format={(v) => v.toFixed(3)}
        />
        <Slider
          label="Glide"
          hint="Flick strength on release"
          min={0}
          max={2}
          step={0.05}
          value={config.glide}
          onChange={(v) => set("glide", v)}
          format={(v) => v.toFixed(2) + "×"}
        />
        {/* Grid / list sliders — hidden in orbit and masonry modes so the
            panel only surfaces knobs that actually do something. */}
        {!isOrbit && !isMasonry && (
          <>
            <Slider
              label="Cell size"
              hint={isGrid ? "Base tile size (px)" : "Derived from viewport ÷ columns"}
              min={140}
              max={420}
              step={10}
              value={config.cell}
              disabled={isList}
              onChange={(v) => set("cell", v)}
              format={(v) => v + "px"}
            />
            <Slider
              label="Columns"
              hint={isGrid ? "Columns per block" : "Columns visible on screen"}
              min={2}
              max={8}
              step={1}
              value={config.cols}
              onChange={(v) => set("cols", v)}
              format={(v) => String(v)}
            />
            <Slider
              label="Rows"
              hint="Rows per block"
              min={2}
              max={8}
              step={1}
              value={config.rows}
              onChange={(v) => set("rows", v)}
              format={(v) => String(v)}
            />
            <Slider
              label="Tile ratio"
              hint="Tile height ÷ width. 1 = square, >1 = portrait"
              min={0.5}
              max={2}
              step={0.05}
              value={config.tileRatio}
              onChange={(v) => set("tileRatio", v)}
              format={(v) => v.toFixed(2) + "×"}
            />
            <Slider
              label="Gap"
              hint="Whitespace between images"
              min={0}
              max={120}
              step={2}
              value={config.gap}
              onChange={(v) => set("gap", v)}
              format={(v) => v + "px"}
            />
            <Slider
              label="Corner radius"
              hint="Tile roundness. 0 = sharp corners."
              min={0}
              max={40}
              step={1}
              value={config.radius}
              onChange={(v) => set("radius", v)}
              format={(v) => v + "px"}
            />
            <Slider
              label="Parallax"
              hint="How much the grid follows the cursor (grid only)"
              min={0}
              max={80}
              step={2}
              value={config.parallax}
              disabled={!isGrid}
              onChange={(v) => set("parallax", v)}
              format={(v) => v + "px"}
            />
            <Slider
              label="Breathe"
              hint="Grid swells while scrolling (list only)"
              min={0}
              max={0.2}
              step={0.005}
              value={config.breathe}
              disabled={!isList}
              onChange={(v) => set("breathe", v)}
              format={(v) => (v * 100).toFixed(1) + "%"}
            />
            <Slider
              label="Max width"
              hint="Grid width cap, centered (list only)"
              min={400}
              max={2400}
              step={40}
              value={config.maxWidth}
              disabled={!isList}
              onChange={(v) => set("maxWidth", v)}
              format={(v) => v + "px"}
            />
          </>
        )}

        {/* Orbit-only sliders. */}
        {isOrbit && (
          <>
            <Slider
              label="Orbit arc"
              hint="Visible fan span (°). 360 = full ring, 180 = front half only."
              min={60}
              max={360}
              step={5}
              value={config.orbitArc}
              onChange={(v) => set("orbitArc", v)}
              format={(v) => v + "°"}
            />
            <Slider
              label="Orbit radius"
              hint="Ring size — larger = cards fan wider across the viewport."
              min={200}
              max={1200}
              step={10}
              value={config.orbitRadius}
              onChange={(v) => set("orbitRadius", v)}
              format={(v) => v + "px"}
            />
            <Slider
              label="Orbit tilt"
              hint="Card bank on the sides of the arc. 0 = flat, 45 = strong fan."
              min={0}
              max={45}
              step={1}
              value={config.orbitTilt}
              onChange={(v) => set("orbitTilt", v)}
              format={(v) => v + "°"}
            />
            <Slider
              label="Card size"
              hint="Individual card size (px, square)."
              min={120}
              max={400}
              step={5}
              value={config.orbitCardSize}
              onChange={(v) => set("orbitCardSize", v)}
              format={(v) => v + "px"}
            />
            <Slider
              label="Perspective"
              hint="Camera depth. Lower = stronger 3D warp, higher = flatter."
              min={600}
              max={3000}
              step={50}
              value={config.orbitPerspective}
              onChange={(v) => set("orbitPerspective", v)}
              format={(v) => v + "px"}
            />
          </>
        )}

        {/* Masonry-only sliders. */}
        {isMasonry && (
          <>
            <Slider
              label="Columns"
              hint="Number of masonry columns"
              min={2}
              max={6}
              step={1}
              value={config.masonryCols}
              onChange={(v) => set("masonryCols", v)}
              format={(v) => String(v)}
            />
            <Slider
              label="Gap"
              hint="Space between tiles (px)"
              min={0}
              max={80}
              step={2}
              value={config.masonryGap}
              onChange={(v) => set("masonryGap", v)}
              format={(v) => v + "px"}
            />
            <Slider
              label="Max width"
              hint="Grid width cap, centered"
              min={600}
              max={2400}
              step={40}
              value={config.masonryMaxWidth}
              onChange={(v) => set("masonryMaxWidth", v)}
              format={(v) => v + "px"}
            />
            <Slider
              label="Corner radius"
              hint="Tile roundness. 0 = sharp corners."
              min={0}
              max={40}
              step={1}
              value={config.radius}
              onChange={(v) => set("radius", v)}
              format={(v) => v + "px"}
            />
          </>
        )}
        <Slider
          label="Hover scale"
          hint="How much a tile grows on hover"
          min={1}
          max={1.3}
          step={0.01}
          value={config.hoverScale}
          onChange={(v) => set("hoverScale", v)}
          format={(v) => v.toFixed(2) + "×"}
        />
        <Slider
          label="Hover speed"
          hint="How fast the grow/shrink animates"
          min={50}
          max={1000}
          step={25}
          value={config.hoverSpeed}
          onChange={(v) => set("hoverSpeed", v)}
          format={(v) => v + "ms"}
        />
        <Slider
          label="Nav blur"
          hint="Frosted-glass blur behind the nav fades. 0 = off (fastest)."
          min={0}
          max={20}
          step={1}
          value={config.navBlur}
          onChange={(v) => set("navBlur", v)}
          format={(v) => (v === 0 ? "off" : v + "px")}
        />
        <Slider
          label="Image crop"
          hint="Zoom image inside tile — trims baked-in rounded corners"
          min={1}
          max={1.15}
          step={0.005}
          value={config.imageCrop}
          onChange={(v) => set("imageCrop", v)}
          format={(v) => v.toFixed(3) + "×"}
        />
      </div>
    </aside>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
      {(["grid", "list", "orbit", "masonry", "index2", "editorial", "parallax"] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`flex-1 min-w-[70px] rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              active ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}

/*
  ColorPicker
  -----------
  Native <input type="color"> for pixel-perfect picking, plus a hex readout
  and a small row of preset swatches (black/dark/mid/light/white) for
  one-click common backgrounds.
*/
function ColorPicker({
  label,
  value,
  onChange,
  presets = ["#0a0a0a", "#ffffff", "#f4f1ea", "#1f1f1f", "#e8ff59"],
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-xs text-white/70">
          {value.toUpperCase()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <label
          className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/15"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <div className="flex flex-1 gap-1.5">
          {presets.map((hex) => (
            <button
              key={hex}
              onClick={() => onChange(hex)}
              title={hex}
              className={`h-6 flex-1 rounded-md border transition-transform hover:scale-110 ${
                value.toLowerCase() === hex.toLowerCase()
                  ? "border-white"
                  : "border-white/15"
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ImageStyleToggle({
  value,
  onChange,
}: {
  value: ImageStyle;
  onChange: (s: ImageStyle) => void;
}) {
  const options: { key: ImageStyle; label: string }[] = [
    { key: "with-bg", label: "With bg" },
    { key: "without-bg", label: "No bg" },
  ];
  return (
    <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {options.map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

type SliderProps = {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  format: (value: number) => string;
};

function Slider({
  label, hint, min, max, step, value, disabled, onChange, format,
}: SliderProps) {
  return (
    <label className={`block ${disabled ? "opacity-40" : ""}`}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-xs text-white/70">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white"
      />
      <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>
    </label>
  );
}
