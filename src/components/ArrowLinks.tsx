"use client";

/*
  ArrowLinks — the ruled "label ↗" link list used in the case-study CTA
  (Figma 423:2440) and the About contact block (Figma 432:2557).

  Each row is a thin-ruled line with an up-right arrow. The list peer-dims:
  every row rests at 100%, and while the list is hovered the non-hovered rows'
  text and arrow fall to 40% (the hovered one wins), same as the All-projects
  footer. Only the text colour dims, never the row's opacity, so the rules
  between the rows stay at full strength. Internal links route with
  next/link; external ones (mailto, social) use a plain <a>, opening http(s)
  targets in a new tab.
*/

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/state";

export type ArrowLink = {
  /** Already-localized label. */
  label: string;
  href: string;
  /** Render as a plain <a> (mailto / social) instead of a next/link route. */
  external?: boolean;
  /**
   * Copy this text instead of navigating. The row shows `label` at rest and
   * swaps to "Copy email" on hover or focus, then "Copied" once clicked.
   */
  copy?: string;
};

function ArrowTopRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <path
        d="M4.5 11.5 11.5 4.5M11.5 4.5H5.5M11.5 4.5V10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ROW =
  "flex h-[65px] items-center justify-between border-t-[0.5px] border-[#f6f6f61a] cursor-pointer text-[#fbfbfb] transition-colors duration-150 ease-[ease] group-hover:text-[#fbfbfb66] hover:text-[#fbfbfb] last:border-b-[0.5px]";

/*
  The email row. It shows the address itself — a visitor can read it, or copy
  it by hand — and hover says what a click does. A click copies rather than
  opening a mail draft: a mailto link does nothing useful for anyone whose
  mail lives in a browser tab, which is most people.

  The two labels share one grid cell and crossfade, so the row never changes
  width as they swap. On touch there's no hover: a tap copies and "Copied"
  confirms it.
*/
function CopyRow({ label, copy }: { label: string; copy: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const fade =
    "col-start-1 row-start-1 transition-opacity duration-150 ease-[ease] motion-reduce:transition-none";
  return (
    <button
      type="button"
      data-cursor-ring
      onClick={() => {
        // The async clipboard is refused in some contexts (an embedded
        // frame, an older Safari); the old selection copy still works there.
        const fallback = () => {
          const el = document.createElement("textarea");
          el.value = copy;
          el.style.position = "fixed";
          el.style.opacity = "0";
          document.body.appendChild(el);
          el.select();
          const ok = document.execCommand("copy");
          el.remove();
          if (ok) setCopied(true);
        };
        if (navigator.clipboard) {
          navigator.clipboard.writeText(copy).then(() => setCopied(true), fallback);
        } else fallback();
      }}
      className={`group/row w-full text-left ${ROW}`}
    >
      <span className="grid text-[13px] font-normal leading-4">
        <span
          className={`${fade} ${
            copied
              ? "opacity-0"
              : "group-hover/row:opacity-0 group-focus-visible/row:opacity-0"
          }`}
        >
          {label}
        </span>
        <span
          aria-hidden
          className={`${fade} ${
            copied
              ? "opacity-100"
              : "opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100"
          }`}
        >
          {copied ? t("nav.copied") : t("nav.copyEmail")}
        </span>
      </span>
      <ArrowTopRight />
      <span className="sr-only" aria-live="polite">
        {copied ? t("nav.copied") : ""}
      </span>
    </button>
  );
}

function Row({ label, href, external, copy }: ArrowLink) {
  if (copy) return <CopyRow label={label} copy={copy} />;
  const inner = (
    <>
      <span className="text-[13px] font-normal leading-4">{label}</span>
      <ArrowTopRight />
    </>
  );
  if (external) {
    const newTab = href.startsWith("http")
      ? { target: "_blank", rel: "noreferrer" }
      : {};
    return (
      <a href={href} data-cursor-ring className={ROW} {...newTab}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} data-cursor-ring className={ROW}>
      {inner}
    </Link>
  );
}

export default function ArrowLinks({
  links,
  className = "",
}: {
  links: ArrowLink[];
  className?: string;
}) {
  // `group` drives the peer-dim across the rows.
  return (
    <div className={`group ${className}`}>
      {links.map((l) => (
        <Row key={l.href} {...l} />
      ))}
    </div>
  );
}
