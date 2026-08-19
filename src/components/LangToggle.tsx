"use client";

/*
  LangToggle — the EN / PT switch, styled and behaving like an iOS switch.

  Geometry is transcribed from Figma node 268:1491 (the "Toggle" component in
  the footer frame 197:570): a small white knob dot and a 13/16 label. The track
  has NO material — no border, no background, no blur — so it's just the knob
  and the label floating over whatever's behind them.

  Behaviour is the iPhone switch the design asks for: a knob that SLIDES from
  one end to the other on click, with the two-letter label riding the opposite
  side. It's the same control in both states — this is a language pick, not an
  on/off, so the track colour never changes; only the knob and label travel.

  How it's built:
    - A fixed-size track (position: relative). Both moving parts are absolutely
      positioned so they slide via `transform: translateX` — transform only, so
      the animation runs on the compositor and never triggers layout.
    - The knob sits at the left in EN and the right in PT; the label takes the
      opposite side, so knob and label never overlap.
    - The easing is a back-ease-out (slight overshoot) so the knob settles with
      a small iOS-like bounce rather than a flat glide. ~260ms — long enough to
      read the travel, short enough to stay a micro-interaction.

  Reduced motion: no per-element media query needed here — the global rule in
  globals.css clamps every transition to 0.01ms, so the knob simply snaps.
*/

import { useLang, type Lang } from "@/lib/state";

// Track geometry (px), transcribed from Figma node 268:1491. The knob is now a
// small 6px CIRCLE (it used to be a full-height 21px knob). The Switch row is
// knob(6) + gap(6) + label(17), with 7px of padding on each outer side, giving
// a 43×20 track. The knob is vertically centred: (20 − 6) / 2 = 7 from the top.
// The label rides in a fixed-width centred box so its stops are deterministic
// and don't shift between "EN" and "PT".
const TRACK_W = 43; // 7 + 6 + 6 + 17 + 7
const TRACK_H = 20;
const KNOB = 6;
const KNOB_TOP = (TRACK_H - KNOB) / 2; // 7
const PAD = 7; // outer padding on the knob side and the label side
const GAP = 6; // knob ↔ label
const LABEL_W = 17; // fixed box for the two-letter label
const KNOB_X_LEFT = PAD; // 7  (EN: knob left)
const KNOB_X_RIGHT = TRACK_W - KNOB - PAD; // 30 (PT: knob right)
const LABEL_X_LEFT = PAD; // 7  (PT: knob right, label left)
const LABEL_X_RIGHT = PAD + KNOB + GAP; // 19 (EN: knob left, label right)

// A touch of overshoot on the way out — the iOS-switch settle.
const EASE_SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";

export default function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  const isEn = lang === "en";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isEn}
      aria-label={isEn ? "Language: English" : "Idioma: Português"}
      onClick={() => setLang((isEn ? "pt" : "en") as Lang)}
      data-cursor-ring
      // No track material — the border and background are intentionally gone.
      // What's left is a transparent hit area (kept at the Figma track size so
      // the knob and label still have their frame) with just the white knob dot
      // and the EN/PT label floating over whatever's behind.
      className={`uline relative shrink-0 cursor-pointer ${className}`}
      style={{
        width: TRACK_W,
        height: TRACK_H,
      }}
    >
      {/* Knob */}
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{
          top: KNOB_TOP,
          left: 0,
          width: KNOB,
          height: KNOB,
          backgroundColor: "#ffffff",
          // A tight drop shadow to lift the dot off the glass. The old knob's
          // 44px-blur glow was made for a 21px knob; on a 6px dot it read as a
          // halo, so it's dropped.
          boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
          transform: `translateX(${isEn ? KNOB_X_LEFT : KNOB_X_RIGHT}px)`,
          transition: `transform 260ms ${EASE_SPRING}`,
          willChange: "transform",
        }}
      />
      {/* Label — rides the side opposite the knob, in a fixed centred box so
          the swap between "EN" and "PT" never nudges its position. */}
      <span
        aria-hidden
        className="absolute text-center text-[13px] font-normal leading-4"
        style={{
          top: "50%",
          left: 0,
          width: LABEL_W,
          marginTop: -8, // half the 16px line-height → vertically centred
          color: "#fbfbfb",
          transform: `translateX(${isEn ? LABEL_X_RIGHT : LABEL_X_LEFT}px)`,
          transition: `transform 260ms ${EASE_SPRING}`,
          willChange: "transform",
        }}
      >
        {isEn ? "EN" : "PT"}
      </span>
    </button>
  );
}
