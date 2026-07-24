/*
  POST /api/save-composition — the write end of the in-browser composition
  editor (open any project with ?edit=1).

  The editor drags/resizes the satellite tiles, then posts the resulting
  coordinates here; this handler merges them into src/lib/compositions.json,
  which the site reads. So "hit Save" literally updates the project.

  DEV ONLY. On a deployed (production) build the filesystem is read-only and
  editing makes no sense, so the route refuses with 403 there. It is never a
  data path for real visitors — only for whoever is running `next dev`.

  Body: { breakpoint: "desktop" | "mobile", slug: string, slots: SatSlot[] }
*/

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type SatSlot = {
  dx: number;
  dy: number;
  w: number;
  ratio: string;
  depth: number;
};

const FILE = join(process.cwd(), "src", "lib", "compositions.json");

// Trim editor noise: 4 decimals is finer than a pixel at these frame sizes.
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

function isSlot(v: unknown): v is SatSlot {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.dx === "number" &&
    typeof s.dy === "number" &&
    typeof s.w === "number" &&
    typeof s.ratio === "string" &&
    typeof s.depth === "number" &&
    [s.dx, s.dy, s.w, s.depth].every(Number.isFinite)
  );
}

export async function POST(request: Request) {
  // Hard gate: never write on a production/hosted build.
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { ok: false, error: "The composition editor is available in dev only." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { breakpoint, slug, slots } = (body ?? {}) as {
    breakpoint?: unknown;
    slug?: unknown;
    slots?: unknown;
  };

  if (breakpoint !== "desktop" && breakpoint !== "mobile") {
    return Response.json(
      { ok: false, error: "breakpoint must be 'desktop' or 'mobile'." },
      { status: 400 }
    );
  }
  if (typeof slug !== "string" || !slug) {
    return Response.json({ ok: false, error: "slug is required." }, { status: 400 });
  }
  if (!Array.isArray(slots) || !slots.every(isSlot)) {
    return Response.json(
      { ok: false, error: "slots must be an array of {dx,dy,w,ratio,depth}." },
      { status: 400 }
    );
  }

  // Read → merge just this (breakpoint, slug) entry → write. Everything else
  // in the file is preserved untouched.
  let data: {
    desktop: Record<string, SatSlot[]>;
    mobile: Record<string, SatSlot[]>;
  };
  try {
    data = JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return Response.json(
      { ok: false, error: "Could not read compositions.json." },
      { status: 500 }
    );
  }

  data[breakpoint][slug] = (slots as SatSlot[]).map((s) => ({
    dx: r4(s.dx),
    dy: r4(s.dy),
    w: r4(s.w),
    ratio: s.ratio,
    depth: r4(s.depth),
  }));

  try {
    await writeFile(FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
  } catch {
    return Response.json(
      { ok: false, error: "Could not write compositions.json." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, breakpoint, slug, count: slots.length });
}
