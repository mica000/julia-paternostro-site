"use client";

/*
  ArrowLinks — the ruled "label ↗" link list used in the case-study CTA
  (Figma 423:2440) and the About contact block (Figma 432:2557).

  Each row is a thin-ruled line with an up-right arrow. The list peer-dims:
  every row rests at 100%, and while the list is hovered the non-hovered rows
  fall to 40% (the hovered one wins), same as the All-projects footer. Internal
  links route with next/link; external ones (mailto, social) use a plain <a>,
  opening http(s) targets in a new tab.
*/

import Link from "next/link";

export type ArrowLink = {
  /** Already-localized label. */
  label: string;
  href: string;
  /** Render as a plain <a> (mailto / social) instead of a next/link route. */
  external?: boolean;
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
  "flex h-[65px] items-center justify-between border-t-[0.5px] border-[#f6f6f61a] cursor-pointer text-[#fbfbfb] opacity-100 transition-opacity duration-150 ease-[ease] group-hover:opacity-40 hover:opacity-100 last:border-b-[0.5px]";

function Row({ label, href, external }: ArrowLink) {
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
