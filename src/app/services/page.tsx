"use client";

/*
  Services — placeholder page
  ---------------------------
  Same shape as /about. Copy is a stub; expand later when the real service
  list, pricing, or CTAs are ready.
*/

import { useLang } from "@/lib/state";

export default function ServicesPage() {
  const { t } = useLang();
  return (
    <main
      className="flex min-h-screen items-center justify-center px-8"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="max-w-2xl text-center text-white">
        <h1 className="mb-6 text-4xl font-semibold uppercase tracking-widest">
          {t("services.title")}
        </h1>
        <p className="text-base leading-relaxed text-white/70">
          {t("services.body")}
        </p>
      </div>
    </main>
  );
}
