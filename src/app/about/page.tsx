"use client";

/*
  About — placeholder page
  ------------------------
  Real copy will land here later. For now, a single centered block that renders
  under the fixed TopNav and above BottomChrome. Content is translated via the
  language context, so it swaps when PT/EN is toggled.
*/

import { useLang } from "@/lib/state";

export default function AboutPage() {
  const { t } = useLang();
  return (
    <main
      className="flex min-h-screen items-center justify-center px-8"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="max-w-2xl text-center text-white">
        <h1 className="mb-6 text-4xl font-semibold uppercase tracking-widest">
          {t("about.title")}
        </h1>
        <p className="text-base leading-relaxed text-white/70">{t("about.body")}</p>
      </div>
    </main>
  );
}
